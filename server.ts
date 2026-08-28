import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getSqliteDatabase,
  saveDatabaseToDisk,
  mapRowToCar,
  searchCarsInDatabase,
} from "./src/utils/database";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Enable CORS so the Vercel-hosted frontend can connect directly to this backend
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  })
);

// Increase JSON payload limit for high-res automotive photos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded photos statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Lazy initialization for Gemini API (server-side only)
let genAI: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

// Save base64 image data directly as files to disk
function saveBase64ImageToDisk(dataUrl: string, prefix = "car"): string {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return dataUrl;

    const ext = matches[1] === "svg+xml" ? "svg" : matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    console.log(`[Storage] Saved image file to disk: ${filename}`);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Failed to save image to disk:", err);
    return dataUrl;
  }
}

// Admin configuration helper
const activeSessions = new Set<string>();

function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || "admin@platesnapcars.local").toLowerCase().trim(),
    password: (process.env.ADMIN_PASSWORD || "platesnap2026").trim(),
    name: process.env.ADMIN_NAME || "Lead Automotive Photographer",
  };
}

// Middleware: Verify Admin Token
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const adminTokenHeader = req.headers["x-admin-token"] as string;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : adminTokenHeader;

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized. Admin session invalid or expired." });
  }
  next();
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check / Backend Status Endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  const db = await getSqliteDatabase();
  const stmt = db.prepare("SELECT COUNT(*) as count FROM cars");
  let count = 0;
  if (stmt.step()) {
    count = (stmt.getAsObject() as { count: number }).count;
  }
  stmt.free();

  res.json({
    status: "ok",
    service: "PlateSnap Dynamic SQL Backend",
    database: "SQLite (Embedded)",
    totalCarsIndexed: count,
    mode: process.env.BACKEND_ONLY === "true" ? "headless-backend" : "fullstack",
    timestamp: new Date().toISOString(),
  });
});

// Admin public info (for login verification / branding)
app.get("/api/admin/info", (req: Request, res: Response) => {
  const creds = getAdminCredentials();
  res.json({
    adminEmail: creds.email,
    adminName: creds.name,
  });
});

// Admin Login
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password, email } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  const creds = getAdminCredentials();

  if (email && email.toLowerCase().trim() !== creds.email) {
    return res.status(401).json({ error: `Invalid admin email. Expected: ${creds.email}` });
  }

  if (password.trim() !== creds.password) {
    return res.status(401).json({ error: "Invalid admin password. Please check your credentials." });
  }

  const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  activeSessions.add(token);

  res.json({
    success: true,
    token,
    admin: {
      name: creds.name,
      email: creds.email,
      role: "SuperAdmin",
    },
  });
});

// Admin Logout
app.post("/api/admin/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : (req.headers["x-admin-token"] as string);
  if (token) activeSessions.delete(token);
  res.json({ success: true, message: "Logged out successfully" });
});

// ==========================================
// DYNAMIC SQL SEARCH & CARS ENDPOINTS
// ==========================================

// GET all cars / Search with dynamic SQL queries & indexes
app.get("/api/cars", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const event = (req.query.event as string) || "";
    const tag = (req.query.tag as string) || "";

    const db = await getSqliteDatabase();
    const results = searchCarsInDatabase(db, q, event, tag);
    res.json({ cars: results, total: results.length });
  } catch (err: any) {
    console.error("SQL Search error:", err);
    res.status(500).json({ error: "Search query failed on database engine." });
  }
});

// GET single car by ID
app.get("/api/cars/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getSqliteDatabase();
  const stmt = db.prepare("SELECT * FROM cars WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return res.status(404).json({ error: "Vehicle photo record not found" });
  }

  const row = stmt.getAsObject();
  stmt.free();

  // Increment view count in SQL
  db.run("UPDATE cars SET views = views + 1 WHERE id = ?", [id]);
  saveDatabaseToDisk(db);

  res.json({ car: mapRowToCar(row) });
});

// POST new car upload (Admin only)
app.post("/api/cars", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      plateNumber,
      carName,
      make,
      model,
      year,
      color,
      event,
      photographer,
      imageUrl,
      cartoonImageUrl,
      hasCartoon,
      tags,
      resolution,
      cameraInfo,
      location,
    } = req.body;

    if (!plateNumber || !imageUrl) {
      return res.status(400).json({ error: "Plate number and image are required." });
    }

    const cleanPlate = plateNumber.toUpperCase().trim();
    const savedImageUrl = saveBase64ImageToDisk(imageUrl, `plate_${cleanPlate.replace(/[^a-zA-Z0-9]/g, "")}`);
    const savedCartoonUrl = cartoonImageUrl
      ? saveBase64ImageToDisk(cartoonImageUrl, `cartoon_${cleanPlate.replace(/[^a-zA-Z0-9]/g, "")}`)
      : null;

    const carId = `car-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const formattedDate =
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      ` • ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

    const tagsArray = Array.isArray(tags) ? tags : ["CarMeet", make || "Automotive"];
    const creds = getAdminCredentials();

    const db = await getSqliteDatabase();
    db.run(
      `INSERT INTO cars (
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        image_url, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
      [
        carId,
        cleanPlate,
        carName || `${make || "Custom"} ${model || "Vehicle"}`,
        make || "Custom",
        model || "Vehicle",
        year ? parseInt(year, 10) : new Date().getFullYear(),
        color || "Custom Color",
        event || "Automotive Gathering",
        location || "Metropolitan Car Meet",
        formattedDate,
        photographer?.name || creds.name,
        photographer?.title || "Automotive Photographer",
        photographer?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        photographer?.bio || "Official Plate Snap Cars verified shooter.",
        photographer?.instagram || "",
        savedImageUrl,
        savedCartoonUrl,
        Boolean(hasCartoon || savedCartoonUrl) ? 1 : 0,
        JSON.stringify(tagsArray),
        resolution || "High Resolution • 300 DPI",
        cameraInfo || "Sony Alpha • 50mm f/1.8 • 1/1000s • ISO 100",
        new Date().toISOString(),
      ]
    );

    saveDatabaseToDisk(db);

    const stmt = db.prepare("SELECT * FROM cars WHERE id = ?");
    stmt.bind([carId]);
    stmt.step();
    const newCarRow = stmt.getAsObject();
    stmt.free();

    res.status(201).json({ success: true, car: mapRowToCar(newCarRow) });
  } catch (err: any) {
    console.error("Error creating car in SQLite:", err);
    res.status(500).json({ error: err.message || "Failed to create vehicle record in database." });
  }
});

// PUT update car photo (Admin only)
app.put("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getSqliteDatabase();

  const stmt = db.prepare("SELECT * FROM cars WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return res.status(404).json({ error: "Car record not found." });
  }
  const existing = stmt.getAsObject() as any;
  stmt.free();

  let {
    plateNumber,
    carName,
    make,
    model,
    year,
    color,
    event,
    location,
    imageUrl,
    cartoonImageUrl,
    hasCartoon,
    tags,
  } = req.body;

  if (imageUrl && imageUrl.startsWith("data:image/")) {
    imageUrl = saveBase64ImageToDisk(imageUrl, `plate_${id}`);
  } else if (!imageUrl) {
    imageUrl = existing.image_url;
  }

  if (cartoonImageUrl && cartoonImageUrl.startsWith("data:image/")) {
    cartoonImageUrl = saveBase64ImageToDisk(cartoonImageUrl, `cartoon_${id}`);
  }

  const tagsJson = tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : existing.tags;

  db.run(
    `UPDATE cars SET
      plate_number = ?,
      car_name = ?,
      make = ?,
      model = ?,
      year = ?,
      color = ?,
      event = ?,
      location = ?,
      image_url = ?,
      cartoon_image_url = ?,
      has_cartoon = ?,
      tags = ?
    WHERE id = ?`,
    [
      plateNumber ? plateNumber.toUpperCase().trim() : existing.plate_number,
      carName || existing.car_name,
      make || existing.make,
      model || existing.model,
      year ? parseInt(year, 10) : existing.year,
      color || existing.color,
      event || existing.event,
      location || existing.location,
      imageUrl,
      cartoonImageUrl || existing.cartoon_image_url,
      hasCartoon !== undefined ? (hasCartoon ? 1 : 0) : existing.has_cartoon,
      tagsJson,
      id,
    ]
  );

  saveDatabaseToDisk(db);

  const stmt2 = db.prepare("SELECT * FROM cars WHERE id = ?");
  stmt2.bind([id]);
  stmt2.step();
  const updatedRow = stmt2.getAsObject();
  stmt2.free();

  res.json({ success: true, car: mapRowToCar(updatedRow) });
});

// Increment download count (Public)
app.post("/api/cars/:id/download", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getSqliteDatabase();
  db.run("UPDATE cars SET downloads = downloads + 1 WHERE id = ?", [id]);
  saveDatabaseToDisk(db);

  const stmt = db.prepare("SELECT downloads FROM cars WHERE id = ?");
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { downloads: number };
    stmt.free();
    return res.json({ success: true, downloads: row.downloads });
  }
  stmt.free();
  res.status(404).json({ error: "Car not found" });
});

// DELETE car photo (Admin only)
app.delete("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getSqliteDatabase();
  db.run("DELETE FROM cars WHERE id = ?", [id]);
  saveDatabaseToDisk(db);
  res.json({ success: true, message: "Car record deleted successfully." });
});

// GET saved theme config
app.get("/api/theme", async (req: Request, res: Response) => {
  const db = await getSqliteDatabase();
  const stmt = db.prepare("SELECT value FROM app_settings WHERE key = 'theme'");
  if (stmt.step()) {
    const row = stmt.getAsObject() as { value: string };
    stmt.free();
    try {
      return res.json({ theme: JSON.parse(row.value) });
    } catch {}
  }
  stmt.free();
  res.json({ theme: null });
});

// POST update theme config (Admin only)
app.post("/api/theme", requireAdmin, async (req: Request, res: Response) => {
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: "Theme configuration required." });

  const db = await getSqliteDatabase();
  db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [JSON.stringify(theme)]
  );
  saveDatabaseToDisk(db);

  res.json({ success: true, theme });
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
async function startServer() {
  const isBackendOnly = process.env.BACKEND_ONLY === "true";

  if (isBackendOnly) {
    console.log("[PlateSnap Server] Running in Headless Backend Mode (No frontend bundle served).");
    app.get("/", (req: Request, res: Response) => {
      res.json({
        service: "PlateSnap Automotive SQL Backend",
        status: "online",
        apiEndpoints: [
          "/api/health",
          "/api/cars?q=7XYZ999",
          "/api/admin/login",
          "/uploads/*",
        ],
      });
    });
  } else if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production SPA serving fallback
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🏎️ PlateSnap Dynamic SQL Server`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`💾 Database: SQLite -> ${path.join(DATA_DIR, "cars.sqlite")}`);
    console.log(`🖼️ Media Storage: -> ${UPLOADS_DIR}`);
    console.log(`🔌 Mode: ${isBackendOnly ? "Headless Backend API" : "Fullstack"}`);
    console.log(`====================================================`);
  });
}

startServer();

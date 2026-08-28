import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getPgPool,
  initializePostgresDatabase,
  mapRowToCar,
  searchCarsInPostgres,
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
  try {
    const pool = getPgPool();
    const result = await pool.query("SELECT COUNT(*) as count FROM cars");
    const count = parseInt(result.rows[0].count, 10);

    res.json({
      status: "ok",
      service: "PlateSnap PostgreSQL Backend API",
      database: "PostgreSQL",
      host: process.env.POSTGRES_HOST || "postgres",
      totalCarsIndexed: count,
      mode: process.env.BACKEND_ONLY === "true" ? "headless-backend" : "fullstack",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: "database_error",
      database: "PostgreSQL (connecting...)",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
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
// POSTGRESQL SEARCH & CARS ENDPOINTS
// ==========================================

// GET all cars / Search with dynamic SQL queries & indexes
app.get("/api/cars", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const event = (req.query.event as string) || "";
    const tag = (req.query.tag as string) || "";

    const results = await searchCarsInPostgres(q, event, tag);
    res.json({ cars: results, total: results.length });
  } catch (err: any) {
    console.error("PostgreSQL Search error:", err);
    res.status(500).json({ error: "Search query failed on database engine." });
  }
});

// GET single car by ID
app.get("/api/cars/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPgPool();
    const result = await pool.query("SELECT * FROM cars WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Vehicle photo record not found" });
    }

    // Increment view count
    await pool.query("UPDATE cars SET views = views + 1 WHERE id = $1", [id]);

    res.json({ car: mapRowToCar(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

    const pool = getPgPool();
    const insertRes = await pool.query(
      `INSERT INTO cars (
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        image_url, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, 1, 0, $20, $21, NOW())
      RETURNING *`,
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
        Boolean(hasCartoon || savedCartoonUrl),
        JSON.stringify(tagsArray),
        resolution || "High Resolution • 300 DPI",
        cameraInfo || "Sony Alpha • 50mm f/1.8 • 1/1000s • ISO 100",
      ]
    );

    res.status(201).json({ success: true, car: mapRowToCar(insertRes.rows[0]) });
  } catch (err: any) {
    console.error("Error creating car in PostgreSQL:", err);
    res.status(500).json({ error: err.message || "Failed to create vehicle record in database." });
  }
});

// PUT update car photo (Admin only)
app.put("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPgPool();

    const existingRes = await pool.query("SELECT * FROM cars WHERE id = $1", [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Car record not found." });
    }
    const existing = existingRes.rows[0];

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

    const tagsJson = tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : JSON.stringify(existing.tags);

    const updateRes = await pool.query(
      `UPDATE cars SET
        plate_number = $1,
        car_name = $2,
        make = $3,
        model = $4,
        year = $5,
        color = $6,
        event = $7,
        location = $8,
        image_url = $9,
        cartoon_image_url = $10,
        has_cartoon = $11,
        tags = $12::jsonb
      WHERE id = $13
      RETURNING *`,
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
        hasCartoon !== undefined ? Boolean(hasCartoon) : existing.has_cartoon,
        tagsJson,
        id,
      ]
    );

    res.json({ success: true, car: mapRowToCar(updateRes.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Increment download count (Public)
app.post("/api/cars/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPgPool();
    const result = await pool.query(
      "UPDATE cars SET downloads = downloads + 1 WHERE id = $1 RETURNING downloads",
      [id]
    );
    if (result.rows.length > 0) {
      return res.json({ success: true, downloads: result.rows[0].downloads });
    }
    res.status(404).json({ error: "Car not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE car photo (Admin only)
app.delete("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPgPool();
    await pool.query("DELETE FROM cars WHERE id = $1", [id]);
    res.json({ success: true, message: "Car record deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET saved theme config
app.get("/api/theme", async (req: Request, res: Response) => {
  try {
    const pool = getPgPool();
    const result = await pool.query("SELECT value FROM app_settings WHERE key = 'theme'");
    if (result.rows.length > 0) {
      return res.json({ theme: result.rows[0].value });
    }
    res.json({ theme: null });
  } catch (err: any) {
    res.json({ theme: null });
  }
});

// POST update theme config (Admin only)
app.post("/api/theme", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { theme } = req.body;
    if (!theme) return res.status(400).json({ error: "Theme configuration required." });

    const pool = getPgPool();
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(theme)]
    );

    res.json({ success: true, theme });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
async function startServer() {
  // Initialize and connect to PostgreSQL
  initializePostgresDatabase().catch((err) => {
    console.warn("[PostgreSQL] Background initialization noticed:", err.message);
  });

  const isBackendOnly = process.env.BACKEND_ONLY === "true";

  if (isBackendOnly) {
    console.log("[PlateSnap Server] Running in Headless Backend Mode (No frontend bundle served).");
    app.get("/", (req: Request, res: Response) => {
      res.json({
        service: "PlateSnap Automotive PostgreSQL Backend",
        database: "PostgreSQL",
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
    console.log(`🏎️ PlateSnap PostgreSQL Backend Server`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`🐘 Database: PostgreSQL (${process.env.POSTGRES_HOST || "postgres"}:5432/${process.env.POSTGRES_DB || "platesnap_db"})`);
    console.log(`🖼️ Media Storage: -> ${UPLOADS_DIR}`);
    console.log(`🔌 Mode: ${isBackendOnly ? "Headless Backend API" : "Fullstack"}`);
    console.log(`====================================================`);
  });
}

startServer();

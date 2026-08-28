import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getPgPool,
  initializePostgresDatabase,
  getIsPostgresAvailable,
  searchCarsInPostgres,
  getCarByIdFromDb,
  insertCarIntoDb,
  updateCarInDb,
  deleteCarFromDb,
  incrementDownloadInDb,
  getThemeFromDb,
  saveThemeToDb,
  getLocalCars,
  mapRowToCar,
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
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Helper to create a clean, safe folder name for a license plate
function getPlateFolderSlug(plateNumber?: string): string {
  if (!plateNumber) return "unassigned";
  const trimmed = plateNumber.toUpperCase().trim();
  const sanitized = trimmed
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "unassigned";
}

// Save base64 image data directly as files to disk inside the plate folder
function saveBase64ImageToDisk(dataUrl: string, prefix = "car", plateNumber?: string): string {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return dataUrl;

    const ext = matches[1] === "svg+xml" ? "svg" : matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];

    const plateFolder = getPlateFolderSlug(plateNumber);
    const targetDir = path.join(UPLOADS_DIR, plateFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    console.log(`[Storage] Saved image file to plate folder [${plateFolder}]: ${filename}`);
    return `/uploads/${plateFolder}/${filename}`;
  } catch (err) {
    console.error("Failed to save image to disk:", err);
    return dataUrl;
  }
}

// Admin configuration helper
const activeSessions = new Set<string>();

function getAdminCredentials() {
  const email = (process.env.ADMIN_EMAIL || "admin@platesnapcars.local").toLowerCase().trim();
  const password = (process.env.ADMIN_PASSWORD || "platesnap2026").trim();
  let name = (process.env.ADMIN_NAME || "Lead Automotive Photographer").trim();
  if (name === password || !name) {
    name = "Lead Automotive Photographer";
  }
  return {
    email,
    password,
    name,
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
  const isPgUp = getIsPostgresAvailable();
  const cars = getLocalCars();

  res.json({
    status: "ok",
    service: "PlateSnap Automotive Backend API",
    database: isPgUp ? "PostgreSQL (Connected)" : "Local Storage Engine (Active)",
    postgresHost: process.env.POSTGRES_HOST || "postgres",
    isPostgresConnected: isPgUp,
    totalCarsIndexed: cars.length,
    mode: process.env.BACKEND_ONLY === "true" ? "headless-backend" : "fullstack",
    timestamp: new Date().toISOString(),
  });
});

// Admin public info (for public photographer credit display)
app.get("/api/admin/info", (req: Request, res: Response) => {
  const creds = getAdminCredentials();
  res.json({
    adminName: creds.name,
  });
});

// Admin Login
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password, email, username, identifier } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  const creds = getAdminCredentials();
  const inputIdentifier = (identifier || username || email || "").toLowerCase().trim();
  const inputPassword = String(password).trim();

  // Valid identifiers include configured email/username, name, and standard admin aliases
  const validIdentifiers = new Set([
    creds.email.toLowerCase().trim(),
    creds.name.toLowerCase().trim(),
    "admin",
    "administrator",
    "admin@platesnapcars.local",
  ]);

  if (process.env.ADMIN_EMAIL) {
    validIdentifiers.add(process.env.ADMIN_EMAIL.toLowerCase().trim());
  }

  const isPasswordValid =
    inputPassword === creds.password ||
    inputPassword === (process.env.ADMIN_PASSWORD || "platesnap2026");

  const isIdentifierValid = !inputIdentifier || validIdentifiers.has(inputIdentifier);

  if (!isPasswordValid || !isIdentifierValid) {
    return res.status(401).json({ error: "Invalid credentials. Please verify your username/email and password." });
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
// GEMINI AI CARTOON GENERATION ENDPOINT
// ==========================================
app.post("/api/generate-cartoon", async (req: Request, res: Response) => {
  try {
    const { image, carName, make, model, color, specialFeatures, plateNumber } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data or URL is required for cartoon generation." });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({
        fallback: true,
        message: "Gemini API key not configured on server. Switching to high-definition algorithmic engine.",
      });
    }

    // Extract base64 and mime type from image input (can be data URL, local /uploads/ URL, or remote URL)
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (typeof image === "string" && image.startsWith("data:image/")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    } else if (typeof image === "string" && image.startsWith("/uploads/")) {
      const relativeUploadPath = image.replace(/^\/uploads\//, "");
      const localPath = path.join(UPLOADS_DIR, relativeUploadPath);
      if (fs.existsSync(localPath)) {
        const fileBuf = fs.readFileSync(localPath);
        base64Data = fileBuf.toString("base64");
        const ext = path.extname(localPath).toLowerCase();
        mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      }
    } else if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      try {
        const fetchRes = await fetch(image);
        const arrayBuf = await fetchRes.arrayBuffer();
        base64Data = Buffer.from(arrayBuf).toString("base64");
        const contentType = fetchRes.headers.get("content-type");
        if (contentType) mimeType = contentType.split(";")[0];
      } catch (fetchErr) {
        console.warn("[Cartoon AI] Failed to fetch remote image url for Gemini:", fetchErr);
      }
    }

    if (!base64Data) {
      return res.json({
        fallback: true,
        message: "Input image data could not be parsed for AI vision model. Using local processor.",
      });
    }

    const vehicleTitle = carName || `${make || ""} ${model || "Vehicle"}`.trim();
    const promptText = `You are a master automotive comic artist and sticker designer.
Transform this exact car photograph of a ${vehicleTitle} ${color ? `(paint color: ${color})` : ""} into a clean, stylized 2D cartoon vector sticker illustration.

Requirements:
- Stylized 2D cel-shaded automotive illustration capturing the exact body shape, wheel stance, headlights, and paint tone of this vehicle.
- Bold, dark, clean comic inking outlines.
- Vibrant, flat pop-art colors with smooth cel-shading highlights and reflections.
- Thick white die-cut sticker silhouette outline framing the car.
- Pure solid white background (#FFFFFF) with no background scenery or floor clutter.
${specialFeatures ? `- Special user focus: ${specialFeatures}` : ""}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      });

      let generatedDataUrl: string | null = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || "image/png";
            generatedDataUrl = `data:${outMime};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (generatedDataUrl) {
        const savedUrl = saveBase64ImageToDisk(
          generatedDataUrl,
          `cartoon_ai`,
          plateNumber || vehicleTitle || "cartoon"
        );
        return res.json({
          success: true,
          dataUrl: savedUrl,
          source: "gemini-ai",
        });
      }
    } catch (genError: any) {
      console.warn("[Cartoon AI] Gemini image generation attempt noted:", genError?.message || genError);
    }

    return res.json({
      fallback: true,
      message: "AI image model unavailable or returned text. Seamlessly applied algorithmic vector processor.",
    });
  } catch (err: any) {
    console.error("Cartoon generation handler error:", err);
    res.status(500).json({ error: err.message || "Failed to generate cartoon art." });
  }
});

// ==========================================
// POSTGRESQL & SEARCH CARS ENDPOINTS
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
    console.error("Search error:", err);
    res.status(500).json({ error: "Search query failed on database engine." });
  }
});

// GET single car by ID
app.get("/api/cars/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const car = await getCarByIdFromDb(id);

    if (!car) {
      return res.status(404).json({ error: "Vehicle photo record not found" });
    }

    res.json({ car });
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
      images,
      cartoonImageUrl,
      hasCartoon,
      tags,
      resolution,
      cameraInfo,
      location,
    } = req.body;

    const rawImagesList: string[] = Array.isArray(images) && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);

    if (!plateNumber || rawImagesList.length === 0) {
      return res.status(400).json({ error: "Plate number and at least one image are required." });
    }

    const cleanPlate = plateNumber.toUpperCase().trim();

    // Process all images into the license plate's folder
    const savedImages: string[] = rawImagesList.map((img: string, idx: number) => {
      if (img && img.startsWith("data:image/")) {
        return saveBase64ImageToDisk(img, `photo_${idx + 1}`, cleanPlate);
      }
      return img;
    });

    const primaryImageUrl = imageUrl && imageUrl.startsWith("data:image/")
      ? saveBase64ImageToDisk(imageUrl, "cover", cleanPlate)
      : (imageUrl || savedImages[0]);

    const savedCartoonUrl = cartoonImageUrl
      ? (cartoonImageUrl.startsWith("data:image/")
          ? saveBase64ImageToDisk(cartoonImageUrl, "cartoon", cleanPlate)
          : cartoonImageUrl)
      : null;

    const carId = `car-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const formattedDate =
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      ` • ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

    const tagsArray = Array.isArray(tags) ? tags : ["CarMeet", make || "Automotive"];
    const creds = getAdminCredentials();

    const newCar = {
      id: carId,
      plateNumber: cleanPlate,
      carName: carName || `${make || "Custom"} ${model || "Vehicle"}`,
      make: make || "Custom",
      model: model || "Vehicle",
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      color: color || "Custom Color",
      event: event || "Automotive Gathering",
      location: location || "Metropolitan Car Meet",
      date: formattedDate,
      photographer: {
        name: photographer?.name || creds.name,
        title: photographer?.title || "Automotive Photographer",
        avatar: photographer?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        bio: photographer?.bio || "Official Plate Snap Cars verified shooter.",
        instagram: photographer?.instagram || "",
      },
      imageUrl: primaryImageUrl,
      images: savedImages,
      cartoonImageUrl: savedCartoonUrl,
      hasCartoon: Boolean(hasCartoon || savedCartoonUrl),
      tags: tagsArray,
      views: 1,
      downloads: 0,
      resolution: resolution || "High Resolution • 300 DPI",
      cameraInfo: cameraInfo || "Sony Alpha • 50mm f/1.8 • 1/1000s • ISO 100",
      createdAt: new Date().toISOString(),
    };

    const inserted = await insertCarIntoDb(newCar);
    res.status(201).json({ success: true, car: inserted });
  } catch (err: any) {
    console.error("Error creating car:", err);
    res.status(500).json({ error: err.message || "Failed to create vehicle record." });
  }
});

// PUT update car photo (Admin only)
app.put("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      images,
      cartoonImageUrl,
      hasCartoon,
      tags,
    } = req.body;

    const existingCar = await getCarByIdFromDb(id);
    const targetPlate = plateNumber || existingCar?.plateNumber || id;

    let savedImages: string[] = [];
    if (Array.isArray(images) && images.length > 0) {
      savedImages = images.map((img: string, idx: number) => {
        if (img && img.startsWith("data:image/")) {
          return saveBase64ImageToDisk(img, `photo_${idx + 1}`, targetPlate);
        }
        return img;
      });
    }

    if (imageUrl && imageUrl.startsWith("data:image/")) {
      imageUrl = saveBase64ImageToDisk(imageUrl, `cover`, targetPlate);
    } else if (!imageUrl && savedImages.length > 0) {
      imageUrl = savedImages[0];
    }

    if (cartoonImageUrl && cartoonImageUrl.startsWith("data:image/")) {
      cartoonImageUrl = saveBase64ImageToDisk(cartoonImageUrl, `cartoon`, targetPlate);
    }

    const updates: any = {
      ...(plateNumber ? { plateNumber: plateNumber.toUpperCase().trim() } : {}),
      ...(carName ? { carName } : {}),
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
      ...(year ? { year: parseInt(year, 10) } : {}),
      ...(color ? { color } : {}),
      ...(event ? { event } : {}),
      ...(location ? { location } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(savedImages.length > 0 ? { images: savedImages } : {}),
      ...(cartoonImageUrl !== undefined ? { cartoonImageUrl } : {}),
      ...(hasCartoon !== undefined ? { hasCartoon: Boolean(hasCartoon) } : {}),
      ...(tags ? { tags: Array.isArray(tags) ? tags : [tags] } : {}),
    };

    const updated = await updateCarInDb(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Car record not found." });
    }

    res.json({ success: true, car: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Increment download count (Public)
app.post("/api/cars/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const downloads = await incrementDownloadInDb(id);
    res.json({ success: true, downloads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE car photo (Admin only)
app.delete("/api/cars/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCarFromDb(id);
    res.json({ success: true, message: "Car record deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET saved theme config
app.get("/api/theme", async (req: Request, res: Response) => {
  try {
    const theme = await getThemeFromDb();
    res.json({ theme });
  } catch (err: any) {
    res.json({ theme: null });
  }
});

// POST update theme config (Admin only)
app.post("/api/theme", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { theme } = req.body;
    if (!theme) return res.status(400).json({ error: "Theme configuration required." });

    await saveThemeToDb(theme);
    res.json({ success: true, theme });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
async function startServer() {
  // Initialize and connect to PostgreSQL (or seamlessly use file storage)
  initializePostgresDatabase().catch((err) => {
    console.log("[Database] Local store ready, background PostgreSQL probe noticed:", err.message);
  });

  const isExplicitlyBackendOnly = process.env.BACKEND_ONLY === "true";
  const distPath = path.join(process.cwd(), "dist");
  const hasDistIndex = fs.existsSync(path.join(distPath, "index.html"));

  if (isExplicitlyBackendOnly && !hasDistIndex) {
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
    // Production SPA serving
    if (hasDistIndex) {
      app.use(express.static(distPath));
      app.get("*", (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.get("/", (req: Request, res: Response) => {
        res.json({
          service: "PlateSnap Automotive Fullstack Server (Building Static Assets...)",
          database: "PostgreSQL",
          status: "online",
          apiEndpoints: [
            "/api/health",
            "/api/cars",
            "/api/admin/login",
          ],
        });
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🏎️ PlateSnap Automotive Server`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`🐘 Database Engine: PostgreSQL / Resilient Multi-Storage`);
    console.log(`🖼️ Media Storage: -> ${UPLOADS_DIR}`);
    console.log(`🔌 Mode: ${isExplicitlyBackendOnly && !hasDistIndex ? "Headless Backend API" : "Fullstack"}`);
    console.log(`====================================================`);
  });
}

startServer();


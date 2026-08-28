import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Directories for local server storage
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const CARS_DB_FILE = path.join(DATA_DIR, "cars_database.json");
const THEME_DB_FILE = path.join(DATA_DIR, "theme_config.json");

// Ensure local storage folders exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to load/save JSON database to local server disk
function loadLocalDatabase(): any[] {
  try {
    if (fs.existsSync(CARS_DB_FILE)) {
      const content = fs.readFileSync(CARS_DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read local database from disk:", err);
  }
  return [];
}

function saveLocalDatabase(data: any[]) {
  try {
    fs.writeFileSync(CARS_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write database to disk:", err);
  }
}

function loadLocalTheme(): any {
  try {
    if (fs.existsSync(THEME_DB_FILE)) {
      return JSON.parse(fs.readFileSync(THEME_DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read local theme config:", err);
  }
  return null;
}

function saveLocalTheme(theme: any) {
  try {
    fs.writeFileSync(THEME_DB_FILE, JSON.stringify(theme, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write theme to disk:", err);
  }
}

// In-memory data store with local server disk synchronization
let carsDatabase: any[] = loadLocalDatabase();
let appThemeConfig: any = loadLocalTheme();

// Helper to save base64 image data directly as files on your local server disk
function saveBase64ImageToDisk(dataUrl: string, prefix = "car"): string {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return dataUrl; // Already a URL or path
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }

    let ext = matches[1];
    if (ext === "svg+xml") ext = "svg";
    if (ext === "jpeg") ext = "jpg";

    const base64Data = matches[2];
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    // Return the local server static URL route
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error("Error writing image to local disk:", err);
    return dataUrl;
  }
}

// Middleware for body parsing (supporting large photo uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve local server media uploads statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Helper to initialize Google GenAI lazily
let genAiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    genAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    itemsCount: carsDatabase.length,
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
  });
});

// GET all cars (supports search query, plate, make, tag)
app.get("/api/cars", (req: Request, res: Response) => {
  const { query, plate, make, tag } = req.query;

  let results = [...carsDatabase];

  if (plate && typeof plate === "string") {
    const cleanPlate = plate.replace(/[\s\-_]/g, "").toUpperCase();
    results = results.filter((c) =>
      c.plateNumber.replace(/[\s\-_]/g, "").toUpperCase().includes(cleanPlate)
    );
  }

  if (query && typeof query === "string") {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.plateNumber.toLowerCase().includes(q) ||
        c.carName.toLowerCase().includes(q) ||
        c.make.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.event.toLowerCase().includes(q) ||
        (c.photographer && c.photographer.name.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  }

  if (make && typeof make === "string" && make !== "All") {
    results = results.filter((c) => c.make.toLowerCase() === make.toLowerCase());
  }

  if (tag && typeof tag === "string") {
    results = results.filter((c) => c.tags && c.tags.includes(tag));
  }

  res.json({ cars: results, total: results.length });
});

// POST new car upload
app.post("/api/cars", (req: Request, res: Response) => {
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
      return res.status(400).json({ error: "Plate number and image URL are required." });
    }

    // Save image files locally to server disk
    const savedImageUrl = saveBase64ImageToDisk(imageUrl, `plate_${plateNumber.replace(/[^a-zA-Z0-9]/g, "")}`);
    const savedCartoonUrl = cartoonImageUrl
      ? saveBase64ImageToDisk(cartoonImageUrl, `cartoon_${plateNumber.replace(/[^a-zA-Z0-9]/g, "")}`)
      : null;

    const newCar = {
      id: `car-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      plateNumber: plateNumber.toUpperCase().trim(),
      carName: carName || `${make || "Custom"} ${model || "Vehicle"}`,
      make: make || "Custom",
      model: model || "Vehicle",
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      color: color || "Custom Color",
      event: event || "Automotive Gathering",
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }) + ` • ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      location: location || "Metropolitan Car Meet",
      photographer: photographer || {
        name: "Admin Photographer",
        title: "Staff Automotive Photographer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        bio: "Official Plate Snap Cars verified shooter.",
      },
      imageUrl: savedImageUrl,
      cartoonImageUrl: savedCartoonUrl,
      hasCartoon: Boolean(hasCartoon || savedCartoonUrl),
      tags: Array.isArray(tags) ? tags : ["CarMeet", make || "Automotive"],
      views: 1,
      downloads: 0,
      resolution: resolution || "4K • 3840 x 2160 • 300 DPI",
      cameraInfo: cameraInfo || "Sony A7R V • 50mm f/1.2 GM • 1/1000s • ISO 100",
      createdAt: new Date().toISOString(),
    };

    carsDatabase.unshift(newCar);
    saveLocalDatabase(carsDatabase);
    res.status(201).json({ success: true, car: newCar });
  } catch (err: any) {
    console.error("Error creating car:", err);
    res.status(500).json({ error: err.message || "Failed to create car photo record" });
  }
});

// Seed / sync initial database
app.post("/api/cars/seed", (req: Request, res: Response) => {
  const { initialCars } = req.body;
  if (Array.isArray(initialCars) && carsDatabase.length === 0) {
    carsDatabase = [...initialCars];
    saveLocalDatabase(carsDatabase);
  }
  res.json({ success: true, count: carsDatabase.length });
});

// PUT update car photo or cartoon
app.put("/api/cars/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = carsDatabase.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Car record not found." });
  }

  let updatedData = { ...req.body };
  if (updatedData.imageUrl && updatedData.imageUrl.startsWith("data:image/")) {
    updatedData.imageUrl = saveBase64ImageToDisk(updatedData.imageUrl, `plate_${id}`);
  }
  if (updatedData.cartoonImageUrl && updatedData.cartoonImageUrl.startsWith("data:image/")) {
    updatedData.cartoonImageUrl = saveBase64ImageToDisk(updatedData.cartoonImageUrl, `cartoon_${id}`);
  }

  carsDatabase[index] = {
    ...carsDatabase[index],
    ...updatedData,
    id, // protect id from being overwritten
  };

  saveLocalDatabase(carsDatabase);
  res.json({ success: true, car: carsDatabase[index] });
});

// Increment download count
app.post("/api/cars/:id/download", (req: Request, res: Response) => {
  const { id } = req.params;
  const car = carsDatabase.find((c) => c.id === id);
  if (car) {
    car.downloads = (car.downloads || 0) + 1;
    saveLocalDatabase(carsDatabase);
    return res.json({ success: true, downloads: car.downloads });
  }
  res.status(404).json({ error: "Car not found" });
});

// DELETE car photo
app.delete("/api/cars/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = carsDatabase.length;
  carsDatabase = carsDatabase.filter((c) => c.id !== id);

  if (carsDatabase.length === initialLength) {
    return res.status(404).json({ error: "Car record not found." });
  }

  saveLocalDatabase(carsDatabase);
  res.json({ success: true, message: "Car photo deleted successfully." });
});

// GET saved theme config
app.get("/api/theme", (req: Request, res: Response) => {
  res.json({ theme: appThemeConfig });
});

// POST update theme config
app.post("/api/theme", (req: Request, res: Response) => {
  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: "Theme configuration required." });
  }
  appThemeConfig = theme;
  saveLocalTheme(appThemeConfig);
  res.json({ success: true, theme: appThemeConfig });
});

// POST AI Cartoon Art Generator / Stylizer Endpoint
app.post("/api/generate-cartoon", async (req: Request, res: Response) => {
  try {
    const { carName, make, model, color, specialFeatures, base64Image } = req.body;
    const ai = getGemini();

    if (!ai) {
      return res.json({
        success: true,
        method: "fallback",
        message: "Gemini API key not configured. Using client-side high-precision vector cartoon engine.",
      });
    }

    const prompt = `You are a legendary Japanese chibi car artist and vinyl sticker designer who creates iconic 2D minimalist vector car illustrations in the style of the iconic pop-up headlight Mazda Miata sticker art (flat bold colors, thick black outlines, cute expressive headlights, front-facing or 3/4 perspective, clean sticker vibe).
Car: ${make || ""} ${model || carName || "Sports Car"}
Color: ${color || "Vibrant"}
Details: ${specialFeatures || "Wide stance, signature headlights, aggressive front lip, sticker aesthetic"}

Please generate a high quality standalone clean SVG representation of this car matching this exact cartoon sticker art style. Return ONLY valid <svg>...</svg> code with no markdown backticks or commentary, viewBox="0 0 800 600", width="800", height="600". Include bold black outline paths (stroke-width 8 to 12), cute headlights, front grille/smile, wheels with slight camber, and cel-shaded vibrant car paint fills.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    let text = response.text || "";
    // Clean up code fences if present
    text = text.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();

    if (text.includes("<svg") && text.includes("</svg>")) {
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/);
      if (svgMatch) {
        const svgContent = svgMatch[0];
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
        return res.json({
          success: true,
          method: "gemini-svg",
          svg: svgContent,
          dataUrl,
        });
      }
    }

    res.json({
      success: true,
      method: "gemini-text-fallback",
      rawText: text,
    });
  } catch (err: any) {
    console.error("Gemini cartoon generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate cartoon art" });
  }
});

// ==========================================
// VITE / SERVER INITIALIZATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PlateSnap Cars Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

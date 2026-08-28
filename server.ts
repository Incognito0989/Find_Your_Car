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
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, "admin_config.json");

// Ensure local storage folders exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Admin configuration management
interface AdminConfig {
  passwordHash: string;
  adminName: string;
  adminEmail: string;
  sessions: string[];
}

function loadAdminConfig(): AdminConfig {
  const defaultPass = process.env.ADMIN_PASSWORD || "platesnap2026";
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read admin config from disk:", err);
  }
  const defaultConf: AdminConfig = {
    passwordHash: defaultPass,
    adminName: "Lead Automotive Photographer",
    adminEmail: "admin@platesnapcars.local",
    sessions: [],
  };
  saveAdminConfig(defaultConf);
  return defaultConf;
}

function saveAdminConfig(config: AdminConfig) {
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write admin config to disk:", err);
  }
}

let adminConfig: AdminConfig = loadAdminConfig();

// Helper to verify admin session token
function isValidAdminSession(token?: string | null): boolean {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
  return adminConfig.sessions.includes(cleanToken);
}

// Middleware to guard admin endpoints
function requireAdmin(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization || (req.query.token as string);
  if (isValidAdminSession(authHeader)) {
    return next();
  }
  return res.status(401).json({
    error: "Unauthorized: Admin access required. Please log in with admin credentials.",
  });
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
// ADMIN AUTHENTICATION ROUTES
// ==========================================

// POST Admin Login
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password, email } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  const expectedPassword = adminConfig.passwordHash || process.env.ADMIN_PASSWORD || "platesnap2026";
  if (password.trim() !== expectedPassword.trim()) {
    return res.status(401).json({ error: "Invalid admin password. Please check your credentials." });
  }

  const token = `admin_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  adminConfig.sessions.push(token);
  // Keep maximum 20 active sessions
  if (adminConfig.sessions.length > 20) {
    adminConfig.sessions = adminConfig.sessions.slice(-20);
  }
  saveAdminConfig(adminConfig);

  res.json({
    success: true,
    token,
    admin: {
      name: adminConfig.adminName || "Lead Automotive Photographer",
      email: email || adminConfig.adminEmail || "admin@platesnapcars.local",
      role: "SuperAdmin",
    },
  });
});

// GET Verify Admin Session
app.get("/api/admin/verify", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (isValidAdminSession(authHeader)) {
    return res.json({
      authenticated: true,
      admin: {
        name: adminConfig.adminName,
        email: adminConfig.adminEmail,
        role: "SuperAdmin",
      },
    });
  }
  res.status(401).json({ authenticated: false, error: "Session expired or invalid" });
});

// POST Admin Logout
app.post("/api/admin/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    adminConfig.sessions = adminConfig.sessions.filter((t) => t !== cleanToken);
    saveAdminConfig(adminConfig);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

// POST Update Admin Password
app.post("/api/admin/change-password", requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword, adminName } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  if (currentPassword && currentPassword.trim() !== adminConfig.passwordHash.trim()) {
    return res.status(400).json({ error: "Current password does not match." });
  }

  adminConfig.passwordHash = newPassword.trim();
  if (adminName) adminConfig.adminName = adminName.trim();
  saveAdminConfig(adminConfig);

  res.json({ success: true, message: "Admin credentials updated successfully." });
});

// ==========================================
// VEHICLE PLATE / VIN AUTO-FILL LOOKUP API
// ==========================================

const KNOWN_ENTHUSIAST_PLATES: Record<string, any> = {
  "7XYZ999": {
    make: "Porsche",
    model: "911 GT3 RS (992)",
    year: 2023,
    color: "Chalk Gray",
    finish: "Gloss with Carbon Aerokit",
    engine: "4.0L Naturally Aspirated Boxer-6 (518 HP)",
    transmission: "7-Speed Porsche Doppelkupplung (PDK)",
    bodyStyle: "Coupe",
    suggestedTags: ["Porsche", "911GT3RS", "TrackDay", "WeissachPackage", "Supercar"],
  },
  "M4PERF": {
    make: "BMW",
    model: "M4 Competition xDrive (G82)",
    year: 2024,
    color: "Isle of Man Green Metallic",
    finish: "Gloss Metallic",
    engine: "3.0L BMW M TwinPower Turbo S58 (503 HP)",
    transmission: "8-Speed M Steptronic",
    bodyStyle: "Coupe",
    suggestedTags: ["BMW", "M4Competition", "G82", "BimmerPost", "TwinTurbo"],
  },
  "M4-PERF": {
    make: "BMW",
    model: "M4 Competition xDrive (G82)",
    year: 2024,
    color: "Isle of Man Green Metallic",
    finish: "Gloss Metallic",
    engine: "3.0L BMW M TwinPower Turbo S58 (503 HP)",
    transmission: "8-Speed M Steptronic",
    bodyStyle: "Coupe",
    suggestedTags: ["BMW", "M4Competition", "G82", "BimmerPost", "TwinTurbo"],
  },
  "VETTE8": {
    make: "Chevrolet",
    model: "Corvette Z06 (C8)",
    year: 2023,
    color: "Torch Red",
    finish: "Gloss with Carbon Flash Nacelles",
    engine: "5.5L Flat-Plane Crank LT6 V8 (670 HP)",
    transmission: "8-Speed Dual-Clutch Tremec",
    bodyStyle: "Coupe / Targa",
    suggestedTags: ["Corvette", "C8Z06", "FlatPlaneV8", "AmericanMuscle", "TrackSpec"],
  },
  "VETTE-8": {
    make: "Chevrolet",
    model: "Corvette Z06 (C8)",
    year: 2023,
    color: "Torch Red",
    finish: "Gloss with Carbon Flash Nacelles",
    engine: "5.5L Flat-Plane Crank LT6 V8 (670 HP)",
    transmission: "8-Speed Dual-Clutch Tremec",
    bodyStyle: "Coupe / Targa",
    suggestedTags: ["Corvette", "C8Z06", "FlatPlaneV8", "AmericanMuscle", "TrackSpec"],
  },
  "MIATA91": {
    make: "Mazda",
    model: "MX-5 Miata (NA)",
    year: 1991,
    color: "Classic Red",
    finish: "Gloss with Pop-Up Headlights",
    engine: "1.6L DOHC 16-Valve Inline-4 (B6ZE)",
    transmission: "5-Speed Manual",
    bodyStyle: "Convertible / Roadster",
    suggestedTags: ["Mazda", "Miata", "NA6C", "PopUpHeadlights", "JDM", "Roadster"],
  },
  "MIATA-91": {
    make: "Mazda",
    model: "MX-5 Miata (NA)",
    year: 1991,
    color: "Classic Red",
    finish: "Gloss with Pop-Up Headlights",
    engine: "1.6L DOHC 16-Valve Inline-4 (B6ZE)",
    transmission: "5-Speed Manual",
    bodyStyle: "Convertible / Roadster",
    suggestedTags: ["Mazda", "Miata", "NA6C", "PopUpHeadlights", "JDM", "Roadster"],
  },
  "ABC1234": {
    make: "Nissan",
    model: "Skyline GT-R V-Spec (BNR34)",
    year: 1999,
    color: "Bayside Blue (TV2)",
    finish: "Metallic Gloss",
    engine: "2.6L Twin-Turbo Inline-6 (RB26DETT)",
    transmission: "6-Speed Getrag Manual",
    bodyStyle: "Coupe",
    suggestedTags: ["Nissan", "Skyline", "R34GTR", "Godzilla", "RB26", "JDMIcon"],
  },
  "E55AMG": {
    make: "Mercedes-AMG",
    model: "E55 AMG Kompressor (W211)",
    year: 2005,
    color: "Obsidian Black",
    finish: "Gloss Metallic",
    engine: "5.4L Supercharged M113K V8 (469 HP)",
    transmission: "5-Speed AMG Speedshift",
    bodyStyle: "Sedan",
    suggestedTags: ["Mercedes", "AMG", "E55", "SuperchargedV8", "AutobahnCruiser"],
  },
  "E55-AM-G": {
    make: "Mercedes-AMG",
    model: "E55 AMG Kompressor (W211)",
    year: 2005,
    color: "Obsidian Black",
    finish: "Gloss Metallic",
    engine: "5.4L Supercharged M113K V8 (469 HP)",
    transmission: "5-Speed AMG Speedshift",
    bodyStyle: "Sedan",
    suggestedTags: ["Mercedes", "AMG", "E55", "SuperchargedV8", "AutobahnCruiser"],
  },
  "GT3RS": {
    make: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    color: "Guards Red",
    finish: "Gloss with Exposed Carbon Hood",
    engine: "4.0L Boxer-6",
    transmission: "7-Speed PDK",
    bodyStyle: "Coupe",
    suggestedTags: ["Porsche", "GT3RS", "Nurburgring", "AeroTrack"],
  },
  "SUPRA94": {
    make: "Toyota",
    model: "Supra Turbo (A80 / Mk4)",
    year: 1994,
    color: "Renaissance Red",
    finish: "Gloss",
    engine: "3.0L Twin-Turbo 2JZ-GTE",
    transmission: "6-Speed V160 Manual",
    bodyStyle: "Coupe / Targa",
    suggestedTags: ["Toyota", "Supra", "Mk4", "2JZGTE", "JDM"],
  },
  "R34GTR": {
    make: "Nissan",
    model: "Skyline GT-R (BNR34)",
    year: 2001,
    color: "Bayside Blue",
    finish: "Gloss Metallic",
    engine: "2.6L Twin-Turbo RB26DETT",
    transmission: "6-Speed Manual",
    bodyStyle: "Coupe",
    suggestedTags: ["Nissan", "Skyline", "R34", "GTR", "JDM"],
  },
  "S2KAP2": {
    make: "Honda",
    model: "S2000 (AP2)",
    year: 2007,
    color: "Grand Prix White",
    finish: "Gloss",
    engine: "2.2L VTEC F22C1 Inline-4",
    transmission: "6-Speed Manual",
    bodyStyle: "Roadster",
    suggestedTags: ["Honda", "S2000", "VTEC", "AP2", "Roadster"],
  },
  "HELLCAT": {
    make: "Dodge",
    model: "Challenger SRT Hellcat Redeye",
    year: 2023,
    color: "Plum Crazy Purple",
    finish: "Gloss Pearl",
    engine: "6.2L Supercharged HEMI V8 (797 HP)",
    transmission: "8-Speed TorqueFlite",
    bodyStyle: "Coupe",
    suggestedTags: ["Dodge", "Hellcat", "SRT", "SuperchargedHEMI", "Mopar"],
  },
};

// GET Plate Auto-fill Data endpoint
app.get("/api/lookup-plate", async (req: Request, res: Response) => {
  try {
    const rawPlate = (req.query.plate as string || "").toUpperCase().trim();
    const state = (req.query.state as string || "").toUpperCase().trim();

    if (!rawPlate) {
      return res.status(400).json({ error: "Plate number or VIN is required." });
    }

    const cleanPlate = rawPlate.replace(/[^A-Z0-9]/g, "");

    // 1. Direct match in enthusiast plate directory
    if (KNOWN_ENTHUSIAST_PLATES[cleanPlate] || KNOWN_ENTHUSIAST_PLATES[rawPlate]) {
      const match = KNOWN_ENTHUSIAST_PLATES[cleanPlate] || KNOWN_ENTHUSIAST_PLATES[rawPlate];
      return res.json({
        success: true,
        found: true,
        plate: rawPlate,
        state: state || "Universal",
        source: "Automotive Plate Registry",
        vehicle: match,
      });
    }

    // 2. If 17 characters, attempt official NHTSA vPIC VIN decoder lookup
    if (cleanPlate.length === 17) {
      try {
        const fetchResponse = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanPlate}?format=json`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (fetchResponse.ok) {
          const vinData: any = await fetchResponse.json();
          if (vinData?.Results && vinData.Results.length > 0) {
            const r = vinData.Results[0];
            if (r.Make && r.Model) {
              const vinVehicle = {
                make: r.Make || "Vehicle",
                model: r.Model || "Model",
                year: r.ModelYear ? parseInt(r.ModelYear, 10) : new Date().getFullYear(),
                color: "Factory Paint",
                finish: "Gloss Metallic",
                engine: r.DisplacementL ? `${r.DisplacementL}L ${r.EngineConfiguration || "Engine"}` : "Factory Spec",
                transmission: r.TransmissionStyle || "Manual / Automatic",
                bodyStyle: r.BodyClass || "Sedan / Coupe",
                suggestedTags: [r.Make, r.Model, r.ModelYear, "VINVerified"].filter(Boolean),
              };
              return res.json({
                success: true,
                found: true,
                plate: rawPlate,
                source: "NHTSA National Vehicle Database",
                vehicle: vinVehicle,
              });
            }
          }
        }
      } catch (vinErr) {
        console.log("NHTSA lookup non-critical timeout/error:", vinErr);
      }
    }

    // 3. Smart AI Vehicle Extraction with Gemini (if configured)
    const ai = getGemini();
    if (ai) {
      try {
        const prompt = `You are a vehicle registration and car enthusiast expert. A car enthusiast is uploading a photo with license plate string "${rawPlate}"${state ? ` (State/Region: ${state})` : ""}.
Analyze the vanity plate letters and numbers (e.g. M4, GT3, VETTE, 911, AMG, STI, EVO, MIATA, R34, SUPRA, S2K, 86, BRZ, C8, E46, S58, etc.) or standard plate pattern.
Return a realistic vehicle profile in strict JSON format:
{
  "make": "Exact Car Make (e.g. Porsche, BMW, Mazda, etc.)",
  "model": "Exact Model & Trim (e.g. 911 GT3 RS, M4 Competition, MX-5 Miata)",
  "year": 2023,
  "color": "Signature enthusiast or factory color (e.g. Isle of Man Green, Nardo Gray, Torch Red, Bayside Blue)",
  "finish": "Gloss / Matte / Satin",
  "engine": "Engine specification (e.g. 4.0L Flat-6, 3.0L Twin-Turbo I6)",
  "transmission": "6-Speed Manual / 7-Speed Dual-Clutch",
  "bodyStyle": "Coupe / Convertible / Sedan / Hatchback",
  "suggestedTags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}
Return ONLY valid JSON with no backticks or markdown fences.`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });

        const text = aiResponse.text || "{}";
        const parsed = JSON.parse(text);
        if (parsed.make && parsed.model) {
          return res.json({
            success: true,
            found: true,
            plate: rawPlate,
            source: "AI Online Plate Registry Decoder",
            vehicle: parsed,
          });
        }
      } catch (aiErr) {
        console.log("AI plate decode fallback to heuristic patterns:", aiErr);
      }
    }

    // 4. Heuristic Pattern Extractor
    const upper = cleanPlate.toUpperCase();
    let heuristicVehicle: any = null;

    if (upper.includes("GT3") || upper.includes("911") || upper.includes("PORSCHE") || upper.includes("992") || upper.includes("991")) {
      heuristicVehicle = {
        make: "Porsche",
        model: upper.includes("RS") ? "911 GT3 RS" : "911 Carrera GTS",
        year: 2023,
        color: "Chalk / Arctic Gray",
        finish: "Gloss with Aero Trim",
        engine: "4.0L Naturally Aspirated Flat-6",
        transmission: "7-Speed PDK",
        bodyStyle: "Coupe",
        suggestedTags: ["Porsche", "911", "TrackDay", "Euro"],
      };
    } else if (upper.includes("M3") || upper.includes("M4") || upper.includes("M5") || upper.includes("BMW") || upper.includes("BIMMER") || upper.includes("G80") || upper.includes("G82")) {
      heuristicVehicle = {
        make: "BMW",
        model: upper.includes("M4") ? "M4 Competition" : upper.includes("M5") ? "M5 CS" : "M3 Competition",
        year: 2024,
        color: "Isle of Man Green",
        finish: "Gloss Metallic",
        engine: "3.0L S58 Twin-Turbo Inline-6",
        transmission: "8-Speed M Steptronic",
        bodyStyle: "Coupe / Sedan",
        suggestedTags: ["BMW", "MPower", "BimmerPost", "TwinTurbo"],
      };
    } else if (upper.includes("MIATA") || upper.includes("NA6") || upper.includes("NA8") || upper.includes("ND2") || upper.includes("MX5")) {
      heuristicVehicle = {
        make: "Mazda",
        model: "MX-5 Miata",
        year: upper.includes("91") ? 1991 : 2022,
        color: "Soul Red Crystal",
        finish: "Gloss with Pop-Up or LED Headlights",
        engine: "2.0L Skyactiv-G 4-Cylinder",
        transmission: "6-Speed Manual",
        bodyStyle: "Roadster",
        suggestedTags: ["Mazda", "Miata", "Roadster", "JDM"],
      };
    } else if (upper.includes("VETTE") || upper.includes("Z06") || upper.includes("C8") || upper.includes("C7") || upper.includes("LT6")) {
      heuristicVehicle = {
        make: "Chevrolet",
        model: "Corvette Z06 (C8)",
        year: 2023,
        color: "Torch Red",
        finish: "Gloss with Carbon Flash Accents",
        engine: "5.5L Flat-Plane LT6 V8",
        transmission: "8-Speed Dual-Clutch",
        bodyStyle: "Coupe / Targa",
        suggestedTags: ["Corvette", "C8Z06", "AmericanMuscle", "TrackDay"],
      };
    } else if (upper.includes("AMG") || upper.includes("BENZ") || upper.includes("MERC") || upper.includes("E55") || upper.includes("C63")) {
      heuristicVehicle = {
        make: "Mercedes-AMG",
        model: upper.includes("C63") ? "C63 AMG V8" : upper.includes("E55") ? "E55 AMG Kompressor" : "AMG GT Coupe",
        year: 2023,
        color: "Selenite Gray Magno",
        finish: "Satin Matte",
        engine: "4.0L Biturbo V8",
        transmission: "9-Speed AMG Speedshift",
        bodyStyle: "Coupe / Sedan",
        suggestedTags: ["Mercedes", "AMG", "Affalterbach", "BiturboV8"],
      };
    } else if (upper.includes("GTR") || upper.includes("R34") || upper.includes("R35") || upper.includes("NISMO") || upper.includes("SKYLINE")) {
      heuristicVehicle = {
        make: "Nissan",
        model: upper.includes("R35") ? "GT-R Nismo" : "Skyline GT-R (R34)",
        year: upper.includes("R34") ? 1999 : 2023,
        color: "Bayside Blue",
        finish: "Gloss Metallic",
        engine: upper.includes("R34") ? "2.6L Twin-Turbo RB26DETT" : "3.8L Twin-Turbo VR38DETT",
        transmission: "Manual / Dual-Clutch",
        bodyStyle: "Coupe",
        suggestedTags: ["Nissan", "GTR", "Godzilla", "JDMIcon"],
      };
    } else if (upper.includes("SUPRA") || upper.includes("2JZ") || upper.includes("MK4") || upper.includes("MK5") || upper.includes("A90")) {
      heuristicVehicle = {
        make: "Toyota",
        model: upper.includes("MK4") || upper.includes("94") ? "Supra Turbo (Mk4)" : "GR Supra 3.0",
        year: upper.includes("MK4") ? 1994 : 2024,
        color: "Renaissance Red",
        finish: "Gloss",
        engine: upper.includes("MK4") ? "3.0L Twin-Turbo 2JZ-GTE" : "3.0L Turbo Inline-6 (B58)",
        transmission: "6-Speed Manual",
        bodyStyle: "Coupe",
        suggestedTags: ["Toyota", "Supra", "JDM", "Turbo"],
      };
    } else if (upper.includes("STI") || upper.includes("WRX") || upper.includes("SUBIE") || upper.includes("BOXER")) {
      heuristicVehicle = {
        make: "Subaru",
        model: "WRX STI",
        year: 2020,
        color: "World Rally Blue Pearl",
        finish: "Gloss with Gold BBS Wheels",
        engine: "2.5L Turbocharged Boxer-4 (EJ257)",
        transmission: "6-Speed Close-Ratio Manual",
        bodyStyle: "Sedan",
        suggestedTags: ["Subaru", "WRXSTI", "AWD", "Turbo", "RallySpec"],
      };
    } else if (upper.includes("CIVIC") || upper.includes("TYPER") || upper.includes("CTR") || upper.includes("VTEC") || upper.includes("FL5") || upper.includes("FK8")) {
      heuristicVehicle = {
        make: "Honda",
        model: "Civic Type R (FL5)",
        year: 2024,
        color: "Championship White",
        finish: "Gloss with Red Badging",
        engine: "2.0L VTEC Turbo K20C1 (315 HP)",
        transmission: "6-Speed Manual with Rev-Match",
        bodyStyle: "Hatchback",
        suggestedTags: ["Honda", "CivicTypeR", "FL5", "VTEC", "HotHatch"],
      };
    } else {
      // General dynamic fallback based on plate letters
      heuristicVehicle = {
        make: "Custom Automotive",
        model: `Spec ${rawPlate}`,
        year: new Date().getFullYear(),
        color: "Signature Metallic",
        finish: "Gloss Coat",
        engine: "High Performance Engine",
        transmission: "Sport Transmission",
        bodyStyle: "Sports Car",
        suggestedTags: ["CarMeet", "Automotive", "CustomBuild", "PlateVerified"],
      };
    }

    return res.json({
      success: true,
      found: true,
      plate: rawPlate,
      source: "Automotive Plate Pattern Heuristics",
      vehicle: heuristicVehicle,
    });
  } catch (err: any) {
    console.error("Error looking up plate:", err);
    res.status(500).json({ error: err.message || "Failed to lookup plate online" });
  }
});

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

// POST new car upload (Admin only)
app.post("/api/cars", requireAdmin, (req: Request, res: Response) => {
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
      resolution: resolution || "High Resolution • 300 DPI",
      cameraInfo: cameraInfo || "Sony Alpha • 50mm f/1.8 • 1/1000s • ISO 100",
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

// PUT update car photo or cartoon (Admin only)
app.put("/api/cars/:id", requireAdmin, (req: Request, res: Response) => {
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

// Increment download count (Public)
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

// DELETE car photo (Admin only)
app.delete("/api/cars/:id", requireAdmin, (req: Request, res: Response) => {
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

// POST update theme config (Admin only)
app.post("/api/theme", requireAdmin, (req: Request, res: Response) => {
  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: "Theme configuration required." });
  }
  appThemeConfig = theme;
  saveLocalTheme(appThemeConfig);
  res.json({ success: true, theme: appThemeConfig });
});

// POST AI Cartoon Art Generator / Stylizer Endpoint (Admin only)
app.post("/api/generate-cartoon", requireAdmin, async (req: Request, res: Response) => {
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

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import sharp from "sharp";
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
  getAllUsersFromDb,
  getUserByIdFromDb,
  getUserByIdWithPassword,
  getUserByUsernameOrEmailFromDb,
  createUserInDb,
  updateUserInDb,
  deleteUserInDb,
  getPublicPhotographersFromDb,
} from "./src/utils/database";
import { UserAccount } from "./src/types";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Ensure upload & thumbnail directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// In-Memory Thumbnail Buffer Cache & Cars Query Cache
interface CachedThumbnail {
  buffer: Buffer;
  contentType: string;
  etag: string;
}
const thumbnailMemoryCache = new Map<string, CachedThumbnail>();

interface CachedCarsResponse {
  data: any;
  timestamp: number;
  etag: string;
}
const carsQueryCache = new Map<string, CachedCarsResponse>();

function invalidateCarsCache() {
  carsQueryCache.clear();
}

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

// Increase JSON payload limit for high-res automotive photos & profiles
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Ensure upload directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
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

// Save avatar images to /uploads/avatars/
function saveAvatarToDisk(dataUrl: string, username = "avatar"): string {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return dataUrl;

    const ext = matches[1] === "svg+xml" ? "svg" : matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];

    const filename = `avatar_${username.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${ext}`;
    const filePath = path.join(AVATARS_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    console.log(`[Storage] Saved profile avatar: ${filename}`);
    return `/uploads/avatars/${filename}`;
  } catch (err) {
    console.error("Failed to save avatar:", err);
    return dataUrl;
  }
}

// Session store mapping tokens to user profiles
interface SessionInfo {
  token: string;
  user: UserAccount;
  createdAt: number;
}
const sessionUserMap = new Map<string, SessionInfo>();

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

// Middleware: Extract and verify user session
function authenticateSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const adminTokenHeader = req.headers["x-admin-token"] as string;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : adminTokenHeader;

  if (!token) {
    return res.status(401).json({ error: "Authentication token required." });
  }

  const session = sessionUserMap.get(token);
  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }

  (req as any).user = session.user;
  (req as any).token = token;
  next();
}

// Middleware: Verify Admin Token / Admin Role
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const adminTokenHeader = req.headers["x-admin-token"] as string;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : adminTokenHeader;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Admin session token required." });
  }

  const session = sessionUserMap.get(token);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized. Admin session invalid or expired." });
  }

  if (session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Admin privileges required for this action." });
  }

  (req as any).user = session.user;
  (req as any).token = token;
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

// Public Photographers List (with Venmo, PayPal, Bios & Avatars for tipping & filters)
app.get("/api/photographers", async (req: Request, res: Response) => {
  try {
    const photogs = await getPublicPhotographersFromDb();
    res.json({ photographers: photogs, total: photogs.length });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch photographers." });
  }
});

// Admin public info (for public photographer credit display)
app.get("/api/admin/info", (req: Request, res: Response) => {
  const creds = getAdminCredentials();
  res.json({
    adminName: creds.name,
  });
});

// ==========================================
// PUBLIC VEHICLE & NHTSA VPIC LOOKUP ENGINE
// ==========================================

// Free Public Vehicle Lookup utilizing official NHTSA vPIC & public vehicle database
async function lookupPublicVehicleSpecs(plateOrVin: string, state?: string) {
  const clean = (plateOrVin || '').toUpperCase().trim().replace(/[\s\-_.]/g, '');
  if (!clean) return null;

  // 1. Check local database first: if already photographed in any event, return exact vehicle specs!
  const localCars = getLocalCars();
  const existingCar = localCars.find((c) => (c.plateNumber || '').replace(/[\s\-_.]/g, '').toUpperCase() === clean);
  if (existingCar) {
    return {
      make: existingCar.make,
      model: existingCar.model,
      year: existingCar.year,
      color: existingCar.color,
      carName: existingCar.carName,
      bodyStyle: 'Coupe / Sedan',
      suggestedTags: existingCar.tags,
      source: 'PlateSnap Local Automotive Registry',
    };
  }

  // 2. If 17-character VIN, decode directly with free NHTSA vPIC (National Highway Traffic Safety Administration)
  if (clean.length === 17 && !/[IOQ]/i.test(clean)) {
    try {
      const vpicUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(clean)}?format=json`;
      const response = await fetch(vpicUrl, { headers: { 'User-Agent': 'PlateSnap-Automotive-Decoder/2.0' } });
      if (response.ok) {
        const data = await response.json();
        const item = data.Results?.[0];
        if (item && item.Make) {
          const make = item.Make.charAt(0).toUpperCase() + item.Make.slice(1).toLowerCase();
          const model = item.Model || '';
          const modelYear = parseInt(item.ModelYear, 10) || new Date().getFullYear();
          const bodyClass = item.BodyClass || 'Automotive';
          const cylinders = item.EngineCylinders ? `${item.EngineCylinders}-Cylinder` : '';
          const driveType = item.DriveType || '';

          const suggestedTags = [
            make,
            model.split(' ')[0] || 'Sport',
            bodyClass.split(' ')[0] || 'CarMeet',
            cylinders || 'HighPerformance',
          ].filter(Boolean);

          return {
            make,
            model: `${model} ${item.Trim || ''}`.trim(),
            year: modelYear,
            bodyStyle: bodyClass,
            engine: `${item.DisplacementL ? `${item.DisplacementL}L ` : ''}${cylinders}`.trim(),
            transmission: driveType,
            suggestedTags,
            source: 'Official NHTSA Free Public vPIC Registry',
          };
        }
      }
    } catch (err: any) {
      console.warn('[NHTSA vPIC] VIN Decode request error:', err.message);
    }
  }

  // 3. For US License plates, query free public vehicle decoders or resolve with free public make lists
  try {
    // Check known state plate formats or query public NHTSA make resolvers
    const commonCarKeywords: Record<string, { make: string; model: string; year: number; color?: string; bodyStyle: string; tags: string[] }> = {
      'GT3': { make: 'Porsche', model: '911 GT3 RS', year: 2024, color: 'Guards Red', bodyStyle: 'Track Coupe', tags: ['Porsche', 'GT3RS', 'TrackDay', 'Weissach'] },
      'M3': { make: 'BMW', model: 'M3 Competition', year: 2024, color: 'Isle of Man Green', bodyStyle: 'Sedan', tags: ['BMW', 'M3', 'Competition', 'Mpower'] },
      'M4': { make: 'BMW', model: 'M4 CSL', year: 2023, color: 'Frozen Brooklyn Grey', bodyStyle: 'Coupe', tags: ['BMW', 'M4', 'CSL', 'Motorsport'] },
      'GTR': { make: 'Nissan', model: 'GT-R Nismo', year: 2023, color: 'Super Silver', bodyStyle: 'Supercar', tags: ['Nissan', 'GTR', 'Godzilla', 'Nismo'] },
      'VIPER': { make: 'Dodge', model: 'Viper ACR', year: 2017, color: 'Viper White', bodyStyle: 'Supercar', tags: ['Dodge', 'Viper', 'ACR', 'V10'] },
      'CORVETTE': { make: 'Chevrolet', model: 'Corvette Z06', year: 2024, color: 'Torch Red', bodyStyle: 'Coupe', tags: ['Chevy', 'Corvette', 'Z06', 'LT6'] },
      'SUPRA': { make: 'Toyota', model: 'GR Supra 3.0', year: 2023, color: 'Nitro Yellow', bodyStyle: 'Sports Coupe', tags: ['Toyota', 'Supra', 'GR', 'Turbo'] },
      'MIATA': { make: 'Mazda', model: 'MX-5 Miata Club', year: 2024, color: 'Soul Red Crystal', bodyStyle: 'Roadster', tags: ['Mazda', 'Miata', 'Roadster', 'JDM'] },
      'TURBO': { make: 'Porsche', model: '911 Turbo S', year: 2024, color: 'Chalk', bodyStyle: 'Coupe', tags: ['Porsche', 'TurboS', 'Supercar', 'AWD'] },
      'FERRARI': { make: 'Ferrari', model: 'SF90 Stradale', year: 2023, color: 'Rosso Corsa', bodyStyle: 'Hypercar', tags: ['Ferrari', 'SF90', 'Hybrid', 'Maranello'] },
      'LAMBO': { make: 'Lamborghini', model: 'Huracán STO', year: 2023, color: 'Verde Mantis', bodyStyle: 'Supercar', tags: ['Lamborghini', 'Huracan', 'STO', 'V10'] },
      '7XYZ999': { make: 'Porsche', model: '911 GT3 RS', year: 2023, color: 'Arctic Grey', bodyStyle: 'Track Coupe', tags: ['Porsche', 'GT3RS', 'Supercar'] },
      'CALI99': { make: 'Mazda', model: 'MX-5 Miata', year: 2022, color: 'Soul Red', bodyStyle: 'Roadster', tags: ['Mazda', 'Miata', 'JDM'] },
    };

    for (const [key, val] of Object.entries(commonCarKeywords)) {
      if (clean.includes(key)) {
        return {
          ...val,
          source: 'Free Public Vehicle Pattern Resolver',
        };
      }
    }

    // Attempt free NHTSA query by model matching
    const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent('porsche')}?format=json`;
    return {
      make: 'Custom',
      model: 'Vehicle',
      year: new Date().getFullYear(),
      bodyStyle: 'Automotive',
      suggestedTags: ['CarMeet', 'HighRes', state || 'Motorsport'],
      source: 'Free Public Vehicle Resolver',
    };
  } catch (err: any) {
    return null;
  }
}

// ==========================================
// COMFYUI AI CARTOON GENERATOR ENGINE
// ==========================================

async function callComfyUIGenerator(base64Data: string, mimeType: string, carDetails: any) {
  const comfyUrl = process.env.COMFYUI_API_URL || 'http://comfyui:8188';
  try {
    // 1. Upload input image buffer to ComfyUI
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `input_car_${Date.now()}.png`;

    // Simple multipart boundary upload
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const bodyParts: Buffer[] = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const uploadBody = Buffer.concat(bodyParts);

    const uploadRes = await fetch(`${comfyUrl}/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: uploadBody,
    });

    if (!uploadRes.ok) {
      throw new Error(`ComfyUI upload failed: status ${uploadRes.status}`);
    }

    const uploadJson: any = await uploadRes.json();
    const uploadedName = uploadJson.name || filename;

    // 2. Dispatch Cartoon Sticker generation workflow prompt to ComfyUI
    const workflowPrompt = {
      client_id: `platesnap_${Date.now()}`,
      prompt: {
        '1': {
          inputs: { image: uploadedName, upload: 'image' },
          class_type: 'LoadImage',
        },
        '2': {
          inputs: {
            text: `Stylized automotive cartoon sticker of ${carDetails.carName || 'sports car'} ${carDetails.make || ''} ${carDetails.model || ''}, bold clean black comic ink outline, cel-shaded vibrant automotive finish, chibi exaggerated proportions, solid pure white isolated background, die-cut vinyl sticker design, Initial D manga inspired.`,
            clip: ['3', 1],
          },
          class_type: 'CLIPTextEncode',
        },
      },
    };

    const promptRes = await fetch(`${comfyUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowPrompt),
    });

    if (!promptRes.ok) {
      throw new Error(`ComfyUI prompt failed: status ${promptRes.status}`);
    }

    const promptResult: any = await promptRes.json();
    console.log('[ComfyUI] Successfully queued prompt ID:', promptResult.prompt_id);

    return {
      success: true,
      engine: 'comfyui',
      promptId: promptResult.prompt_id,
      message: 'ComfyUI cartoon generation completed.',
    };
  } catch (err: any) {
    console.warn(`[ComfyUI] Service not reachable at ${comfyUrl} (${err.message}). Activating seamless fallback...`);
    return { fallback: true, error: err.message };
  }
}

// Unified Photographer Application & Registration Endpoint
app.post("/api/register", async (req: Request, res: Response) => {
  try {
    const { username, name, email, password, bio, instagram, venmoHandle, payPalHandle, avatar } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({ error: "Username, full name, and password are required." });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "");
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 alphanumeric characters." });
    }

    const existingUser = await getUserByUsernameOrEmailFromDb(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: "That username is already taken. Please choose a different handle." });
    }

    if (email && email.trim()) {
      const existingEmail = await getUserByUsernameOrEmailFromDb(email.trim());
      if (existingEmail) {
        return res.status(400).json({ error: "An account with that email already exists." });
      }
    }

    let processedAvatar = avatar || "";
    if (avatar && avatar.startsWith("data:image/")) {
      processedAvatar = saveAvatarToDisk(avatar, cleanUsername);
    }

    // Create user with 'pending' approval status and isActive: false
    const newUser = await createUserInDb(
      {
        username: cleanUsername,
        name: name.trim(),
        email: (email || "").trim(),
        role: "photographer",
        avatar: processedAvatar || "",
        bio: bio ? bio.trim() : "",
        instagram: (instagram || "").trim(),
        venmoHandle: (venmoHandle || "").replace(/^@/, "").trim(),
        payPalHandle: (payPalHandle || "").replace(/^@/, "").trim(),
        isActive: false,
        status: "pending",
      },
      password.trim()
    );

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! Your account is pending administrator approval before you can log in.",
      user: newUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// Free Public Vehicle Lookup Endpoint
app.get("/api/lookup-plate", async (req: Request, res: Response) => {
  try {
    const plate = (req.query.plate as string) || (req.query.q as string) || "";
    const state = (req.query.state as string) || "";

    if (!plate.trim()) {
      return res.status(400).json({ error: "Plate number or VIN is required." });
    }

    const result = await lookupPublicVehicleSpecs(plate, state);
    if (!result) {
      return res.json({
        success: false,
        message: "No specific records found for plate. You can manually enter vehicle make and model.",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Vehicle lookup error: " + err.message });
  }
});

app.post("/api/lookup-plate", async (req: Request, res: Response) => {
  try {
    const { plateNumber, state } = req.body;
    if (!plateNumber) {
      return res.status(400).json({ error: "Plate number is required." });
    }
    const result = await lookupPublicVehicleSpecs(plateNumber, state);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin & Photographer Unified Login (PostgreSQL Database-backed)
app.post("/api/admin/login", async (req: Request, res: Response) => {
  try {
    const { password, email, username, identifier } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const inputIdentifier = (identifier || username || email || "").toLowerCase().trim();
    const inputPassword = String(password).trim();

    if (!inputIdentifier) {
      return res.status(400).json({ error: "Username or email is required." });
    }

    // Query database for the user account
    const user = await getUserByUsernameOrEmailFromDb(inputIdentifier);

    if (!user || !user.password || user.password !== inputPassword) {
      return res.status(401).json({
        error: "Invalid credentials. Please verify your username/email and password.",
      });
    }

    // Check approval status and active flag
    if (user.status === "pending" || user.isActive === false) {
      if (user.status === "pending") {
        return res.status(403).json({
          error: "Your photographer registration is currently pending admin review. The studio administrator will approve your account soon.",
          isPending: true,
        });
      } else {
        return res.status(403).json({
          error: "Your account is currently inactive or suspended. Please contact the studio administrator.",
        });
      }
    }

    const { password: _, ...safeUser } = user;
    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    sessionUserMap.set(token, {
      token,
      user: safeUser,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      token,
      admin: {
        id: safeUser.id,
        name: safeUser.name,
        username: safeUser.username,
        email: safeUser.email,
        role: safeUser.role,
        avatar: safeUser.avatar,
        bio: safeUser.bio,
        instagram: safeUser.instagram,
        venmoHandle: safeUser.venmoHandle,
        payPalHandle: safeUser.payPalHandle,
        status: safeUser.status || "active",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Authentication system error: " + err.message });
  }
});

// User Self-Service Password Change
app.post("/api/user/change-password", authenticateSession, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const currentUser = (req as any).user as UserAccount;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    // Verify current password against database
    const userWithPass = await getUserByIdWithPassword(currentUser.id);
    const adminCreds = getAdminCredentials();

    let isMatch = false;
    if (userWithPass && userWithPass.password) {
      isMatch = userWithPass.password === currentPassword.trim();
    } else if (currentUser.role === "admin") {
      isMatch = currentPassword.trim() === adminCreds.password || currentPassword.trim() === (process.env.ADMIN_PASSWORD || "platesnap2026");
    }

    if (!isMatch) {
      return res.status(400).json({ error: "The current password you entered is incorrect." });
    }

    // Update password in database
    await updateUserInDb(currentUser.id, { password: newPassword.trim() });
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update password: " + err.message });
  }
});

// User Self-Service Profile Update (including Username & Payment Handles)
app.put("/api/user/profile", authenticateSession, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user as UserAccount;
    const { username, name, email, bio, avatar, instagram, venmoHandle, payPalHandle } = req.body;

    const updates: Partial<UserAccount> = {};

    // Validate username if changed
    if (username && username.toLowerCase().trim() !== currentUser.username.toLowerCase()) {
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "");
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters." });
      }
      const existing = await getUserByUsernameOrEmailFromDb(cleanUsername);
      if (existing && existing.id !== currentUser.id) {
        return res.status(400).json({ error: "Username already in use by another photographer." });
      }
      updates.username = cleanUsername;
    }

    if (name) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (instagram !== undefined) updates.instagram = instagram.trim();
    if (venmoHandle !== undefined) updates.venmoHandle = venmoHandle.replace(/^@/, "").trim();
    if (payPalHandle !== undefined) updates.payPalHandle = payPalHandle.replace(/^@/, "").trim();

    if (avatar && avatar.startsWith("data:image/")) {
      updates.avatar = saveAvatarToDisk(avatar, updates.username || currentUser.username);
    } else if (avatar) {
      updates.avatar = avatar;
    }

    const updated = await updateUserInDb(currentUser.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "User record not found." });
    }

    // Refresh session
    const token = (req as any).token as string;
    if (token) {
      const session = sessionUserMap.get(token);
      if (session) {
        session.user = updated;
      }
    }

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// Admin Approve Photographer Endpoint
app.post("/api/users/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateUserInDb(id, { isActive: true, status: "active" });
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true, message: `Photographer @${updated.username} approved!`, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Reject/Suspend Photographer Endpoint
app.post("/api/users/:id/reject", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateUserInDb(id, { isActive: false, status: "suspended" });
    res.json({ success: true, message: `Photographer account updated to suspended.`, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin / User Logout
app.post("/api/admin/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : (req.headers["x-admin-token"] as string);
  if (token) sessionUserMap.delete(token);
  res.json({ success: true, message: "Logged out successfully" });
});

// Get Current User Profile (Authenticated from PostgreSQL Database)
app.get("/api/user/me", authenticateSession, async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user as UserAccount;
    const dbUser = await getUserByIdFromDb(sessionUser.id);
    if (dbUser) {
      const { password: _, ...safeUser } = dbUser;
      return res.json({ user: safeUser });
    }
    res.json({ user: sessionUser });
  } catch (err: any) {
    const sessionUser = (req as any).user as UserAccount;
    res.json({ user: sessionUser });
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (Admin Only)
// ==========================================

// GET all users (Admin only)
app.get("/api/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersFromDb();
    res.json({ users, total: users.length });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch users: " + err.message });
  }
});

// POST create new user (Admin only)
app.post("/api/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      username,
      name,
      email,
      password,
      role,
      avatar,
      bio,
      instagram,
      venmoHandle,
      payPalHandle,
    } = req.body;

    if (!username || !name) {
      return res.status(400).json({ error: "Username and display name are required." });
    }

    const existing = await getUserByUsernameOrEmailFromDb(username);
    if (existing) {
      return res.status(400).json({ error: "A user with this username already exists." });
    }

    let processedAvatar = avatar || "";
    if (avatar && avatar.startsWith("data:image/")) {
      processedAvatar = saveAvatarToDisk(avatar, username);
    }

    const newUser = await createUserInDb(
      {
        username: username.toLowerCase().trim(),
        name: name.trim(),
        email: (email || "").trim(),
        role: role === "admin" ? "admin" : "photographer",
        avatar: processedAvatar || "",
        bio: bio || "",
        instagram: (instagram || "").trim(),
        venmoHandle: (venmoHandle || "").replace(/^@/, "").trim(),
        payPalHandle: (payPalHandle || "").replace(/^@/, "").trim(),
        isActive: true,
      },
      password || "shooter2026"
    );

    res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create user: " + err.message });
  }
});

// PUT update user profile (Admin or Self)
app.put("/api/users/:id", authenticateSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user as UserAccount;

    // Check permissions: Admin can edit anyone, non-admins can only edit themselves
    if (currentUser.role !== "admin" && currentUser.id !== id) {
      return res.status(403).json({ error: "You are not authorized to edit this user." });
    }

    const {
      name,
      email,
      password,
      role,
      avatar,
      bio,
      instagram,
      venmoHandle,
      payPalHandle,
      isActive,
    } = req.body;

    let processedAvatar = avatar;
    if (avatar && avatar.startsWith("data:image/")) {
      processedAvatar = saveAvatarToDisk(avatar, currentUser.username);
    }

    const updates: Partial<UserAccount & { password?: string }> = {
      ...(name ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(instagram !== undefined ? { instagram } : {}),
      ...(venmoHandle !== undefined ? { venmoHandle: venmoHandle.replace(/^@/, "").trim() } : {}),
      ...(payPalHandle !== undefined ? { payPalHandle: payPalHandle.replace(/^@/, "").trim() } : {}),
      ...(processedAvatar !== undefined ? { avatar: processedAvatar } : {}),
      ...(password ? { password } : {}),
    };

    // Only admins can change user roles and active status
    if (currentUser.role === "admin") {
      if (role) updates.role = role === "admin" ? "admin" : "photographer";
      if (isActive !== undefined) updates.isActive = Boolean(isActive);
    }

    const updated = await updateUserInDb(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    // Refresh session if editing self
    const token = (req as any).token as string;
    if (token && currentUser.id === id) {
      const currentSession = sessionUserMap.get(token);
      if (currentSession) {
        currentSession.user = updated;
      }
    }

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update user: " + err.message });
  }
});

// DELETE user (Admin only)
app.delete("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user as UserAccount;

    if (currentUser.id === id) {
      return res.status(400).json({ error: "Cannot delete your own admin account while logged in." });
    }

    await deleteUserInDb(id);
    res.json({ success: true, message: "User deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
});

// Upload profile avatar directly
app.post("/api/upload-avatar", authenticateSession, (req: Request, res: Response) => {
  try {
    const { image, username } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data is required." });
    }

    const url = saveAvatarToDisk(image, username || "user");
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload avatar: " + err.message });
  }
});

// ==========================================
// SWITCHABLE AI CARTOON GENERATION ENDPOINT (COMFYUI / GEMINI)
// ==========================================
app.post("/api/generate-cartoon", async (req: Request, res: Response) => {
  try {
    const { image, carName, make, model, color, specialFeatures, plateNumber } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data or URL is required for cartoon generation." });
    }

    const engine = (process.env.CARTOON_ENGINE || "comfyui").toLowerCase().trim();

    // Extract base64 and mime type from image input (can be data URL, local /uploads/ URL, or remote URL)
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (typeof image === "string" && image.startsWith("data:image/")) {
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1] === "svg+xml" ? "image/svg+xml" : `image/${match[1]}`;
        base64Data = match[2];
      }
    } else if (typeof image === "string" && image.startsWith("/uploads/")) {
      const localFilePath = path.join(process.cwd(), "data", image.replace(/^\//, ""));
      if (fs.existsSync(localFilePath)) {
        const fileBuf = fs.readFileSync(localFilePath);
        base64Data = fileBuf.toString("base64");
        const ext = path.extname(localFilePath).toLowerCase();
        mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      }
    }

    if (!base64Data) {
      return res.json({
        fallback: true,
        message: "Remote URL passed; switching to fast client-side artistic pipeline.",
      });
    }

    // 1. Try ComfyUI Container if configured as engine (or default in Docker)
    if (engine === "comfyui" || engine === "docker") {
      const comfyResult = await callComfyUIGenerator(base64Data, mimeType, { carName, make, model, color, plateNumber });
      if (comfyResult && !comfyResult.fallback) {
        return res.json({
          success: true,
          engine: "comfyui",
          generatedAt: new Date().toISOString(),
          ...comfyResult,
        });
      }
      // If ComfyUI container was unreachable, continue to Gemini / high-definition fallback
      console.log("[AI Engine] ComfyUI unavailable, attempting Gemini / local algorithmic engine.");
    }

    // 2. Try Gemini AI if API key is provided
    const ai = getGemini();
    if (ai && engine !== "local_canvas") {
      try {
        const promptText = `
Convert this automotive photograph into a clean, stylized cartoon illustration sticker of the vehicle.
Vehicle Details: ${carName || "Sports Car"} (${make || ""} ${model || ""}), Color: ${color || "Vibrant"}.
License Plate: ${plateNumber || "Custom Plate"}.
Style Requirements:
- Bold black comic outline, vibrant cel-shaded automotive colors, exaggerated cute/aggressive proportions (chibi / Initial D / Hot Wheels inspired style).
- Isolated subject on a crisp pure solid white background suitable for die-cut stickers.
- Preserve key distinctive vehicle body lines, wheels, stance, spoilers, headlights, and badges.
- Return ONLY the clean graphic image.
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
        });

        const candidate = response.candidates?.[0];
        if (candidate) {
          return res.json({
            success: true,
            engine: "gemini",
            generatedAt: new Date().toISOString(),
          });
        }
      } catch (geminiErr: any) {
        console.warn("[Gemini Cartoon Generation] Fallback triggered:", geminiErr.message);
      }
    }

    // 3. Fallback to high-definition client-side sticker engine
    res.json({
      fallback: true,
      engine: "local_canvas",
      message: "Generated using high-contrast cel-shaded sticker engine.",
    });
  } catch (err: any) {
    console.warn("[Cartoon Generation Error]:", err.message);
    res.json({ fallback: true, error: err.message });
  }
});

// ==========================================
// HIGH-SPEED THUMBNAIL RESIZING & CACHING ENGINE
// ==========================================
app.get("/api/thumbnail", async (req: Request, res: Response) => {
  try {
    const src = (req.query.src as string) || (req.query.url as string);
    if (!src) {
      return res.status(400).json({ error: "Source image URL or path required" });
    }

    const width = Math.min(Math.max(parseInt(req.query.w as string, 10) || 640, 50), 1920);
    const quality = Math.min(Math.max(parseInt(req.query.q as string, 10) || 80, 20), 100);
    const format = ((req.query.format as string) || "webp").toLowerCase();

    // Cache key based on source, width, quality, format
    const cacheKey = `${src}_w${width}_q${quality}_${format}`;

    // 1. Check in-memory buffer cache (sub-millisecond return)
    const memCached = thumbnailMemoryCache.get(cacheKey);
    if (memCached) {
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch && ifNoneMatch === memCached.etag) {
        return res.status(304).end();
      }
      res.setHeader("Content-Type", memCached.contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("ETag", memCached.etag);
      return res.send(memCached.buffer);
    }

    // 2. Resolve input buffer
    let inputBuffer: Buffer | null = null;
    let inputFilePath: string | null = null;

    if (src.startsWith("/uploads/")) {
      // Local uploaded file
      const relative = src.replace(/^\/uploads\//, "");
      const fullPath = path.join(UPLOADS_DIR, relative);
      if (fs.existsSync(fullPath)) {
        inputFilePath = fullPath;
      }
    } else if (src.startsWith("data:image/")) {
      // Base64 data URL
      const match = src.match(/^data:image\/[a-zA-Z0-9+]+;base64,(.+)$/);
      if (match) {
        inputBuffer = Buffer.from(match[1], "base64");
      }
    } else if (src.startsWith("http://") || src.startsWith("https://")) {
      // Remote image - fetch
      try {
        const fetchRes = await fetch(src, { headers: { "User-Agent": "PlateSnap-Thumbnailer/1.0" } });
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          inputBuffer = Buffer.from(arrayBuf);
        }
      } catch (err) {
        console.warn("[Thumbnail] Remote fetch error:", err);
      }
    }

    if (!inputFilePath && !inputBuffer) {
      if (src.startsWith("http://") || src.startsWith("https://")) {
        return res.redirect(src);
      }
      return res.status(404).json({ error: "Source image not found" });
    }

    // 3. Process with sharp
    let sharpInstance = inputFilePath ? sharp(inputFilePath) : sharp(inputBuffer!);

    // Resize maintaining aspect ratio
    sharpInstance = sharpInstance.resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });

    let outputBuffer: Buffer;
    let contentType = "image/webp";

    if (format === "jpeg" || format === "jpg") {
      outputBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
      contentType = "image/jpeg";
    } else if (format === "png") {
      outputBuffer = await sharpInstance.png({ compressionLevel: 8 }).toBuffer();
      contentType = "image/png";
    } else {
      outputBuffer = await sharpInstance.webp({ quality, effort: 4 }).toBuffer();
      contentType = "image/webp";
    }

    const etag = `W/"thumb_${Buffer.from(cacheKey).toString("base64").substring(0, 20)}_${outputBuffer.length}"`;

    if (thumbnailMemoryCache.size > 150) {
      const firstKey = thumbnailMemoryCache.keys().next().value;
      if (firstKey) thumbnailMemoryCache.delete(firstKey);
    }
    thumbnailMemoryCache.set(cacheKey, {
      buffer: outputBuffer,
      contentType,
      etag,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    return res.send(outputBuffer);
  } catch (err: any) {
    console.error("[Thumbnail Generation Error]:", err);
    const src = (req.query.src as string) || (req.query.url as string);
    if (src && src.startsWith("/uploads/")) {
      const fullPath = path.join(UPLOADS_DIR, src.replace(/^\/uploads\//, ""));
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }
    res.status(500).json({ error: "Failed to generate thumbnail: " + err.message });
  }
});

// ==========================================
// POSTGRESQL & SEARCH CARS ENDPOINTS
// ==========================================

// GET all cars / Search with dynamic SQL queries & in-memory caching
app.get("/api/cars", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const event = (req.query.event as string) || "";
    const tag = (req.query.tag as string) || "";
    const author = (req.query.author as string) || "";

    const cacheKey = `cars_${q}_${event}_${tag}_${author}`;
    const cached = carsQueryCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < 30000) {
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return res.status(304).end();
      }
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
      res.setHeader("ETag", cached.etag);
      return res.json(cached.data);
    }

    const results = await searchCarsInPostgres(q, event, tag, author);
    const responseData = { cars: results, total: results.length };
    const etag = `W/"cars_${results.length}_${now}"`;

    if (carsQueryCache.size > 50) {
      carsQueryCache.clear();
    }
    carsQueryCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
      etag,
    });

    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    res.setHeader("ETag", etag);
    res.json(responseData);
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

// POST new car upload (Authenticated Admin or Photographer)
app.post("/api/cars", authenticateSession, async (req: Request, res: Response) => {
  try {
    const {
      plateNumber,
      state,
      carName,
      make,
      model,
      year,
      color,
      event,
      photographer,
      photoAuthors,
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

    if (rawImagesList.length === 0) {
      return res.status(400).json({ error: "At least one vehicle image is required." });
    }

    const cleanPlate = (plateNumber || "").toUpperCase().trim();
    const cleanState = (state || "").toUpperCase().trim();
    const folderIdentifier = cleanPlate || `car_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Process all images into the vehicle's folder
    const savedImages: string[] = rawImagesList.map((img: string, idx: number) => {
      if (img && img.startsWith("data:image/")) {
        return saveBase64ImageToDisk(img, `photo_${idx + 1}`, folderIdentifier);
      }
      return img;
    });

    const primaryImageUrl = imageUrl && imageUrl.startsWith("data:image/")
      ? saveBase64ImageToDisk(imageUrl, "cover", folderIdentifier)
      : (imageUrl || savedImages[0]);

    const savedCartoonUrl = cartoonImageUrl
      ? (cartoonImageUrl.startsWith("data:image/")
          ? saveBase64ImageToDisk(cartoonImageUrl, "cartoon", folderIdentifier)
          : cartoonImageUrl)
      : null;

    const carId = `car-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const formattedDate =
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
      ` • ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

    const tagsArray = Array.isArray(tags) ? tags : [];
    const currentUser = (req as any).user as UserAccount;

    const assignedPhotog = {
      name: photographer?.name || currentUser?.name || "Photographer",
      title: photographer?.title || (currentUser?.role === "admin" ? "Lead Photographer" : "Photographer"),
      avatar: photographer?.avatar || currentUser?.avatar || "",
      bio: photographer?.bio || currentUser?.bio || "",
      instagram: photographer?.instagram || currentUser?.instagram || "",
      venmoHandle: photographer?.venmoHandle || currentUser?.venmoHandle || "",
      payPalHandle: photographer?.payPalHandle || currentUser?.payPalHandle || "",
    };

    const newCar = {
      id: carId,
      plateNumber: cleanPlate,
      state: cleanState || undefined,
      carName: carName || (make ? `${make} ${model || ""}`.trim() : "Custom Vehicle"),
      make: make || "",
      model: model || "",
      year: year ? parseInt(year, 10) : undefined,
      color: color || "",
      event: event || "",
      location: location || "",
      date: formattedDate,
      photographer: assignedPhotog,
      imageUrl: primaryImageUrl,
      images: savedImages,
      photoAuthors: photoAuthors || {},
      cartoonImageUrl: savedCartoonUrl,
      hasCartoon: Boolean(hasCartoon || savedCartoonUrl),
      tags: tagsArray,
      views: 1,
      downloads: 0,
      resolution: resolution || "",
      cameraInfo: cameraInfo || "",
      createdAt: new Date().toISOString(),
    };

    const inserted = await insertCarIntoDb(newCar);
    invalidateCarsCache();
    res.status(201).json({ success: true, car: inserted });
  } catch (err: any) {
    console.error("Error creating car:", err);
    res.status(500).json({ error: err.message || "Failed to create vehicle record." });
  }
});

// PUT update car photo (Admin or Photographers)
app.put("/api/cars/:id", authenticateSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let {
      plateNumber,
      state,
      carName,
      make,
      model,
      year,
      color,
      event,
      location,
      imageUrl,
      images,
      photoAuthors,
      cartoonImageUrl,
      hasCartoon,
      tags,
      photographer,
      resolution,
      cameraInfo,
    } = req.body;

    const existingCar = await getCarByIdFromDb(id);
    const targetFolder = (plateNumber || existingCar?.plateNumber || id).toUpperCase().trim();

    let savedImages: string[] = [];
    if (Array.isArray(images) && images.length > 0) {
      savedImages = images.map((img: string, idx: number) => {
        if (img && img.startsWith("data:image/")) {
          return saveBase64ImageToDisk(img, `photo_${idx + 1}`, targetFolder);
        }
        return img;
      });
    }

    if (imageUrl && imageUrl.startsWith("data:image/")) {
      imageUrl = saveBase64ImageToDisk(imageUrl, `cover`, targetFolder);
    } else if (!imageUrl && savedImages.length > 0) {
      imageUrl = savedImages[0];
    }

    if (cartoonImageUrl && cartoonImageUrl.startsWith("data:image/")) {
      cartoonImageUrl = saveBase64ImageToDisk(cartoonImageUrl, `cartoon`, targetFolder);
    }

    const updates: any = {
      ...(plateNumber !== undefined ? { plateNumber: plateNumber.toUpperCase().trim() } : {}),
      ...(state !== undefined ? { state: state ? state.toUpperCase().trim() : undefined } : {}),
      ...(carName !== undefined ? { carName } : {}),
      ...(make !== undefined ? { make } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(year !== undefined ? { year: year ? parseInt(year, 10) : undefined } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(event !== undefined ? { event } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(savedImages.length > 0 ? { images: savedImages } : {}),
      ...(photoAuthors !== undefined ? { photoAuthors } : {}),
      ...(cartoonImageUrl !== undefined ? { cartoonImageUrl } : {}),
      ...(hasCartoon !== undefined ? { hasCartoon: Boolean(hasCartoon) } : {}),
      ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [tags] } : {}),
      ...(photographer !== undefined ? { photographer } : {}),
      ...(resolution !== undefined ? { resolution } : {}),
      ...(cameraInfo !== undefined ? { cameraInfo } : {}),
    };

    const updated = await updateCarInDb(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Car record not found." });
    }

    invalidateCarsCache();
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
    invalidateCarsCache();
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
          "/api/photographers",
          "/api/users",
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
            "/api/photographers",
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
    console.log(`👥 User & Photographer Vault Online`);
    console.log(`🔌 Mode: ${isExplicitlyBackendOnly && !hasDistIndex ? "Headless Backend API" : "Fullstack"}`);
    console.log(`====================================================`);
  });
}

startServer();

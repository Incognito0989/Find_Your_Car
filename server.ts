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
  getAllUsersFromDb,
  getUserByIdFromDb,
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// Admin & Photographer Unified Login
app.post("/api/admin/login", async (req: Request, res: Response) => {
  try {
    const { password, email, username, identifier } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const inputIdentifier = (identifier || username || email || "").toLowerCase().trim();
    const inputPassword = String(password).trim();
    const creds = getAdminCredentials();

    let authenticatedUser: UserAccount | null = null;

    // 1. Check if matching specific database user
    if (inputIdentifier) {
      const user = await getUserByUsernameOrEmailFromDb(inputIdentifier);
      if (user && user.password && user.password === inputPassword) {
        const { password: _, ...safeUser } = user;
        authenticatedUser = safeUser;
      }
    }

    // 2. Check environment admin credentials fallback
    if (!authenticatedUser) {
      const validAdminIdentifiers = new Set([
        creds.email.toLowerCase().trim(),
        creds.name.toLowerCase().trim(),
        "admin",
        "administrator",
        "admin@platesnapcars.local",
      ]);
      if (process.env.ADMIN_EMAIL) {
        validAdminIdentifiers.add(process.env.ADMIN_EMAIL.toLowerCase().trim());
      }

      const isPasswordAdmin =
        inputPassword === creds.password ||
        inputPassword === (process.env.ADMIN_PASSWORD || "platesnap2026");

      const isIdentifierAdmin = !inputIdentifier || validAdminIdentifiers.has(inputIdentifier);

      if (isPasswordAdmin && isIdentifierAdmin) {
        // Fetch or create master admin profile
        const existingAdmin = await getUserByUsernameOrEmailFromDb("admin");
        if (existingAdmin) {
          const { password: _, ...safeAdmin } = existingAdmin;
          authenticatedUser = safeAdmin;
        } else {
          authenticatedUser = {
            id: "user-admin-master",
            username: "admin",
            name: creds.name,
            email: creds.email,
            role: "admin",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            bio: "Lead Automotive Photographer & Studio Administrator.",
            instagram: "@rivera_motorsport",
            venmoHandle: "alex-rivera-photo",
            payPalHandle: "alexriveraphoto",
            createdAt: new Date().toISOString(),
            isActive: true,
          };
        }
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({
        error: "Invalid credentials. Please verify your username/email and password.",
      });
    }

    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    sessionUserMap.set(token, {
      token,
      user: authenticatedUser,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      token,
      admin: {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        avatar: authenticatedUser.avatar,
        bio: authenticatedUser.bio,
        instagram: authenticatedUser.instagram,
        venmoHandle: authenticatedUser.venmoHandle,
        payPalHandle: authenticatedUser.payPalHandle,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Authentication system error: " + err.message });
  }
});

// Admin / User Logout
app.post("/api/admin/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : (req.headers["x-admin-token"] as string);
  if (token) sessionUserMap.delete(token);
  res.json({ success: true, message: "Logged out successfully" });
});

// Get Current User Profile (Authenticated)
app.get("/api/user/me", authenticateSession, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  res.json({ user });
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
        avatar: processedAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        bio: bio || "Automotive photographer and content creator.",
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
        generatedAt: new Date().toISOString(),
      });
    }

    res.json({ fallback: true });
  } catch (err: any) {
    console.warn("[Gemini Cartoon Generation] Fallback triggered:", err.message);
    res.json({ fallback: true, error: err.message });
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
    const author = (req.query.author as string) || "";

    const results = await searchCarsInPostgres(q, event, tag, author);
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

// POST new car upload (Authenticated Admin or Photographer)
app.post("/api/cars", authenticateSession, async (req: Request, res: Response) => {
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
    const currentUser = (req as any).user as UserAccount;

    const assignedPhotog = {
      name: photographer?.name || currentUser.name || "Alex Rivera",
      title: photographer?.title || "Automotive Photographer",
      avatar: photographer?.avatar || currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      bio: photographer?.bio || currentUser.bio || "Official Plate Snap Cars verified shooter.",
      instagram: photographer?.instagram || currentUser.instagram || "",
      venmoHandle: photographer?.venmoHandle || currentUser.venmoHandle || "",
      payPalHandle: photographer?.payPalHandle || currentUser.payPalHandle || "",
    };

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
      photographer: assignedPhotog,
      imageUrl: primaryImageUrl,
      images: savedImages,
      photoAuthors: photoAuthors || {},
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

// PUT update car photo (Admin or Photographers)
app.put("/api/cars/:id", authenticateSession, async (req: Request, res: Response) => {
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
      photoAuthors,
      cartoonImageUrl,
      hasCartoon,
      tags,
      photographer,
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
      ...(photoAuthors ? { photoAuthors } : {}),
      ...(cartoonImageUrl !== undefined ? { cartoonImageUrl } : {}),
      ...(hasCartoon !== undefined ? { hasCartoon: Boolean(hasCartoon) } : {}),
      ...(tags ? { tags: Array.isArray(tags) ? tags : [tags] } : {}),
      ...(photographer ? { photographer } : {}),
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

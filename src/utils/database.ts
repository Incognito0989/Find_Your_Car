import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { CarPhoto, AppThemeConfig, UserAccount, Photographer } from '../types';
import { INITIAL_CAR_PHOTOS, DEFAULT_THEMES, INITIAL_USERS } from '../data/initialData';

let pgPool: Pool | null = null;
let isPostgresAvailable = false;
let isCheckingPostgres = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const CARS_JSON_PATH = path.join(DATA_DIR, 'cars.json');
const THEME_JSON_PATH = path.join(DATA_DIR, 'theme.json');
const USERS_JSON_PATH = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'platesnap';
  const password = process.env.POSTGRES_PASSWORD || 'platesnap_secret_pass';
  const database = process.env.POSTGRES_DB || 'platesnap_db';
  return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = getDatabaseUrl();
    pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000, // Fast 2s timeout to avoid blocking if host is unreachable
    });

    pgPool.on('error', () => {
      isPostgresAvailable = false;
    });
  }
  return pgPool;
}

export function getIsPostgresAvailable(): boolean {
  return isPostgresAvailable;
}

// ----------------------------------------------------
// File-Backed Fallback Storage Engine (Durable & Fast)
// ----------------------------------------------------
export function getLocalCars(): CarPhoto[] {
  try {
    if (!fs.existsSync(CARS_JSON_PATH)) {
      fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(INITIAL_CAR_PHOTOS, null, 2), 'utf-8');
      return INITIAL_CAR_PHOTOS;
    }
    const data = fs.readFileSync(CARS_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_CAR_PHOTOS;
  } catch (err) {
    console.warn('[Database Fallback] Reading local cars failed, using initial:', err);
    return INITIAL_CAR_PHOTOS;
  }
}

export function saveLocalCars(cars: CarPhoto[]): void {
  try {
    fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database Fallback] Failed to write cars to disk:', err);
  }
}

export function getLocalUsers(): (UserAccount & { password?: string })[] {
  try {
    if (!fs.existsSync(USERS_JSON_PATH)) {
      const defaultUsersWithPass = INITIAL_USERS.map((u) => ({
        ...u,
        password: u.role === 'admin' ? (process.env.ADMIN_PASSWORD || 'platesnap2026') : 'shooter2026',
      }));
      fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(defaultUsersWithPass, null, 2), 'utf-8');
      return defaultUsersWithPass;
    }
    const data = fs.readFileSync(USERS_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_USERS.map((u) => ({
      ...u,
      password: u.role === 'admin' ? (process.env.ADMIN_PASSWORD || 'platesnap2026') : 'shooter2026',
    }));
  } catch (err) {
    console.warn('[Database Fallback] Reading local users failed, using initial:', err);
    return INITIAL_USERS.map((u) => ({
      ...u,
      password: u.role === 'admin' ? (process.env.ADMIN_PASSWORD || 'platesnap2026') : 'shooter2026',
    }));
  }
}

export function saveLocalUsers(users: (UserAccount & { password?: string })[]): void {
  try {
    fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database Fallback] Failed to write users to disk:', err);
  }
}

export function getLocalTheme(): AppThemeConfig | null {
  try {
    if (fs.existsSync(THEME_JSON_PATH)) {
      const data = fs.readFileSync(THEME_JSON_PATH, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && (parsed.id || parsed.primary || parsed.bg)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[Database Fallback] Error reading local theme:', e);
  }
  return DEFAULT_THEMES[0] || null;
}

export function saveLocalTheme(theme: AppThemeConfig): void {
  try {
    const dir = path.dirname(THEME_JSON_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(THEME_JSON_PATH, JSON.stringify(theme, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Database Fallback] Error saving local theme:', e);
  }
}

// ----------------------------------------------------
// Database Initialization
// ----------------------------------------------------
export async function initializePostgresDatabase(): Promise<void> {
  if (isCheckingPostgres) return;
  isCheckingPostgres = true;

  // Initialize local JSON store immediately so app is always responsive
  getLocalCars();
  getLocalUsers();

  try {
    const pool = getPgPool();
    // Quick probe with timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PostgreSQL connection timeout')), 2500)
      ),
    ]);

    client.release();
    isPostgresAvailable = true;
    console.log('[PostgreSQL] Connected to PostgreSQL database successfully!');

    // Create Schema & ensure images and users tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        username VARCHAR(128) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(64) DEFAULT 'photographer',
        avatar TEXT,
        bio TEXT,
        instagram VARCHAR(128),
        venmo_handle VARCHAR(128),
        paypal_handle VARCHAR(128),
        cashapp_handle VARCHAR(128),
        is_active BOOLEAN DEFAULT TRUE,
        status VARCHAR(64) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cars (
        id VARCHAR(128) PRIMARY KEY,
        plate_number VARCHAR(64),
        state VARCHAR(64),
        car_name VARCHAR(255) NOT NULL,
        make VARCHAR(128) NOT NULL,
        model VARCHAR(128) NOT NULL,
        year INTEGER,
        color VARCHAR(128),
        event VARCHAR(255),
        location VARCHAR(255),
        date VARCHAR(128),
        photographer_name VARCHAR(255),
        photographer_title VARCHAR(255),
        photographer_avatar TEXT,
        photographer_bio TEXT,
        photographer_instagram VARCHAR(128),
        photographer_venmo VARCHAR(128),
        photographer_paypal VARCHAR(128),
        photographer_cashapp VARCHAR(128),
        image_url TEXT NOT NULL,
        images JSONB DEFAULT '[]'::jsonb,
        photo_authors JSONB DEFAULT '{}'::jsonb,
        cartoon_image_url TEXT,
        has_cartoon BOOLEAN DEFAULT FALSE,
        tags JSONB DEFAULT '[]'::jsonb,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        resolution VARCHAR(128),
        camera_info VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS cashapp_handle VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT 'active';
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS state VARCHAR(64);
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photo_authors JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photographer_venmo VARCHAR(128);
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photographer_paypal VARCHAR(128);
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photographer_cashapp VARCHAR(128);
      DO $$ BEGIN
        ALTER TABLE cars ALTER COLUMN plate_number DROP NOT NULL;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);
      CREATE INDEX IF NOT EXISTS idx_cars_state ON cars(state);
      CREATE INDEX IF NOT EXISTS idx_cars_make ON cars(make);
      CREATE INDEX IF NOT EXISTS idx_cars_event ON cars(event);
      CREATE INDEX IF NOT EXISTS idx_cars_photographer ON cars(photographer_name);
      CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(128) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Sync theme settings with app_settings in Postgres
    try {
      const themeRes = await pool.query("SELECT value FROM app_settings WHERE key = 'theme'");
      if (themeRes.rows.length > 0 && themeRes.rows[0].value) {
        saveLocalTheme(themeRes.rows[0].value);
      } else {
        const localTheme = getLocalTheme();
        if (localTheme) {
          await pool.query(
            `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', $1::jsonb, NOW()) ON CONFLICT (key) DO NOTHING`,
            [JSON.stringify(localTheme)]
          );
        }
      }
    } catch (err: any) {
      console.warn('[PostgreSQL Theme Sync] Note:', err.message);
    }

    // Seed default users if empty
    const usersCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCountRes.rows[0].count, 10) === 0) {
      console.log('[PostgreSQL] Empty users table. Seeding initial photographers and admin accounts...');
      await seedDefaultUsers(pool);
    }

    // Seed default cars if empty
    const countRes = await pool.query('SELECT COUNT(*) as count FROM cars');
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log('[PostgreSQL] Empty database detected. Seeding initial vehicle vault records...');
      await seedDefaultCars(pool);
    }
  } catch (err: any) {
    isPostgresAvailable = false;
    console.log(
      `[Database Engine] PostgreSQL instance not reachable (${err.message}). Using high-performance file repository at data/cars.json & data/users.json.`
    );
  } finally {
    isCheckingPostgres = false;
  }
}

async function seedDefaultUsers(pool: Pool) {
  const localUsers = getLocalUsers();
  for (const u of localUsers) {
    await pool.query(
      `INSERT INTO users (
        id, username, name, email, password, role, avatar, bio, instagram, venmo_handle, paypal_handle, cashapp_handle, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING`,
      [
        u.id,
        u.username.toLowerCase(),
        u.name,
        u.email,
        u.password || 'platesnap2026',
        u.role,
        u.avatar,
        u.bio,
        u.instagram || '',
        u.venmoHandle || '',
        u.payPalHandle || '',
        u.cashAppHandle || '',
        u.isActive ?? true,
        u.createdAt || new Date().toISOString(),
      ]
    );
  }
}

async function seedDefaultCars(pool: Pool) {
  const initialCars = getLocalCars();

  for (const car of initialCars) {
    await pool.query(
      `INSERT INTO cars (
        id, plate_number, state, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        photographer_venmo, photographer_paypal, photographer_cashapp,
        image_url, images, photo_authors, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22::jsonb, $23, $24, $25::jsonb, $26, $27, $28, $29, $30)
      ON CONFLICT (id) DO NOTHING`,
      [
        car.id,
        car.plateNumber || '',
        car.state || '',
        car.carName,
        car.make,
        car.model,
        car.year,
        car.color,
        car.event,
        car.location,
        car.date,
        car.photographer?.name || 'Alex Rivera',
        car.photographer?.title || 'Automotive Photographer',
        car.photographer?.avatar || '',
        car.photographer?.bio || '',
        car.photographer?.instagram || '',
        car.photographer?.venmoHandle || 'alex-rivera-photo',
        car.photographer?.payPalHandle || 'alexriveraphoto',
        car.photographer?.cashAppHandle || 'alexriveraphoto',
        car.imageUrl,
        JSON.stringify(car.images || [car.imageUrl]),
        JSON.stringify(car.photoAuthors || {}),
        car.cartoonImageUrl || null,
        Boolean(car.hasCartoon),
        JSON.stringify(car.tags || []),
        car.views || 0,
        car.downloads || 0,
        car.resolution || 'High Resolution • 300 DPI',
        car.cameraInfo || 'Sony Alpha',
        car.createdAt || new Date().toISOString(),
      ]
    );
  }
}

export function mapRowToCar(row: any): CarPhoto | null {
  if (!row) return null;
  let parsedTags: string[] = [];
  try {
    parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [];
  } catch {
    parsedTags = row.tags ? String(row.tags).split(',').map((s: string) => s.trim()) : [];
  }

  let parsedImages: string[] = [];
  try {
    if (row.images) {
      parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
    }
  } catch {
    parsedImages = [];
  }
  if (!Array.isArray(parsedImages) || parsedImages.length === 0) {
    parsedImages = row.image_url ? [row.image_url] : [];
  }

  let parsedPhotoAuthors: Record<string, Photographer> = {};
  try {
    if (row.photo_authors) {
      parsedPhotoAuthors = typeof row.photo_authors === 'string' ? JSON.parse(row.photo_authors) : row.photo_authors;
    }
  } catch {
    parsedPhotoAuthors = {};
  }

  return {
    id: row.id,
    plateNumber: row.plate_number || '',
    state: row.state || undefined,
    carName: row.car_name || '',
    make: row.make || '',
    model: row.model || '',
    year: row.year || undefined,
    color: row.color || '',
    event: row.event || '',
    location: row.location || '',
    date: row.date || '',
    photographer: {
      name: row.photographer_name || 'Photographer',
      title: row.photographer_title || 'Photographer',
      avatar: row.photographer_avatar || '',
      bio: row.photographer_bio || '',
      instagram: row.photographer_instagram || '',
      venmoHandle: row.photographer_venmo || '',
      payPalHandle: row.photographer_paypal || '',
      cashAppHandle: row.photographer_cashapp || '',
    },
    imageUrl: row.image_url,
    images: parsedImages,
    photoAuthors: parsedPhotoAuthors,
    cartoonImageUrl: row.cartoon_image_url || null,
    hasCartoon: Boolean(row.has_cartoon),
    tags: parsedTags,
    views: row.views || 0,
    downloads: row.downloads || 0,
    resolution: row.resolution || '',
    cameraInfo: row.camera_info || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapRowToUser(row: any): UserAccount & { password?: string } {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email || '',
    role: row.role || 'photographer',
    avatar: row.avatar || '',
    bio: row.bio || '',
    instagram: row.instagram || '',
    venmoHandle: row.venmo_handle || '',
    payPalHandle: row.paypal_handle || '',
    cashAppHandle: row.cashapp_handle || '',
    isActive: row.is_active ?? true,
    status: row.status || (row.is_active ? 'active' : 'pending'),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    password: row.password,
  };
}

// ----------------------------------------------------
// Dynamic Photographer Hydration Engine
// ----------------------------------------------------
export function buildUsersLookupMap(users: UserAccount[]): Map<string, UserAccount> {
  const map = new Map<string, UserAccount>();
  for (const u of users) {
    if (u.id) map.set(u.id, u);
    if (u.username) map.set(u.username.toLowerCase().trim(), u);
    if (u.name) map.set(u.name.toLowerCase().trim(), u);
  }
  return map;
}

export function hydratePhotographerWithUser(photog?: Photographer, usersMap?: Map<string, UserAccount>): Photographer {
  if (!photog) {
    return {
      name: 'Photographer',
      title: 'Automotive Photographer',
      avatar: '',
      bio: '',
      instagram: '',
      venmoHandle: '',
      payPalHandle: '',
      cashAppHandle: '',
    };
  }

  let matchedUser: UserAccount | undefined;
  if (usersMap) {
    if (photog.id && usersMap.has(photog.id)) {
      matchedUser = usersMap.get(photog.id);
    } else if (photog.name && usersMap.has(photog.name.toLowerCase().trim())) {
      matchedUser = usersMap.get(photog.name.toLowerCase().trim());
    }
  }

  if (matchedUser) {
    return {
      id: matchedUser.id,
      name: matchedUser.name || photog.name,
      title: matchedUser.role === 'admin' ? 'Lead Automotive Photographer' : (photog.title || 'Automotive Photographer'),
      avatar: matchedUser.avatar || photog.avatar || '',
      bio: matchedUser.bio || photog.bio || '',
      instagram: matchedUser.instagram || photog.instagram || '',
      venmoHandle: matchedUser.venmoHandle || photog.venmoHandle || '',
      payPalHandle: matchedUser.payPalHandle || photog.payPalHandle || '',
      cashAppHandle: matchedUser.cashAppHandle || photog.cashAppHandle || '',
    };
  }

  return {
    ...photog,
    name: photog.name || 'Photographer',
    title: photog.title || 'Photographer',
    avatar: photog.avatar || '',
    bio: photog.bio || '',
    instagram: photog.instagram || '',
    venmoHandle: photog.venmoHandle || '',
    payPalHandle: photog.payPalHandle || '',
    cashAppHandle: photog.cashAppHandle || '',
  };
}

export function hydrateCarPhotographers(car: CarPhoto, usersMap?: Map<string, UserAccount>): CarPhoto {
  const updatedPhotog = hydratePhotographerWithUser(car.photographer, usersMap);
  const updatedPhotoAuthors: Record<string, Photographer> = {};
  if (car.photoAuthors && typeof car.photoAuthors === 'object') {
    Object.entries(car.photoAuthors).forEach(([key, author]) => {
      updatedPhotoAuthors[key] = hydratePhotographerWithUser(author, usersMap);
    });
  }

  return {
    ...car,
    photographer: updatedPhotog,
    photoAuthors: Object.keys(updatedPhotoAuthors).length > 0 ? updatedPhotoAuthors : car.photoAuthors,
  };
}

// ----------------------------------------------------
// User Management Functions (Postgres + Fallback)
// ----------------------------------------------------
export async function getAllUsersFromDb(): Promise<UserAccount[]> {
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const result = await pool.query('SELECT id, username, name, email, role, avatar, bio, instagram, venmo_handle, paypal_handle, cashapp_handle, is_active, status, created_at FROM users ORDER BY created_at ASC');
      return result.rows.map((row) => {
        const u = mapRowToUser(row);
        delete (u as any).password;
        return u;
      });
    } catch (e: any) {
      console.warn('[PostgreSQL Users] Get users failed, falling back to local file:', e.message);
      isPostgresAvailable = false;
    }
  }

  const local = getLocalUsers();
  return local.map((u) => {
    const { password, ...safeUser } = u;
    return {
      ...safeUser,
      status: safeUser.status || (safeUser.isActive ? 'active' : 'pending'),
    };
  });
}

export async function getUserByIdFromDb(id: string): Promise<(UserAccount & { password?: string }) | null> {
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        return mapRowToUser(res.rows[0]);
      }
    } catch (e) {
      isPostgresAvailable = false;
    }
  }

  const local = getLocalUsers();
  return local.find((u) => u.id === id) || null;
}

export async function getUserByUsernameOrEmailFromDb(identifier: string): Promise<(UserAccount & { password?: string }) | null> {
  const clean = identifier.trim().toLowerCase();
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const res = await pool.query(
        'SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1',
        [clean]
      );
      if (res.rows.length > 0) {
        return mapRowToUser(res.rows[0]);
      }
    } catch (e) {
      isPostgresAvailable = false;
    }
  }

  const local = getLocalUsers();
  return (
    local.find(
      (u) => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean)
    ) || null
  );
}

export async function getUserByIdWithPassword(id: string): Promise<(UserAccount & { password?: string }) | null> {
  const local = getLocalUsers();
  return local.find((u) => u.id === id) || null;
}

export async function createUserInDb(
  userData: Partial<UserAccount>,
  password = 'shooter2026'
): Promise<UserAccount> {
  const newUser: UserAccount & { password?: string } = {
    id: userData.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: (userData.username || `photog_${Date.now()}`).toLowerCase().trim(),
    name: userData.name || 'Photographer',
    email: userData.email || '',
    role: userData.role === 'admin' ? 'admin' : 'photographer',
    avatar: userData.avatar || '',
    bio: userData.bio || '',
    instagram: userData.instagram || '',
    venmoHandle: userData.venmoHandle || '',
    payPalHandle: userData.payPalHandle || '',
    cashAppHandle: userData.cashAppHandle || '',
    isActive: userData.isActive ?? (userData.status === 'pending' ? false : true),
    status: userData.status || (userData.isActive === false ? 'pending' : 'active'),
    createdAt: new Date().toISOString(),
    password,
  };

  // Update local file store
  const localUsers = getLocalUsers();
  const existingIdx = localUsers.findIndex((u) => u.username.toLowerCase() === newUser.username.toLowerCase());
  if (existingIdx >= 0) {
    localUsers[existingIdx] = newUser;
  } else {
    localUsers.push(newUser);
  }
  saveLocalUsers(localUsers);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO users (
          id, username, name, email, password, role, avatar, bio, instagram, venmo_handle, paypal_handle, cashapp_handle, is_active, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          avatar = EXCLUDED.avatar,
          bio = EXCLUDED.bio,
          instagram = EXCLUDED.instagram,
          venmo_handle = EXCLUDED.venmo_handle,
          paypal_handle = EXCLUDED.paypal_handle,
          cashapp_handle = EXCLUDED.cashapp_handle,
          is_active = EXCLUDED.is_active,
          status = EXCLUDED.status`,
        [
          newUser.id,
          newUser.username,
          newUser.name,
          newUser.email,
          newUser.password,
          newUser.role,
          newUser.avatar,
          newUser.bio,
          newUser.instagram,
          newUser.venmoHandle,
          newUser.payPalHandle,
          newUser.cashAppHandle,
          newUser.isActive,
          newUser.status,
          newUser.createdAt,
        ]
      );
    } catch (e: any) {
      console.warn('[PostgreSQL Users] Insert user failed, stored locally:', e.message);
      isPostgresAvailable = false;
    }
  }

  const { password: _, ...safe } = newUser;
  return safe;
}

export async function updateUserInDb(
  id: string,
  updates: Partial<UserAccount & { password?: string }>
): Promise<UserAccount | null> {
  const local = getLocalUsers();
  const idx = local.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  const existing = local[idx];
  const updatedUser: UserAccount & { password?: string } = {
    ...existing,
    ...updates,
    username: updates.username ? updates.username.toLowerCase().trim() : existing.username,
    name: updates.name !== undefined ? updates.name : existing.name,
    avatar: updates.avatar !== undefined ? updates.avatar : existing.avatar,
    bio: updates.bio !== undefined ? updates.bio : existing.bio,
    instagram: updates.instagram !== undefined ? updates.instagram : existing.instagram,
    venmoHandle: updates.venmoHandle !== undefined ? updates.venmoHandle : existing.venmoHandle,
    payPalHandle: updates.payPalHandle !== undefined ? updates.payPalHandle : existing.payPalHandle,
    cashAppHandle: updates.cashAppHandle !== undefined ? updates.cashAppHandle : existing.cashAppHandle,
    status: updates.status || (updates.isActive !== undefined ? (updates.isActive ? 'active' : 'suspended') : existing.status),
    password: updates.password ? updates.password : existing.password,
  };
  local[idx] = updatedUser;
  saveLocalUsers(local);

  // Sync all cars where this photographer contributed
  const localCars = getLocalCars();
  let carsModified = false;
  const matchNames = [
    existing.name.toLowerCase().trim(),
    existing.username.toLowerCase().trim(),
    updatedUser.name.toLowerCase().trim(),
    updatedUser.username.toLowerCase().trim(),
  ];

  for (const car of localCars) {
    const isPhotogMatch =
      (car.photographer?.id && car.photographer.id === id) ||
      (car.photographer?.name && matchNames.includes(car.photographer.name.toLowerCase().trim()));

    if (isPhotogMatch) {
      car.photographer = {
        ...car.photographer,
        id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar || '',
        bio: updatedUser.bio || '',
        instagram: updatedUser.instagram || '',
        venmoHandle: updatedUser.venmoHandle || '',
        payPalHandle: updatedUser.payPalHandle || '',
        cashAppHandle: updatedUser.cashAppHandle || '',
      };
      carsModified = true;
    }

    if (car.photoAuthors && typeof car.photoAuthors === 'object') {
      let authorsUpdated = false;
      Object.keys(car.photoAuthors).forEach((k) => {
        const author = car.photoAuthors![k];
        if (
          (author?.id && author.id === id) ||
          (author?.name && matchNames.includes(author.name.toLowerCase().trim()))
        ) {
          car.photoAuthors![k] = {
            ...author,
            id: updatedUser.id,
            name: updatedUser.name,
            avatar: updatedUser.avatar || '',
            bio: updatedUser.bio || '',
            instagram: updatedUser.instagram || '',
            venmoHandle: updatedUser.venmoHandle || '',
            payPalHandle: updatedUser.payPalHandle || '',
            cashAppHandle: updatedUser.cashAppHandle || '',
          };
          authorsUpdated = true;
        }
      });
      if (authorsUpdated) carsModified = true;
    }
  }

  if (carsModified) {
    saveLocalCars(localCars);
  }

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `UPDATE users SET
          username = COALESCE($1, username),
          name = COALESCE($2, name),
          email = COALESCE($3, email),
          role = COALESCE($4, role),
          avatar = COALESCE($5, avatar),
          bio = COALESCE($6, bio),
          instagram = COALESCE($7, instagram),
          venmo_handle = COALESCE($8, venmo_handle),
          paypal_handle = COALESCE($9, paypal_handle),
          cashapp_handle = COALESCE($10, cashapp_handle),
          is_active = COALESCE($11, is_active),
          status = COALESCE($12, status),
          password = COALESCE($13, password)
        WHERE id = $14`,
        [
          updates.username ? updates.username.toLowerCase().trim() : null,
          updates.name || null,
          updates.email !== undefined ? updates.email : null,
          updates.role || null,
          updates.avatar !== undefined ? updates.avatar : null,
          updates.bio !== undefined ? updates.bio : null,
          updates.instagram !== undefined ? updates.instagram : null,
          updates.venmoHandle !== undefined ? updates.venmoHandle : null,
          updates.payPalHandle !== undefined ? updates.payPalHandle : null,
          updates.cashAppHandle !== undefined ? updates.cashAppHandle : null,
          updates.isActive !== undefined ? updates.isActive : null,
          updates.status || null,
          updates.password || null,
          id,
        ]
      );

      // Also propagate photographer changes across existing cars table in Postgres
      await pool.query(
        `UPDATE cars SET
          photographer_avatar = COALESCE($1, photographer_avatar),
          photographer_bio = COALESCE($2, photographer_bio),
          photographer_instagram = COALESCE($3, photographer_instagram),
          photographer_venmo = COALESCE($4, photographer_venmo),
          photographer_paypal = COALESCE($5, photographer_paypal),
          photographer_cashapp = COALESCE($6, photographer_cashapp),
          photographer_name = COALESCE($7, photographer_name)
        WHERE LOWER(photographer_name) = $8 OR LOWER(photographer_name) = $9`,
        [
          updatedUser.avatar,
          updatedUser.bio,
          updatedUser.instagram,
          updatedUser.venmoHandle,
          updatedUser.payPalHandle,
          updatedUser.cashAppHandle,
          updatedUser.name,
          existing.name.toLowerCase().trim(),
          existing.username.toLowerCase().trim(),
        ]
      ).catch(() => {});
    } catch (e: any) {
      console.warn('[PostgreSQL Users] Update failed, updated locally:', e.message);
      isPostgresAvailable = false;
    }
  }

  const { password: _, ...safe } = updatedUser;
  return safe;
}

export async function deleteUserInDb(id: string): Promise<boolean> {
  const local = getLocalUsers();
  const filtered = local.filter((u) => u.id !== id);
  saveLocalUsers(filtered);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (e) {
      isPostgresAvailable = false;
    }
  }
  return true;
}

export async function getPublicPhotographersFromDb(): Promise<Photographer[]> {
  const users = await getAllUsersFromDb();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    title: u.role === 'admin' ? 'Lead Photographer' : 'Photographer',
    avatar: u.avatar || '',
    bio: u.bio || '',
    instagram: u.instagram || '',
    venmoHandle: u.venmoHandle || '',
    payPalHandle: u.payPalHandle || '',
    cashAppHandle: u.cashAppHandle || '',
  }));
}

// ----------------------------------------------------
// Unified Search Function (Postgres + Fallback)
// ----------------------------------------------------
export async function searchCarsInPostgres(
  query: string,
  eventFilter?: string,
  tagFilter?: string,
  authorFilter?: string
): Promise<CarPhoto[]> {
  const users = await getAllUsersFromDb();
  const usersMap = buildUsersLookupMap(users);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      let sql = `SELECT * FROM cars WHERE 1=1`;
      const params: any[] = [];
      let paramIdx = 1;

      if (query && query.trim()) {
        const q = query.trim();
        const cleanPlate = q.replace(/[\s\-_.]/g, '');

        sql += ` AND (
          REGEXP_REPLACE(UPPER(plate_number), '[\\s\\-_.]', '', 'g') ILIKE $${paramIdx}
          OR plate_number ILIKE $${paramIdx + 1}
          OR state ILIKE $${paramIdx + 1}
          OR car_name ILIKE $${paramIdx + 1}
          OR make ILIKE $${paramIdx + 1}
          OR model ILIKE $${paramIdx + 1}
          OR event ILIKE $${paramIdx + 1}
          OR location ILIKE $${paramIdx + 1}
          OR photographer_name ILIKE $${paramIdx + 1}
          OR photographer_bio ILIKE $${paramIdx + 1}
          OR photographer_instagram ILIKE $${paramIdx + 1}
          OR photographer_venmo ILIKE $${paramIdx + 1}
          OR photographer_paypal ILIKE $${paramIdx + 1}
          OR photographer_cashapp ILIKE $${paramIdx + 1}
          OR tags::text ILIKE $${paramIdx + 1}
          OR CAST(year AS TEXT) ILIKE $${paramIdx + 1}
        )`;
        params.push(`%${cleanPlate}%`, `%${q}%`);
        paramIdx += 2;
      }

      if (eventFilter && eventFilter !== 'All Events' && eventFilter.trim()) {
        sql += ` AND event = $${paramIdx}`;
        params.push(eventFilter.trim());
        paramIdx += 1;
      }

      if (tagFilter && tagFilter.trim()) {
        sql += ` AND tags::text ILIKE $${paramIdx}`;
        params.push(`%${tagFilter.trim()}%`);
        paramIdx += 1;
      }

      if (authorFilter && authorFilter !== 'All Photographers' && authorFilter.trim()) {
        sql += ` AND photographer_name ILIKE $${paramIdx}`;
        params.push(`%${authorFilter.trim()}%`);
        paramIdx += 1;
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await pool.query(sql, params);
      return result.rows
        .map(mapRowToCar)
        .filter(Boolean)
        .map((car) => hydrateCarPhotographers(car!, usersMap));
    } catch (err: any) {
      console.warn('[PostgreSQL Search] Query failed, falling back to local store:', err.message);
      isPostgresAvailable = false;
    }
  }

  // File repository fallback search with full fuzzy matching
  const allCars = getLocalCars();
  const q = (query || '').trim().toLowerCase();
  const cleanQ = q.replace(/[\s\-_.]/g, '');

  const filtered = allCars.filter((car) => {
    // Event filter check
    if (eventFilter && eventFilter !== 'All Events' && eventFilter.trim()) {
      if (car.event !== eventFilter) return false;
    }

    // Tag filter check
    if (tagFilter && tagFilter.trim()) {
      const matchTag = Array.isArray(car.tags) && car.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase());
      if (!matchTag) return false;
    }

    // Author filter check
    if (authorFilter && authorFilter !== 'All Photographers' && authorFilter.trim()) {
      const photogName = (car.photographer?.name || '').toLowerCase();
      if (!photogName.includes(authorFilter.toLowerCase().trim())) {
        return false;
      }
    }

    // Text search query check
    if (q) {
      const cleanCarPlate = (car.plateNumber || '').replace(/[\s\-_.]/g, '').toLowerCase();
      const rawPlate = (car.plateNumber || '').toLowerCase();
      const carState = (car.state || '').toLowerCase();
      const carName = (car.carName || '').toLowerCase();
      const make = (car.make || '').toLowerCase();
      const model = (car.model || '').toLowerCase();
      const event = (car.event || '').toLowerCase();
      const location = (car.location || '').toLowerCase();
      const photog = (car.photographer?.name || '').toLowerCase();
      const photogBio = (car.photographer?.bio || '').toLowerCase();
      const photogInsta = (car.photographer?.instagram || '').toLowerCase();
      const tags = (car.tags || []).join(' ').toLowerCase();
      const year = String(car.year || '');

      const matches =
        cleanCarPlate.includes(cleanQ) ||
        rawPlate.includes(q) ||
        carState.includes(q) ||
        carName.includes(q) ||
        make.includes(q) ||
        model.includes(q) ||
        event.includes(q) ||
        location.includes(q) ||
        photog.includes(q) ||
        photogBio.includes(q) ||
        photogInsta.includes(q) ||
        tags.includes(q) ||
        year.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  return filtered.map((car) => hydrateCarPhotographers(car, usersMap));
}

// ----------------------------------------------------
// Unified CRUD Operations
// ----------------------------------------------------
export async function getAllCarsFromDb(): Promise<CarPhoto[]> {
  return searchCarsInPostgres('');
}

export async function getCarByIdFromDb(id: string): Promise<CarPhoto | null> {
  const users = await getAllUsersFromDb();
  const usersMap = buildUsersLookupMap(users);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        await pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [id]).catch(() => {});
        const mapped = mapRowToCar(result.rows[0]);
        return mapped ? hydrateCarPhotographers(mapped, usersMap) : null;
      }
    } catch (e) {
      isPostgresAvailable = false;
    }
  }

  // Fallback to local store
  const cars = getLocalCars();
  const found = cars.find((c) => c.id === id);
  if (found) {
    found.views = (found.views || 0) + 1;
    saveLocalCars(cars);
    return hydrateCarPhotographers(found, usersMap);
  }
  return null;
}

export async function insertCarIntoDb(car: CarPhoto): Promise<CarPhoto> {
  // Always update local store
  const cars = getLocalCars();
  const updatedCars = [car, ...cars.filter((c) => c.id !== car.id)];
  saveLocalCars(updatedCars);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO cars (
          id, plate_number, state, car_name, make, model, year, color, event, location, date,
          photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
          photographer_venmo, photographer_paypal, photographer_cashapp,
          image_url, images, photo_authors, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22::jsonb, $23, $24, $25::jsonb, $26, $27, $28, $29, $30)
        ON CONFLICT (id) DO UPDATE SET
          plate_number = EXCLUDED.plate_number,
          state = EXCLUDED.state,
          car_name = EXCLUDED.car_name,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          color = EXCLUDED.color,
          event = EXCLUDED.event,
          location = EXCLUDED.location,
          date = EXCLUDED.date,
          photographer_name = EXCLUDED.photographer_name,
          photographer_title = EXCLUDED.photographer_title,
          photographer_avatar = EXCLUDED.photographer_avatar,
          photographer_bio = EXCLUDED.photographer_bio,
          photographer_instagram = EXCLUDED.photographer_instagram,
          photographer_venmo = EXCLUDED.photographer_venmo,
          photographer_paypal = EXCLUDED.photographer_paypal,
          photographer_cashapp = EXCLUDED.photographer_cashapp,
          images = EXCLUDED.images,
          photo_authors = EXCLUDED.photo_authors,
          image_url = EXCLUDED.image_url,
          cartoon_image_url = EXCLUDED.cartoon_image_url,
          has_cartoon = EXCLUDED.has_cartoon,
          tags = EXCLUDED.tags,
          resolution = EXCLUDED.resolution,
          camera_info = EXCLUDED.camera_info`,
        [
          car.id,
          car.plateNumber || '',
          car.state || '',
          car.carName || '',
          car.make || '',
          car.model || '',
          car.year || null,
          car.color || '',
          car.event || '',
          car.location || '',
          car.date || '',
          car.photographer?.name || 'Photographer',
          car.photographer?.title || 'Photographer',
          car.photographer?.avatar || '',
          car.photographer?.bio || '',
          car.photographer?.instagram || '',
          car.photographer?.venmoHandle || '',
          car.photographer?.payPalHandle || '',
          car.photographer?.cashAppHandle || '',
          car.imageUrl,
          JSON.stringify(car.images || [car.imageUrl]),
          JSON.stringify(car.photoAuthors || {}),
          car.cartoonImageUrl || null,
          Boolean(car.hasCartoon),
          JSON.stringify(car.tags || []),
          car.views || 1,
          car.downloads || 0,
          car.resolution || '',
          car.cameraInfo || '',
          car.createdAt || new Date().toISOString(),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL Insert] Postgres unavailable, saved locally only:', err.message);
      isPostgresAvailable = false;
    }
  }

  return car;
}

export async function updateCarInDb(id: string, updates: Partial<CarPhoto>): Promise<CarPhoto | null> {
  const cars = getLocalCars();
  const index = cars.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const existing = cars[index];
  const updated: CarPhoto = {
    ...existing,
    ...updates,
    photographer: {
      ...existing.photographer,
      ...(updates.photographer || {}),
    },
    photoAuthors: {
      ...(existing.photoAuthors || {}),
      ...(updates.photoAuthors || {}),
    },
  };
  cars[index] = updated;
  saveLocalCars(cars);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `UPDATE cars SET
          plate_number = COALESCE($1, plate_number),
          state = $2,
          car_name = COALESCE($3, car_name),
          make = COALESCE($4, make),
          model = COALESCE($5, model),
          year = $6,
          color = COALESCE($7, color),
          event = COALESCE($8, event),
          location = COALESCE($9, location),
          image_url = COALESCE($10, image_url),
          images = COALESCE($11::jsonb, images),
          photo_authors = COALESCE($12::jsonb, photo_authors),
          cartoon_image_url = $13,
          has_cartoon = COALESCE($14, has_cartoon),
          tags = COALESCE($15::jsonb, tags),
          photographer_name = COALESCE($16, photographer_name),
          photographer_title = COALESCE($17, photographer_title),
          photographer_avatar = COALESCE($18, photographer_avatar),
          photographer_bio = COALESCE($19, photographer_bio),
          photographer_instagram = COALESCE($20, photographer_instagram),
          photographer_venmo = COALESCE($21, photographer_venmo),
          photographer_paypal = COALESCE($22, photographer_paypal),
          photographer_cashapp = COALESCE($23, photographer_cashapp),
          resolution = COALESCE($24, resolution),
          camera_info = COALESCE($25, camera_info)
        WHERE id = $26`,
        [
          updates.plateNumber !== undefined ? updates.plateNumber : null,
          updates.state !== undefined ? updates.state : existing.state || null,
          updates.carName !== undefined ? updates.carName : null,
          updates.make !== undefined ? updates.make : null,
          updates.model !== undefined ? updates.model : null,
          updates.year !== undefined ? updates.year : existing.year || null,
          updates.color !== undefined ? updates.color : null,
          updates.event !== undefined ? updates.event : null,
          updates.location !== undefined ? updates.location : null,
          updates.imageUrl !== undefined ? updates.imageUrl : null,
          updates.images ? JSON.stringify(updates.images) : null,
          updates.photoAuthors ? JSON.stringify(updates.photoAuthors) : null,
          updates.cartoonImageUrl !== undefined ? updates.cartoonImageUrl : existing.cartoonImageUrl,
          updates.hasCartoon !== undefined ? updates.hasCartoon : existing.hasCartoon,
          updates.tags ? JSON.stringify(updates.tags) : null,
          updates.photographer?.name !== undefined ? updates.photographer.name : null,
          updates.photographer?.title !== undefined ? updates.photographer.title : null,
          updates.photographer?.avatar !== undefined ? updates.photographer.avatar : null,
          updates.photographer?.bio !== undefined ? updates.photographer.bio : null,
          updates.photographer?.instagram !== undefined ? updates.photographer.instagram : null,
          updates.photographer?.venmoHandle !== undefined ? updates.photographer.venmoHandle : null,
          updates.photographer?.payPalHandle !== undefined ? updates.photographer.payPalHandle : null,
          updates.photographer?.cashAppHandle !== undefined ? updates.photographer.cashAppHandle : null,
          updates.resolution !== undefined ? updates.resolution : null,
          updates.cameraInfo !== undefined ? updates.cameraInfo : null,
          id,
        ]
      );
    } catch (e: any) {
      console.warn('[PostgreSQL Update] Postgres unavailable, updated locally:', e.message);
      isPostgresAvailable = false;
    }
  }

  return updated;
}

export async function deleteCarFromDb(id: string): Promise<boolean> {
  const cars = getLocalCars();
  const filtered = cars.filter((c) => c.id !== id);
  saveLocalCars(filtered);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query('DELETE FROM cars WHERE id = $1', [id]);
    } catch (e) {
      isPostgresAvailable = false;
    }
  }

  return true;
}

export async function incrementDownloadInDb(id: string): Promise<number> {
  const cars = getLocalCars();
  const car = cars.find((c) => c.id === id);
  let downloads = 1;
  if (car) {
    car.downloads = (car.downloads || 0) + 1;
    downloads = car.downloads;
    saveLocalCars(cars);
  }

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const res = await pool.query(
        'UPDATE cars SET downloads = downloads + 1 WHERE id = $1 RETURNING downloads',
        [id]
      );
      if (res.rows.length > 0) {
        downloads = res.rows[0].downloads;
      }
    } catch (e) {
      isPostgresAvailable = false;
    }
  }

  return downloads;
}

export async function getThemeFromDb(): Promise<AppThemeConfig | null> {
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const result = await pool.query("SELECT value FROM app_settings WHERE key = 'theme'");
      if (result.rows.length > 0) {
        return result.rows[0].value;
      }
    } catch (e) {
      isPostgresAvailable = false;
    }
  }
  return getLocalTheme();
}

export async function saveThemeToDb(theme: AppThemeConfig): Promise<void> {
  saveLocalTheme(theme);
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(theme)]
      );
    } catch (e) {
      isPostgresAvailable = false;
    }
  }
}

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
    if (Array.isArray(parsed) && parsed.length > 0) {
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
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('[Database Fallback] Error reading local theme:', e);
  }
  return DEFAULT_THEMES[0] || null;
}

export function saveLocalTheme(theme: AppThemeConfig): void {
  try {
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
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cars (
        id VARCHAR(128) PRIMARY KEY,
        plate_number VARCHAR(64) NOT NULL,
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

      ALTER TABLE cars ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photo_authors JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photographer_venmo VARCHAR(128);
      ALTER TABLE cars ADD COLUMN IF NOT EXISTS photographer_paypal VARCHAR(128);

      CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);
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
        id, username, name, email, password, role, avatar, bio, instagram, venmo_handle, paypal_handle, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        photographer_venmo, photographer_paypal,
        image_url, images, photo_authors, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21, $22, $23::jsonb, $24, $25, $26, $27, $28)
      ON CONFLICT (id) DO NOTHING`,
      [
        car.id,
        car.plateNumber,
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
    plateNumber: row.plate_number,
    carName: row.car_name,
    make: row.make,
    model: row.model,
    year: row.year,
    color: row.color,
    event: row.event,
    location: row.location,
    date: row.date,
    photographer: {
      name: row.photographer_name || 'Alex Rivera',
      title: row.photographer_title || 'Automotive Photographer',
      avatar: row.photographer_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      bio: row.photographer_bio || '',
      instagram: row.photographer_instagram || '',
      venmoHandle: row.photographer_venmo || '',
      payPalHandle: row.photographer_paypal || '',
    },
    imageUrl: row.image_url,
    images: parsedImages,
    photoAuthors: parsedPhotoAuthors,
    cartoonImageUrl: row.cartoon_image_url || null,
    hasCartoon: Boolean(row.has_cartoon),
    tags: parsedTags,
    views: row.views || 0,
    downloads: row.downloads || 0,
    resolution: row.resolution || 'High Resolution • 300 DPI',
    cameraInfo: row.camera_info || 'Pro Camera • 50mm',
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
    isActive: row.is_active ?? true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    password: row.password,
  };
}

// ----------------------------------------------------
// User Management Functions (Postgres + Fallback)
// ----------------------------------------------------
export async function getAllUsersFromDb(): Promise<UserAccount[]> {
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const result = await pool.query('SELECT id, username, name, email, role, avatar, bio, instagram, venmo_handle, paypal_handle, is_active, created_at FROM users ORDER BY created_at ASC');
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
    return safeUser;
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

export async function createUserInDb(
  userData: Partial<UserAccount>,
  password = 'shooter2026'
): Promise<UserAccount> {
  const newUser: UserAccount & { password?: string } = {
    id: userData.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: (userData.username || `photog_${Date.now()}`).toLowerCase().trim(),
    name: userData.name || 'Automotive Photographer',
    email: userData.email || '',
    role: userData.role === 'admin' ? 'admin' : 'photographer',
    avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    bio: userData.bio || 'Automotive shooter and car enthusiast.',
    instagram: userData.instagram || '',
    venmoHandle: userData.venmoHandle || '',
    payPalHandle: userData.payPalHandle || '',
    isActive: userData.isActive ?? true,
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
          id, username, name, email, password, role, avatar, bio, instagram, venmo_handle, paypal_handle, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          is_active = EXCLUDED.is_active`,
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
          newUser.isActive,
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
    password: updates.password ? updates.password : existing.password,
  };
  local[idx] = updatedUser;
  saveLocalUsers(local);

  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      await pool.query(
        `UPDATE users SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          role = COALESCE($3, role),
          avatar = COALESCE($4, avatar),
          bio = COALESCE($5, bio),
          instagram = COALESCE($6, instagram),
          venmo_handle = COALESCE($7, venmo_handle),
          paypal_handle = COALESCE($8, paypal_handle),
          is_active = COALESCE($9, is_active),
          password = COALESCE($10, password)
        WHERE id = $11`,
        [
          updates.name || null,
          updates.email !== undefined ? updates.email : null,
          updates.role || null,
          updates.avatar !== undefined ? updates.avatar : null,
          updates.bio !== undefined ? updates.bio : null,
          updates.instagram !== undefined ? updates.instagram : null,
          updates.venmoHandle !== undefined ? updates.venmoHandle : null,
          updates.payPalHandle !== undefined ? updates.payPalHandle : null,
          updates.isActive !== undefined ? updates.isActive : null,
          updates.password || null,
          id,
        ]
      );
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
    title: u.role === 'admin' ? 'Lead Automotive Photographer' : 'Automotive Photographer',
    avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    bio: u.bio,
    instagram: u.instagram,
    venmoHandle: u.venmoHandle,
    payPalHandle: u.payPalHandle,
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
      return result.rows.map(mapRowToCar).filter(Boolean) as CarPhoto[];
    } catch (err: any) {
      console.warn('[PostgreSQL Search] Query failed, falling back to local store:', err.message);
      isPostgresAvailable = false;
    }
  }

  // File repository fallback search with full fuzzy matching
  const allCars = getLocalCars();
  const q = (query || '').trim().toLowerCase();
  const cleanQ = q.replace(/[\s\-_.]/g, '');

  return allCars.filter((car) => {
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
}

// ----------------------------------------------------
// Unified CRUD Operations
// ----------------------------------------------------
export async function getCarByIdFromDb(id: string): Promise<CarPhoto | null> {
  if (isPostgresAvailable) {
    try {
      const pool = getPgPool();
      const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        await pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [id]).catch(() => {});
        return mapRowToCar(result.rows[0]);
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
    return found;
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
          id, plate_number, car_name, make, model, year, color, event, location, date,
          photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
          photographer_venmo, photographer_paypal,
          image_url, images, photo_authors, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21, $22, $23::jsonb, $24, $25, $26, $27, $28)
        ON CONFLICT (id) DO UPDATE SET
          plate_number = EXCLUDED.plate_number,
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
          car.plateNumber,
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
          car.photographer?.venmoHandle || '',
          car.photographer?.payPalHandle || '',
          car.imageUrl,
          JSON.stringify(car.images || [car.imageUrl]),
          JSON.stringify(car.photoAuthors || {}),
          car.cartoonImageUrl || null,
          Boolean(car.hasCartoon),
          JSON.stringify(car.tags || []),
          car.views || 1,
          car.downloads || 0,
          car.resolution || 'High Resolution • 300 DPI',
          car.cameraInfo || 'Sony Alpha',
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
          car_name = COALESCE($2, car_name),
          make = COALESCE($3, make),
          model = COALESCE($4, model),
          year = COALESCE($5, year),
          color = COALESCE($6, color),
          event = COALESCE($7, event),
          location = COALESCE($8, location),
          image_url = COALESCE($9, image_url),
          images = COALESCE($10::jsonb, images),
          photo_authors = COALESCE($11::jsonb, photo_authors),
          cartoon_image_url = $12,
          has_cartoon = COALESCE($13, has_cartoon),
          tags = COALESCE($14::jsonb, tags),
          photographer_name = COALESCE($15, photographer_name),
          photographer_title = COALESCE($16, photographer_title),
          photographer_avatar = COALESCE($17, photographer_avatar),
          photographer_bio = COALESCE($18, photographer_bio),
          photographer_instagram = COALESCE($19, photographer_instagram),
          photographer_venmo = COALESCE($20, photographer_venmo),
          photographer_paypal = COALESCE($21, photographer_paypal)
        WHERE id = $22`,
        [
          updates.plateNumber || null,
          updates.carName || null,
          updates.make || null,
          updates.model || null,
          updates.year || null,
          updates.color || null,
          updates.event || null,
          updates.location || null,
          updates.imageUrl || null,
          updates.images ? JSON.stringify(updates.images) : null,
          updates.photoAuthors ? JSON.stringify(updates.photoAuthors) : null,
          updates.cartoonImageUrl !== undefined ? updates.cartoonImageUrl : existing.cartoonImageUrl,
          updates.hasCartoon !== undefined ? updates.hasCartoon : existing.hasCartoon,
          updates.tags ? JSON.stringify(updates.tags) : null,
          updates.photographer?.name || null,
          updates.photographer?.title || null,
          updates.photographer?.avatar || null,
          updates.photographer?.bio || null,
          updates.photographer?.instagram || null,
          updates.photographer?.venmoHandle || null,
          updates.photographer?.payPalHandle || null,
          id,
        ]
      );
    } catch (e: any) {
      console.warn('[PostgreSQL Update] Postgres unavailable, updated locally only:', e.message);
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

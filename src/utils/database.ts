import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { CarPhoto, AppThemeConfig } from '../types';
import { INITIAL_CAR_PHOTOS, DEFAULT_THEMES } from '../data/initialData';

let pgPool: Pool | null = null;
let isPostgresAvailable = false;
let isCheckingPostgres = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const CARS_JSON_PATH = path.join(DATA_DIR, 'cars.json');
const THEME_JSON_PATH = path.join(DATA_DIR, 'theme.json');

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

    pgPool.on('error', (err) => {
      // Don't crash process on connection drops
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

    // Create Schema & ensure images column exists
    await pool.query(`
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
        image_url TEXT NOT NULL,
        images JSONB DEFAULT '[]'::jsonb,
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

      CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);
      CREATE INDEX IF NOT EXISTS idx_cars_make ON cars(make);
      CREATE INDEX IF NOT EXISTS idx_cars_event ON cars(event);
      CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(128) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

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
      `[Database Engine] PostgreSQL instance not reachable (${err.message}). Using high-performance file repository at data/cars.json.`
    );
  } finally {
    isCheckingPostgres = false;
  }
}

async function seedDefaultCars(pool: Pool) {
  const initialCars = getLocalCars();

  for (const car of initialCars) {
    await pool.query(
      `INSERT INTO cars (
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        image_url, images, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20::jsonb, $21, $22, $23, $24, $25)
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
        car.imageUrl,
        JSON.stringify(car.images || [car.imageUrl]),
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
    parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
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
      name: row.photographer_name || "Unknown Shooter",
      title: row.photographer_title || "Automotive Photographer",
      avatar: row.photographer_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      bio: row.photographer_bio || "",
      instagram: row.photographer_instagram || "",
    },
    imageUrl: row.image_url,
    images: parsedImages,
    cartoonImageUrl: row.cartoon_image_url || null,
    hasCartoon: Boolean(row.has_cartoon),
    tags: parsedTags,
    views: row.views || 0,
    downloads: row.downloads || 0,
    resolution: row.resolution || "High Resolution • 300 DPI",
    cameraInfo: row.camera_info || "Pro Camera • 50mm",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

// ----------------------------------------------------
// Unified Search Function (Postgres + Fallback)
// ----------------------------------------------------
export async function searchCarsInPostgres(query: string, eventFilter?: string, tagFilter?: string): Promise<CarPhoto[]> {
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
          image_url, images, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20::jsonb, $21, $22, $23, $24, $25)
        ON CONFLICT (id) DO UPDATE SET
          plate_number = EXCLUDED.plate_number,
          car_name = EXCLUDED.car_name,
          images = EXCLUDED.images,
          image_url = EXCLUDED.image_url`,
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
          car.imageUrl,
          JSON.stringify(car.images || [car.imageUrl]),
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
          cartoon_image_url = $11,
          has_cartoon = COALESCE($12, has_cartoon),
          tags = COALESCE($13::jsonb, tags)
        WHERE id = $14`,
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
          updates.cartoonImageUrl !== undefined ? updates.cartoonImageUrl : existing.cartoonImageUrl,
          updates.hasCartoon !== undefined ? updates.hasCartoon : existing.hasCartoon,
          updates.tags ? JSON.stringify(updates.tags) : null,
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


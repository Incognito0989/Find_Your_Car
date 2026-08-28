import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cars.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: SqlJsDatabase | null = null;

export async function getSqliteDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      console.log(`[SQLite] Loaded existing database from ${DB_FILE}`);
    } catch (err) {
      console.error('[SQLite] Error reading existing database file, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log(`[SQLite] Creating new database file at ${DB_FILE}`);
    dbInstance = new SQL.Database();
  }

  initializeSchema(dbInstance);
  saveDatabaseToDisk(dbInstance);
  return dbInstance;
}

export function saveDatabaseToDisk(db: SqlJsDatabase) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[SQLite] Failed to persist database to disk:', err);
  }
}

function initializeSchema(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS cars (
      id TEXT PRIMARY KEY,
      plate_number TEXT NOT NULL,
      car_name TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      color TEXT,
      event TEXT,
      location TEXT,
      date TEXT,
      photographer_name TEXT,
      photographer_title TEXT,
      photographer_avatar TEXT,
      photographer_bio TEXT,
      photographer_instagram TEXT,
      image_url TEXT NOT NULL,
      cartoon_image_url TEXT,
      has_cartoon INTEGER DEFAULT 0,
      tags TEXT,
      views INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      resolution TEXT,
      camera_info TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // Check if we need to seed initial cars
  const stmt = db.prepare('SELECT COUNT(*) as count FROM cars');
  let count = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { count: number };
    count = row.count;
  }
  stmt.free();

  if (count === 0) {
    console.log('[SQLite] Empty database detected. Seeding initial vehicle records...');
    seedDefaultCars(db);
  }
}

function seedDefaultCars(db: SqlJsDatabase) {
  const initialCars = [
    {
      id: "car-1",
      plate_number: "7XYZ999",
      car_name: "Porsche 911 GT3 RS",
      make: "Porsche",
      model: "911 GT3 RS (992)",
      year: 2024,
      color: "Python Green / Carbon",
      event: "Apex Laguna Seca Invitational",
      location: "Laguna Seca Raceway, Monterey CA",
      date: "October 24, 2023 • 4:32 PM",
      photographer_name: process.env.ADMIN_NAME || "Alex Rivera",
      photographer_title: "Automotive Photographer",
      photographer_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      photographer_bio: "Motorsport & track day specialist capturing high-velocity supercars worldwide.",
      photographer_instagram: "@rivera_motorsport",
      image_url: "https://images.unsplash.com/photo-1603584173870-7f3d5128759b?auto=format&fit=crop&q=80&w=1400",
      cartoon_image_url: null,
      has_cartoon: 0,
      tags: JSON.stringify(["Porsche", "GT3RS", "TrackDay", "LagunaSeca", "Supercar", "992"]),
      views: 1420,
      downloads: 384,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Sony Alpha • 70-200mm f/2.8 GM II • 1/2000s • ISO 100",
      created_at: "2023-10-24T16:32:00Z"
    },
    {
      id: "car-2",
      plate_number: "M4-PERF",
      car_name: "BMW M4 Competition",
      make: "BMW",
      model: "M4 Competition G82",
      year: 2023,
      color: "Yas Marina Blue",
      event: "Sunset Canyon Run LA",
      location: "Angeles Crest Highway, Los Angeles CA",
      date: "October 24, 2023 • 3:15 PM",
      photographer_name: "Marcus Vance",
      photographer_title: "Commercial Car Shooter",
      photographer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      photographer_bio: "Automotive commercial director and canyon carving enthusiast.",
      photographer_instagram: "@vance_visuals",
      image_url: "https://images.unsplash.com/photo-1614200179396-2bdb77ee4a31?auto=format&fit=crop&q=80&w=1400",
      cartoon_image_url: null,
      has_cartoon: 0,
      tags: JSON.stringify(["BMW", "M4", "Competition", "CanyonRun", "G82", "Turbo"]),
      views: 980,
      downloads: 215,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Canon R5 • 50mm f/1.2 L • 1/1600s • ISO 100",
      created_at: "2023-10-24T15:15:00Z"
    },
    {
      id: "car-3",
      plate_number: "MIATA-91",
      car_name: "Mazda Miata MX-5",
      make: "Mazda",
      model: "Miata NA Special",
      year: 1991,
      color: "Classic Red / White Hardtop",
      event: "Gridlife Midwest Festival",
      location: "South Haven, MI",
      date: "October 22, 2023 • 2:10 PM",
      photographer_name: "Tyler Chen",
      photographer_title: "Trackside Journalist",
      photographer_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
      photographer_bio: "Covering grassroots drifting and time-attack builds nationwide.",
      photographer_instagram: "@tchen_shutter",
      image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=1400",
      cartoon_image_url: null,
      has_cartoon: 0,
      tags: JSON.stringify(["Mazda", "Miata", "NA", "JDM", "PopUpHeadlights", "Grassroots"]),
      views: 2150,
      downloads: 740,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Nikon Z9 • 85mm f/1.4 • 1/3200s • ISO 64",
      created_at: "2023-10-22T14:10:00Z"
    },
    {
      id: "car-4",
      plate_number: "GODZLA",
      car_name: "Nissan Skyline GT-R R34",
      make: "Nissan",
      model: "Skyline GT-R V-Spec II",
      year: 2001,
      color: "Bayside Blue",
      event: "Supercar Saturday Cars & Coffee",
      location: "Irvine, CA",
      date: "October 20, 2023 • 9:45 AM",
      photographer_name: process.env.ADMIN_NAME || "Alex Rivera",
      photographer_title: "Automotive Photographer",
      photographer_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      photographer_bio: "Motorsport & track day specialist capturing high-velocity supercars worldwide.",
      photographer_instagram: "@rivera_motorsport",
      image_url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1400",
      cartoon_image_url: null,
      has_cartoon: 0,
      tags: JSON.stringify(["Nissan", "Skyline", "GTR", "R34", "BaysideBlue", "JDM", "Legend"]),
      views: 3410,
      downloads: 1290,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Sony Alpha • 24-70mm f/2.8 GM • 1/1000s • ISO 100",
      created_at: "2023-10-20T09:45:00Z"
    }
  ];

  for (const car of initialCars) {
    db.run(
      `INSERT INTO cars (
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        image_url, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        car.id,
        car.plate_number,
        car.car_name,
        car.make,
        car.model,
        car.year,
        car.color,
        car.event,
        car.location,
        car.date,
        car.photographer_name,
        car.photographer_title,
        car.photographer_avatar,
        car.photographer_bio,
        car.photographer_instagram,
        car.image_url,
        car.cartoon_image_url,
        car.has_cartoon,
        car.tags,
        car.views,
        car.downloads,
        car.resolution,
        car.camera_info,
        car.created_at,
      ]
    );
  }
}

export function mapRowToCar(row: any) {
  if (!row) return null;
  let parsedTags: string[] = [];
  try {
    parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
  } catch {
    parsedTags = row.tags ? String(row.tags).split(',').map((s: string) => s.trim()) : [];
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
    cartoonImageUrl: row.cartoon_image_url || null,
    hasCartoon: Boolean(row.has_cartoon),
    tags: parsedTags,
    views: row.views || 0,
    downloads: row.downloads || 0,
    resolution: row.resolution || "High Resolution • 300 DPI",
    cameraInfo: row.camera_info || "Pro Camera • 50mm",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function searchCarsInDatabase(db: SqlJsDatabase, query: string, eventFilter?: string, tagFilter?: string) {
  let sql = `SELECT * FROM cars WHERE 1=1`;
  const params: any[] = [];

  if (query && query.trim()) {
    const q = query.trim();
    const cleanPlate = q.replace(/[\s\-_.]/g, '');

    sql += ` AND (
      REPLACE(REPLACE(REPLACE(UPPER(plate_number), ' ', ''), '-', ''), '_', '') LIKE UPPER(?)
      OR UPPER(plate_number) LIKE UPPER(?)
      OR UPPER(car_name) LIKE UPPER(?)
      OR UPPER(make) LIKE UPPER(?)
      OR UPPER(model) LIKE UPPER(?)
      OR UPPER(event) LIKE UPPER(?)
      OR UPPER(location) LIKE UPPER(?)
      OR UPPER(photographer_name) LIKE UPPER(?)
      OR UPPER(tags) LIKE UPPER(?)
      OR CAST(year AS TEXT) LIKE ?
    )`;
    const p1 = `%${cleanPlate}%`;
    const p2 = `%${q}%`;
    params.push(p1, p2, p2, p2, p2, p2, p2, p2, p2, p2);
  }

  if (eventFilter && eventFilter !== 'All Events' && eventFilter.trim()) {
    sql += ` AND event = ?`;
    params.push(eventFilter.trim());
  }

  if (tagFilter && tagFilter.trim()) {
    sql += ` AND UPPER(tags) LIKE UPPER(?)`;
    params.push(`%${tagFilter.trim()}%`);
  }

  sql += ` ORDER BY created_at DESC`;

  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  return rows.map(mapRowToCar);
}

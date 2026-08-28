import { Pool } from 'pg';

let pgPool: Pool | null = null;

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
    console.log(`[PostgreSQL] Initializing connection pool (host: ${process.env.POSTGRES_HOST || 'postgres'})...`);
    pgPool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected client error on idle connection:', err);
    });
  }
  return pgPool;
}

export async function initializePostgresDatabase(): Promise<void> {
  const pool = getPgPool();
  let connected = false;
  let attempts = 0;
  const maxAttempts = 15;

  while (!connected && attempts < maxAttempts) {
    try {
      attempts++;
      const client = await pool.connect();
      client.release();
      connected = true;
      console.log('[PostgreSQL] Connected to PostgreSQL database successfully!');
    } catch (err: any) {
      console.log(`[PostgreSQL] Waiting for PostgreSQL container to boot up... (Attempt ${attempts}/${maxAttempts})`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  if (!connected) {
    console.warn('[PostgreSQL] Could not connect to PostgreSQL immediately. Background retry will occur upon request.');
    return;
  }

  // Create Schema
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
      cartoon_image_url TEXT,
      has_cartoon BOOLEAN DEFAULT FALSE,
      tags JSONB DEFAULT '[]'::jsonb,
      views INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      resolution VARCHAR(128),
      camera_info VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

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
}

async function seedDefaultCars(pool: Pool) {
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
      has_cartoon: false,
      tags: JSON.stringify(["Porsche", "GT3RS", "TrackDay", "LagunaSeca", "Supercar", "992"]),
      views: 1420,
      downloads: 384,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Sony Alpha • 70-200mm f/2.8 GM II • 1/2000s • ISO 100",
      created_at: new Date("2023-10-24T16:32:00Z")
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
      has_cartoon: false,
      tags: JSON.stringify(["BMW", "M4", "Competition", "CanyonRun", "G82", "Turbo"]),
      views: 980,
      downloads: 215,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Canon R5 • 50mm f/1.2 L • 1/1600s • ISO 100",
      created_at: new Date("2023-10-24T15:15:00Z")
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
      has_cartoon: false,
      tags: JSON.stringify(["Mazda", "Miata", "NA", "JDM", "PopUpHeadlights", "Grassroots"]),
      views: 2150,
      downloads: 740,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Nikon Z9 • 85mm f/1.4 • 1/3200s • ISO 64",
      created_at: new Date("2023-10-22T14:10:00Z")
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
      has_cartoon: false,
      tags: JSON.stringify(["Nissan", "Skyline", "GTR", "R34", "BaysideBlue", "JDM", "Legend"]),
      views: 3410,
      downloads: 1290,
      resolution: "High Resolution • 300 DPI",
      camera_info: "Sony Alpha • 24-70mm f/2.8 GM • 1/1000s • ISO 100",
      created_at: new Date("2023-10-20T09:45:00Z")
    }
  ];

  for (const car of initialCars) {
    await pool.query(
      `INSERT INTO cars (
        id, plate_number, car_name, make, model, year, color, event, location, date,
        photographer_name, photographer_title, photographer_avatar, photographer_bio, photographer_instagram,
        image_url, cartoon_image_url, has_cartoon, tags, views, downloads, resolution, camera_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO NOTHING`,
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
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function searchCarsInPostgres(query: string, eventFilter?: string, tagFilter?: string) {
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
  return result.rows.map(mapRowToCar);
}

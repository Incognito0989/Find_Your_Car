import { CarPhoto, AppThemeConfig } from '../types';

export const DEFAULT_THEMES: AppThemeConfig[] = [
  {
    id: 'apple-dark',
    name: 'Apple Stealth (Default Dark)',
    isDark: true,
    primary: '#0A84FF',
    primaryHover: '#0070E0',
    bg: '#000000',
    cardBg: '#111111',
    cardBorder: '#2C2C2E',
    textMain: '#FFFFFF',
    textMuted: '#9CA3AF',
    navBg: 'rgba(0, 0, 0, 0.55)',
    searchBg: '#1C1C1E',
    badgeBg: 'rgba(0, 0, 0, 0.75)',
    badgeBorder: '#2C2C2E',
    badgeText: '#FFFFFF',
    glow: '0 0 25px rgba(10, 132, 255, 0.25)',
    videoOpacity: 0.5,
    radius: 24,
  },
  {
    id: 'pure-nordic-light',
    name: 'Pure Nordic Minimalist (Light)',
    isDark: false,
    primary: '#0A84FF',
    primaryHover: '#0066CC',
    bg: '#FAFAFA',
    cardBg: '#FFFFFF',
    cardBorder: '#E5E5E7',
    textMain: '#1C1C1E',
    textMuted: '#636366',
    navBg: 'rgba(255, 255, 255, 0.8)',
    searchBg: '#F2F2F7',
    badgeBg: 'rgba(255, 255, 255, 0.85)',
    badgeBorder: '#E5E5E7',
    badgeText: '#1C1C1E',
    glow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    videoOpacity: 0.1,
    radius: 24,
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight Cyber',
    isDark: true,
    primary: '#00F5D4',
    primaryHover: '#00D9BC',
    bg: '#08080C',
    cardBg: '#12121A',
    cardBorder: '#242438',
    textMain: '#F8F9FA',
    textMuted: '#9D9DB8',
    navBg: 'rgba(8, 8, 12, 0.75)',
    searchBg: '#181824',
    badgeBg: 'rgba(18, 18, 26, 0.85)',
    badgeBorder: '#00F5D4',
    badgeText: '#00F5D4',
    glow: '0 0 30px rgba(0, 245, 212, 0.3)',
    videoOpacity: 0.6,
    radius: 20,
  },
  {
    id: 'nurburgring-track',
    name: 'Nürburgring Apex Red',
    isDark: true,
    primary: '#FF2A54',
    primaryHover: '#E01E45',
    bg: '#0A0A0A',
    cardBg: '#141414',
    cardBorder: '#2A2A2A',
    textMain: '#FFFFFF',
    textMuted: '#A0A0A0',
    navBg: 'rgba(10, 10, 10, 0.75)',
    searchBg: '#1E1E1E',
    badgeBg: 'rgba(20, 20, 20, 0.85)',
    badgeBorder: '#FF2A54',
    badgeText: '#FFFFFF',
    glow: '0 0 30px rgba(255, 42, 84, 0.25)',
    videoOpacity: 0.55,
    radius: 24,
  },
  {
    id: 'monaco-gold',
    name: 'Monaco Luxury Gold',
    isDark: true,
    primary: '#FFB703',
    primaryHover: '#E6A200',
    bg: '#0B0B0D',
    cardBg: '#16161A',
    cardBorder: '#323028',
    textMain: '#FDFEFE',
    textMuted: '#A8A69E',
    navBg: 'rgba(11, 11, 13, 0.75)',
    searchBg: '#1D1D24',
    badgeBg: 'rgba(22, 22, 26, 0.9)',
    badgeBorder: '#FFB703',
    badgeText: '#FFB703',
    glow: '0 0 30px rgba(255, 183, 3, 0.25)',
    videoOpacity: 0.5,
    radius: 24,
  },
  {
    id: 'electric-amethyst',
    name: 'Electric Amethyst',
    isDark: true,
    primary: '#A855F7',
    primaryHover: '#9333EA',
    bg: '#09070F',
    cardBg: '#130F1E',
    cardBorder: '#2E2248',
    textMain: '#F9F8FD',
    textMuted: '#9B92B0',
    navBg: 'rgba(9, 7, 15, 0.75)',
    searchBg: '#1A142A',
    badgeBg: 'rgba(19, 15, 30, 0.9)',
    badgeBorder: '#A855F7',
    badgeText: '#E9D5FF',
    glow: '0 0 30px rgba(168, 85, 247, 0.25)',
    videoOpacity: 0.55,
    radius: 24,
  }
];

// High quality cartoon SVGs and images for cars matching the exact requested cartoon aesthetic
export const SAMPLE_CARTOON_MIATA_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(100, 100) scale(0.75)">
    <!-- Car Body Base Shadow -->
    <path d="M 120,430 C 100,430 80,420 80,390 L 80,330 C 80,280 120,230 180,210 C 240,190 320,180 400,180 C 480,180 560,190 620,210 C 680,230 720,280 720,330 L 720,390 C 720,420 700,430 680,430 Z" fill="%23FA7B8C" stroke="%23000000" stroke-width="12" stroke-linejoin="round"/>
    
    <!-- Wheels and Stance -->
    <path d="M 80,330 L 60,340 L 70,440 L 120,440 L 110,380 Z" fill="%231E1E1E" stroke="%23000000" stroke-width="10"/>
    <path d="M 720,330 L 740,340 L 730,440 L 680,440 L 690,380 Z" fill="%231E1E1E" stroke="%23000000" stroke-width="10"/>

    <!-- Windshield and Frame -->
    <path d="M 230,200 L 260,100 C 270,75 320,65 400,65 C 480,65 530,75 540,100 L 570,200 Z" fill="%23FA7B8C" stroke="%23000000" stroke-width="12"/>
    <path d="M 270,190 L 290,110 C 300,95 340,85 400,85 C 460,85 500,95 510,110 L 530,190 Z" fill="%232D3136" stroke="%23000000" stroke-width="8"/>

    <!-- Hood & Pop-up Headlights -->
    <!-- Left Pop-up -->
    <rect x="165" y="140" width="115" height="115" rx="12" fill="%23111111" stroke="%23000000" stroke-width="10"/>
    <circle cx="222" cy="198" r="42" fill="%23F3F3F3" stroke="%23000000" stroke-width="8"/>
    
    <!-- Right Pop-up (Taped 'X' track style) -->
    <rect x="520" y="140" width="115" height="115" rx="12" fill="%23111111" stroke="%23000000" stroke-width="10"/>
    <circle cx="578" cy="198" r="42" fill="%23F3F3F3" stroke="%23000000" stroke-width="8"/>
    <line x1="548" y1="168" x2="608" y2="228" stroke="%23000000" stroke-width="9"/>
    <line x1="608" y1="168" x2="548" y2="228" stroke="%23000000" stroke-width="9"/>

    <!-- Turn Signals / Indicator Lights -->
    <rect x="155" y="290" width="125" height="35" rx="10" fill="%23F5BC38" stroke="%23000000" stroke-width="8"/>
    <rect x="520" y="290" width="125" height="35" rx="10" fill="%23F5BC38" stroke="%23000000" stroke-width="8"/>

    <!-- Miata Smile / Happy Grille -->
    <path d="M 270,390 C 270,440 530,440 530,390 C 530,370 270,370 270,390 Z" fill="%23382736" stroke="%23000000" stroke-width="10"/>
    <path d="M 300,410 C 350,430 450,430 500,410 Z" fill="%231D121B"/>

    <!-- Front Lip Details & Tow Hook -->
    <rect x="200" y="445" width="55" height="22" rx="6" fill="%23111111" stroke="%23000000" stroke-width="6"/>
  </g>
</svg>`;

export const SAMPLE_CARTOON_PORSCHE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(100, 100) scale(0.75)">
    <!-- GT3 RS Massive Wing -->
    <rect x="120" y="40" width="560" height="30" rx="8" fill="%231A1A1A" stroke="%23000000" stroke-width="10"/>
    <line x1="240" y1="70" x2="260" y2="150" stroke="%23000000" stroke-width="12"/>
    <line x1="560" y1="70" x2="540" y2="150" stroke="%23000000" stroke-width="12"/>

    <!-- Aerodynamic Body in Lizard Green / White GT3 RS livery -->
    <path d="M 100,390 C 80,390 70,360 70,320 C 70,250 140,200 240,180 L 320,170 C 360,165 440,165 480,170 L 560,180 C 660,200 730,250 730,320 C 730,360 720,390 700,390 Z" fill="%2368D391" stroke="%23000000" stroke-width="12"/>
    
    <!-- Windshield -->
    <path d="M 230,180 L 270,95 C 290,75 350,65 400,65 C 450,65 510,75 530,95 L 570,180 Z" fill="%231F2937" stroke="%23000000" stroke-width="10"/>

    <!-- Fender Vents & Aerodynamic Louvers -->
    <line x1="160" y1="210" x2="220" y2="190" stroke="%23000000" stroke-width="8"/>
    <line x1="150" y1="225" x2="210" y2="205" stroke="%23000000" stroke-width="8"/>
    <line x1="640" y1="210" x2="580" y2="190" stroke="%23000000" stroke-width="8"/>
    <line x1="650" y1="225" x2="590" y2="205" stroke="%23000000" stroke-width="8"/>

    <!-- Iconic Round Headlights -->
    <circle cx="190" cy="245" r="42" fill="%23FFFFFF" stroke="%23000000" stroke-width="10"/>
    <circle cx="190" cy="245" r="24" fill="%2360A5FA" stroke="%23000000" stroke-width="6"/>
    <circle cx="610" cy="245" r="42" fill="%23FFFFFF" stroke="%23000000" stroke-width="10"/>
    <circle cx="610" cy="245" r="24" fill="%2360A5FA" stroke="%23000000" stroke-width="6"/>

    <!-- Aggressive Carbon Intake Grille -->
    <path d="M 200,330 L 600,330 L 580,410 L 220,410 Z" fill="%23111827" stroke="%23000000" stroke-width="10"/>
    <line x1="330" y1="330" x2="330" y2="410" stroke="%23000000" stroke-width="8"/>
    <line x1="470" y1="330" x2="470" y2="410" stroke="%23000000" stroke-width="8"/>

    <!-- Front Splitter Aero -->
    <rect x="140" y="415" width="520" height="24" rx="6" fill="%23000000"/>
  </g>
</svg>`;

export const SAMPLE_CARTOON_BMW_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(100, 100) scale(0.75)">
    <!-- Body in Isle of Man Green / Yas Marina Blue -->
    <path d="M 100,380 C 80,380 70,350 70,310 C 70,240 140,190 230,170 C 310,150 490,150 570,170 C 660,190 730,240 730,310 C 730,350 720,380 700,380 Z" fill="%2338BDF8" stroke="%23000000" stroke-width="12"/>
    
    <!-- Windshield -->
    <path d="M 220,170 L 260,85 C 280,70 340,60 400,60 C 460,60 520,70 540,85 L 580,170 Z" fill="%2318181B" stroke="%23000000" stroke-width="10"/>

    <!-- Angular Laser Headlights -->
    <path d="M 140,230 L 230,200 L 250,240 L 150,260 Z" fill="%23FEF08A" stroke="%23000000" stroke-width="9"/>
    <path d="M 660,230 L 570,200 L 550,240 L 650,260 Z" fill="%23FEF08A" stroke="%23000000" stroke-width="9"/>

    <!-- Large Vertical Kidney Grilles (M4 Signature) -->
    <rect x="330" y="210" width="60" height="180" rx="14" fill="%2309090B" stroke="%23000000" stroke-width="10"/>
    <rect x="410" y="210" width="60" height="180" rx="14" fill="%2309090B" stroke="%23000000" stroke-width="10"/>
    
    <!-- Horizontal Slats -->
    <line x1="335" y1="250" x2="385" y2="250" stroke="%2327272A" stroke-width="6"/>
    <line x1="335" y1="290" x2="385" y2="290" stroke="%2327272A" stroke-width="6"/>
    <line x1="335" y1="330" x2="385" y2="330" stroke="%2327272A" stroke-width="6"/>
    <line x1="415" y1="250" x2="465" y2="250" stroke="%2327272A" stroke-width="6"/>
    <line x1="415" y1="290" x2="465" y2="290" stroke="%2327272A" stroke-width="6"/>
    <line x1="415" y1="330" x2="465" y2="330" stroke="%2327272A" stroke-width="6"/>

    <!-- M Performance Carbon Lip -->
    <path d="M 120,400 L 680,400 L 660,430 L 140,430 Z" fill="%23000000"/>
  </g>
</svg>`;

export const SAMPLE_CARTOON_CORVETTE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(100, 100) scale(0.75)">
    <!-- Corvette C8 Stingray in Torch Red / Sebring Orange -->
    <path d="M 90,370 C 80,340 100,280 150,220 L 230,170 C 310,140 490,140 570,170 L 650,220 C 700,280 720,340 710,370 Z" fill="%23F97316" stroke="%23000000" stroke-width="12"/>
    
    <!-- Sharp Windshield & Roof Line -->
    <path d="M 210,170 L 270,75 C 290,60 350,55 400,55 C 450,55 510,60 530,75 L 590,170 Z" fill="%231E293B" stroke="%23000000" stroke-width="10"/>

    <!-- Sharp Jewel Headlights -->
    <polygon points="150,240 240,195 270,225 180,265" fill="%23FFFFFF" stroke="%23000000" stroke-width="8"/>
    <polygon points="650,240 560,195 530,225 620,265" fill="%23FFFFFF" stroke="%23000000" stroke-width="8"/>

    <!-- Boomerang Center Intakes -->
    <polygon points="200,320 370,320 350,400 180,390" fill="%230F172A" stroke="%23000000" stroke-width="9"/>
    <polygon points="600,320 430,320 450,400 620,390" fill="%230F172A" stroke="%23000000" stroke-width="9"/>

    <!-- Front Aerodynamic Point -->
    <polygon points="380,330 420,330 400,410" fill="%23EA580C" stroke="%23000000" stroke-width="6"/>
  </g>
</svg>`;

export const INITIAL_CAR_PHOTOS: CarPhoto[] = [
  {
    id: 'car-1',
    plateNumber: '7XYZ999',
    carName: 'Porsche 911 GT3 RS',
    make: 'Porsche',
    model: '911 GT3 RS (992)',
    year: 2024,
    color: 'Python Green / Carbon',
    event: 'Apex Laguna Seca Invitational',
    date: 'October 24, 2023 • 4:32 PM',
    location: 'Laguna Seca Raceway, Monterey CA',
    photographer: {
      name: 'Alex Rivera',
      title: 'Automotive Photographer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      bio: 'Motorsport & track day specialist capturing high-velocity supercars worldwide.',
      instagram: '@rivera_motorsport'
    },
    imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f3d5128759b?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_PORSCHE_SVG,
    hasCartoon: true,
    tags: ['Porsche', 'GT3RS', 'TrackDay', 'LagunaSeca', 'Supercar', '992'],
    views: 1420,
    downloads: 384,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Sony A1 • 70-200mm f/2.8 GM II • 1/2000s • ISO 100',
    createdAt: '2023-10-24T16:32:00Z'
  },
  {
    id: 'car-2',
    plateNumber: 'M4-PERF',
    carName: 'BMW M4 Competition',
    make: 'BMW',
    model: 'M4 Competition G82',
    year: 2023,
    color: 'Yas Marina Blue',
    event: 'Sunset Canyon Run LA',
    date: 'October 24, 2023 • 3:15 PM',
    location: 'Angeles Crest Highway, Los Angeles CA',
    photographer: {
      name: 'Marcus Vance',
      title: 'Commercial Car Shooter',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      bio: 'Automotive commercial director and canyon carving enthusiast.',
      instagram: '@vance_visuals'
    },
    imageUrl: 'https://images.unsplash.com/photo-1614200179396-2bdb77ee4a31?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_BMW_SVG,
    hasCartoon: true,
    tags: ['BMW', 'M4', 'G82', 'CanyonCarver', 'TwinTurbo', 'IsleOfMan'],
    views: 980,
    downloads: 215,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Canon R5 • 28-70mm f/2.0 USM • 1/1250s • ISO 160',
    createdAt: '2023-10-24T15:15:00Z'
  },
  {
    id: 'car-3',
    plateNumber: 'VETTE-8',
    carName: 'Chevrolet Corvette C8',
    make: 'Chevrolet',
    model: 'Corvette C8 Stingray',
    year: 2023,
    color: 'Sebring Orange Tintcoat',
    event: 'Supercar Sunday Malibu',
    date: 'October 23, 2023 • 5:50 PM',
    location: 'Pacific Coast Highway, Malibu CA',
    photographer: {
      name: 'Elena Rostova',
      title: 'Trackside & Street Photographer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
      bio: 'Documenting golden hour automotive culture and hypercars.',
      instagram: '@rostova_lens'
    },
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_CORVETTE_SVG,
    hasCartoon: true,
    tags: ['Corvette', 'C8', 'V8', 'MidEngine', 'GoldenHour', 'Malibu'],
    views: 1840,
    downloads: 512,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Nikon Z9 • 85mm f/1.2 S • 1/3200s • ISO 64',
    createdAt: '2023-10-23T17:50:00Z'
  },
  {
    id: 'car-4',
    plateNumber: 'MIATA-91',
    carName: 'Mazda MX-5 Miata NA',
    make: 'Mazda',
    model: 'MX-5 Miata NA Pop-Up',
    year: 1991,
    color: 'Classic Pink / Track Edition',
    event: 'Midnight Touge Meet Daikoku',
    date: 'October 22, 2023 • 9:45 PM',
    location: 'Daikoku Futo Parking Area, Yokohama',
    photographer: {
      name: 'Kenji Takahashi',
      title: 'JDM Culture Documentarian',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      bio: 'Capturing the heart and soul of Japanese car meets and retro legends.',
      instagram: '@kenji_jdm'
    },
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_MIATA_SVG,
    hasCartoon: true,
    tags: ['Mazda', 'Miata', 'NA', 'PopUpHeadlights', 'JDM', 'CuteCar', 'Touge'],
    views: 3120,
    downloads: 890,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Fujifilm GFX 100S • 110mm f/2 • 1/250s • ISO 400',
    createdAt: '2023-10-22T21:45:00Z'
  },
  {
    id: 'car-5',
    plateNumber: 'ABC1234',
    carName: 'Nissan Skyline GT-R R34',
    make: 'Nissan',
    model: 'Skyline GT-R V-Spec II',
    year: 2002,
    color: 'Bayside Blue',
    event: 'Wangan Midnight Revival',
    date: 'October 21, 2023 • 11:20 PM',
    location: 'Shuto Expressway, Tokyo',
    photographer: {
      name: 'Alex Rivera',
      title: 'Automotive Photographer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      bio: 'Motorsport & track day specialist capturing high-velocity supercars worldwide.',
      instagram: '@rivera_motorsport'
    },
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_MIATA_SVG,
    hasCartoon: false,
    tags: ['Nissan', 'GTR', 'R34', 'Godzilla', 'RB26', 'JDM', 'BaysideBlue'],
    views: 4500,
    downloads: 1200,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Sony A7R V • 50mm f/1.2 GM • 1/160s • ISO 800',
    createdAt: '2023-10-21T23:20:00Z'
  },
  {
    id: 'car-6',
    plateNumber: 'E55-AM-G',
    carName: 'Mercedes-Benz E55 AMG',
    make: 'Mercedes-AMG',
    model: 'E55 AMG Kompressor W211',
    year: 2005,
    color: 'Obsidian Black Metallic',
    event: 'Autobahn Speedfest Munich',
    date: 'October 20, 2023 • 2:10 PM',
    location: 'A8 Autobahn, Germany',
    photographer: {
      name: 'Marcus Vance',
      title: 'Commercial Car Shooter',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      bio: 'Automotive commercial director and canyon carving enthusiast.',
      instagram: '@vance_visuals'
    },
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=1400',
    cartoonImageUrl: SAMPLE_CARTOON_BMW_SVG,
    hasCartoon: false,
    tags: ['Mercedes', 'AMG', 'E55', 'V8Kompressor', 'Supercharged', 'Autobahn'],
    views: 1150,
    downloads: 290,
    resolution: '4K • 3840 x 2160 • 300 DPI',
    cameraInfo: 'Leica SL2-S • 50mm Summilux • 1/1000s • ISO 50',
    createdAt: '2023-10-20T14:10:00Z'
  }
];

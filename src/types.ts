export interface Photographer {
  id?: string;
  name: string;
  title: string;
  avatar: string;
  bio?: string;
  instagram?: string;
  venmoHandle?: string;
  payPalHandle?: string;
  cashAppHandle?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'photographer';
  avatar: string;
  bio: string;
  instagram?: string;
  venmoHandle?: string;
  payPalHandle?: string;
  cashAppHandle?: string;
  createdAt: string;
  isActive: boolean;
  status?: 'pending' | 'active' | 'suspended';
}

export interface CarPhoto {
  id: string;
  plateNumber: string;
  state?: string;
  carName: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  event: string;
  date: string;
  location?: string;
  photographer: Photographer;
  imageUrl: string; // Primary thumbnail / cover photo
  images?: string[]; // All photos belonging to this car's set/gallery
  photoCount?: number; // Total number of photos in the car's gallery
  photoAuthors?: Record<string, Photographer>; // Optional mapping of image index/URL to specific photographer
  cartoonImageUrl?: string;
  hasCartoon: boolean;
  tags: string[];
  views: number;
  downloads: number;
  resolution: string;
  cameraInfo?: string;
  createdAt?: string;
}

export interface VehicleLookupResult {
  make: string;
  model: string;
  year?: number;
  color?: string;
  finish?: string;
  engine?: string;
  transmission?: string;
  bodyStyle?: string;
  state?: string;
  suggestedTags?: string[];
  source?: string;
}

export interface AdminAuth {
  isAuthenticated: boolean;
  token: string | null;
  adminName?: string;
  role?: string;
}

export interface AppThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  primary: string;
  primaryHover: string;
  bg: string;
  cardBg: string;
  cardBorder: string;
  textMain: string;
  textMuted: string;
  navBg: string;
  searchBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glow: string;
  videoOpacity: number;
  radius: number;
}

export interface GeneralSettings {
  // App Identity & Branding
  appName: string;
  appSubtitle: string;
  appIconUrl?: string;
  heroHeadline: string;
  heroSubtitle: string;
  footerText: string;

  // Active AI Provider
  aiProvider: 'gemini' | 'nvidia' | 'comfyui' | 'local_canvas';

  // Google Gemini AI Configuration
  geminiApiKey?: string;
  geminiModel: string;
  geminiAspectRatio?: '1:1' | '4:3' | '3:4' | '16:9';
  geminiImageSize?: '512px' | '1K' | '2K';

  // NVIDIA AI & NIM Configuration
  nvidiaApiKey?: string;
  nvidiaModel: string;
  nvidiaBaseUrl?: string;

  // ComfyUI Configuration
  comfyuiBaseUrl?: string;
  comfyuiWorkflow?: string;

  // Local Vector Canvas Configuration
  localColorQuantization?: number;
  localOutlineThickness?: number;

  // Universal Sticker & Prompt Settings
  stickerGlobalPrompt: string;
  stickerNegativePrompt?: string;
  maxStickerRetries: number;
  allowVisitorStickers: boolean;
  failoverToLocal: boolean;

  // Author Tipping & Gating Controls
  showTipBeforeDownload: boolean;
  showTipBeforeSticker: boolean;
  tipModalTitle: string;
  tipModalDescription: string;
  defaultTipAmounts: number[];
  enableTipping: boolean;

  // Media Display & Extras
  enableWatermark: boolean;
  watermarkText?: string;
  defaultDownloadQuality: 'full' | '1080p' | 'raw';
}

export interface StickerGenerationRequest {
  image: string;
  carName?: string;
  make?: string;
  model?: string;
  color?: string;
  plateNumber?: string;
  feedback?: string;
  feedbackPreset?: string;
  retryAttempt?: number;
}

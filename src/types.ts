export interface Photographer {
  name: string;
  title: string;
  avatar: string;
  bio?: string;
  instagram?: string;
}

export interface CarPhoto {
  id: string;
  plateNumber: string;
  carName: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  event: string;
  date: string;
  location?: string;
  photographer: Photographer;
  imageUrl: string;
  cartoonImageUrl?: string;
  hasCartoon: boolean;
  tags: string[];
  views: number;
  downloads: number;
  resolution: string;
  cameraInfo?: string;
  createdAt?: string;
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

import { AppThemeConfig } from '../types';

export function applyThemeToDocument(theme: AppThemeConfig) {
  const root = document.documentElement;

  if (theme.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  // Core Theme Palette
  root.style.setProperty('--ps-primary', theme.primary);
  root.style.setProperty('--ps-primary-hover', theme.primaryHover || theme.primary);
  root.style.setProperty('--ps-bg', theme.bg);
  root.style.setProperty('--ps-card-bg', theme.cardBg);
  root.style.setProperty('--ps-card-border', theme.cardBorder);
  
  // High contrast typography variables
  root.style.setProperty('--ps-text-main', theme.textMain);
  root.style.setProperty('--ps-text-muted', theme.textMuted);
  root.style.setProperty('--ps-text-subtle', theme.isDark ? '#71717A' : '#64748B');
  root.style.setProperty('--ps-text-contrast', theme.isDark ? '#FFFFFF' : '#0F172A');
  
  // Navigation & Search surfaces
  root.style.setProperty('--ps-nav-bg', theme.navBg);
  root.style.setProperty('--ps-search-bg', theme.searchBg);
  
  // Badges & Tag surfaces
  root.style.setProperty('--ps-badge-bg', theme.badgeBg);
  root.style.setProperty('--ps-badge-border', theme.badgeBorder || theme.cardBorder);
  root.style.setProperty('--ps-badge-text', theme.badgeText || theme.textMain);

  // Chips & interactive pill buttons
  root.style.setProperty('--ps-chip-bg', theme.isDark ? 'rgba(20, 20, 22, 0.85)' : 'rgba(241, 245, 249, 0.9)');
  root.style.setProperty('--ps-chip-border', theme.isDark ? '#2C2C2E' : '#E2E8F0');
  root.style.setProperty('--ps-chip-text', theme.isDark ? '#9CA3AF' : '#475569');
  root.style.setProperty('--ps-chip-hover-text', theme.isDark ? '#FFFFFF' : '#0F172A');
  
  // Input fields
  root.style.setProperty('--ps-input-bg', theme.isDark ? '#1C1C1E' : '#FFFFFF');
  root.style.setProperty('--ps-input-border', theme.isDark ? '#2C2C2E' : '#CBD5E1');
  root.style.setProperty('--ps-input-text', theme.isDark ? '#FFFFFF' : '#0F172A');
  root.style.setProperty('--ps-input-placeholder', theme.isDark ? '#6B7280' : '#94A3B8');
  
  // FX & geometry
  root.style.setProperty('--ps-glow', theme.glow);
  root.style.setProperty('--ps-radius', `${theme.radius || 24}px`);
  root.style.setProperty('--ps-video-opacity', `${theme.videoOpacity ?? (theme.isDark ? 0.45 : 0.08)}`);
}


import { AppThemeConfig } from '../types';

export function applyThemeToDocument(theme: AppThemeConfig) {
  const root = document.documentElement;

  if (theme.isDark) {
    root.classList.add('dark');
    root.removeAttribute('data-theme');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  root.style.setProperty('--ps-primary', theme.primary);
  root.style.setProperty('--ps-primary-hover', theme.primaryHover || theme.primary);
  root.style.setProperty('--ps-bg', theme.bg);
  root.style.setProperty('--ps-card-bg', theme.cardBg);
  root.style.setProperty('--ps-card-border', theme.cardBorder);
  root.style.setProperty('--ps-text-main', theme.textMain);
  root.style.setProperty('--ps-text-muted', theme.textMuted);
  root.style.setProperty('--ps-nav-bg', theme.navBg);
  root.style.setProperty('--ps-search-bg', theme.searchBg);
  root.style.setProperty('--ps-badge-bg', theme.badgeBg);
  root.style.setProperty('--ps-badge-border', theme.badgeBorder || theme.cardBorder);
  root.style.setProperty('--ps-badge-text', theme.badgeText || theme.textMain);
  root.style.setProperty('--ps-glow', theme.glow);
  root.style.setProperty('--ps-radius', `${theme.radius || 24}px`);
  root.style.setProperty('--ps-video-opacity', `${theme.videoOpacity ?? 0.45}`);
}

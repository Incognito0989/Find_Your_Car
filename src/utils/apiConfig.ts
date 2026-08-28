// API Configuration helper for connecting Vercel frontend to local or cloud Docker backend

const STORAGE_KEY = 'platesnap_custom_backend_url';

export function getApiBaseUrl(): string {
  // 1. Check local storage for user-configured backend endpoint (e.g. from UI settings)
  if (typeof window !== 'undefined') {
    const savedCustomUrl = localStorage.getItem(STORAGE_KEY);
    if (savedCustomUrl && savedCustomUrl.trim()) {
      return savedCustomUrl.trim().replace(/\/+$/, '');
    }
  }

  // 2. Check Vite environment variable injected at Vercel build time (VITE_API_URL)
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === 'string') {
    return envApiUrl.trim().replace(/\/+$/, '');
  }

  // 3. In local development or standalone same-origin deployment, use relative paths
  return '';
}

export function setCustomBackendUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export function formatMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = getApiBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

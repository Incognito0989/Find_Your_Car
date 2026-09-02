import React, { useState, useEffect, useCallback } from 'react';
import { CarPhoto, AppThemeConfig, GeneralSettings } from './types';
import { INITIAL_CAR_PHOTOS, DEFAULT_THEMES } from './data/initialData';
import { VisitorPortal } from './components/VisitorPortal';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ServerConnectionModal } from './components/ServerConnectionModal';
import { applyThemeToDocument } from './utils/themeUtils';
import { getApiBaseUrl } from './utils/apiConfig';

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  appName: 'PlateSnap Cars',
  appSubtitle: 'Cinematic Automotive Showcase & Plate Lookup',
  heroHeadline: 'Trackside Excellence. Captured in 4K.',
  heroSubtitle: 'Search high-resolution track photography by license plate, car model, or photographer.',
  footerText: '© 2026 Cinematic Automotive Photography',

  aiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-3.1-flash-image',
  geminiAspectRatio: '1:1',
  geminiImageSize: '1K',

  nvidiaApiKey: '',
  nvidiaModel: 'stabilityai/stable-diffusion-3-medium',
  nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',

  comfyuiBaseUrl: 'http://127.0.0.1:8188',
  comfyuiWorkflow: 'default',

  localColorQuantization: 16,
  localOutlineThickness: 3,

  stickerGlobalPrompt:
    'Die-cut vinyl sticker illustration of {car_description}, clean crisp white die-cut contour border, bold black comic ink vector outlines, cel-shaded vibrant automotive paint finish, exaggerated chibi proportions, isolated on pure solid white background, sticker art, 8k resolution, masterpiece',
  stickerNegativePrompt:
    'photorealistic background, messy noise, blurry, text artifacts, watermark, low quality, photorealism',
  maxStickerRetries: 3,
  allowVisitorStickers: true,
  failoverToLocal: true,
  showTipBeforeDownload: false,
  showTipBeforeSticker: true,
  tipModalTitle: 'Support the Creator Before Generating Your Sticker',
  tipModalDescription:
    'Car enthusiasts and track photographers spend hours capturing these moments. Show appreciation or continue for free to generate your vinyl sticker.',
  defaultTipAmounts: [3, 5, 10, 20],
  enableTipping: true,
  enableWatermark: false,
  watermarkText: 'PlateSnap',
  defaultDownloadQuality: 'full',
};

export function App() {
  const [currentView, setCurrentView] = useState<'visitor' | 'admin'>('visitor');
  const [cars, setCars] = useState<CarPhoto[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('platesnap_cars_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [currentTheme, setCurrentTheme] = useState<AppThemeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('plate_snap_theme');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.id || parsed.primary || parsed.bg)) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return DEFAULT_THEMES[0];
  });
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('platesnap_general_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_GENERAL_SETTINGS, ...parsed };
          }
        }
      } catch (e) {}
    }
    return DEFAULT_GENERAL_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Admin Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);

  // Helper for calling API with configured base URL
  const apiFetch = useCallback((endpoint: string, options?: RequestInit) => {
    const base = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = base ? `${base}${cleanEndpoint}` : cleanEndpoint;
    return fetch(url, options);
  }, []);

  // Fetch cars, theme, and general settings from backend API with client caching
  const refreshAppData = useCallback(async () => {
    try {
      setIsLoading(true);
      const carsRes = await apiFetch('/api/cars');
      if (carsRes.ok) {
        const carsData = await carsRes.json();
        if (carsData && Array.isArray(carsData.cars)) {
          setCars(carsData.cars);
          try {
            localStorage.setItem('platesnap_cars_cache', JSON.stringify(carsData.cars));
          } catch (e) {}
        }
      }

      const themeRes = await apiFetch('/api/theme');
      if (themeRes.ok) {
        const themeData = await themeRes.json();
        if (themeData && themeData.theme) {
          setCurrentTheme(themeData.theme);
          applyThemeToDocument(themeData.theme);
          try {
            localStorage.setItem('plate_snap_theme', JSON.stringify(themeData.theme));
          } catch (e) {}
        }
      }

      const settingsRes = await apiFetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData && settingsData.settings) {
          const merged = { ...DEFAULT_GENERAL_SETTINGS, ...settingsData.settings };
          setGeneralSettings(merged);
          try {
            localStorage.setItem('platesnap_general_settings', JSON.stringify(merged));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Backend sync defaulted to cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // Check stored admin session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('platesnap_admin_token');
    const savedUser = localStorage.getItem('platesnap_admin_user');

    if (savedToken) {
      setAdminToken(savedToken);
      if (savedUser) {
        try {
          setAdminUser(JSON.parse(savedUser));
        } catch (e) {}
      }
    }
  }, []);

  // Initialize theme and load cars on boot
  useEffect(() => {
    const savedThemeJson = localStorage.getItem('plate_snap_theme');
    let activeTheme = DEFAULT_THEMES[0];
    if (savedThemeJson) {
      try {
        activeTheme = JSON.parse(savedThemeJson);
      } catch (e) {
        activeTheme = DEFAULT_THEMES[0];
      }
    }
    setCurrentTheme(activeTheme);
    applyThemeToDocument(activeTheme);

    refreshAppData();
  }, [refreshAppData]);

  // Open Admin portal with authentication check
  const handleOpenAdmin = () => {
    const token = adminToken || localStorage.getItem('platesnap_admin_token');
    if (!token) {
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentView('admin');
  };

  // Login successful callback
  const handleLoginSuccess = (token: string, userData: { name: string; email: string }) => {
    setAdminToken(token);
    setAdminUser(userData);
    setIsLoginModalOpen(false);
    setCurrentView('admin');
  };

  // Admin Logout handler
  const handleLogoutAdmin = async () => {
    if (adminToken) {
      try {
        await apiFetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        });
      } catch (e) {}
    }
    localStorage.removeItem('platesnap_admin_token');
    localStorage.removeItem('platesnap_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setCurrentView('visitor');
  };

  // Add new car handler (persists into SQLite backend)
  const handleAddCar = async (newCarData: Partial<CarPhoto>) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await apiFetch('/api/cars', {
        method: 'POST',
        headers,
        body: JSON.stringify(newCarData),
      });

      const data = await res.json();
      if (data.success && data.car) {
        setCars((prev) => [data.car, ...prev]);
      } else if (res.status === 401) {
        setIsLoginModalOpen(true);
        throw new Error('Admin authorization required to upload.');
      }
    } catch (e) {
      console.error('Error adding car:', e);
      throw e;
    }
  };

  // Update existing car handler
  const handleUpdateCar = async (id: string, updated: Partial<CarPhoto>) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await apiFetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updated),
      });

      if (res.status === 401) {
        setIsLoginModalOpen(true);
        return;
      }

      const data = await res.json();
      if (data.success && data.car) {
        setCars((prev) => prev.map((c) => (c.id === id ? data.car : c)));
      } else {
        setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      }
    } catch (e) {
      console.error('Error updating car:', e);
    }
  };

  // Delete car handler
  const handleDeleteCar = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await apiFetch(`/api/cars/${id}`, { method: 'DELETE', headers });
      if (res.status === 401) {
        setIsLoginModalOpen(true);
        return;
      }

      setCars((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Error deleting car:', e);
    }
  };

  // Save theme globally
  const handleSaveTheme = async (newTheme: AppThemeConfig) => {
    setCurrentTheme(newTheme);
    applyThemeToDocument(newTheme);
    try {
      localStorage.setItem('plate_snap_theme', JSON.stringify(newTheme));
    } catch (e) {}

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await apiFetch('/api/theme', {
        method: 'POST',
        headers,
        body: JSON.stringify({ theme: newTheme }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.theme) {
          setCurrentTheme(data.theme);
          applyThemeToDocument(data.theme);
          try {
            localStorage.setItem('plate_snap_theme', JSON.stringify(data.theme));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Saved theme locally:', e);
    }
  };

  // Save general settings globally
  const handleSaveSettings = async (newSettings: GeneralSettings) => {
    setGeneralSettings(newSettings);
    try {
      localStorage.setItem('platesnap_general_settings', JSON.stringify(newSettings));
    } catch (e) {}

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings: newSettings }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          const merged = { ...DEFAULT_GENERAL_SETTINGS, ...data.settings };
          setGeneralSettings(merged);
          try {
            localStorage.setItem('platesnap_general_settings', JSON.stringify(merged));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Saved general settings locally:', e);
    }
  };

  return (
    <div id="plate-snap-app-root" className="min-h-screen">
      {currentView === 'visitor' ? (
        <VisitorPortal
          cars={cars}
          isLoading={isLoading}
          onOpenAdmin={handleOpenAdmin}
          onOpenServerConfig={() => setIsServerModalOpen(true)}
          currentTheme={currentTheme}
          generalSettings={generalSettings}
          onUpdateCar={handleUpdateCar}
        />
      ) : (
        <AdminPortal
          cars={cars}
          onAddCar={handleAddCar}
          onUpdateCar={handleUpdateCar}
          onDeleteCar={handleDeleteCar}
          currentTheme={currentTheme}
          onSaveTheme={handleSaveTheme}
          generalSettings={generalSettings}
          onSaveSettings={handleSaveSettings}
          onBackToVisitor={() => setCurrentView('visitor')}
          onLogoutAdmin={handleLogoutAdmin}
          adminName={adminUser?.name || 'Admin Photographer'}
          adminUser={adminUser}
          adminToken={adminToken}
        />
      )}

      {/* Secure Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        theme={currentTheme}
      />

      {/* Backend Connection Modal */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onConnected={refreshAppData}
        theme={currentTheme}
      />
    </div>
  );
}

export default App;

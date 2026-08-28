import React, { useState, useEffect } from 'react';
import { CarPhoto, AppThemeConfig, AdminAuth } from './types';
import { INITIAL_CAR_PHOTOS, DEFAULT_THEMES } from './data/initialData';
import { VisitorPortal } from './components/VisitorPortal';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { applyThemeToDocument } from './utils/themeUtils';

export function App() {
  const [currentView, setCurrentView] = useState<'visitor' | 'admin'>('visitor');
  const [cars, setCars] = useState<CarPhoto[]>(INITIAL_CAR_PHOTOS);
  const [currentTheme, setCurrentTheme] = useState<AppThemeConfig>(DEFAULT_THEMES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Admin Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

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

      // Verify token with backend
      fetch(`/api/admin/verify?token=${encodeURIComponent(savedToken)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.authenticated) {
            localStorage.removeItem('platesnap_admin_token');
            localStorage.removeItem('platesnap_admin_user');
            setAdminToken(null);
            setAdminUser(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Initialize theme and load cars from backend
  useEffect(() => {
    // 1. Initial local theme apply
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

    // 2. Fetch cars and theme from backend API
    const initAppData = async () => {
      try {
        // Fetch or seed cars
        const carsRes = await fetch('/api/cars');
        const carsData = await carsRes.json();

        if (carsData && Array.isArray(carsData.cars) && carsData.cars.length > 0) {
          setCars(carsData.cars);
        } else {
          // Seed backend with initial car records
          await fetch('/api/cars/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initialCars: INITIAL_CAR_PHOTOS }),
          });
          setCars(INITIAL_CAR_PHOTOS);
        }

        // Fetch saved server theme
        const themeRes = await fetch('/api/theme');
        const themeData = await themeRes.json();
        if (themeData && themeData.theme) {
          setCurrentTheme(themeData.theme);
          applyThemeToDocument(themeData.theme);
        }
      } catch (err) {
        console.warn('Backend sync defaulted to local store:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAppData();
  }, []);

  // Open Admin portal with authentication check
  const handleOpenAdmin = async () => {
    const token = adminToken || localStorage.getItem('platesnap_admin_token');
    if (!token) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/admin/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.authenticated) {
        setAdminToken(token);
        if (data.admin) setAdminUser(data.admin);
        setCurrentView('admin');
      } else {
        localStorage.removeItem('platesnap_admin_token');
        setAdminToken(null);
        setIsLoginModalOpen(true);
      }
    } catch (e) {
      setIsLoginModalOpen(true);
    }
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
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: adminToken }),
        });
      } catch (e) {}
    }
    localStorage.removeItem('platesnap_admin_token');
    localStorage.removeItem('platesnap_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setCurrentView('visitor');
  };

  // Add new car handler (with admin token)
  const handleAddCar = async (newCarData: Partial<CarPhoto>) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/cars', {
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
      } else {
        // Fallback local update
        const fallbackCar: CarPhoto = {
          id: `car-${Date.now()}`,
          plateNumber: newCarData.plateNumber || 'CUSTOM',
          carName: newCarData.carName || 'Custom Vehicle',
          make: newCarData.make || 'Custom',
          model: newCarData.model || 'Model',
          year: newCarData.year || 2024,
          color: newCarData.color || 'Custom',
          event: newCarData.event || 'Automotive Gathering',
          date: 'Just Now',
          location: newCarData.location || 'Local Meet',
          photographer: newCarData.photographer || {
            name: adminUser?.name || 'Alex Rivera',
            title: 'Staff Photographer',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          },
          imageUrl: newCarData.imageUrl || '',
          cartoonImageUrl: newCarData.cartoonImageUrl,
          hasCartoon: Boolean(newCarData.hasCartoon || newCarData.cartoonImageUrl),
          tags: newCarData.tags || ['CarMeet'],
          views: 1,
          downloads: 0,
          resolution: 'High Resolution • 300 DPI',
          cameraInfo: 'Sony Alpha • 50mm f/1.8',
        };
        setCars((prev) => [fallbackCar, ...prev]);
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

      const res = await fetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updated),
      });

      if (res.status === 401) {
        setIsLoginModalOpen(true);
        return;
      }

      setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
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

      const res = await fetch(`/api/cars/${id}`, { method: 'DELETE', headers });
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
    localStorage.setItem('plate_snap_theme', JSON.stringify(newTheme));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      await fetch('/api/theme', {
        method: 'POST',
        headers,
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (e) {
      console.warn('Saved theme to local cache.');
    }
  };

  return (
    <div id="plate-snap-app-root" className="min-h-screen">
      {currentView === 'visitor' ? (
        <VisitorPortal
          cars={cars}
          onOpenAdmin={handleOpenAdmin}
          currentTheme={currentTheme}
        />
      ) : (
        <AdminPortal
          cars={cars}
          onAddCar={handleAddCar}
          onUpdateCar={handleUpdateCar}
          onDeleteCar={handleDeleteCar}
          currentTheme={currentTheme}
          onSaveTheme={handleSaveTheme}
          onBackToVisitor={() => setCurrentView('visitor')}
          onLogoutAdmin={handleLogoutAdmin}
          adminName={adminUser?.name || 'Admin Photographer'}
        />
      )}

      {/* Secure Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        theme={currentTheme}
      />
    </div>
  );
}

export default App;

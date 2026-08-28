import React, { useState, useEffect } from 'react';
import { CarPhoto, AppThemeConfig } from './types';
import { INITIAL_CAR_PHOTOS, DEFAULT_THEMES } from './data/initialData';
import { VisitorPortal } from './components/VisitorPortal';
import { AdminPortal } from './components/AdminPortal';
import { applyThemeToDocument } from './utils/themeUtils';

export function App() {
  const [currentView, setCurrentView] = useState<'visitor' | 'admin'>('visitor');
  const [cars, setCars] = useState<CarPhoto[]>(INITIAL_CAR_PHOTOS);
  const [currentTheme, setCurrentTheme] = useState<AppThemeConfig>(DEFAULT_THEMES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Add new car handler
  const handleAddCar = async (newCarData: Partial<CarPhoto>) => {
    try {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCarData),
      });
      const data = await res.json();
      if (data.success && data.car) {
        setCars((prev) => [data.car, ...prev]);
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
            name: 'Alex Rivera',
            title: 'Staff Photographer',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          },
          imageUrl: newCarData.imageUrl || '',
          cartoonImageUrl: newCarData.cartoonImageUrl,
          hasCartoon: Boolean(newCarData.hasCartoon || newCarData.cartoonImageUrl),
          tags: newCarData.tags || ['CarMeet'],
          views: 1,
          downloads: 0,
          resolution: '4K • 3840 x 2160',
          cameraInfo: 'Sony A7R V',
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
      await fetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (e) {
      console.error('Error updating car:', e);
    }
  };

  // Delete car handler
  const handleDeleteCar = async (id: string) => {
    try {
      await fetch(`/api/cars/${id}`, { method: 'DELETE' });
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
      await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          onOpenAdmin={() => setCurrentView('admin')}
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
        />
      )}
    </div>
  );
}

export default App;

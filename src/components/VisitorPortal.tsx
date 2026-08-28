import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  LayoutGrid,
  List,
  Shield,
  Camera,
  ArrowUpRight,
  Filter,
  X,
  Lock,
  ChevronRight,
  Users,
  Heart,
} from 'lucide-react';
import { CarPhoto, AppThemeConfig, Photographer } from '../types';
import { PhotoCard } from './PhotoCard';
import { DownloadModal } from './DownloadModal';
import { CarGalleryPage } from './CarGalleryPage';
import { TipModal } from './TipModal';

interface VisitorPortalProps {
  cars: CarPhoto[];
  onOpenAdmin: () => void;
  onOpenServerConfig?: () => void;
  currentTheme: AppThemeConfig;
  onToggleThemeMode?: () => void;
}

export const VisitorPortal: React.FC<VisitorPortalProps> = ({
  cars,
  onOpenAdmin,
  currentTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('All');
  const [artFilter, setArtFilter] = useState<'all' | 'photos' | 'cartoons'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Active Car Detail / Full Gallery View State
  const [selectedCarForGallery, setSelectedCarForGallery] = useState<CarPhoto | null>(null);

  // Download & Tip Modal States
  const [selectedCarForDownload, setSelectedCarForDownload] = useState<CarPhoto | null>(null);
  const [initialCartoonState, setInitialCartoonState] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [tippingCar, setTippingCar] = useState<CarPhoto | null>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);

  // Quick sample plates for user click
  const QUICK_PLATES = ['7XYZ999', 'M4-PERF', 'VETTE-8', 'MIATA-91', 'ABC1234', 'E55-AM-G'];

  // All distinct makes
  const distinctMakes = useMemo(() => {
    const set = new Set<string>();
    cars.forEach((c) => {
      if (c.make) set.add(c.make);
    });
    return ['All', ...Array.from(set)];
  }, [cars]);

  // All distinct photographers
  const distinctPhotographers = useMemo(() => {
    const map = new Map<string, Photographer>();
    cars.forEach((c) => {
      if (c.photographer?.name) {
        map.set(c.photographer.name, c.photographer);
      }
      if (c.photoAuthors) {
        Object.values(c.photoAuthors as Record<string, Photographer>).forEach((p: Photographer) => {
          if (p && p.name) map.set(p.name, p);
        });
      }
    });
    return Array.from(map.values());
  }, [cars]);

  // Filtered Cars
  const filteredCars = useMemo(() => {
    let result = [...cars];

    // Search query filter (matches plate, name, make, model, event, author name, bio, tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/[\s\-_.]/g, '');
      const rawQ = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const cleanPlate = c.plateNumber.toLowerCase().replace(/[\s\-_.]/g, '');
        const photogName = (c.photographer?.name || '').toLowerCase();
        const photogBio = (c.photographer?.bio || '').toLowerCase();
        const photogInsta = (c.photographer?.instagram || '').toLowerCase();
        const authorMatch = c.photoAuthors
          ? Object.values(c.photoAuthors as Record<string, Photographer>).some(
              (p: Photographer) => (p.name && p.name.toLowerCase().includes(rawQ)) || (p.bio && p.bio.toLowerCase().includes(rawQ))
            )
          : false;

        return (
          cleanPlate.includes(q) ||
          c.plateNumber.toLowerCase().includes(rawQ) ||
          c.carName.toLowerCase().includes(rawQ) ||
          c.make.toLowerCase().includes(rawQ) ||
          c.model.toLowerCase().includes(rawQ) ||
          c.event.toLowerCase().includes(rawQ) ||
          c.location.toLowerCase().includes(rawQ) ||
          photogName.includes(rawQ) ||
          photogBio.includes(rawQ) ||
          photogInsta.includes(rawQ) ||
          authorMatch ||
          c.tags.some((t) => t.toLowerCase().includes(rawQ))
        );
      });
    }

    // Make filter
    if (selectedMake !== 'All') {
      result = result.filter((c) => c.make.toLowerCase() === selectedMake.toLowerCase());
    }

    // Author / Photographer filter
    if (selectedAuthor !== 'All') {
      result = result.filter((c) => {
        if (c.photographer?.name.toLowerCase() === selectedAuthor.toLowerCase()) return true;
        if (c.photoAuthors) {
          return Object.values(c.photoAuthors as Record<string, Photographer>).some(
            (p: Photographer) => p.name && p.name.toLowerCase() === selectedAuthor.toLowerCase()
          );
        }
        return false;
      });
    }

    // Art type filter
    if (artFilter === 'cartoons') {
      result = result.filter((c) => c.hasCartoon);
    } else if (artFilter === 'photos') {
      // All have photos
    }

    return result;
  }, [cars, searchQuery, selectedMake, selectedAuthor, artFilter]);

  const handleOpenDownload = (car: CarPhoto, defaultToCartoon: boolean = false) => {
    setSelectedCarForDownload(car);
    setInitialCartoonState(defaultToCartoon);
    setIsModalOpen(true);
  };

  const handleOpenTipModal = (car: CarPhoto) => {
    setTippingCar(car);
    setIsTipModalOpen(true);
  };

  // If a car is selected for full gallery view, render the CarGalleryPage!
  if (selectedCarForGallery) {
    const currentCar = cars.find((c) => c.id === selectedCarForGallery.id) || selectedCarForGallery;
    return (
      <CarGalleryPage
        car={currentCar}
        onBack={() => setSelectedCarForGallery(null)}
        currentTheme={currentTheme}
        onOpenAdmin={onOpenAdmin}
        onOpenTipModal={() => handleOpenTipModal(currentCar)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ps-bg,#000000)] text-[var(--ps-text-main,#ffffff)] relative overflow-x-hidden transition-colors duration-300">
      {/* 3D Cinematic Background Video Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          id="bg-cinematic-video"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: currentTheme.videoOpacity ?? 0.45 }}
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-sports-car-driving-through-a-city-at-night-42232-large.mp4"
            type="video/mp4"
          />
        </video>
        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ps-bg,#000000)] via-[var(--ps-bg,#000000)]/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(10,132,255,0.08),transparent_70%)]" />
      </div>

      {/* Top Glassmorphic Navigation */}
      <nav className="sticky top-0 z-40 ps-glass-nav bg-[var(--ps-nav-bg,rgba(0,0,0,0.6))] border-b border-[var(--ps-card-border,#2C2C2E)] backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-inner">
              <Camera className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">PLATE SNAP</span>
                <span className="text-gray-500 font-light">/</span>
                <span className="font-light text-xs tracking-widest uppercase text-gray-400">
                  CARS
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono tracking-wide">
                MULTI-THEME CINEMATIC ARCHIVE
              </p>
            </div>
          </div>

          {/* Discrete Admin Lock Icon */}
          <div className="flex items-center">
            <button
              id="admin-portal-lock-btn"
              onClick={onOpenAdmin}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
              title="Admin"
              aria-label="Admin"
            >
              <Lock className="w-4 h-4 opacity-40 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 space-y-12">
        {/* Hero Section with High Impact Typography */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
            <span>High-Res Photography & 2D Vector Cartoon Stickers</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--ps-text-main,#ffffff)] leading-[1.1]">
            Find Your Car by License Plate.
          </h1>

          <p className="text-base sm:text-lg text-[var(--ps-text-muted,#9ca3af)] max-w-2xl mx-auto leading-relaxed">
            Search our curated gallery from premier track days and meets by plate or photographer.
            Download high-resolution photography and support shooters with direct tipping.
          </p>
        </section>

        {/* Hero License Plate & Author Search Component */}
        <section className="max-w-2xl mx-auto space-y-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--ps-primary,#0A84FF)] to-blue-600 rounded-[28px] blur-md opacity-25 group-hover:opacity-40 transition duration-500" />
            <div className="relative flex items-center bg-[var(--ps-search-bg,#1C1C1E)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-2 shadow-2xl focus-within:border-[var(--ps-primary,#0A84FF)] transition-all">
              <div className="pl-4 pr-2 text-gray-400">
                <Search className="w-6 h-6 text-[var(--ps-primary,#0A84FF)]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by license plate (7XYZ999), car name, or photographer..."
                className="w-full bg-transparent border-none py-3.5 text-base sm:text-lg text-[var(--ps-text-main,#ffffff)] font-mono font-medium outline-none placeholder:text-gray-500 placeholder:font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-gray-400 hover:text-white transition-colors mr-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold px-6 py-3.5 rounded-2xl text-sm shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* Quick Try Plate Tags */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-gray-400">
            <span className="font-semibold text-gray-500">Quick Try:</span>
            {QUICK_PLATES.map((plate) => (
              <button
                key={plate}
                onClick={() => setSearchQuery(plate)}
                className={`font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  searchQuery.toUpperCase() === plate
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {plate}
              </button>
            ))}
          </div>
        </section>

        {/* Filter Controls Bar (Makes + Photographers + Art Styles) */}
        <section className="space-y-4 pt-6 border-t border-[var(--ps-card-border,#2C2C2E)]">
          {/* Row 1: Make filter chips */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase font-mono mr-1.5 shrink-0">
                Make:
              </span>
              {distinctMakes.map((make) => (
                <button
                  key={make}
                  onClick={() => setSelectedMake(make)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedMake === make
                      ? 'bg-[var(--ps-primary,#0A84FF)] text-white border-[var(--ps-primary,#0A84FF)] shadow-md'
                      : 'bg-[#141416]/80 text-gray-400 border-[#2C2C2E] hover:text-white hover:border-gray-600'
                  }`}
                >
                  {make}
                </button>
              ))}
            </div>

            {/* Grid / List Switcher */}
            <div className="hidden sm:flex items-center bg-[#141416]/90 p-1 rounded-xl border border-[#2C2C2E] shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Photographer / Author Search Filter & Art Style Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
            {/* Photographer chips */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase font-mono mr-1 shrink-0">
                <Users className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
                <span>Author:</span>
              </div>
              <button
                onClick={() => setSelectedAuthor('All')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  selectedAuthor === 'All'
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-[#141416]/80 text-gray-400 border-[#2C2C2E] hover:text-white'
                }`}
              >
                All Photographers
              </button>

              {distinctPhotographers.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedAuthor(p.name)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedAuthor === p.name
                      ? 'bg-[var(--ps-primary,#0A84FF)] text-white border-[var(--ps-primary,#0A84FF)] shadow-md'
                      : 'bg-[#141416]/80 text-gray-400 border-[#2C2C2E] hover:text-white'
                  }`}
                >
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-4 h-4 rounded-full object-cover border border-white/20"
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* Art Style Toggle */}
            <div className="flex items-center bg-[#141416]/90 p-1 rounded-xl border border-[#2C2C2E] shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setArtFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  artFilter === 'all' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All Works
              </button>
              <button
                onClick={() => setArtFilter('photos')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  artFilter === 'photos' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Photos Only
              </button>
              <button
                onClick={() => setArtFilter('cartoons')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  artFilter === 'cartoons'
                    ? 'bg-pink-500/20 text-pink-300 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>Cartoons</span>
              </button>
            </div>
          </div>
        </section>

        {/* Results Gallery Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Automotive Showcase</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300">
                {filteredCars.length} {filteredCars.length === 1 ? 'result' : 'results'}
              </span>
              {selectedAuthor !== 'All' && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  By {selectedAuthor}
                </span>
              )}
            </div>

            {(searchQuery || selectedAuthor !== 'All' || selectedMake !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAuthor('All');
                  setSelectedMake('All');
                  setArtFilter('all');
                }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Reset all filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredCars.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'flex flex-col gap-4'
              }
            >
              {filteredCars.map((car) => (
                <PhotoCard
                  key={car.id}
                  car={car}
                  onOpenDownloadModal={handleOpenDownload}
                  onSelectCar={(car) => setSelectedCarForGallery(car)}
                  onSelectAuthor={(authorName) => setSelectedAuthor(authorName)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="p-16 text-center bg-[#141416]/60 border border-[#2C2C2E] rounded-3xl space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Search className="w-8 h-8 text-[var(--ps-primary,#0A84FF)]" />
              </div>
              <h3 className="text-lg font-bold text-white">No cars found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Try searching by different license plate characters, car make, or select another photographer.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMake('All');
                  setSelectedAuthor('All');
                  setArtFilter('all');
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* Feature Highlight: 2D Cartoon Stickers */}
        <section className="bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-blue-950/40 border border-pink-500/20 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Iconic Mazda Miata Vector Art Mode</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Turn Your Car Into a 2D Cartoon Sticker.
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Transform any track photograph into iconic pop-up headlight Miata cel-shaded vector
              illustrations in seconds.
            </p>
          </div>

          <button
            onClick={() => setArtFilter('cartoons')}
            className="bg-white text-black hover:bg-gray-100 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span>Explore Stickers</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Footer (Lock removed from bottom right) */}
      <footer className="border-t border-[var(--ps-card-border,#2C2C2E)] bg-black/80 backdrop-blur-md py-12 px-6 relative z-10 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold text-white">PLATE SNAP / CARS</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} Cinematic Automotive Photography</span>
          </div>

          <div className="flex items-center gap-6 text-gray-400">
            <span className="hover:text-white transition-colors cursor-pointer">
              Photographer Terms
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </footer>

      {/* Download & Support Modal */}
      <DownloadModal
        car={selectedCarForDownload}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCarForDownload(null);
        }}
        initialCartoonState={initialCartoonState}
      />

      {/* Direct Tip Modal */}
      {isTipModalOpen && tippingCar && (
        <TipModal
          isOpen={isTipModalOpen}
          onClose={() => {
            setIsTipModalOpen(false);
            setTippingCar(null);
          }}
          car={tippingCar}
          allPhotographers={
            tippingCar.photoAuthors && Object.keys(tippingCar.photoAuthors).length > 0
              ? Object.values(tippingCar.photoAuthors)
              : [tippingCar.photographer]
          }
        />
      )}
    </div>
  );
};

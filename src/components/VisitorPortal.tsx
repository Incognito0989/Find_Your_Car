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
} from 'lucide-react';
import { CarPhoto, AppThemeConfig } from '../types';
import { PhotoCard } from './PhotoCard';
import { DownloadModal } from './DownloadModal';

interface VisitorPortalProps {
  cars: CarPhoto[];
  onOpenAdmin: () => void;
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
  const [artFilter, setArtFilter] = useState<'all' | 'photos' | 'cartoons'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [selectedCarForDownload, setSelectedCarForDownload] = useState<CarPhoto | null>(null);
  const [initialCartoonState, setInitialCartoonState] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  // Filtered Cars
  const filteredCars = useMemo(() => {
    let result = [...cars];

    // Search query filter (matches plate, name, make, model, event, tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/[\s\-_]/g, '');
      const rawQ = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const cleanPlate = c.plateNumber.toLowerCase().replace(/[\s\-_]/g, '');
        return (
          cleanPlate.includes(q) ||
          c.plateNumber.toLowerCase().includes(rawQ) ||
          c.carName.toLowerCase().includes(rawQ) ||
          c.make.toLowerCase().includes(rawQ) ||
          c.model.toLowerCase().includes(rawQ) ||
          c.event.toLowerCase().includes(rawQ) ||
          c.tags.some((t) => t.toLowerCase().includes(rawQ))
        );
      });
    }

    // Make filter
    if (selectedMake !== 'All') {
      result = result.filter((c) => c.make.toLowerCase() === selectedMake.toLowerCase());
    }

    // Art type filter
    if (artFilter === 'cartoons') {
      result = result.filter((c) => c.hasCartoon);
    } else if (artFilter === 'photos') {
      // All have photos
    }

    return result;
  }, [cars, searchQuery, selectedMake, artFilter]);

  const handleOpenDownload = (car: CarPhoto, defaultToCartoon: boolean = false) => {
    setSelectedCarForDownload(car);
    setInitialCartoonState(defaultToCartoon);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--ps-bg,#000000)] text-[var(--ps-text-main,#ffffff)] relative overflow-x-hidden transition-colors duration-300">
      {/* 3D Cinematic Background Video Layer (Matching user reference) */}
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

      {/* Top Glassmorphic Navigation (Matching Reference) */}
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

          {/* Right Header Navigation Actions */}
          <div className="flex items-center gap-3">
            {/* Live Server Pulse */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4K CLOUD VAULT ONLINE</span>
            </div>

            {/* Switch to Admin Portal Button */}
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition-all shadow-md"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
              <span>Admin Portal</span>
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
            <span>High-Res 4K Photography & 2D Vector Cartoon Stickers</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--ps-text-main,#ffffff)] leading-[1.1]">
            Find Your Car by License Plate.
          </h1>

          <p className="text-base sm:text-lg text-[var(--ps-text-muted,#9ca3af)] max-w-2xl mx-auto leading-relaxed">
            Search our curated gallery from premier track days and meets. Download uncompressed 4K
            RAW photography or stylized cartoon sticker art.
          </p>
        </section>

        {/* Hero License Plate Search Component (Matching Reference HTML) */}
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
                placeholder="Enter license plate # (e.g. 7XYZ999, M4-PERF)..."
                className="w-full bg-transparent border-none py-3.5 text-base sm:text-lg text-[var(--ps-text-main,#ffffff)] font-mono font-medium outline-none placeholder:text-gray-500 placeholder:font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-gray-400 hover:text-white transition-colors mr-1"
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
                className={`font-mono px-2.5 py-1 rounded-lg border transition-all ${
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

        {/* Filter Controls Bar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t border-[var(--ps-card-border,#2C2C2E)]">
          {/* Make / Manufacturer Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            {distinctMakes.map((make) => (
              <button
                key={make}
                onClick={() => setSelectedMake(make)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedMake === make
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white border-[var(--ps-primary,#0A84FF)] shadow-md'
                    : 'bg-[#141416]/80 text-gray-400 border-[#2C2C2E] hover:text-white hover:border-gray-600'
                }`}
              >
                {make}
              </button>
            ))}
          </div>

          {/* Art Style Toggle & View Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Art Style Tabs */}
            <div className="flex items-center bg-[#141416]/90 p-1 rounded-xl border border-[#2C2C2E]">
              <button
                onClick={() => setArtFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  artFilter === 'all' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setArtFilter('cartoons')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  artFilter === 'cartoons'
                    ? 'bg-pink-500/30 text-pink-300 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-pink-400" />
                2D Cartoon Only
              </button>
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center bg-[#141416]/90 p-1 rounded-xl border border-[#2C2C2E]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Grid Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="List Layout"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Results Metadata Header */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>
            Showing <span className="font-bold text-white">{filteredCars.length}</span> verified
            captures
            {searchQuery && (
              <span>
                {' '}
                matching "<span className="text-white font-mono">{searchQuery}</span>"
              </span>
            )}
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMake('All');
                setArtFilter('all');
              }}
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Gallery Cards Grid (Matching exact 3-column Apple/Porsche layout) */}
        {filteredCars.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
                : 'space-y-4'
            }
          >
            {filteredCars.map((car) => (
              <PhotoCard
                key={car.id}
                car={car}
                onOpenDownloadModal={handleOpenDownload}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[28px] p-12 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Vehicles Found</h3>
            <p className="text-xs text-gray-400">
              No matching captures found for plate or query "
              <span className="font-mono text-white">{searchQuery}</span>". Try one of the quick
              tags above or upload new photos in the Admin Portal.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
              >
                Reset Search
              </button>
              <button
                onClick={onOpenAdmin}
                className="px-4 py-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] text-white text-xs font-semibold hover:brightness-110 transition-colors"
              >
                Upload to Admin Portal
              </button>
            </div>
          </div>
        )}

        {/* Cinematic Bottom Banner */}
        <section className="rounded-[32px] overflow-hidden relative bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-black border border-white/10 p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold border border-pink-500/30">
              <Sparkles className="w-3.5 h-3.5" /> 2D Vector Cartoon Stickers
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Want your car rendered in 2D sticker art?
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Transform any track photograph into iconic pop-up headlight Miata cel-shaded vector
              illustrations in seconds.
            </p>
          </div>

          <button
            onClick={onOpenAdmin}
            className="bg-white text-black hover:bg-gray-100 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Open Studio in Admin</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
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
            <button onClick={onOpenAdmin} className="hover:text-white transition-colors">
              Admin Portal
            </button>
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
    </div>
  );
};

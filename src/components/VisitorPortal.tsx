import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronDown,
  Users,
  Heart,
  MapPin,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { CarPhoto, AppThemeConfig, Photographer } from '../types';
import { PhotoCard } from './PhotoCard';
import { PhotoCardSkeleton, PhotoCardSkeletonGrid } from './PhotoCardSkeleton';
import { DownloadModal } from './DownloadModal';
import { CarGalleryPage } from './CarGalleryPage';
import { TipModal } from './TipModal';
import { US_STATES, getStateName, parsePlateAndStateQuery } from '../utils/stateUtils';

interface VisitorPortalProps {
  cars: CarPhoto[];
  isLoading?: boolean;
  onOpenAdmin: () => void;
  onOpenServerConfig?: () => void;
  currentTheme: AppThemeConfig;
  onToggleThemeMode?: () => void;
}

export const VisitorPortal: React.FC<VisitorPortalProps> = ({
  cars,
  isLoading = false,
  onOpenAdmin,
  currentTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('All');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('All');
  const [artFilter, setArtFilter] = useState<'all' | 'photos' | 'cartoons'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Infinite Scroll / Row Pagination State
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [isLoadingMoreRows, setIsLoadingMoreRows] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Active Car Detail / Full Gallery View State
  const [selectedCarForGallery, setSelectedCarForGallery] = useState<CarPhoto | null>(null);

  // Download & Tip Modal States
  const [selectedCarForDownload, setSelectedCarForDownload] = useState<CarPhoto | null>(null);
  const [initialCartoonState, setInitialCartoonState] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [tippingCar, setTippingCar] = useState<CarPhoto | null>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);

  // Quick sample vehicles for user click
  const QUICK_CARS = [
    'Porsche 911 GT3 RS',
    'BMW M4 Competition',
    'Corvette Z06 C8',
    'Mazda Miata NA',
    'Mercedes-AMG E55',
  ];

  // All distinct makes
  const distinctMakes = useMemo(() => {
    const set = new Set<string>();
    cars.forEach((c) => {
      if (c.make) set.add(c.make);
    });
    return ['All', ...Array.from(set)];
  }, [cars]);

  // All distinct states represented in current inventory
  const distinctStates = useMemo(() => {
    const set = new Set<string>();
    cars.forEach((c) => {
      if (c.state) set.add(c.state.toUpperCase().trim());
    });
    return ['All', ...Array.from(set).sort()];
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

  // Smart Query Parsing (Checks if user typed a compound query like "7XYZ999 CA" or "Texas GT3")
  const parsedSearch = useMemo(() => {
    return parsePlateAndStateQuery(searchQuery);
  }, [searchQuery]);

  // Effective State Filter (Combines UI selector with typed state query)
  const effectiveState = useMemo(() => {
    if (selectedStateFilter !== 'All') return selectedStateFilter;
    if (parsedSearch.hasStateMatch && parsedSearch.state) return parsedSearch.state;
    return null;
  }, [selectedStateFilter, parsedSearch]);

  // Check for multi-state matching vehicles when searching a plate without a specific state selected
  const multiStateNotice = useMemo(() => {
    if (effectiveState !== null || !searchQuery.trim()) return null;

    const cleanPlateSearch = searchQuery.toUpperCase().replace(/[\s\-_.]/g, '');
    if (cleanPlateSearch.length < 2) return null;

    // Check cars that match this plate
    const matchingCars = cars.filter((c) => {
      const p = (c.plateNumber || '').toUpperCase().replace(/[\s\-_.]/g, '');
      return p.length > 0 && (p.includes(cleanPlateSearch) || cleanPlateSearch.includes(p));
    });

    if (matchingCars.length <= 1) return null;

    const stateMap = new Map<string, number>();
    matchingCars.forEach((c) => {
      const st = c.state ? c.state.toUpperCase().trim() : 'UNSPECIFIED';
      stateMap.set(st, (stateMap.get(st) || 0) + 1);
    });

    if (stateMap.size > 1) {
      return {
        plateQuery: searchQuery.trim().toUpperCase(),
        totalMatches: matchingCars.length,
        states: Array.from(stateMap.entries()).map(([code, count]) => ({
          code,
          label: code === 'UNSPECIFIED' ? 'No State Specified' : getStateName(code),
          count,
        })),
      };
    }
    return null;
  }, [cars, searchQuery, effectiveState]);

  // Filtered Cars
  const filteredCars = useMemo(() => {
    let result = [...cars];

    // State filter (exact match if state specified)
    if (effectiveState) {
      result = result.filter((c) => (c.state || '').toUpperCase().trim() === effectiveState.toUpperCase().trim());
    }

    // Search query filter (matches plate, name, make, model, event, author name, bio, tags)
    const textQuery = parsedSearch.hasStateMatch ? parsedSearch.plate : searchQuery;

    if (textQuery.trim()) {
      const q = textQuery.toLowerCase().replace(/[\s\-_.]/g, '');
      const rawQ = textQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const cleanPlate = (c.plateNumber || '').toLowerCase().replace(/[\s\-_.]/g, '');
        const plateRaw = (c.plateNumber || '').toLowerCase();
        const carState = (c.state || '').toLowerCase();
        const photogName = (c.photographer?.name || '').toLowerCase();
        const photogBio = (c.photographer?.bio || '').toLowerCase();
        const photogInsta = (c.photographer?.instagram || '').toLowerCase();
        const authorMatch = c.photoAuthors
          ? Object.values(c.photoAuthors as Record<string, Photographer>).some(
              (p: Photographer) => (p.name && p.name.toLowerCase().includes(rawQ)) || (p.bio && p.bio.toLowerCase().includes(rawQ))
            )
          : false;

        return (
          (cleanPlate && cleanPlate.includes(q)) ||
          plateRaw.includes(rawQ) ||
          (!effectiveState && carState === rawQ) ||
          (c.carName || '').toLowerCase().includes(rawQ) ||
          (c.make || '').toLowerCase().includes(rawQ) ||
          (c.model || '').toLowerCase().includes(rawQ) ||
          (c.event || '').toLowerCase().includes(rawQ) ||
          (c.location || '').toLowerCase().includes(rawQ) ||
          photogName.includes(rawQ) ||
          photogBio.includes(rawQ) ||
          photogInsta.includes(rawQ) ||
          authorMatch ||
          (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(rawQ)))
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
  }, [cars, searchQuery, parsedSearch, effectiveState, selectedMake, selectedAuthor, artFilter]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setVisibleCount(8);
  }, [searchQuery, selectedStateFilter, selectedMake, selectedAuthor, artFilter]);

  // Infinite Scroll Intersection Observer to load more rows on scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && visibleCount < filteredCars.length && !isLoadingMoreRows) {
          setIsLoadingMoreRows(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 4, filteredCars.length));
            setIsLoadingMoreRows(false);
          }, 350);
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredCars.length, isLoadingMoreRows]);

  const handleLoadMore = () => {
    setIsLoadingMoreRows(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 4, filteredCars.length));
      setIsLoadingMoreRows(false);
    }, 250);
  };

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
            Find Your Car by Vehicle Name.
          </h1>

          <p className="text-base sm:text-lg text-[var(--ps-text-muted,#9ca3af)] max-w-2xl mx-auto leading-relaxed">
            Search our curated gallery from premier track days and meets by vehicle name, make, or photographer.
            Download high-resolution photography and support shooters with direct tipping.
          </p>
        </section>

        {/* Hero Vehicle Name & Author Search Component */}
        <section className="max-w-3xl mx-auto space-y-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--ps-primary,#0A84FF)] to-blue-600 rounded-[28px] blur-md opacity-25 group-hover:opacity-40 transition duration-500" />
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[var(--ps-search-bg,#1C1C1E)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-2 shadow-2xl focus-within:border-[var(--ps-primary,#0A84FF)] transition-all gap-2 sm:gap-0">
              
              {/* Origin State / Region Selector Dropdown Inside Search Bar */}
              <div className="flex items-center pl-3 pr-2 sm:border-r border-[#3A3A3C]/60 shrink-0 py-1 sm:py-0">
                <MapPin className="w-4 h-4 text-[var(--ps-primary,#0A84FF)] mr-1.5 shrink-0" />
                <select
                  value={selectedStateFilter}
                  onChange={(e) => setSelectedStateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-200 outline-none cursor-pointer pr-2 hover:text-white transition-colors"
                  title="Filter by Vehicle Origin State / Region"
                >
                  <option value="All" className="bg-[#1C1C1E] text-white">All States / Regions</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code} className="bg-[#1C1C1E] text-white">
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Search Input */}
              <div className="flex items-center flex-1 min-w-0">
                <div className="pl-3 pr-2 text-gray-400">
                  <Search className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by car name (e.g. Porsche 911 GT3 RS, Miata), make, author..."
                  className="w-full bg-transparent border-none py-3 text-sm sm:text-base text-[var(--ps-text-main,#ffffff)] font-mono font-medium outline-none placeholder:text-gray-500 placeholder:font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-gray-400 hover:text-white transition-colors mr-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md active:scale-95 transition-all shrink-0 cursor-pointer text-center"
              >
                Search
              </button>
            </div>
          </div>

          {/* Search Helpers & Quick Vehicles */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-gray-400 px-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-500">Quick Try:</span>
              {QUICK_CARS.map((carItem) => (
                <button
                  key={carItem}
                  onClick={() => {
                    setSearchQuery(carItem);
                  }}
                  className={`font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer text-[11px] ${
                    searchQuery.toLowerCase().includes(carItem.toLowerCase())
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {carItem}
                </button>
              ))}
            </div>

            {selectedStateFilter !== 'All' && (
              <div className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30 text-[11px] font-mono">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>Filtered to <strong>{getStateName(selectedStateFilter)}</strong></span>
                <button
                  onClick={() => setSelectedStateFilter('All')}
                  className="ml-1 hover:text-white cursor-pointer"
                  title="Clear state filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Filter Controls Bar (States + Makes + Photographers + Art Styles) */}
        <section className="space-y-4 pt-6 border-t border-[var(--ps-card-border,#2C2C2E)]">
          {/* Row 1: State Origin Filter Chips (if inventory has distinct states) */}
          {distinctStates.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase font-mono mr-1 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>State:</span>
              </div>
              {distinctStates.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStateFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedStateFilter === st
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-[#141416]/80 text-gray-400 border-[#2C2C2E] hover:text-white hover:border-gray-600'
                  }`}
                >
                  {st === 'All' ? 'All States' : getStateName(st)}
                </button>
              ))}
            </div>
          )}

          {/* Row 2: Make filter chips */}
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

          {/* Row 3: Photographer / Author Search Filter & Art Style Toggle */}
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
          {/* Multi-State Disambiguation Alert Banner */}
          {multiStateNotice && (
            <div className="p-4 bg-gradient-to-r from-blue-950/60 to-purple-950/40 border border-blue-500/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-3 text-blue-200">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    Found {multiStateNotice.totalMatches} vehicles matching [{multiStateNotice.plateQuery}] across {multiStateNotice.states.length} different states.
                  </p>
                  <p className="text-[11px] text-blue-300">
                    Filter by vehicle origin state to eliminate redundant results:
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {multiStateNotice.states.map((st) => (
                  <button
                    key={st.code}
                    onClick={() => setSelectedStateFilter(st.code)}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-white text-xs font-mono font-bold border border-blue-400/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>{st.label} ({st.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Automotive Showcase</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300">
                {filteredCars.length} {filteredCars.length === 1 ? 'result' : 'results'}
              </span>
              {selectedStateFilter !== 'All' && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {getStateName(selectedStateFilter)}
                </span>
              )}
              {selectedAuthor !== 'All' && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  By {selectedAuthor}
                </span>
              )}
            </div>

            {(searchQuery || selectedStateFilter !== 'All' || selectedAuthor !== 'All' || selectedMake !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStateFilter('All');
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

          {/* Gallery Content Area */}
          {isLoading && cars.length === 0 ? (
            <PhotoCardSkeletonGrid count={8} viewMode={viewMode} />
          ) : filteredCars.length > 0 ? (
            <div className="space-y-6">
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'flex flex-col gap-4'
                }
              >
                {filteredCars.slice(0, visibleCount).map((car, index) => (
                  <PhotoCard
                    key={car.id}
                    car={car}
                    priority={index < (viewMode === 'grid' ? 4 : 2)}
                    onOpenDownloadModal={handleOpenDownload}
                    onSelectCar={(car) => setSelectedCarForGallery(car)}
                    onSelectAuthor={(authorName) => setSelectedAuthor(authorName)}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Shimmer row skeleton when loading additional rows */}
              {isLoadingMoreRows && (
                <div className="pt-2 animate-fadeIn">
                  <PhotoCardSkeletonGrid
                    count={viewMode === 'grid' ? 4 : 2}
                    viewMode={viewMode}
                  />
                </div>
              )}

              {/* Infinite scroll sentinel observer & fallback load more */}
              {visibleCount < filteredCars.length && (
                <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3">
                  <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMoreRows}
                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-md hover:border-[var(--ps-primary,#0A84FF)]/40 cursor-pointer disabled:opacity-50"
                  >
                    <ChevronDown className="w-4 h-4 text-[var(--ps-primary,#0A84FF)] animate-bounce" />
                    <span>
                      {isLoadingMoreRows
                        ? 'Loading next row...'
                        : `Load More Vehicles (${filteredCars.length - visibleCount} more)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-[#141416]/60 border border-[#2C2C2E] rounded-3xl space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Search className="w-8 h-8 text-[var(--ps-primary,#0A84FF)]" />
              </div>
              <h3 className="text-lg font-bold text-white">No cars found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Try searching by different vehicle name, car make, model, or select another photographer.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStateFilter('All');
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

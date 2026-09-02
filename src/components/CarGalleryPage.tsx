import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  Sparkles,
  Camera,
  Calendar,
  MapPin,
  Tag,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Check,
  Layers,
  Eye,
  Shield,
  ShieldCheck,
  ExternalLink,
  ZoomIn,
  X,
  FileArchive,
  Heart,
  CreditCard,
  Smartphone,
  Users,
  Lock,
  Loader2,
} from 'lucide-react';
import { CarPhoto, AppThemeConfig, Photographer } from '../types';
import { formatMediaUrl, getThumbnailUrl, getApiBaseUrl } from '../utils/apiConfig';
import { DownloadModal } from './DownloadModal';
import { TipModal } from './TipModal';
import { GalleryPhotoSkeletonGrid, GalleryThumbnailSkeleton } from './PhotoCardSkeleton';

interface CarGalleryPageProps {
  car: CarPhoto;
  onBack: () => void;
  currentTheme: AppThemeConfig;
  onOpenAdmin?: () => void;
  onOpenTipModal?: () => void;
}

export const CarGalleryPage: React.FC<CarGalleryPageProps> = ({
  car: initialCar,
  onBack,
  currentTheme,
  onOpenAdmin,
}) => {
  // Current car state which gets enriched when full details are fetched
  const [car, setCar] = useState<CarPhoto>(initialCar);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(
    !initialCar.images || initialCar.images.length <= 1
  );

  // Sync state if initialCar prop changes
  useEffect(() => {
    setCar(initialCar);
  }, [initialCar]);

  // Fetch full details (all gallery photos) on mount if only cover photo was loaded initially
  useEffect(() => {
    let isMounted = true;
    const fetchFullCarDetails = async () => {
      // If car already has multiple loaded images, skip
      if (initialCar.images && initialCar.images.length > 1) {
        setIsLoadingDetails(false);
        return;
      }

      try {
        setIsLoadingDetails(true);
        const base = getApiBaseUrl();
        const url = base ? `${base}/api/cars/${initialCar.id}` : `/api/cars/${initialCar.id}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.car && isMounted) {
            setCar(data.car);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch full vehicle details:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      }
    };

    fetchFullCarDetails();

    return () => {
      isMounted = false;
    };
  }, [initialCar.id]);

  // Normalize images list (fallback to imageUrl if images array is empty or undefined)
  const allImages = React.useMemo(() => {
    if (Array.isArray(car.images) && car.images.length > 0) {
      return car.images;
    }
    return [car.imageUrl];
  }, [car.images, car.imageUrl]);

  const expectedPhotoCount = React.useMemo(() => {
    return Math.max(
      car.photoCount || 0,
      initialCar.photoCount || 0,
      Array.isArray(car.images) && car.images.length > 0 ? car.images.length : 0,
      Array.isArray(initialCar.images) && initialCar.images.length > 0 ? initialCar.images.length : 0,
      1
    );
  }, [car.photoCount, initialCar.photoCount, car.images, initialCar.images]);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [downloadModalCartoon, setDownloadModalCartoon] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState<string>('');

  // Tipping Modal State
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);
  const [tippingPhotographers, setTippingPhotographers] = useState<Photographer[]>([]);

  // Mobile Touch Swipe Handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe left -> Next
        setActiveIndex((prev) => (prev + 1) % allImages.length);
      } else {
        // Swipe right -> Prev
        setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [car.id]);

  // Keyboard navigation for active photo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % allImages.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
      } else if (e.key === 'Escape' && isFullscreenOpen) {
        setIsFullscreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, isFullscreenOpen]);

  const activePhotoUrl = formatMediaUrl(allImages[activeIndex] || car.imageUrl);

  // Get author for specific photo
  const getAuthorForPhoto = (imgUrl: string): Photographer => {
    if (car.photoAuthors && car.photoAuthors[imgUrl]) {
      return car.photoAuthors[imgUrl];
    }
    return car.photographer;
  };

  const activeAuthor = getAuthorForPhoto(allImages[activeIndex]);

  // Get all distinct authors who took photos for this car
  const allSetAuthors = React.useMemo(() => {
    const map = new Map<string, Photographer>();
    if (car.photographer) map.set(car.photographer.name, car.photographer);
    if (car.photoAuthors) {
      Object.values(car.photoAuthors as Record<string, Photographer>).forEach((p: Photographer) => {
        if (p && p.name) map.set(p.name, p);
      });
    }
    return Array.from(map.values());
  }, [car]);

  // Copy shareable link
  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Download individual photo directly
  const handleDownloadSinglePhoto = (url: string, index: number) => {
    const safePrefix = `${car.make || 'Car'}_${car.model || 'Photo'}`.replace(/[\s\-_]+/g, '_');
    const link = document.createElement('a');
    link.href = formatMediaUrl(url);
    link.download = `${safePrefix}_Photo_${index + 1}_HighRes.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track download in backend
    fetch(`/api/cars/${car.id}/download`, { method: 'POST' }).catch(() => {});
  };

  // Open Tip for Single Author
  const handleTipSingleAuthor = (photog: Photographer) => {
    setTippingPhotographers([photog]);
    setIsTipModalOpen(true);
  };

  // Open Tip Split for All Authors
  const handleTipAllAuthors = () => {
    setTippingPhotographers(allSetAuthors);
    setIsTipModalOpen(true);
  };

  // Batch download all photos for this car
  const handleDownloadAllPhotos = async () => {
    setIsDownloadingAll(true);
    setDownloadAllProgress('Preparing photo archive...');
    const safePrefix = `${car.make || 'Car'}_${car.model || 'Photo'}`.replace(/[\s\-_]+/g, '_');

    try {
      for (let i = 0; i < allImages.length; i++) {
        setDownloadAllProgress(`Downloading photo ${i + 1} of ${allImages.length}...`);
        const imgUrl = formatMediaUrl(allImages[i]);
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = `${safePrefix}_Photo_${i + 1}_HighRes.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((res) => setTimeout(res, 400));
      }

      fetch(`/api/cars/${car.id}/download`, { method: 'POST' }).catch(() => {});
      setDownloadAllProgress('All photos queued for download!');
      setTimeout(() => {
        setIsDownloadingAll(false);
        setDownloadAllProgress('');
      }, 2000);
    } catch (err) {
      setIsDownloadingAll(false);
      setDownloadAllProgress('Error triggering batch download.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ps-bg,#000000)] text-[var(--ps-text-main,#ffffff)] relative transition-colors duration-300">
      {/* Top Header / Sticky Bar */}
      <header className="sticky top-0 z-40 bg-[var(--ps-nav-bg,rgba(0,0,0,0.85))] border-b border-[var(--ps-card-border,#2C2C2E)] backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-16 py-2.5 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white text-xs font-bold border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] transition-all shadow-sm active:scale-95 cursor-pointer group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--ps-primary,#0A84FF)] group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">Back to Site</span>
            <span className="sm:hidden">Back</span>
          </button>

          {/* Center Vehicle Descriptor Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[160px] sm:max-w-xs md:max-w-md">
            <div className="bg-[var(--ps-badge-bg,#111111)] px-3 py-1.5 rounded-full border border-[var(--ps-badge-border,#2C2C2E)] flex items-center gap-1.5 shadow-sm min-w-0">
              <span className="text-xs sm:text-sm font-mono font-black text-[var(--ps-badge-text,#ffffff)] tracking-wider truncate">
                {car.carName || `${car.make} ${car.model || ''}`}
              </span>
            </div>
            <span className="hidden md:inline-block text-xs font-mono font-semibold text-[var(--ps-text-muted,#9ca3af)] bg-[var(--ps-card-bg,#111111)] px-2.5 py-1 rounded-full border border-[var(--ps-card-border,#2C2C2E)] shrink-0">
              {allImages.length} {allImages.length === 1 ? 'Photo' : 'Photos'}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleTipAllAuthors}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Tip Photographers"
            >
              <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
              <span className="hidden sm:inline">
                {allSetAuthors.length > 1 ? `Tip Authors (${allSetAuthors.length})` : 'Tip Author'}
              </span>
              <span className="sm:hidden">Tip</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white text-xs font-semibold border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] transition-colors cursor-pointer group shadow-sm"
              title="Share Gallery Link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 text-xs font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white transition-colors" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadAllPhotos}
              disabled={isDownloadingAll}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isDownloadingAll ? 'Downloading...' : `Download All (${allImages.length})`}
              </span>
              <span className="sm:hidden">Download</span>
            </button>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white text-xs font-bold border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] transition-all active:scale-95 cursor-pointer group shadow-sm"
                title="Photographer Admin Portal"
                aria-label="Photographer Admin Portal"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white transition-colors" />
                <span className="hidden md:inline">Admin Portal</span>
                <Lock className="w-3 h-3 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white/80 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Detail Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Vehicle Information Hero Banner */}
        <section className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 shadow-xl transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Car Title, Make, Model & Specs */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {car.make && (
                  <span className="px-3 py-1 rounded-full bg-[var(--ps-primary,#0A84FF)]/15 text-[var(--ps-primary,#0A84FF)] text-xs font-mono font-bold tracking-wide border border-[var(--ps-primary,#0A84FF)]/30">
                    {car.make}
                  </span>
                )}
                {car.year && (
                  <span className="px-2.5 py-1 rounded-full bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-mono font-semibold">
                    {car.year}
                  </span>
                )}
                {car.color && (
                  <span className="px-2.5 py-1 rounded-full bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-semibold">
                    🎨 {car.color}
                  </span>
                )}
                {car.carName && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      <strong>{car.carName}</strong>
                    </span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--ps-text-main,#ffffff)] tracking-tight">
                {car.carName || 'Vehicle'}
              </h1>

              {(car.event || car.location || car.date) && (
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-[var(--ps-text-muted,#9ca3af)] font-medium">
                  {car.event && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[var(--ps-primary,#0A84FF)]" />
                      <span>{car.event}</span>
                    </div>
                  )}
                  {car.event && car.location && <span>•</span>}
                  {car.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[var(--ps-primary,#0A84FF)]" />
                      <span>{car.location}</span>
                    </div>
                  )}
                  {(car.event || car.location) && car.date && <span>•</span>}
                  {car.date && <span>{car.date}</span>}
                </div>
              )}
            </div>

            {/* Right: Photographer Details & Tipping */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[var(--ps-card-border,#2C2C2E)]">
              {/* Primary Photographer / Set Authors */}
              <div className="flex items-center gap-3 bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] px-4 py-2.5 rounded-2xl shadow-sm">
                {car.photographer?.avatar ? (
                  <img
                    src={car.photographer.avatar}
                    alt={car.photographer.name}
                    className="w-10 h-10 rounded-full object-cover border border-[var(--ps-card-border,#2C2C2E)] shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--ps-card-bg,#1c1c1e)] border border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-center text-[var(--ps-text-main,#ffffff)] font-bold text-sm shadow-sm">
                    {(car.photographer?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-[var(--ps-text-muted,#9ca3af)] uppercase font-mono font-bold tracking-wider">
                    {allSetAuthors.length > 1 ? `Lead Shooter (${allSetAuthors.length} in set)` : 'Photographer'}
                  </p>
                  <p className="text-sm font-extrabold text-[var(--ps-text-main,#ffffff)]">{car.photographer?.name || 'Photographer'}</p>
                  {car.photographer?.instagram && (
                    <p className="text-[11px] text-[var(--ps-primary,#0A84FF)] font-mono font-medium">
                      {car.photographer.instagram}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleTipSingleAuthor(car.photographer)}
                  className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 transition-colors ml-1 cursor-pointer shadow-sm"
                  title={`Tip ${car.photographer.name}`}
                >
                  <Heart className="w-4 h-4 fill-amber-500/30 text-amber-500" />
                </button>
              </div>

              {/* Cartoon Sticker Quick Action */}
              {car.hasCartoon && car.cartoonImageUrl && (
                <button
                  onClick={() => {
                    setDownloadModalCartoon(true);
                    setIsDownloadModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-700 dark:text-pink-300 border border-pink-500/30 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>Get 2D Cartoon Sticker</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Hero Interactive Photo Viewer */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[var(--ps-text-main,#ffffff)]">Full-Resolution Spotlight</h2>
              <span className="text-xs font-mono font-semibold text-[var(--ps-text-muted,#9ca3af)] bg-[var(--ps-card-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] px-2.5 py-0.5 rounded-full shadow-sm">
                Photo {activeIndex + 1} of {allImages.length}
              </span>
            </div>

            {/* Quick Actions for active photo */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleTipSingleAuthor(activeAuthor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title={`Tip ${activeAuthor.name}`}
              >
                <Heart className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500" />
                <span>Tip Author</span>
              </button>

              <button
                onClick={() => setIsFullscreenOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] text-xs font-bold transition-colors cursor-pointer shadow-sm group"
                title="Open Fullscreen Lightbox"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white transition-colors" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>

              <button
                onClick={() => handleDownloadSinglePhoto(allImages[activeIndex], activeIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </button>
            </div>
          </div>

          {/* Main Stage Frame */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] bg-black/90 rounded-3xl overflow-hidden border border-[var(--ps-card-border,#2C2C2E)] shadow-2xl flex items-center justify-center group touch-pan-y"
          >
            {/* Active Image */}
            <img
              src={activePhotoUrl}
              alt={`${car.carName} - Shot ${activeIndex + 1}`}
              className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 select-none"
              onClick={() => setIsFullscreenOpen(true)}
              draggable={false}
            />

            {/* Left Nav Arrow */}
            {allImages.length > 1 && (
              <button
                onClick={() => setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-85 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Right Nav Arrow */}
            {allImages.length > 1 && (
              <button
                onClick={() => setActiveIndex((prev) => (prev + 1) % allImages.length)}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-85 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Author Attribution Tag in Top Right */}
            {activeAuthor && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/75 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg max-w-[180px] sm:max-w-none">
                {activeAuthor.avatar ? (
                  <img
                    src={activeAuthor.avatar}
                    alt={activeAuthor.name}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {(activeAuthor.name || 'P').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-[11px] min-w-0">
                  <span className="text-gray-400 block text-[9px] leading-tight">Shot by</span>
                  <span className="text-white font-bold truncate block">{activeAuthor.name}</span>
                </div>
              </div>
            )}

            {/* Bottom Metadata Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pointer-events-none">
              <div className="space-y-0.5 min-w-0">
                {car.resolution && (
                  <p className="text-xs font-mono text-[var(--ps-primary,#0A84FF)] font-bold truncate">
                    {car.resolution}
                  </p>
                )}
                {car.cameraInfo && (
                  <p className="text-[11px] text-gray-300 font-mono truncate">
                    {car.cameraInfo}
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-400 font-mono bg-black/60 backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/10 w-fit">
                Angle {activeIndex + 1} of {allImages.length}
              </div>
            </div>
          </div>

          {/* Thumbnail Carousel Strip */}
          {isLoadingDetails ? (
            expectedPhotoCount > 1 && (
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {Array.from({ length: expectedPhotoCount }).map((_, idx) => (
                  <GalleryThumbnailSkeleton key={`thumb-skel-${idx}`} />
                ))}
              </div>
            )
          ) : (
            allImages.length > 1 && (
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`relative w-20 sm:w-28 md:w-32 aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeIndex === idx
                        ? 'border-[var(--ps-primary,#0A84FF)] scale-105 shadow-lg shadow-[var(--ps-primary,#0A84FF)]/20 ring-2 ring-[var(--ps-primary,#0A84FF)]/40'
                        : 'border-[#2C2C2E] opacity-60 hover:opacity-100 hover:border-white/40'
                    }`}
                  >
                    <img
                      src={getThumbnailUrl(imgUrl, 320, 75)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                      #{idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </section>

        {/* Complete Car Photo Gallery Grid with Author attribution per picture */}
        <section className="space-y-6 pt-4 border-t border-[var(--ps-card-border,#2C2C2E)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--ps-text-main,#ffffff)]">Vehicle Photo Gallery</h2>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">
                {isLoadingDetails
                  ? `Loading ${expectedPhotoCount} high-resolution captures for ${car.carName}...`
                  : `All ${allImages.length} high-resolution captures for ${car.carName}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTipAllAuthors}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Heart className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500" />
                <span>Tip Set Authors</span>
              </button>

              <button
                onClick={handleDownloadAllPhotos}
                disabled={isDownloadingAll || isLoadingDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] text-xs font-semibold transition-colors cursor-pointer shadow-sm group disabled:opacity-50"
              >
                <FileArchive className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)] group-hover:text-white transition-colors" />
                <span>Batch Download Set</span>
              </button>
            </div>
          </div>

          {/* Responsive Gallery Grid or Skeletons */}
          {isLoadingDetails ? (
            <GalleryPhotoSkeletonGrid count={expectedPhotoCount} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {allImages.map((imgUrl, idx) => {
                const formattedUrl = formatMediaUrl(imgUrl);
                const isSelected = activeIndex === idx;
                const author = getAuthorForPhoto(imgUrl);

                return (
                  <div
                    key={idx}
                    className={`group relative bg-[var(--ps-card-bg,#111111)] border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col ${
                      isSelected
                        ? 'border-[var(--ps-primary,#0A84FF)] ring-1 ring-[var(--ps-primary,#0A84FF)]'
                        : 'border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)]/50'
                    }`}
                  >
                    {/* Photo Container */}
                    <div
                      onClick={() => setActiveIndex(idx)}
                      className="relative aspect-[4/3] bg-black/80 overflow-hidden cursor-pointer"
                    >
                      <div className="skeleton-rainbow-shimmer opacity-20" />
                      <img
                        src={getThumbnailUrl(imgUrl, 640, 80)}
                        alt={`${car.carName} - Shot ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Badge */}
                      <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-white border border-white/10 z-20">
                        Photo {idx + 1}
                      </div>

                      {/* Active Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-[var(--ps-primary,#0A84FF)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-20">
                          Spotlight Active
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex(idx);
                            setIsFullscreenOpen(true);
                          }}
                          className="p-2.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          title="View Fullscreen"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTipSingleAuthor(author);
                          }}
                          className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          title={`Tip ${author.name}`}
                        >
                          <Heart className="w-4 h-4 fill-black" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSinglePhoto(imgUrl, idx);
                          }}
                          className="p-2.5 rounded-full bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          title="Download Photo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Info Footer with Author Info */}
                    <div className="p-3.5 sm:p-4 flex items-center justify-between border-t border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-card-bg,#111111)] gap-2">
                      <div className="space-y-1 min-w-0 pr-1">
                        <p className="text-xs font-bold text-[var(--ps-text-main,#ffffff)] truncate">
                          {idx === 0 ? 'Primary Front Shot' : `Angle Capture #${idx + 1}`}
                        </p>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            src={author.avatar}
                            alt={author.name}
                            className="w-4 h-4 rounded-full object-cover border border-[var(--ps-card-border,#2C2C2E)] shadow-sm shrink-0"
                          />
                          <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-medium truncate">
                            {author.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleTipSingleAuthor(author)}
                          className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer shadow-sm"
                          title={`Tip ${author.name}`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500" />
                        </button>

                        <button
                          onClick={() => handleDownloadSinglePhoto(imgUrl, idx)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)] text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-sm group"
                        >
                          <Download className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)] group-hover:text-white transition-colors" />
                          <span className="hidden xs:inline sm:inline">Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2D Cartoon Sticker Section */}
        {car.hasCartoon && car.cartoonImageUrl && (
          <section className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent border border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 text-pink-700 dark:text-pink-300 text-xs font-bold border border-pink-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>2D Cartoon Sticker Edition</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--ps-text-main,#ffffff)]">
                  Get the Cartoon Vector Sticker for {car.carName}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ps-text-muted,#9ca3af)] leading-relaxed max-w-2xl font-medium">
                  Hand-crafted or AI-stylized vector art based on this vehicle. Perfect for custom vinyl decals,
                  social avatars, and die-cut prints with transparent backgrounds.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setDownloadModalCartoon(true);
                      setIsDownloadModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Vector Sticker (.SVG / .PNG)</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-center">
                <div className="w-48 h-48 rounded-2xl bg-white/95 p-4 shadow-2xl border border-pink-300 flex items-center justify-center">
                  <img
                    src={formatMediaUrl(car.cartoonImageUrl)}
                    alt="Cartoon Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tags / Keywords Section */}
        {car.tags && car.tags.length > 0 && (
          <section className="space-y-3 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">Automotive Tags</h3>
            <div className="flex flex-wrap gap-2">
              {car.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-[var(--ps-card-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] text-xs text-[var(--ps-text-muted,#9ca3af)] font-mono font-semibold shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox / Fullscreen Modal */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {car.model} • Photo {activeIndex + 1} of {allImages.length}
              </span>
              <span className="hidden sm:inline text-xs text-gray-400">{car.carName}</span>
              <span className="text-xs text-blue-400 font-medium">By {activeAuthor.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTipSingleAuthor(activeAuthor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer hover:bg-amber-500/30"
              >
                <Heart className="w-3.5 h-3.5 fill-amber-400/40 text-amber-400" />
                <span className="hidden sm:inline">Tip {activeAuthor.name}</span>
              </button>

              <button
                onClick={() => handleDownloadSinglePhoto(allImages[activeIndex], activeIndex)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] text-white text-xs font-bold shadow-md cursor-pointer hover:brightness-110"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download High-Res</span>
              </button>
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image View */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden touch-pan-y"
          >
            <img
              src={activePhotoUrl}
              alt="Fullscreen View"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
              draggable={false}
            />

            {allImages.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setActiveIndex((prev) => (prev + 1) % allImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeIndex === i ? 'border-[var(--ps-primary,#0A84FF)] scale-110' : 'border-white/20 opacity-50'
                  }`}
                >
                  <img src={formatMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Download Modal */}
      {isDownloadModalOpen && (
        <DownloadModal
          car={car}
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          defaultToCartoon={downloadModalCartoon}
        />
      )}

      {/* Tip Modal */}
      {isTipModalOpen && (
        <TipModal
          isOpen={isTipModalOpen}
          onClose={() => setIsTipModalOpen(false)}
          car={car}
          allPhotographers={tippingPhotographers}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Download, Sparkles, Image as ImageIcon, Camera, Eye, Layers } from 'lucide-react';
import { CarPhoto, GeneralSettings } from '../types';
import { formatMediaUrl, getThumbnailUrl } from '../utils/apiConfig';

interface PhotoCardProps {
  car: CarPhoto;
  onOpenDownloadModal: (car: CarPhoto, defaultToCartoon?: boolean) => void;
  onSelectCar?: (car: CarPhoto) => void;
  onSelectAuthor?: (authorName: string) => void;
  onOpenStickerGenerator?: (car: CarPhoto) => void;
  generalSettings?: GeneralSettings;
  viewMode?: 'grid' | 'list';
  priority?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  car,
  onOpenDownloadModal,
  onSelectCar,
  onSelectAuthor,
  onOpenStickerGenerator,
  generalSettings,
  viewMode = 'grid',
  priority = false,
}) => {
  const [showCartoon, setShowCartoon] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const [imageHasError, setImageHasError] = useState<boolean>(false);

  // Use high-performance WebP thumbnail for cover photos in the gallery
  const rawImage = showCartoon && car.cartoonImageUrl ? car.cartoonImageUrl : car.imageUrl;
  const displayImage = showCartoon
    ? formatMediaUrl(rawImage)
    : getThumbnailUrl(rawImage, 720, 80);

  const photoCount = car.photoCount !== undefined 
    ? car.photoCount 
    : (Array.isArray(car.images) && car.images.length > 0 ? car.images.length : 1);

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelectCar) {
      onSelectCar(car);
    } else {
      onOpenDownloadModal(car, false);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectAuthor && car.photographer?.name) {
      onSelectAuthor(car.photographer.name);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        id={`photo-card-${car.id}`}
        onClick={handleCardClick}
        className="photo-card group relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[20px] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:border-[var(--ps-primary,#0A84FF)]/50 flex flex-col md:flex-row items-center p-4 gap-6 cursor-pointer"
      >
        {/* Thumbnail with Loading Shimmer */}
        <div className="relative w-full md:w-64 aspect-[4/3] rounded-xl overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
          {/* Skeleton Shimmer while image loads */}
          {!isImageLoaded && !imageHasError && (
            <div className="absolute inset-0 bg-white/5 overflow-hidden flex items-center justify-center z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
              <Camera className="w-6 h-6 text-white/20 animate-pulse" />
            </div>
          )}

          <img
            src={displayImage}
            alt={car.carName}
            loading={priority ? 'eager' : 'lazy'}
            // @ts-ignore
            fetchpriority={priority ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setImageHasError(true);
              setIsImageLoaded(true);
            }}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              showCartoon ? 'bg-white object-contain p-2' : ''
            } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="absolute top-2.5 left-2.5 z-10">
            <div className="bg-[var(--ps-badge-bg,rgba(0,0,0,0.85))] backdrop-blur-md px-2.5 py-1 rounded-full border border-[var(--ps-badge-border,#2C2C2E)] flex items-center gap-1.5 shadow-md">
              <span className="text-xs font-mono font-bold tracking-wider text-[var(--ps-badge-text,#ffffff)]">
                {car.carName || `${car.make} ${car.model || ''}`}
              </span>
            </div>
          </div>

          {/* Photo count indicator */}
          <div className="absolute top-2.5 right-2.5 z-10 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-md">
            <Layers className="w-3 h-3 text-sky-400" />
            <span className="text-white font-bold">{photoCount} {photoCount === 1 ? 'Shot' : 'Shots'}</span>
          </div>

          {car.hasCartoon && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCartoon(!showCartoon);
                setIsImageLoaded(false);
              }}
              className="absolute bottom-2.5 right-2.5 z-10 bg-black/80 hover:bg-black text-pink-400 border border-pink-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md transition-all shadow-lg cursor-pointer"
              title="Toggle Cartoon / Real Photo"
            >
              <Sparkles className="w-3 h-3" />
              {showCartoon ? 'Photo' : 'Cartoon'}
            </button>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0 space-y-2 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)] truncate group-hover:text-[var(--ps-primary,#0A84FF)] transition-colors">
              {car.carName}
            </h3>
            {car.year && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-[var(--ps-text-muted,#9ca3af)] font-mono">
                {car.year}
              </span>
            )}
          </div>

          {(car.event || car.location) && (
            <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] flex items-center gap-2">
              {car.event && <span>{car.event}</span>}
              {car.event && car.location && <span>•</span>}
              {car.location && <span>{car.location}</span>}
            </p>
          )}

          {car.photographer?.name && (
            <div
              onClick={handleAuthorClick}
              className="flex items-center gap-2 pt-2 hover:opacity-80 transition-opacity w-fit"
              title="Filter by this photographer"
            >
              {car.photographer.avatar ? (
                <img
                  src={car.photographer.avatar}
                  alt={car.photographer.name}
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  {car.photographer.name.charAt(0)}
                </div>
              )}
              <span className="text-xs text-[var(--ps-text-main,#ffffff)] font-medium hover:text-[var(--ps-primary,#0A84FF)]">
                {car.photographer.name}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectCar) onSelectCar(car);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
            <span>View Gallery ({photoCount})</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDownloadModal(car, false);
            }}
            className="p-2.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            title="Download High-Res"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onOpenStickerGenerator && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenStickerGenerator(car);
              }}
              className="px-3 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Generate 2D Vinyl Sticker"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Sticker</span>
            </button>
          )}
          {car.hasCartoon && !onOpenStickerGenerator && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDownloadModal(car, true);
              }}
              className="p-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              title="Download Cartoon Sticker"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`photo-card-${car.id}`}
      onClick={handleCardClick}
      className="photo-card group relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[20px] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:border-[var(--ps-primary,#0A84FF)]/50 flex flex-col cursor-pointer"
    >
      {/* Thumbnail Aspect Ratio with Shimmer */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/40 flex items-center justify-center">
        {/* Skeleton Shimmer Wave while image downloads */}
        {!isImageLoaded && !imageHasError && (
          <div className="absolute inset-0 bg-white/5 overflow-hidden flex items-center justify-center z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
            <Camera className="w-8 h-8 text-white/20 animate-pulse" />
          </div>
        )}

        <img
          src={displayImage}
          alt={car.carName}
          loading={priority ? 'eager' : 'lazy'}
          // @ts-ignore
          fetchpriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setIsImageLoaded(true)}
          onError={() => {
            setImageHasError(true);
            setIsImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            showCartoon ? 'bg-white object-contain p-4' : ''
          } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Vehicle Badge (Floating Top Left) */}
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-[var(--ps-badge-bg,rgba(0,0,0,0.85))] backdrop-blur-md px-3 py-1 rounded-full border border-[var(--ps-badge-border,#2C2C2E)] flex items-center gap-1.5 shadow-md">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--ps-badge-text,#ffffff)]">
              {car.carName || `${car.make} ${car.model || ''}`}
            </span>
          </div>
        </div>

        {/* Photo count indicator (Top Right) */}
        <div className="absolute top-3 right-3 z-10 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 shadow-md">
          <Layers className="w-3 h-3 text-sky-400" />
          <span className="text-white font-bold">{photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}</span>
        </div>

        {/* Art Type Indicator / Toggle */}
        {car.hasCartoon && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCartoon(!showCartoon);
              setIsImageLoaded(false);
            }}
            className="absolute bottom-3 right-3 z-10 bg-black/80 hover:bg-black text-pink-400 border border-pink-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer"
            title="Toggle Cartoon / Real Photo"
          >
            <Sparkles className="w-3 h-3" />
            {showCartoon ? 'Show Photo' : 'Show Cartoon'}
          </button>
        )}

        {/* Hover View Gallery Overlay Hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
          <span className="bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-xl">
            <Eye className="w-3.5 h-3.5 text-[var(--ps-primary,#0A84FF)]" />
            Open Full Gallery
          </span>
        </div>
      </div>

      {/* Card Content Footer */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-[var(--ps-text-main,#ffffff)] line-clamp-1 group-hover:text-[var(--ps-primary,#0A84FF)] transition-colors">
              {car.carName}
            </h3>
            {car.year && (
              <span className="text-xs font-mono text-[var(--ps-text-muted,#9ca3af)] shrink-0">
                {car.year}
              </span>
            )}
          </div>
          {(car.event || car.location) && (
            <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-1 line-clamp-1">
              {[car.event, car.location].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Tags */}
        {Array.isArray(car.tags) && car.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {car.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] text-[var(--ps-text-muted,#9ca3af)] font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Photographer & Action */}
        <div className="pt-3 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between">
          {car.photographer?.name ? (
            <div
              onClick={handleAuthorClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              title={`Filter by photographer ${car.photographer.name}`}
            >
              {car.photographer.avatar ? (
                <img
                  src={car.photographer.avatar}
                  alt={car.photographer.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/15"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  {car.photographer.name.charAt(0)}
                </div>
              )}
              <span className="text-xs text-[var(--ps-text-main,#ffffff)] font-medium truncate max-w-[100px] hover:text-[var(--ps-primary,#0A84FF)]">
                {car.photographer.name}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDownloadModal(car, false);
              }}
              className="p-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              title="Download High-Res Photo"
            >
              <Download className="w-4 h-4" />
            </button>
            {onOpenStickerGenerator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStickerGenerator(car);
                }}
                className="p-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Generate 2D Vinyl Sticker"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {car.hasCartoon && !onOpenStickerGenerator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDownloadModal(car, true);
                }}
                className="p-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Download Cartoon Sticker"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


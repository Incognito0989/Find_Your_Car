import React, { useState } from 'react';
import { Download, Sparkles, Image as ImageIcon, Camera, Eye } from 'lucide-react';
import { CarPhoto } from '../types';

interface PhotoCardProps {
  car: CarPhoto;
  onOpenDownloadModal: (car: CarPhoto, defaultToCartoon?: boolean) => void;
  viewMode?: 'grid' | 'list';
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  car,
  onOpenDownloadModal,
  viewMode = 'grid',
}) => {
  const [showCartoon, setShowCartoon] = useState<boolean>(false);

  const displayImage = showCartoon && car.cartoonImageUrl ? car.cartoonImageUrl : car.imageUrl;

  if (viewMode === 'list') {
    return (
      <div
        id={`photo-card-${car.id}`}
        className="photo-card group relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[20px] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:border-[var(--ps-primary,#0A84FF)]/50 flex flex-col md:flex-row items-center p-4 gap-6"
      >
        {/* Thumbnail with Plate Badge */}
        <div className="relative w-full md:w-64 aspect-[4/3] rounded-xl overflow-hidden shrink-0 bg-black flex items-center justify-center">
          <img
            src={displayImage}
            alt={car.carName}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              showCartoon ? 'bg-white object-contain p-2' : ''
            }`}
          />
          <div className="absolute top-2.5 left-2.5">
            <div className="bg-[var(--ps-badge-bg,rgba(0,0,0,0.75))] backdrop-blur-md px-2.5 py-1 rounded-full border border-[var(--ps-badge-border,#2C2C2E)] flex items-center gap-1.5 shadow-md">
              <span className="text-[9px] text-[var(--ps-text-muted,#9ca3af)] font-bold uppercase tracking-wider">
                Plate
              </span>
              <span className="text-xs font-mono font-bold text-[var(--ps-badge-text,#ffffff)]">
                {car.plateNumber}
              </span>
            </div>
          </div>

          {car.hasCartoon && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCartoon(!showCartoon);
              }}
              className="absolute bottom-2.5 right-2.5 bg-black/80 hover:bg-black text-pink-400 border border-pink-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md transition-all shadow-lg"
              title="Toggle Cartoon / Real Photo"
            >
              <Sparkles className="w-3 h-3" />
              {showCartoon ? 'Show Photo' : 'Show Cartoon'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)] tracking-tight truncate">
              {car.carName}
            </h3>
            {car.year && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#1C1C1E] text-gray-400 border border-[#2C2C2E]">
                {car.year}
              </span>
            )}
            {car.hasCartoon && (
              <span className="bg-pink-500/15 text-pink-400 border border-pink-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                2D Cartoon Available
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider">
            {car.event} • {car.date}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
              {car.photographer.name}
            </span>
            <span className="font-mono text-[11px] text-gray-500">{car.resolution}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {car.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex md:flex-col items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={() => onOpenDownloadModal(car, showCartoon)}
            className="flex-1 md:flex-initial bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            View & Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`photo-card-${car.id}`}
      className="photo-card group relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] overflow-hidden transition-all duration-500 shadow-lg hover:shadow-2xl hover:border-[var(--ps-primary,#0A84FF)]/40 flex flex-col justify-between"
    >
      {/* Photo Image Aspect 4/3 */}
      <div className="aspect-[4/3] overflow-hidden relative bg-black flex items-center justify-center">
        <img
          src={displayImage}
          alt={car.carName}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
            showCartoon ? 'bg-white object-contain p-3' : ''
          }`}
          loading="lazy"
        />

        {/* Plate Badge (Matching reference design) */}
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-[var(--ps-badge-bg,rgba(0,0,0,0.75))] backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--ps-badge-border,#2C2C2E)] flex items-center gap-2 shadow-xl">
            <span className="text-[10px] text-[var(--ps-text-muted,#9ca3af)] font-bold uppercase tracking-wider">
              Plate
            </span>
            <span className="text-sm font-mono font-bold text-[var(--ps-badge-text,#ffffff)] tracking-wider">
              {car.plateNumber}
            </span>
          </div>
        </div>

        {/* 2D Cartoon Quick Switch Pill */}
        {car.hasCartoon && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCartoon(!showCartoon);
              }}
              className="bg-black/80 hover:bg-black border border-pink-500/50 text-pink-400 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-xl hover:scale-105 transition-all"
              title="Toggle Cartoon / Real Photo"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>{showCartoon ? 'Real Photo' : 'Cartoon Art'}</span>
            </button>
          </div>
        )}

        {/* Hover Overlay Action (Matching reference design) */}
        <div className="photo-card-overlay absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
          <button
            onClick={() => onOpenDownloadModal(car, showCartoon)}
            className="bg-white text-black font-bold py-3 px-8 rounded-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4 text-black" />
            View & Download
          </button>
          <span className="text-[11px] text-gray-300 mt-2 font-medium tracking-wide">
            {showCartoon ? '4K Vector Sticker Ready' : '4K 300 DPI High-Res'}
          </span>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-6 flex items-center justify-between border-t border-[var(--ps-card-border,#2C2C2E)]/60 bg-[var(--ps-card-bg,#111111)]">
        <div className="min-w-0 pr-3">
          <h3 className="font-semibold text-[var(--ps-text-main,#ffffff)] tracking-tight truncate text-base">
            {car.carName}
          </h3>
          <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider mt-1 truncate">
            {car.date}
          </p>
        </div>

        <button
          onClick={() => onOpenDownloadModal(car, showCartoon)}
          className="text-gray-400 hover:text-[var(--ps-primary,#0A84FF)] hover:scale-110 cursor-pointer transition-all p-2 rounded-lg hover:bg-white/5 shrink-0"
          title="Download High-Res"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

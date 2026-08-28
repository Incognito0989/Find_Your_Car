import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Heart,
  CheckCircle2,
  Info,
  Maximize2,
  FileCode,
  Tag,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { CarPhoto } from '../types';

interface DownloadModalProps {
  car: CarPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  initialCartoonState?: boolean;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  car,
  isOpen,
  onClose,
  initialCartoonState = false,
}) => {
  const [selectedDonation, setSelectedDonation] = useState<number | 'custom'>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<'full' | '1080p' | 'cartoon' | 'raw'>('full');
  const [isCartoonView, setIsCartoonView] = useState<boolean>(initialCartoonState);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync cartoon state if initial changes
  React.useEffect(() => {
    setIsCartoonView(Boolean(initialCartoonState && car?.hasCartoon));
  }, [initialCartoonState, car]);

  if (!isOpen || !car) return null;

  const currentDisplayImage =
    isCartoonView && car.cartoonImageUrl ? car.cartoonImageUrl : car.imageUrl;

  const handleDownload = async (withDonation: boolean) => {
    setIsDownloading(true);
    try {
      // Call backend increment download
      fetch(`/api/cars/${car.id}/download`, { method: 'POST' }).catch(() => {});

      // Simulate download trigger
      const link = document.createElement('a');
      link.href = currentDisplayImage;
      link.download = `${car.plateNumber}_${car.make}_${car.model}_${
        isCartoonView ? 'Cartoon_Sticker' : selectedResolution
      }.${isCartoonView ? 'svg' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 4000);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div id="download-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 modal-blur bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh] z-10 animate-in zoom-in-95 duration-200">
        {/* Left Side: Interactive Image Viewer */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[320px] md:min-h-[500px]">
          {/* Close button top left matching reference */}
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all shadow-xl"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Plate & Art Style Badge top right */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <div className="bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-xl">
              PLATE: {car.plateNumber}
            </div>

            {car.hasCartoon && (
              <button
                onClick={() => setIsCartoonView(!isCartoonView)}
                className={`backdrop-blur-md border text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 transition-all shadow-xl ${
                  isCartoonView
                    ? 'bg-pink-500 text-white border-pink-400'
                    : 'bg-black/70 text-pink-400 border-pink-500/40 hover:bg-black'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isCartoonView ? 'View Real Photo' : 'View 2D Cartoon'}
              </button>
            )}
          </div>

          {/* Main Visual Render */}
          <div className="w-full h-full p-4 flex items-center justify-center relative">
            <img
              src={currentDisplayImage}
              alt={car.carName}
              className={`max-w-full max-h-[70vh] object-contain select-none transition-all duration-300 ${
                isCartoonView ? 'bg-white rounded-2xl p-6 shadow-2xl max-h-[55vh]' : ''
              }`}
            />
          </div>

          {/* Quick share button bottom left */}
          <button
            onClick={handleCopyLink}
            className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md border border-white/10 text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copiedLink ? 'Link Copied!' : 'Share Photo'}
          </button>
        </div>

        {/* Right Side: Donation & Download Panel (Matching Reference UI) */}
        <div className="w-full md:w-[420px] p-6 md:p-10 overflow-y-auto custom-scrollbar bg-[var(--ps-card-bg,#111111)] border-t md:border-t-0 md:border-l border-[var(--ps-card-border,#2C2C2E)] flex flex-col justify-between">
          <div>
            {/* Header text */}
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--ps-text-main,#ffffff)] mb-1">
              Download High-Res
            </h2>
            <p className="text-[var(--ps-text-muted,#9ca3af)] text-xs md:text-sm mb-6">
              Your photo is ready for download in original high resolution (300 DPI).
            </p>

            {/* Resolution Selector */}
            <div className="mb-6">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Select Format & Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setSelectedResolution('full');
                    setIsCartoonView(false);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                    selectedResolution === 'full' && !isCartoonView
                      ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-[var(--ps-primary,#0A84FF)]'
                      : 'border-[#2C2C2E] bg-[#1C1C1E] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Original Res</div>
                  <div className="text-[9px] opacity-70">300 DPI (Full)</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedResolution('1080p');
                    setIsCartoonView(false);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                    selectedResolution === '1080p' && !isCartoonView
                      ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-[var(--ps-primary,#0A84FF)]'
                      : 'border-[#2C2C2E] bg-[#1C1C1E] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">1080p</div>
                  <div className="text-[9px] opacity-70">Web & Social</div>
                </button>

                {car.hasCartoon && (
                  <button
                    onClick={() => {
                      setSelectedResolution('cartoon');
                      setIsCartoonView(true);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                      isCartoonView
                        ? 'border-pink-500 bg-pink-500/15 text-pink-400'
                        : 'border-[#2C2C2E] bg-[#1C1C1E] text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-400" /> Cartoon
                    </div>
                    <div className="text-[9px] opacity-70">Vector Sticker</div>
                  </button>
                )}
              </div>
            </div>

            {/* Support Photographer Donation Section (Exact Reference match) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Support the Photographer
                </h3>
                <span className="text-[10px] text-blue-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% goes to artist
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {[5, 10, 20].map((amt) => {
                  const isSelected = selectedDonation === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => {
                        setSelectedDonation(amt);
                        setCustomAmount('');
                      }}
                      className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                        isSelected
                          ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-[var(--ps-primary,#0A84FF)] scale-102 shadow-md'
                          : 'border-[#2C2C2E] hover:border-[var(--ps-primary,#0A84FF)] hover:bg-[var(--ps-primary,#0A84FF)]/10 text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount field */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">
                  $
                </span>
                <input
                  type="number"
                  placeholder="Custom donation amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedDonation('custom');
                  }}
                  className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-3 pl-8 pr-4 text-white text-sm focus:ring-1 focus:ring-[var(--ps-primary,#0A84FF)] focus:border-[var(--ps-primary,#0A84FF)] outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleDownload(true)}
                disabled={isDownloading}
                className="w-full bg-[var(--ps-primary,#0A84FF)] text-white py-3.5 px-6 rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 text-white fill-white" />
                {selectedDonation === 'custom' && customAmount
                  ? `Donate $${customAmount} & Download High-Res`
                  : typeof selectedDonation === 'number'
                  ? `Donate $${selectedDonation} & Download High-Res`
                  : 'Donate & Download High-Res'}
              </button>

              <button
                onClick={() => handleDownload(false)}
                disabled={isDownloading}
                className="w-full py-2.5 text-gray-500 hover:text-white text-xs font-medium transition-colors text-center cursor-pointer"
              >
                Skip donation & download free ($0)
              </button>

              {downloadSuccess && (
                <div className="p-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold flex items-center gap-2 justify-center animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Download started in full resolution!
                </div>
              )}
            </div>
          </div>

          {/* Photographer Profile & Specs Footer (Matching reference) */}
          <div className="mt-8 pt-6 border-t border-[#2C2C2E]">
            <div className="flex items-center gap-3.5">
              <img
                src={car.photographer.avatar}
                alt={car.photographer.name}
                className="w-11 h-11 rounded-full object-cover border border-white/10 ring-2 ring-blue-500/20"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  Captured by {car.photographer.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{car.photographer.title}</p>
                {car.photographer.bio && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                    {car.photographer.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Camera specs */}
            {car.cameraInfo && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <Camera className="w-3 h-3 text-gray-600" />
                <span>{car.cameraInfo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

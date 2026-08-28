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
import { formatMediaUrl, getApiBaseUrl } from '../utils/apiConfig';

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

  const rawImage = isCartoonView && car.cartoonImageUrl ? car.cartoonImageUrl : car.imageUrl;
  const currentDisplayImage = formatMediaUrl(rawImage);

  const handleDownload = async (withDonation: boolean) => {
    setIsDownloading(true);
    try {
      // Call backend increment download
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/cars/${car.id}/download` : `/api/cars/${car.id}/download`;
      fetch(endpoint, { method: 'POST' }).catch(() => {});

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
            className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all shadow-xl cursor-pointer"
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
                className={`backdrop-blur-md border text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 transition-all shadow-xl cursor-pointer ${
                  isCartoonView
                    ? 'bg-pink-500/30 border-pink-500 text-pink-300'
                    : 'bg-black/70 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>{isCartoonView ? 'Sticker View' : 'Switch to Cartoon'}</span>
              </button>
            )}
          </div>

          {/* Main Visual Presentation */}
          <div className="w-full h-full p-4 flex items-center justify-center">
            <img
              src={currentDisplayImage}
              alt={car.carName}
              className={`max-w-full max-h-[75vh] object-contain transition-all duration-300 ${
                isCartoonView ? 'p-8 bg-white/5 rounded-2xl' : 'rounded-xl'
              }`}
            />
          </div>

          {/* Watermark subtle bottom left */}
          <div className="absolute bottom-6 left-6 z-20 pointer-events-none opacity-60">
            <p className="text-[10px] font-mono tracking-widest text-white uppercase">
              Plate Snap • Verified Vault Record
            </p>
          </div>
        </div>

        {/* Right Side: Photo Details & Download Workflow */}
        <div className="w-full md:w-[420px] bg-[var(--ps-card-bg,#111111)] p-6 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar border-t md:border-t-0 md:border-l border-[var(--ps-card-border,#2C2C2E)] space-y-6">
          <div className="space-y-5">
            {/* Header & Car Title */}
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--ps-text-muted,#9ca3af)] mb-1">
                <span>{car.year} • {car.make}</span>
                <span className="font-mono">{car.plateNumber}</span>
              </div>
              <h2 className="text-2xl font-black text-[var(--ps-text-main,#ffffff)] tracking-tight">
                {car.carName}
              </h2>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-1">
                {car.event} • {car.location}
              </p>
            </div>

            {/* Photographer Card */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <img
                src={car.photographer.avatar}
                alt={car.photographer.name}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{car.photographer.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{car.photographer.title}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Share photo link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Download Format / Resolution Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
                Select File Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResolution('full');
                    setIsCartoonView(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedResolution === 'full' && !isCartoonView
                      ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-white'
                      : 'border-[#2C2C2E] bg-[#141416] text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold">Ultra HD JPG</p>
                  <p className="text-[10px] text-gray-500">300 DPI Original</p>
                </button>

                {car.hasCartoon && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResolution('cartoon');
                      setIsCartoonView(true);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isCartoonView
                        ? 'border-pink-500 bg-pink-500/15 text-pink-300'
                        : 'border-[#2C2C2E] bg-[#141416] text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <p className="text-xs font-bold">Cartoon Sticker</p>
                    </div>
                    <p className="text-[10px] text-gray-500">Vector SVG / 2D</p>
                  </button>
                )}
              </div>
            </div>

            {/* Optional Tip / Donation for Photographer */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--ps-card-border,#2C2C2E)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  <span>Support Photographer</span>
                </span>
                <span className="text-[11px] text-gray-500">Optional Tip</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSelectedDonation(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedDonation === amt
                        ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                        : 'border-[#2C2C2E] bg-[#141416] text-gray-400 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedDonation(0)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedDonation === 0
                      ? 'border-gray-500 bg-white/10 text-white'
                      : 'border-[#2C2C2E] bg-[#141416] text-gray-400 hover:text-white'
                  }`}
                >
                  Free
                </button>
              </div>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="pt-4 space-y-2 border-t border-[var(--ps-card-border,#2C2C2E)]">
            <button
              onClick={() => handleDownload(selectedDonation !== 0)}
              disabled={isDownloading}
              className="w-full py-3.5 rounded-2xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Download Started!</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>
                    {selectedDonation === 0
                      ? 'Download Free'
                      : `Download & Tip $${selectedDonation}`}
                  </span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full resolution license • Personal and social media usage</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

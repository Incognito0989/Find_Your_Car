import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  Layers,
  Wand2,
  Sliders,
  Maximize2,
  Image as ImageIcon,
  Heart,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CarPhoto, GeneralSettings } from '../types';
import { formatMediaUrl } from '../utils/apiConfig';
import { convertPhotoToCartoonSticker } from '../utils/cartoonEngine';

interface StickerGeneratorModalProps {
  car: CarPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  generalSettings?: GeneralSettings | null;
  onApplyStickerToCar?: (stickerDataUrl: string) => Promise<void>;
  onTipClick?: () => void;
}

const FEEDBACK_PRESETS = [
  'Bolder comic inking lines',
  'More vibrant automotive paint finish',
  'Exaggerated chibi proportions',
  'Sharper wheel & rim details',
  'Cleaner solid die-cut white border',
  'Remove background noise & isolate subject',
  'Enhance spoiler and aero kit contours',
];

export const StickerGeneratorModal: React.FC<StickerGeneratorModalProps> = ({
  car,
  isOpen,
  onClose,
  generalSettings,
  onApplyStickerToCar,
  onTipClick,
}) => {
  const maxRetries = generalSettings?.maxStickerRetries ?? 3;
  const [retriesRemaining, setRetriesRemaining] = useState<number>(maxRetries);
  const [currentStickerUrl, setCurrentStickerUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [engineUsed, setEngineUsed] = useState<string>(generalSettings?.aiProvider || 'gemini');

  useEffect(() => {
    if (generalSettings?.aiProvider) {
      setEngineUsed(generalSettings.aiProvider);
    }
  }, [generalSettings?.aiProvider]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Recreate & Feedback State
  const [selectedFeedbackPreset, setSelectedFeedbackPreset] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [showFeedbackSection, setShowFeedbackSection] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'sticker' | 'original'>('sticker');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [copiedDownload, setCopiedDownload] = useState<boolean>(false);

  // Initialize or reset on car opening
  useEffect(() => {
    if (isOpen && car) {
      setRetriesRemaining(maxRetries);
      setSelectedFeedbackPreset('');
      setFeedbackText('');
      setErrorMsg(null);
      setAppliedSuccess(false);

      if (car.hasCartoon && car.cartoonImageUrl) {
        setCurrentStickerUrl(formatMediaUrl(car.cartoonImageUrl));
        setEngineUsed('saved');
        setStatusMessage('Loaded existing vector sticker art.');
      } else {
        // Auto-generate on first open
        generateSticker(0);
      }
    } else {
      setCurrentStickerUrl(null);
    }
  }, [isOpen, car?.id]);

  if (!isOpen || !car) return null;

  const originalImageUrl = formatMediaUrl(car.imageUrl);

  const generateSticker = async (
    retryCount: number,
    feedback?: string,
    preset?: string
  ) => {
    setIsGenerating(true);
    setErrorMsg(null);
    const currentProvider = generalSettings?.aiProvider || 'gemini';
    setStatusMessage(
      currentProvider === 'gemini'
        ? `Synthesizing sticker with Google Gemini AI (${generalSettings?.geminiModel || 'gemini-3.1-flash-image'})...`
        : currentProvider === 'nvidia'
        ? `Synthesizing sticker with NVIDIA AI (${generalSettings?.nvidiaModel || 'NIM'})...`
        : currentProvider === 'comfyui'
        ? `Rendering sticker with ComfyUI (${generalSettings?.comfyuiWorkflow || 'default'})...`
        : 'Generating high-contrast vector sticker...'
    );

    try {
      // 1. Call server-side sticker generation API
      const response = await fetch('/api/generate-sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImageUrl,
          carName: car.carName,
          make: car.make,
          model: car.model,
          color: car.color,
          plateNumber: car.plateNumber,
          feedback: feedback || feedbackText || undefined,
          feedbackPreset: preset || selectedFeedbackPreset || undefined,
          retryAttempt: retryCount,
        }),
      });

      let result: any = null;
      if (response.ok) {
        result = await response.json();
      }

      if (result && result.success && result.dataUrl) {
        const engine = result.engine || currentProvider;
        setCurrentStickerUrl(result.dataUrl);
        setEngineUsed(engine);
        setStatusMessage(
          result.message ||
          (engine === 'gemini'
            ? `Sticker created successfully with Google Gemini AI (${generalSettings?.geminiModel || 'gemini-3.1-flash-image'})!`
            : `Sticker created successfully with ${engine.toUpperCase()} AI!`)
        );
      } else {
        // 2. Client-side Local Algorithmic Canvas Fallback (High-definition Cel-Shading + Die-Cut Inking)
        setStatusMessage('Applying high-contrast cel-shaded vector dielectric engine...');
        
        // Adjust filter parameters based on feedback
        let edgeThreshold = 26;
        let edgeThickness = 2.5;
        let saturationBoost = 1.4;
        let contrastBoost = 1.2;

        if (preset === 'Bolder comic inking lines' || feedback?.toLowerCase().includes('bold')) {
          edgeThickness = 3.5;
          edgeThreshold = 22;
        }
        if (preset === 'More vibrant automotive paint finish' || feedback?.toLowerCase().includes('vibrant')) {
          saturationBoost = 1.7;
          contrastBoost = 1.35;
        }
        if (preset === 'Sharper wheel & rim details' || feedback?.toLowerCase().includes('sharp')) {
          edgeThreshold = 20;
        }

        const localSticker = await convertPhotoToCartoonSticker(originalImageUrl, {
          edgeThreshold,
          edgeThickness,
          colorSteps: 7,
          saturationBoost,
          contrastBoost,
          stickerBorder: true,
          stickerBorderWidth: 10,
        });

        setCurrentStickerUrl(localSticker);
        setEngineUsed('local_canvas');
        setStatusMessage('Generated using high-contrast cel-shaded vector sticker engine.');
      }
    } catch (err: any) {
      console.warn('Sticker generation error, falling back to local canvas:', err);
      try {
        const localSticker = await convertPhotoToCartoonSticker(originalImageUrl, {
          edgeThreshold: 26,
          edgeThickness: 2.5,
          colorSteps: 7,
          saturationBoost: 1.4,
          contrastBoost: 1.2,
          stickerBorder: true,
          stickerBorderWidth: 8,
        });
        setCurrentStickerUrl(localSticker);
        setEngineUsed('local_canvas');
        setStatusMessage('Generated via local dielectric cartoon engine.');
      } catch (e: any) {
        setErrorMsg('Failed to generate sticker. Please check connection and retry.');
      }
    } finally {
      setIsGenerating(false);
      setShowFeedbackSection(false);
    }
  };

  const handleRecreateWithFeedback = () => {
    if (retriesRemaining <= 0) return;
    const combinedFeedback = [selectedFeedbackPreset, feedbackText].filter(Boolean).join(' - ');
    if (!combinedFeedback.trim()) {
      setErrorMsg('Please select a feedback option or type notes so the AI knows what to adjust.');
      return;
    }

    const nextRetries = retriesRemaining - 1;
    setRetriesRemaining(nextRetries);
    generateSticker(maxRetries - nextRetries, feedbackText, selectedFeedbackPreset);
  };

  const handleDownloadSticker = () => {
    if (!currentStickerUrl) return;
    const safeName = `${car.make || 'Car'}_${car.model || car.carName || 'Sticker'}`.replace(/[\s\-_]+/g, '_');
    const link = document.createElement('a');
    link.href = currentStickerUrl;
    link.download = `${safeName}_AI_Sticker.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedDownload(true);
    setTimeout(() => setCopiedDownload(false), 3000);
  };

  const handleApplyToVehicle = async () => {
    if (!currentStickerUrl || !onApplyStickerToCar) return;
    try {
      setIsApplying(true);
      await onApplyStickerToCar(currentStickerUrl);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to apply sticker to car:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      id="sticker-generator-modal"
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-pink-500/20 to-transparent blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative px-6 py-4 border-b border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/30 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--ps-text-main,#ffffff)]">
                  AI Sticker Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                  {engineUsed === 'gemini'
                    ? 'Google Gemini AI'
                    : engineUsed === 'nvidia'
                    ? 'NVIDIA NIM'
                    : engineUsed === 'comfyui'
                    ? 'ComfyUI Server'
                    : 'Cel-Shaded Vector'}
                </span>
              </div>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">
                {car.carName || `${car.make} ${car.model}`} • Die-Cut Vinyl Illustration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTipClick && (
              <button
                onClick={onTipClick}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title="Support Photographer"
              >
                <Heart className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500" />
                <span>Tip Author</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:bg-white/10 text-[var(--ps-text-muted,#9ca3af)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Visual Display & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Sticker Canvas Display */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-900 border border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-center shadow-inner group">
                {/* Transparent / White Grid Backdrop for Die-Cut Visual */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}
                />

                {isGenerating ? (
                  <div className="relative z-10 flex flex-col items-center justify-center p-6 space-y-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 animate-pulse">
                      <Wand2 className="w-7 h-7 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Rendering AI Sticker Art...</p>
                      <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-1 max-w-xs">{statusMessage}</p>
                    </div>
                  </div>
                ) : currentStickerUrl && viewMode === 'sticker' ? (
                  <img
                    src={currentStickerUrl}
                    alt="Generated Sticker"
                    className="relative z-10 max-h-[90%] max-w-[90%] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300"
                  />
                ) : viewMode === 'original' ? (
                  <img
                    src={originalImageUrl}
                    alt="Original Photo"
                    className="relative z-10 w-full h-full object-cover"
                  />
                ) : (
                  /* Split View */
                  <div className="relative z-10 w-full h-full grid grid-cols-2">
                    <div className="relative h-full overflow-hidden border-r border-white/20">
                      <img src={originalImageUrl} alt="Original" className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                        Original Photo
                      </span>
                    </div>
                    <div className="relative h-full flex items-center justify-center bg-neutral-900 p-2">
                      <img
                        src={currentStickerUrl || originalImageUrl}
                        alt="Sticker"
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-pink-600 text-[10px] text-white font-mono">
                        AI Sticker
                      </span>
                    </div>
                  </div>
                )}

                {/* View Mode Toggle Pill (Top Left) */}
                <div className="absolute top-3 left-3 z-20 flex items-center bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs shadow-md">
                  <button
                    onClick={() => setViewMode('sticker')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      viewMode === 'sticker' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Sticker
                  </button>
                  <button
                    onClick={() => setViewMode('original')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      viewMode === 'original' ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-sm' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Photo
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      viewMode === 'split' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Compare
                  </button>
                </div>

                {/* Retries Remaining Badge (Top Right) */}
                <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-200 flex items-center gap-1.5 shadow-md">
                  <RotateCcw className="w-3 h-3 text-pink-400" />
                  <span>
                    <strong>{retriesRemaining}</strong> / {maxRetries} Retries Left
                  </span>
                </div>
              </div>

              {/* Status Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Right: Actions, Feedback & Recreate Panel */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
                      Sticker Properties
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Die-Cut Ready
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--ps-text-main,#ffffff)]">
                    {car.carName || `${car.make} ${car.model}`}
                  </p>
                  <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] leading-relaxed">
                    Stylized with bold inking vectors and thick die-cut white vinyl contour border. Formatted for vinyl decals and high-resolution sticker printing.
                  </p>
                </div>

                {/* Download and Apply Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleDownloadSticker}
                    disabled={!currentStickerUrl || isGenerating}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {copiedDownload ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Downloaded Sticker!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download High-Res Sticker (.PNG)</span>
                      </>
                    )}
                  </button>

                  {onApplyStickerToCar && (
                    <button
                      onClick={handleApplyToVehicle}
                      disabled={!currentStickerUrl || isGenerating || isApplying}
                      className="w-full py-2.5 px-4 rounded-2xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {appliedSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Saved as Vehicle Badge!</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Set as Vehicle Cartoon Badge</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* RECREATE SECTION WITH REQUIRED FEEDBACK */}
                <div className="pt-3 border-t border-[var(--ps-card-border,#2C2C2E)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ps-text-main,#ffffff)]">
                      <Sliders className="w-3.5 h-3.5 text-pink-400" />
                      <span>Not Satisfied? Recreate with Feedback</span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--ps-text-muted,#9ca3af)]">
                      {retriesRemaining} left
                    </span>
                  </div>

                  {retriesRemaining > 0 ? (
                    <div className="space-y-3 bg-[var(--ps-search-bg,#161618)] p-3.5 rounded-2xl border border-[var(--ps-card-border,#2C2C2E)]">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] mb-1.5">
                          1. Select Quick Style Adjustment:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {FEEDBACK_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setSelectedFeedbackPreset(preset)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                                selectedFeedbackPreset === preset
                                  ? 'bg-pink-600/30 text-pink-300 border-pink-500/60 font-bold'
                                  : 'bg-black/40 text-[var(--ps-text-muted,#9ca3af)] border-white/5 hover:text-white'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] mb-1">
                          2. Optional Custom Revision Notes:
                        </label>
                        <input
                          type="text"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="e.g., Accentuate the yellow brake calipers & spoiler..."
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-[var(--ps-card-border,#2C2C2E)] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                        />
                      </div>

                      <button
                        onClick={handleRecreateWithFeedback}
                        disabled={isGenerating || (!selectedFeedbackPreset && !feedbackText.trim())}
                        className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-40 shadow-md"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Regenerate Sticker with Feedback</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 text-xs text-gray-400 text-center font-medium">
                      Maximum retry attempts reached for this session ({maxRetries}/{maxRetries}). Download your favorite version or restart fresh.
                    </div>
                  )}
                </div>
              </div>

              {/* Tipping Promo Link */}
              {onTipClick && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-500 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Love the photos & stickers? Support the shooter.</span>
                  </div>
                  <button
                    onClick={onTipClick}
                    className="font-bold underline hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    Tip Creator
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between text-xs text-[var(--ps-text-muted,#9ca3af)] shrink-0 bg-[var(--ps-card-bg,#111111)]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            <span>AI Sticker Pipeline configured with automatic local dielectric failover</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:bg-white/10 text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] font-semibold transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

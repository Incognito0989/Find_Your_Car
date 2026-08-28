import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Wand2,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  ArrowRightLeft,
  Bot,
  Zap,
} from 'lucide-react';
import { convertPhotoToCartoonSticker, normalizeMediaForCanvas } from '../utils/cartoonEngine';
import { formatMediaUrl } from '../utils/apiConfig';

interface CartoonArtStudioProps {
  isOpen: boolean;
  onClose: () => void;
  plateNumber?: string;
  carName: string;
  make: string;
  model: string;
  color?: string;
  originalImageUrl: string;
  availableImages?: string[];
  onApplyCartoon: (cartoonUrl: string) => void;
}

export const CartoonArtStudio: React.FC<CartoonArtStudioProps> = ({
  isOpen,
  onClose,
  plateNumber,
  carName,
  make,
  model,
  color,
  originalImageUrl,
  availableImages = [],
  onApplyCartoon,
}) => {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>(originalImageUrl);
  const [cartoonResult, setCartoonResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [engineSource, setEngineSource] = useState<'ai' | 'canvas'>('canvas');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'cartoon-only' | 'split'>('side-by-side');

  // Algorithmic stylization parameters
  const [edgeThickness, setEdgeThickness] = useState<number>(2);
  const [edgeThreshold, setEdgeThreshold] = useState<number>(26);
  const [colorSteps, setColorSteps] = useState<number>(6);
  const [saturationBoost, setSaturationBoost] = useState<number>(1.35);
  const [stickerBorder, setStickerBorder] = useState<boolean>(true);

  // Sync selected photo when props change
  useEffect(() => {
    if (originalImageUrl) {
      setSelectedPhotoUrl(originalImageUrl);
    }
  }, [originalImageUrl]);

  // Core processing function: runs algorithmic cel-shading & inking on the exact selected picture
  const processSelectedPhoto = useCallback(
    async (sourceUrl: string) => {
      if (!sourceUrl) return;
      setIsProcessing(true);
      try {
        const normalized = normalizeMediaForCanvas(sourceUrl);
        const result = await convertPhotoToCartoonSticker(normalized, {
          edgeThickness,
          edgeThreshold,
          colorSteps,
          saturationBoost,
          stickerBorder,
          stickerBorderWidth: 10,
        });
        setCartoonResult(result);
        setEngineSource('canvas');
      } catch (err) {
        console.error('Error generating cartoon sticker from photo:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [edgeThickness, edgeThreshold, colorSteps, saturationBoost, stickerBorder]
  );

  // Auto-apply to selected picture whenever it or the settings change
  useEffect(() => {
    if (isOpen && selectedPhotoUrl && engineSource !== 'ai') {
      const timer = setTimeout(() => {
        processSelectedPhoto(selectedPhotoUrl);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedPhotoUrl, processSelectedPhoto, engineSource]);

  // Trigger Gemini AI Generation from Selected Picture
  const handleGenerateWithGemini = async () => {
    if (!selectedPhotoUrl) return;
    setIsAiGenerating(true);
    try {
      const normalized = normalizeMediaForCanvas(selectedPhotoUrl);
      const res = await fetch('/api/generate-cartoon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: normalized,
          plateNumber: plateNumber || '',
          carName,
          make,
          model,
          color: color || '',
          specialFeatures: '2D comic sticker art, bold ink outlines, cel-shaded reflections, white die-cut border',
        }),
      });
      const data = await res.json();
      if (data.dataUrl) {
        setCartoonResult(data.dataUrl);
        setEngineSource('ai');
      } else {
        // Fallback to high-definition algorithmic processor
        await processSelectedPhoto(selectedPhotoUrl);
      }
    } catch (e) {
      console.warn('Gemini API call fell back to local cartoonizer:', e);
      await processSelectedPhoto(selectedPhotoUrl);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApply = () => {
    if (cartoonResult) {
      onApplyCartoon(cartoonResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  const imageList = availableImages.length > 0 ? availableImages : [originalImageUrl];

  return (
    <div id="cartoon-art-studio-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#111113] border border-[#2C2C2E] rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[94vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2C2C2E] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-violet-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">2D Cartoon Sticker Studio</h2>
                <span className="bg-pink-500/20 text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30 uppercase tracking-wider">
                  Auto-Applied to Selected Photo
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Vehicle: <span className="text-white font-medium">{carName || `${make} ${model}`}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-[#222225] p-1 rounded-xl border border-[#333338]">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'side-by-side' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cartoon-only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'cartoon-only' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Cartoon Only
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Visual Preview Area */}
          <div className="flex-1 bg-black/95 p-4 sm:p-6 flex flex-col items-center justify-center overflow-y-auto relative min-h-[320px]">
            {/* Subtle background grid */}
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Preview Stage */}
            {viewMode === 'side-by-side' ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl z-10">
                {/* Original Photo */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Original Selected Photo
                    </span>
                  </div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#2C2C2E] bg-[#141416] flex items-center justify-center shadow-lg">
                    <img
                      src={formatMediaUrl(selectedPhotoUrl)}
                      alt="Original Car"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Auto-Generated 2D Cartoon */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-pink-400 font-semibold px-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      2D Cartoon Sticker Result
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {engineSource === 'ai' ? 'Powered by Gemini AI' : 'Cel-Shade Algorithm'}
                    </span>
                  </div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/50 bg-white flex items-center justify-center shadow-xl">
                    {cartoonResult ? (
                      <img
                        src={formatMediaUrl(cartoonResult)}
                        alt="2D Cartoon Car"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-pink-500" />
                        <span className="text-xs">Generating 2D Cartoon...</span>
                      </div>
                    )}

                    {/* Processing overlay badge */}
                    {(isProcessing || isAiGenerating) && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
                        <span className="text-xs font-semibold">
                          {isAiGenerating ? 'Generating with Gemini AI...' : 'Stylizing vehicle contours...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Cartoon Only mode */
              <div className="w-full max-w-xl z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-pink-400 font-semibold px-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    2D Vector Cartoon Sticker
                  </span>
                </div>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/50 bg-white flex items-center justify-center shadow-2xl">
                  {cartoonResult ? (
                    <img
                      src={formatMediaUrl(cartoonResult)}
                      alt="2D Cartoon Car"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
                  )}
                </div>
              </div>
            )}

            {/* Photo Selector Thumbnail Strip (if multiple photos staged for this vehicle) */}
            {imageList.length > 1 && (
              <div className="w-full max-w-4xl mt-4 pt-3 border-t border-white/10 z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Which Picture to Cartoonize ({imageList.length} Photos):
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {imageList.map((url, idx) => {
                    const isSelected = selectedPhotoUrl === url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPhotoUrl(url);
                          setEngineSource('canvas');
                        }}
                        className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-pink-500 ring-2 ring-pink-500/40 scale-105 shadow-md'
                            : 'border-[#333338] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={formatMediaUrl(url)}
                          alt={`Angle ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Stylization Controls & Gemini AI trigger */}
          <div className="w-full lg:w-80 bg-[#161618] border-t lg:border-t-0 lg:border-l border-[#2C2C2E] p-5 flex flex-col justify-between overflow-y-auto space-y-5">
            <div className="space-y-4">
              {/* Gemini AI Action Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-pink-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-pink-400" />
                    Gemini AI Vision Studio
                  </span>
                  <span className="text-[10px] bg-pink-500 text-white font-bold px-2 py-0.5 rounded-full">
                    AI Key
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Use the Gemini image model to transform the selected photo into a custom stylized sticker with comic reflections and die-cut borders.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateWithGemini}
                  disabled={isAiGenerating}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Gemini Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Generate with Gemini AI
                    </>
                  )}
                </button>
              </div>

              {/* Fine-Tuning Sliders for Exact Photo Contour Styling */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                    Stylization Sliders
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEdgeThickness(2);
                      setEdgeThreshold(26);
                      setColorSteps(6);
                      setSaturationBoost(1.35);
                      setStickerBorder(true);
                      setEngineSource('canvas');
                    }}
                    className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* Edge Inking Thickness */}
                <div className="space-y-1 bg-[#1E1E22] p-2.5 rounded-xl border border-[#2E2E33]">
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span>Comic Inking Outlines</span>
                    <span className="text-pink-400 font-mono font-bold">{edgeThickness}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={edgeThickness}
                    onChange={(e) => {
                      setEdgeThickness(Number(e.target.value));
                      setEngineSource('canvas');
                    }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Cel-Shading Color Quantization */}
                <div className="space-y-1 bg-[#1E1E22] p-2.5 rounded-xl border border-[#2E2E33]">
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span>Cel-Shading Bands</span>
                    <span className="text-pink-400 font-mono font-bold">{colorSteps} levels</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={colorSteps}
                    onChange={(e) => {
                      setColorSteps(Number(e.target.value));
                      setEngineSource('canvas');
                    }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Color Saturation */}
                <div className="space-y-1 bg-[#1E1E22] p-2.5 rounded-xl border border-[#2E2E33]">
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span>Vibrancy & Saturation</span>
                    <span className="text-pink-400 font-mono font-bold">
                      +{Math.round((saturationBoost - 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="1.8"
                    step="0.05"
                    value={saturationBoost}
                    onChange={(e) => {
                      setSaturationBoost(Number(e.target.value));
                      setEngineSource('canvas');
                    }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Die-Cut Sticker Outline */}
                <div className="flex items-center justify-between bg-[#1E1E22] p-2.5 rounded-xl border border-[#2E2E33]">
                  <span className="text-[11px] text-gray-300">White Die-Cut Sticker Frame</span>
                  <input
                    type="checkbox"
                    checked={stickerBorder}
                    onChange={(e) => {
                      setStickerBorder(e.target.checked);
                      setEngineSource('canvas');
                    }}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3 border-t border-[#2C2C2E]">
              <button
                type="button"
                onClick={handleApply}
                disabled={!cartoonResult || isProcessing || isAiGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Attach 2D Cartoon Art to Car
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

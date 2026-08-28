import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Check,
  X,
  Palette,
  Eye,
  SlidersHorizontal,
  Zap,
  Download,
} from 'lucide-react';
import {
  generateCarVectorSvg,
  CartoonStyleOptions,
  applyCartoonCanvasFilter,
} from '../utils/cartoonEngine';
import {
  SAMPLE_CARTOON_MIATA_SVG,
  SAMPLE_CARTOON_PORSCHE_SVG,
  SAMPLE_CARTOON_BMW_SVG,
  SAMPLE_CARTOON_CORVETTE_SVG,
} from '../data/initialData';

interface CartoonArtStudioProps {
  isOpen: boolean;
  onClose: () => void;
  carName: string;
  make: string;
  model: string;
  originalImageUrl: string;
  onApplyCartoon: (cartoonSvgUrl: string) => void;
}

export const CartoonArtStudio: React.FC<CartoonArtStudioProps> = ({
  isOpen,
  onClose,
  carName,
  make,
  model,
  originalImageUrl,
  onApplyCartoon,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('miata-popup');
  const [carColor, setCarColor] = useState<string>('#FA7B8C'); // Iconic cute pink
  const [headlightStyle, setHeadlightStyle] = useState<'popup' | 'popup-taped-x' | 'laser' | 'round-classic' | 'sharp-aggressive'>('popup-taped-x');
  const [wingStyle, setWingStyle] = useState<'none' | 'ducktail' | 'gt-wing' | 'carbon-spoiler'>('none');
  const [smileGrille, setSmileGrille] = useState<boolean>(true);
  const [outlineWidth, setOutlineWidth] = useState<number>(10);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [customSvgResult, setCustomSvgResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'cartoon-only' | 'overlay'>('side-by-side');

  // Compute current cartoon vector SVG
  const currentCartoonSvg =
    customSvgResult ||
    generateCarVectorSvg({
      primaryColor: carColor,
      headlightStyle,
      wingStyle,
      smileGrille,
      outlineWidth,
    });

  // Presets mapping
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setCustomSvgResult(null);
    if (presetId === 'miata-popup') {
      setCarColor('#FA7B8C'); // Signature cute pink
      setHeadlightStyle('popup-taped-x');
      setWingStyle('none');
      setSmileGrille(true);
      setOutlineWidth(10);
    } else if (presetId === 'gt3rs-track') {
      setCarColor('#68D391'); // Lizard green
      setHeadlightStyle('round-classic');
      setWingStyle('gt-wing');
      setSmileGrille(false);
      setOutlineWidth(11);
    } else if (presetId === 'm4-competition') {
      setCarColor('#38BDF8'); // Yas marina blue
      setHeadlightStyle('laser');
      setWingStyle('none');
      setSmileGrille(false);
      setOutlineWidth(10);
    } else if (presetId === 'corvette-c8') {
      setCarColor('#F97316'); // Sebring orange
      setHeadlightStyle('laser');
      setWingStyle('none');
      setSmileGrille(false);
      setOutlineWidth(10);
    } else if (presetId === 'jdm-midnight') {
      setCarColor('#818CF8'); // Bayside violet / blue
      setHeadlightStyle('popup');
      setWingStyle('ducktail');
      setSmileGrille(true);
      setOutlineWidth(12);
    }
  };

  // AI Generation via Backend Gemini API Endpoint
  const handleGenerateWithGemini = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/generate-cartoon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carName,
          make,
          model,
          color: carColor,
          specialFeatures: `${headlightStyle} headlights, ${wingStyle} wing, 2D sticker aesthetic`,
        }),
      });
      const data = await res.json();
      if (data.dataUrl) {
        setCustomSvgResult(data.dataUrl);
      } else {
        // Fallback to stylized vector
        setCustomSvgResult(currentCartoonSvg);
      }
    } catch (e) {
      console.warn('Backend AI generation fell back to instant vector studio:', e);
      setCustomSvgResult(currentCartoonSvg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApply = () => {
    onApplyCartoon(currentCartoonSvg);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="cartoon-art-studio-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
      {/* Modal backdrop */}
      <div className="absolute inset-0 modal-blur bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#111111] border border-[#2C2C2E] rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2C2C2E] flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-400 text-black font-black flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">2D Cartoon Vector Sticker Studio</h2>
                <span className="bg-pink-500/20 text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30 uppercase tracking-wider">
                  Miata Style
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Transform photo of <span className="text-white font-medium">{carName || 'your vehicle'}</span> into clean pop-up cartoon sticker art
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-xl border border-[#2C2C2E]">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'side-by-side' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('cartoon-only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'cartoon-only' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Cartoon Only
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Visual Showcase Stage */}
          <div className="flex-1 bg-black/90 p-6 flex flex-col items-center justify-center overflow-hidden relative min-h-[360px]">
            {/* Grid backdrop */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#FA7B8C_1px,transparent_1px)] [background-size:32px_32px]" />

            {viewMode === 'side-by-side' ? (
              <div className="w-full h-full max-h-[55vh] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center z-10">
                {/* Original Photo */}
                <div className="relative rounded-2xl overflow-hidden border border-[#2C2C2E] bg-[#141416] aspect-[4/3] flex flex-col shadow-xl">
                  <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                    Original Capture
                  </div>
                  <img
                    src={originalImageUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Cartoon Art Result */}
                <div className="relative rounded-2xl overflow-hidden border border-pink-500/40 bg-white aspect-[4/3] flex flex-col items-center justify-center shadow-2xl group">
                  <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    2D Cartoon Sticker
                  </div>
                  <img
                    src={currentCartoonSvg}
                    alt="Cartoon Vector Art"
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-pink-500/40 bg-white max-w-md w-full aspect-[4/3] flex items-center justify-center shadow-2xl z-10">
                <img
                  src={currentCartoonSvg}
                  alt="Cartoon Vector Art"
                  className="w-full h-full object-contain p-4"
                />
              </div>
            )}

            {/* AI Generation Status Pill */}
            {isGeneratingAi && (
              <div className="absolute bottom-6 bg-black/90 backdrop-blur-md border border-pink-500/50 px-4 py-2 rounded-full text-xs font-semibold text-pink-300 flex items-center gap-2 shadow-2xl animate-pulse z-20">
                <Wand2 className="w-4 h-4 animate-spin text-pink-400" />
                Gemini AI generating custom cel-shaded vector sticker...
              </div>
            )}
          </div>

          {/* Customizer Panel */}
          <div className="w-full md:w-[380px] bg-[#141416] border-t md:border-t-0 md:border-l border-[#2C2C2E] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 block flex items-center justify-between">
                  <span>Vehicle Character Presets</span>
                  <span className="text-pink-400 text-[11px] font-normal">Matching Reference</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'miata-popup', label: 'Miata Pop-Up (Ref)', color: '#FA7B8C' },
                    { id: 'gt3rs-track', label: 'Porsche GT Wing', color: '#68D391' },
                    { id: 'm4-competition', label: 'BMW M Twin Grille', color: '#38BDF8' },
                    { id: 'corvette-c8', label: 'Corvette C8 Wedge', color: '#F97316' },
                    { id: 'jdm-midnight', label: 'JDM Touge Legend', color: '#818CF8' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetSelect(p.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                        selectedPreset === p.id
                          ? 'border-pink-500 bg-pink-500/10 text-white font-semibold'
                          : 'border-[#2C2C2E] bg-[#1C1C1E] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Customizer */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 block flex items-center justify-between">
                  <span>Car Body Cel Color</span>
                  <span className="font-mono text-white text-[11px]">{carColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={carColor}
                    onChange={(e) => {
                      setCarColor(e.target.value);
                      setCustomSvgResult(null);
                    }}
                    className="w-10 h-10 rounded-xl bg-transparent border border-[#2C2C2E] cursor-pointer p-0.5"
                  />
                  {/* Quick palette shortcuts */}
                  <div className="flex-1 flex items-center justify-between gap-1.5 bg-[#1C1C1E] p-1.5 rounded-xl border border-[#2C2C2E]">
                    {['#FA7B8C', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF', '#18181B'].map((col) => (
                      <button
                        key={col}
                        onClick={() => {
                          setCarColor(col);
                          setCustomSvgResult(null);
                        }}
                        className={`w-6 h-6 rounded-lg border transition-transform ${
                          carColor === col ? 'scale-110 border-white ring-2 ring-pink-500' : 'border-black/30 hover:scale-105'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Headlight Style */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 block">
                  Headlight Character
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'popup-taped-x', label: 'Pop-Up X Tape' },
                    { id: 'popup', label: 'Pop-Up Dual' },
                    { id: 'round-classic', label: 'Classic Round' },
                    { id: 'laser', label: 'Laser Angle' },
                  ].map((hl) => (
                    <button
                      key={hl.id}
                      onClick={() => {
                        setHeadlightStyle(hl.id as any);
                        setCustomSvgResult(null);
                      }}
                      className={`py-2 px-1 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                        headlightStyle === hl.id
                          ? 'border-pink-500 bg-pink-500/15 text-pink-300'
                          : 'border-[#2C2C2E] bg-[#1C1C1E] text-gray-400 hover:text-white'
                      }`}
                    >
                      {hl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outline & Stance Thickness */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-400">Black Sticker Outline Width</span>
                  <span className="text-white font-mono">{outlineWidth}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="16"
                  value={outlineWidth}
                  onChange={(e) => {
                    setOutlineWidth(parseInt(e.target.value, 10));
                    setCustomSvgResult(null);
                  }}
                  className="w-full accent-pink-500 bg-[#2C2C2E] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Grille Expression */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E]">
                <div>
                  <span className="text-xs font-bold text-white block">Miata Smile / Grille</span>
                  <span className="text-[10px] text-gray-400">Iconic cute front bumper smile</span>
                </div>
                <button
                  onClick={() => {
                    setSmileGrille(!smileGrille);
                    setCustomSvgResult(null);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    smileGrille ? 'bg-pink-500' : 'bg-[#2C2C2E]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      smileGrille ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* AI Redraw Button */}
              <button
                onClick={handleGenerateWithGemini}
                disabled={isGeneratingAi}
                className="w-full py-2.5 px-3 rounded-xl border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                {isGeneratingAi ? 'AI Stylizing...' : 'Redraw with Gemini AI Vision'}
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#2C2C2E] space-y-2.5">
              <button
                onClick={handleApply}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 active:scale-95 transition-all text-sm"
              >
                <Check className="w-4 h-4" />
                Attach 2D Cartoon Art to Car
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
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

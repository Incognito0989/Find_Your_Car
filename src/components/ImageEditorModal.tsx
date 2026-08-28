import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Check,
  X,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
} from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
}

type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9' | '3:2';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onSave,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [fineAngle, setFineAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('4:3');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [zoom, setZoom] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'crop' | 'adjust'>('crop');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load base image
  useEffect(() => {
    if (!imageUrl || !isOpen) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl, isOpen]);

  // Re-render canvas whenever transformations change
  useEffect(() => {
    if (imageRef.current && isOpen) {
      renderCanvas();
    }
  }, [rotation, fineAngle, flipH, flipV, aspectRatio, brightness, contrast, saturation, zoom, isOpen]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop dimensions according to aspect ratio
    let targetWidth = img.naturalWidth || img.width || 800;
    let targetHeight = img.naturalHeight || img.height || 600;

    if (aspectRatio === '1:1') {
      const minDim = Math.min(targetWidth, targetHeight);
      targetWidth = minDim;
      targetHeight = minDim;
    } else if (aspectRatio === '4:3') {
      const maxW = targetWidth;
      const maxH = Math.round((maxW * 3) / 4);
      if (maxH <= targetHeight) {
        targetHeight = maxH;
      } else {
        targetWidth = Math.round((targetHeight * 4) / 3);
      }
    } else if (aspectRatio === '16:9') {
      const maxW = targetWidth;
      const maxH = Math.round((maxW * 9) / 16);
      if (maxH <= targetHeight) {
        targetHeight = maxH;
      } else {
        targetWidth = Math.round((targetHeight * 16) / 9);
      }
    } else if (aspectRatio === '3:2') {
      const maxW = targetWidth;
      const maxH = Math.round((maxW * 2) / 3);
      if (maxH <= targetHeight) {
        targetHeight = maxH;
      } else {
        targetWidth = Math.round((targetHeight * 3) / 2);
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply color filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    ctx.save();
    // Center point
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply Rotation & Fine Angle
    const totalRotation = ((rotation + fineAngle) * Math.PI) / 180;
    ctx.rotate(totalRotation);

    // Apply Flips
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const sourceW = img.naturalWidth || img.width;
    const sourceH = img.naturalHeight || img.height;
    ctx.drawImage(img, -sourceW / 2, -sourceH / 2, sourceW, sourceH);

    ctx.restore();
    ctx.filter = 'none';
  };

  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setFineAngle(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setZoom(1);
    setAspectRatio('4:3');
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    const editedUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    onSave(editedUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="image-editor-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 modal-blur bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#111111] border border-[#2C2C2E] rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2C2C2E] flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Studio Crop & Orientation Editor</h2>
              <p className="text-xs text-gray-400">Adjust aspect ratio, level horizon, and calibrate tone</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#2C2C2E] text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Canvas Stage */}
          <div className="flex-1 bg-black/95 relative p-6 flex items-center justify-center overflow-hidden min-h-[340px]">
            {/* Grid overlay for leveling */}
            <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative max-w-full max-h-[60vh] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-2xl border border-white/10"
              />
            </div>

            {/* Quick zoom controls floating on stage */}
            <div className="absolute bottom-4 left-6 bg-[#18181A]/90 backdrop-blur-md border border-[#2C2C2E] rounded-full px-3 py-1.5 flex items-center gap-3 text-xs text-gray-300">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                className="hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                className="hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="w-full md:w-[360px] bg-[#141416] border-t md:border-t-0 md:border-l border-[#2C2C2E] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              {/* Tab selector */}
              <div className="flex rounded-xl bg-[#1C1C1E] p-1 border border-[#2C2C2E]">
                <button
                  onClick={() => setActiveTab('crop')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'crop'
                      ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" />
                  Crop & Framing
                </button>
                <button
                  onClick={() => setActiveTab('adjust')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'adjust'
                      ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Tune & Filter
                </button>
              </div>

              {activeTab === 'crop' ? (
                <div className="space-y-5">
                  {/* Aspect Ratio */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 block">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['4:3', '16:9', '1:1', '3:2', 'free'] as AspectRatioType[]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                            aspectRatio === ratio
                              ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                              : 'border-[#2C2C2E] bg-[#1A1A1D] text-gray-400 hover:text-white'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation Controls */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 block">
                      Orientation & Flip
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={handleRotateCcw}
                        className="py-2.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-300 hover:text-white transition-colors"
                        title="Rotate -90°"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-[10px] font-mono">-90°</span>
                      </button>
                      <button
                        onClick={handleRotateCw}
                        className="py-2.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-300 hover:text-white transition-colors"
                        title="Rotate +90°"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="text-[10px] font-mono">+90°</span>
                      </button>
                      <button
                        onClick={() => setFlipH(!flipH)}
                        className={`py-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                          flipH
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'bg-[#1C1C1E] border-[#2C2C2E] text-gray-300 hover:text-white'
                        }`}
                        title="Flip Horizontal"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                        <span className="text-[10px]">Flip H</span>
                      </button>
                      <button
                        onClick={() => setFlipV(!flipV)}
                        className={`py-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                          flipV
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'bg-[#1C1C1E] border-[#2C2C2E] text-gray-300 hover:text-white'
                        }`}
                        title="Flip Vertical"
                      >
                        <FlipVertical className="w-4 h-4" />
                        <span className="text-[10px]">Flip V</span>
                      </button>
                    </div>
                  </div>

                  {/* Horizon Angle Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">Fine Horizon Tilt</span>
                      <span className="text-white font-mono">{fineAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={fineAngle}
                      onChange={(e) => setFineAngle(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 bg-[#2C2C2E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>-45°</span>
                      <span>0°</span>
                      <span>+45°</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">Brightness</span>
                      <span className="text-white font-mono">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 bg-[#2C2C2E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">Contrast</span>
                      <span className="text-white font-mono">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="160"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 bg-[#2C2C2E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">Color Saturation</span>
                      <span className="text-white font-mono">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500 bg-[#2C2C2E] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#2C2C2E] space-y-2.5">
              <button
                onClick={handleApply}
                className="w-full bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
              >
                <Check className="w-4 h-4" />
                Save Crop & Orientation
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
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

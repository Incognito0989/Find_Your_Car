import React, { useState } from 'react';
import {
  Upload,
  Crop,
  Sparkles,
  Sliders,
  Palette,
  Layers,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Car,
  Tag,
  Camera,
  Calendar,
  MapPin,
  Check,
  Shield,
  FileImage,
  Paintbrush,
  Download,
  Eye,
  LogOut,
  Search,
  Zap,
} from 'lucide-react';
import { CarPhoto, AppThemeConfig, VehicleLookupResult } from '../types';
import { ImageEditorModal } from './ImageEditorModal';
import { CartoonArtStudio } from './CartoonArtStudio';
import { DEFAULT_THEMES } from '../data/initialData';
import { applyThemeToDocument } from '../utils/themeUtils';

interface AdminPortalProps {
  cars: CarPhoto[];
  onAddCar: (newCar: Partial<CarPhoto>) => Promise<void>;
  onUpdateCar: (id: string, updated: Partial<CarPhoto>) => Promise<void>;
  onDeleteCar: (id: string) => Promise<void>;
  currentTheme: AppThemeConfig;
  onSaveTheme: (theme: AppThemeConfig) => Promise<void>;
  onBackToVisitor: () => void;
  onLogoutAdmin?: () => void;
  adminName?: string;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  cars,
  onAddCar,
  onUpdateCar,
  onDeleteCar,
  currentTheme,
  onSaveTheme,
  onBackToVisitor,
  onLogoutAdmin,
  adminName = 'Admin Photographer',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'theme' | 'fleet'>('upload');

  // Upload Form State
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [carName, setCarName] = useState<string>('');
  const [make, setMake] = useState<string>('Porsche');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<string>('2024');
  const [color, setColor] = useState<string>('');
  const [event, setEvent] = useState<string>('Sunset Track Day Laguna');
  const [location, setLocation] = useState<string>('Monterey, CA');
  const [photographerName, setPhotographerName] = useState<string>(adminName || 'Alex Rivera');
  const [photographerTitle, setPhotographerTitle] = useState<string>('Automotive Photographer');
  const [tagsInput, setTagsInput] = useState<string>('TrackDay, Supercar, HighRes');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [cartoonImageUrl, setCartoonImageUrl] = useState<string | null>(null);
  const [hasCartoon, setHasCartoon] = useState<boolean>(false);
  const [resolution, setResolution] = useState<string>('High Resolution • 300 DPI');
  const [cameraInfo, setCameraInfo] = useState<string>('Sony Alpha • 70-200mm f/2.8 GM • ISO 100');

  // Online Plate Auto-Lookup State
  const [isLookingUpPlate, setIsLookingUpPlate] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{
    source: string;
    details: string;
  } | null>(null);

  // Auto-fill car details from plate lookup API
  const handleAutoFillPlate = async (targetPlate?: string) => {
    const queryPlate = (targetPlate || plateNumber).trim();
    if (!queryPlate || queryPlate.length < 2) {
      setStatusMsg({ type: 'error', text: 'Please enter at least 2 characters of a plate or VIN to lookup.' });
      return;
    }

    setIsLookingUpPlate(true);
    setLookupFeedback(null);

    try {
      const response = await fetch(`/api/lookup-plate?plate=${encodeURIComponent(queryPlate)}`);
      const data = await response.json();

      if (data.success && data.vehicle) {
        const v = data.vehicle;
        if (v.make) setMake(v.make);
        if (v.model) setModel(v.model);
        if (v.year) setYear(String(v.year));
        if (v.color) setColor(v.color);
        if (v.make && v.model) {
          setCarName(`${v.make} ${v.model}`);
        }
        if (Array.isArray(v.suggestedTags) && v.suggestedTags.length > 0) {
          setTagsInput(v.suggestedTags.join(', '));
        }

        setLookupFeedback({
          source: data.source || 'Online Registry',
          details: `${v.make} ${v.model} (${v.year || ''}) - ${v.engine || ''}`,
        });

        setStatusMsg({
          type: 'success',
          text: `✨ Auto-filled vehicle specifications for [${queryPlate.toUpperCase()}] via ${data.source}!`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No online vehicle record found for this plate. You can manually enter make and model.',
        });
      }
    } catch (err: any) {
      console.error('Plate lookup error:', err);
      setStatusMsg({
        type: 'error',
        text: 'Plate lookup service unavailable. You can enter details manually.',
      });
    } finally {
      setIsLookingUpPlate(false);
    }
  };

  // Modals
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isCartoonStudioOpen, setIsCartoonStudioOpen] = useState<boolean>(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Theme Customizer State
  const [themeForm, setThemeForm] = useState<AppThemeConfig>({ ...currentTheme });
  const [themeSavedToast, setThemeSavedToast] = useState<boolean>(false);

  // Quick sample photo library for easy testing
  const SAMPLE_PHOTOS = [
    {
      label: 'Porsche 911 GT3 RS',
      plate: 'GT3-992',
      make: 'Porsche',
      model: '911 GT3 RS',
      color: 'Python Green',
      url: 'https://images.unsplash.com/photo-1603584173870-7f3d5128759b?auto=format&fit=crop&q=80&w=1200',
    },
    {
      label: 'Mazda Miata Pop-Up NA',
      plate: 'MIATA-91',
      make: 'Mazda',
      model: 'MX-5 Miata',
      color: 'Classic Pink',
      url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=1200',
    },
    {
      label: 'BMW M4 Competition',
      plate: 'M4-PERF',
      make: 'BMW',
      model: 'M4 Competition G82',
      color: 'Yas Marina Blue',
      url: 'https://images.unsplash.com/photo-1614200179396-2bdb77ee4a31?auto=format&fit=crop&q=80&w=1200',
    },
    {
      label: 'Corvette C8 Stingray',
      plate: 'VETTE-8',
      make: 'Chevrolet',
      model: 'Corvette C8',
      color: 'Sebring Orange',
      url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200',
    },
  ];

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImageUrl(result);
        setStatusMsg({ type: 'success', text: `Loaded image "${file.name}". You can now crop or convert to cartoon art!` });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: (typeof SAMPLE_PHOTOS)[0]) => {
    setUploadedImageUrl(sample.url);
    setPlateNumber(sample.plate);
    setMake(sample.make);
    setModel(sample.model);
    setCarName(`${sample.make} ${sample.model}`);
    setColor(sample.color);
    setStatusMsg({ type: 'success', text: `Loaded template for ${sample.label}.` });
  };

  // Submit new car to backend
  const handleSubmitCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      setStatusMsg({ type: 'error', text: 'License plate number is required for all uploads.' });
      return;
    }
    if (!uploadedImageUrl) {
      setStatusMsg({ type: 'error', text: 'Please upload or select an automotive image first.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await onAddCar({
        plateNumber: plateNumber.toUpperCase().trim(),
        carName: carName || `${make} ${model || 'Vehicle'}`,
        make,
        model: model || carName || 'Sport',
        year: parseInt(year, 10) || 2024,
        color: color || 'Custom Finish',
        event: event || 'Automotive Gathering',
        location: location || 'Laguna Seca, CA',
        photographer: {
          name: photographerName || 'Alex Rivera',
          title: photographerTitle || 'Automotive Photographer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          bio: 'Verified Plate Snap Cars high-resolution event photographer.',
        },
        imageUrl: uploadedImageUrl,
        cartoonImageUrl: cartoonImageUrl || undefined,
        hasCartoon: Boolean(hasCartoon || cartoonImageUrl),
        tags: tagsArray.length > 0 ? tagsArray : [make, 'CarMeet'],
        resolution,
        cameraInfo,
      });

      setStatusMsg({
        type: 'success',
        text: `Successfully published photo for plate [${plateNumber.toUpperCase()}]. It is now searchable in the visitor dashboard!`,
      });

      // Reset form
      setPlateNumber('');
      setModel('');
      setCarName('');
      setUploadedImageUrl('');
      setCartoonImageUrl(null);
      setHasCartoon(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to upload car photo' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme Live Preview & Apply
  const handleThemeColorChange = (key: keyof AppThemeConfig, value: any) => {
    const updated = { ...themeForm, [key]: value };
    setThemeForm(updated);
    applyThemeToDocument(updated);
  };

  const handleApplyPreset = (preset: AppThemeConfig) => {
    setThemeForm(preset);
    applyThemeToDocument(preset);
  };

  const handleSaveThemeGlobal = async () => {
    await onSaveTheme(themeForm);
    setThemeSavedToast(true);
    setTimeout(() => setThemeSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--ps-bg,#000000)] text-[var(--ps-text-main,#ffffff)] pb-24 transition-colors duration-300">
      {/* Top Admin Navigation Bar */}
      <nav className="sticky top-0 z-50 ps-glass-nav bg-[#0F0F12]/90 border-b border-[#2C2C2E] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToVisitor}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Visitor Portal
            </button>
            <div className="h-4 w-[1px] bg-[#2C2C2E]" />
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                ADMIN SECURE
              </span>
              <span className="font-bold text-sm tracking-tight hidden sm:inline">
                {adminName || 'Admin Photographer'} Studio
              </span>
            </div>
          </div>

          {/* Tab Navigation & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-xl border border-[#2C2C2E]">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload & Studio
              </button>

              <button
                onClick={() => setActiveTab('theme')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'theme'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                UI Theme Changer
              </button>

              <button
                onClick={() => setActiveTab('fleet')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Manage Fleet ({cars.length})
              </button>
            </div>

            {/* Logout button */}
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
                title="Lock and sign out of admin portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock / Log Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-6 pt-10">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mb-8 p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
              statusMsg.type === 'success'
                ? 'bg-green-500/15 border-green-500/30 text-green-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <p className="text-sm font-medium">{statusMsg.text}</p>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: UPLOAD & STUDIO SUITE */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Upload & Media Prep (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                      Image Media & Staging
                    </h2>
                    <p className="text-xs text-gray-400">
                      Upload high-res automotive file, crop & level orientation, and generate 2D cartoon art
                    </p>
                  </div>
                </div>

                {/* Upload Box / Dropzone */}
                {!uploadedImageUrl ? (
                  <div className="border-2 border-dashed border-[#3C3C3E] hover:border-[var(--ps-primary,#0A84FF)] rounded-2xl p-8 text-center transition-colors bg-[#161618] relative group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[var(--ps-primary,#0A84FF)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-white text-base mb-1">
                      Drag & Drop Car Photo Here
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Supports JPG, PNG, WEBP, TIFF in high resolution (up to 50MB)
                    </p>
                    <span className="inline-block bg-[#2C2C2E] text-white text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-[var(--ps-primary,#0A84FF)] transition-colors">
                      Browse Files
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Upload Preview Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original or Cropped Image Preview */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#2C2C2E] bg-black flex items-center justify-center group shadow-lg">
                        <img
                          src={uploadedImageUrl}
                          alt="Staged Car"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                          Ready for Crop & Level
                        </div>

                        {/* Interactive Edit Trigger on Hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCropModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            Crop & Orient
                          </button>
                        </div>
                      </div>

                      {/* Cartoon Vector Preview (if generated) */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-pink-500/40 bg-white flex items-center justify-center shadow-lg group">
                        {cartoonImageUrl ? (
                          <>
                            <img
                              src={cartoonImageUrl}
                              alt="Cartoon Sticker"
                              className="w-full h-full object-contain p-3"
                            />
                            <div className="absolute top-2.5 left-2.5 bg-pink-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                              <Sparkles className="w-3 h-3" />
                              2D Cartoon Attached
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setIsCartoonStudioOpen(true)}
                                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Edit Cartoon
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mx-auto mb-2">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-gray-800">No Cartoon Version Yet</p>
                            <p className="text-[11px] text-gray-500 mb-3">
                              Turn this car photo into a Miata-style 2D sticker
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsCartoonStudioOpen(true)}
                              className="bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-colors"
                            >
                              Open Cartoon Studio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Studio Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsCropModalOpen(true)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
                      >
                        <Crop className="w-4 h-4 text-blue-400" />
                        Crop & Adjust Orientation
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCartoonStudioOpen(true)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-bold text-pink-300 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        {cartoonImageUrl ? 'Customize Cartoon Art' : 'Turn into 2D Cartoon Art'}
                      </button>

                      <label className="py-2.5 px-3 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Quick Templates / Sample fleet for rapid testing */}
                <div className="border-t border-[#2C2C2E] pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 block">
                    Quick Sample Fleet (Click to test instantly):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SAMPLE_PHOTOS.map((sample) => (
                      <button
                        key={sample.plate}
                        type="button"
                        onClick={() => handleSelectSample(sample)}
                        className="p-2 rounded-xl bg-[#161618] hover:bg-[#222226] border border-[#2C2C2E] text-left transition-colors flex items-center gap-2"
                      >
                        <img
                          src={sample.url}
                          alt={sample.label}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{sample.make}</p>
                          <p className="text-[9px] font-mono text-gray-400">{sample.plate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Metadata, Plate Input & Backend Publishing (5 cols) */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmitCar}
                className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-6 shadow-xl space-y-5"
              >
                <div className="border-b border-[#2C2C2E] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                      Vehicle & License Tagging
                    </h2>
                    <p className="text-xs text-gray-400">
                      License plate is mandatory for visitor retrieval
                    </p>
                  </div>
                </div>

                {/* License Plate Input - Prominent & Auto-formatted with Online Auto-Fill */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      * License Plate Number (Mandatory)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoFillPlate()}
                      disabled={isLookingUpPlate || !plateNumber.trim()}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLookingUpPlate ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          <span>Looking up...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Auto-Fill Online Data</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7XYZ999, GT3-992, MIATA-91, M4-PERF"
                      value={plateNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPlateNumber(val);
                      }}
                      onBlur={() => {
                        if (plateNumber.trim().length >= 3 && !model) {
                          handleAutoFillPlate(plateNumber);
                        }
                      }}
                      className="w-full bg-[#1C1C1E] border-2 border-blue-500/60 focus:border-blue-400 rounded-xl py-3 pl-4 pr-14 text-white font-mono font-bold text-lg tracking-wider uppercase outline-none shadow-inner transition-all placeholder:text-gray-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      PLATE
                    </div>
                  </div>

                  {/* Auto-fill indicator badge */}
                  {lookupFeedback && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        <strong>Auto-Filled ({lookupFeedback.source}):</strong> {lookupFeedback.details}
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 mt-1">
                    Tip: Type plate or VIN and hit <strong className="text-gray-400">Auto-Fill</strong> to automatically retrieve make, model, year, and tags from online registries.
                  </p>
                </div>

                {/* Make & Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Make / Manufacturer
                    </label>
                    <select
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-xs outline-none focus:border-blue-500"
                    >
                      <option value="Porsche">Porsche</option>
                      <option value="Mazda">Mazda</option>
                      <option value="BMW">BMW</option>
                      <option value="Chevrolet">Chevrolet</option>
                      <option value="Nissan">Nissan</option>
                      <option value="Mercedes-AMG">Mercedes-AMG</option>
                      <option value="Ferrari">Ferrari</option>
                      <option value="Lamborghini">Lamborghini</option>
                      <option value="Audi">Audi</option>
                      <option value="Toyota">Toyota</option>
                      <option value="Subaru">Subaru</option>
                      <option value="Ford">Ford</option>
                      <option value="Dodge">Dodge</option>
                      <option value="Honda">Honda</option>
                      <option value="McLaren">McLaren</option>
                      <option value="Aston Martin">Aston Martin</option>
                      <option value="Custom">Custom / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Model / Trim
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 911 GT3 RS / MX-5"
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setCarName(`${make} ${e.target.value}`);
                      }}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2.5 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Year & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Year
                    </label>
                    <input
                      type="number"
                      placeholder="2024"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Body Color Finish
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Python Green"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Event & Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Event Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Supercar Sunday Laguna"
                      value={event}
                      onChange={(e) => setEvent(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Event Location
                    </label>
                    <input
                      type="text"
                      placeholder="Monterey, CA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* General Tags */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                    General Search Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="TrackDay, Supercar, JDM, PopUpHeadlights, HighRes"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500 placeholder:text-gray-600"
                  />
                </div>

                {/* Photographer attribution */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Photographer
                    </label>
                    <input
                      type="text"
                      placeholder="Alex Rivera"
                      value={photographerName}
                      onChange={(e) => setPhotographerName(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      Resolution
                    </label>
                    <input
                      type="text"
                      placeholder="High Resolution • 300 DPI"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Submit to Backend Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold py-4 px-6 rounded-xl text-sm shadow-xl shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isSubmitting ? 'Uploading to Server...' : 'Save & Publish to Live Gallery'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: UI THEME CHANGER & COMPONENT STYLER */}
        {activeTab === 'theme' && (
          <div className="space-y-8">
            {/* Header Description */}
            <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                  Live UI Theme & Component Color Customizer
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Admins can dynamically alter the colors of different app component types. Changes preview live across both Admin and Visitor interfaces!
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveThemeGlobal}
                  className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Theme to App Server
                </button>
                {themeSavedToast && (
                  <span className="text-green-400 text-xs font-semibold animate-in fade-in">
                    Theme Saved!
                  </span>
                )}
              </div>
            </div>

            {/* Presets Row */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">
                1. Select Curated Architectural Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {DEFAULT_THEMES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      themeForm.id === preset.id
                        ? 'border-[var(--ps-primary,#0A84FF)] bg-blue-500/10 ring-2 ring-blue-500/30'
                        : 'border-[#2C2C2E] bg-[#141416] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.bg }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.cardBg }}
                      />
                    </div>
                    <p className="text-xs font-bold text-white truncate">{preset.name}</p>
                    <p className="text-[10px] text-gray-500">{preset.isDark ? 'Dark Mode' : 'Light Mode'}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Component Pickers Grid */}
            <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-6 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-6 border-b border-[#2C2C2E] pb-3 flex items-center justify-between">
                <span>2. Fine Component Color Controls</span>
                <span className="text-xs font-normal text-blue-400">Applies live in real-time</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Primary Accent Color */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Primary Accent & CTA</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.primary}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Action buttons, search button, focus rings & primary highlights
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.primary}
                      onChange={(e) => handleThemeColorChange('primary', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#0A84FF', '#00F5D4', '#FF2A54', '#FFB703', '#A855F7', '#10B981'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('primary', c)}
                          className="w-6 h-6 rounded-lg border border-black/40 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Canvas Color */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">App Background Canvas</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.bg}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Main background tone behind 3D video layer
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.bg}
                      onChange={(e) => handleThemeColorChange('bg', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#000000', '#08080C', '#0A0A0A', '#0F172A', '#FAFAFA', '#F5F5F7'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('bg', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Surface Color */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Card & Modal Surface</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.cardBg}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Gallery photo cards, modal dialogs, and drawer surfaces
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.cardBg.startsWith('#') ? themeForm.cardBg : '#111111'}
                      onChange={(e) => handleThemeColorChange('cardBg', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#111111', '#141416', '#1A1A24', '#1E1B2E', '#FFFFFF', '#F2F2F7'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('cardBg', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Border Tone */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Borders & Dividers</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.cardBorder}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Card outlines, dividers, and input borders
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.cardBorder.startsWith('#') ? themeForm.cardBorder : '#2C2C2E'}
                      onChange={(e) => handleThemeColorChange('cardBorder', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#2C2C2E', '#3C3C3E', '#242438', '#382848', '#E5E5E7', '#D1D5DB'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('cardBorder', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search Box Background */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Search Box Background</span>
                    <span className="font-mono text-xs text-gray-400">{themeForm.searchBg}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Hero license plate search input container background
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={themeForm.searchBg.startsWith('#') ? themeForm.searchBg : '#1C1C1E'}
                      onChange={(e) => handleThemeColorChange('searchBg', e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-[#3C3C3E] cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#1C1C1E', '#181824', '#221C30', '#262626', '#FFFFFF', '#EAEAEA'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleThemeColorChange('searchBg', c)}
                          className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Video Background Opacity */}
                <div className="p-4 rounded-2xl bg-[#161618] border border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Cinematic Video Intensity</span>
                    <span className="font-mono text-xs text-gray-400">{Math.round((themeForm.videoOpacity ?? 0.5) * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Atmospheric 3D video layer brightness in background
                  </p>
                  <div className="pt-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={themeForm.videoOpacity ?? 0.5}
                      onChange={(e) => handleThemeColorChange('videoOpacity', parseFloat(e.target.value))}
                      className="w-full accent-blue-500 bg-[#2C2C2E] h-2 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLEET & GALLERY MANAGEMENT */}
        {activeTab === 'fleet' && (
          <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[var(--ps-primary,#0A84FF)]" />
                  Live Gallery Fleet Management ({cars.length} vehicles)
                </h2>
                <p className="text-xs text-gray-400">
                  Search, review plate tags, inspect downloads, and manage cartoon vector attachments
                </p>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add New Car
              </button>
            </div>

            {/* Table / Grid of uploaded cars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="bg-[#161618] border border-[#2C2C2E] rounded-2xl overflow-hidden shadow-lg p-4 space-y-3"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src={car.imageUrl}
                      alt={car.carName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/10 text-xs font-mono font-bold text-white">
                      {car.plateNumber}
                    </div>
                    {car.hasCartoon && (
                      <div className="absolute top-2.5 right-2.5 bg-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Cartoon
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white truncate">{car.carName}</h4>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{car.event}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-mono">
                      <span>👁️ {car.views || 0} views</span>
                      <span>⬇️ {car.downloads || 0} downloads</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#2C2C2E] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{car.date}</span>
                    <button
                      onClick={() => onDeleteCar(car.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete car record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isCropModalOpen && uploadedImageUrl && (
        <ImageEditorModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageUrl={uploadedImageUrl}
          onSave={(editedUrl) => {
            setUploadedImageUrl(editedUrl);
            setStatusMsg({ type: 'success', text: 'Cropped and oriented image saved!' });
          }}
        />
      )}

      {isCartoonStudioOpen && uploadedImageUrl && (
        <CartoonArtStudio
          isOpen={isCartoonStudioOpen}
          onClose={() => setIsCartoonStudioOpen(false)}
          carName={carName || `${make} ${model}`}
          make={make}
          model={model}
          originalImageUrl={uploadedImageUrl}
          onApplyCartoon={(cartoonUrl) => {
            setCartoonImageUrl(cartoonUrl);
            setHasCartoon(true);
            setStatusMsg({
              type: 'success',
              text: '2D Cartoon Art vector sticker successfully created and attached to car!',
            });
          }}
        />
      )}
    </div>
  );
};

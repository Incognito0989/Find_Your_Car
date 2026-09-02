import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Key,
  Cpu,
  RefreshCw,
  Heart,
  Download,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Save,
  RotateCcw,
  ExternalLink,
  Eye,
  EyeOff,
  Shield,
  Layers,
  Zap,
  Globe,
  HelpCircle,
  Play,
  Type,
  FileCode,
  Server,
  Palette,
  Terminal,
  Clock,
  Ratio,
} from 'lucide-react';
import { GeneralSettings } from '../types';
import { DEFAULT_GENERAL_SETTINGS } from '../data/initialData';

interface GeneralSettingsSectionProps {
  initialSettings?: GeneralSettings | null;
  onSaveSettings: (settings: GeneralSettings) => Promise<boolean>;
  adminToken?: string | null;
}

const GEMINI_PROMPT_PRESETS = [
  {
    title: 'Classic Die-Cut Vinyl',
    tag: 'Recommended',
    desc: 'Crisp white vinyl contour border, bold black comic ink vector outlines, cel-shaded vibrant automotive paint finish, exaggerated chibi proportions, isolated on pure solid white background',
    prompt: 'Die-cut vinyl sticker illustration of {car_description}, clean crisp white die-cut contour border, bold black comic ink vector outlines, cel-shaded vibrant automotive paint finish, exaggerated chibi proportions, isolated on pure solid white background, sticker art, 8k resolution, masterpiece',
  },
  {
    title: 'JDM Itasha Anime Decal',
    tag: 'Japanese Tuner',
    desc: 'Japanese anime decal style, dynamic angle, bold vector ink outlines, glossy cel-shaded vibrant reflections, speed lines',
    prompt: 'JDM anime style die-cut decal of {car_description}, Japanese racing culture sticker, dynamic bold vector ink outlines, glossy cel-shaded vibrant colors, thick white sticker border outline, isolated on pure white background, crisp vector graphic',
  },
  {
    title: 'Vintage Retro Pop-Art Comic',
    tag: '70s Halftone',
    desc: 'Retro 70s comic halftone dots, bold pop-art inking, vintage muscle car poster aesthetic, saturated primaries',
    prompt: 'Vintage pop-art comic die-cut sticker of {car_description}, retro comic book illustration, heavy black ink outlines, subtle halftone pattern, bold saturated primary colors, clean white die-cut border, isolated on plain white background',
  },
  {
    title: 'Minimalist Vector Emblem',
    tag: 'Modern Flat',
    desc: 'Sleek modern automotive emblem, ultra-clean silhouettes, geometric lines, modern aesthetic',
    prompt: 'Minimalist flat vector emblem sticker of {car_description}, clean aerodynamic silhouette, sharp modern geometric lines, bold contrast, premium die-cut white outline, isolated on solid white background, graphic design sticker',
  },
];

const GEMINI_MODEL_PRESETS = [
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    badge: 'Recommended for Stickers',
    description: 'High-quality die-cut sticker generation and automotive styling (Nano Banana 2)',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    badge: 'Fastest Speed',
    description: 'Ultra-fast sub-second sticker generation with minimal latency',
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    badge: 'Pro Quality',
    description: 'Complex reasoning, search grounding, and maximum visual graphic detail',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Multimodal Vision',
    description: 'Multimodal vehicle bodyline analysis and stylized automotive vector prompt generation',
  },
];

const NVIDIA_MODEL_PRESETS = [
  {
    id: 'stabilityai/stable-diffusion-3-medium',
    name: 'Stable Diffusion 3 Medium',
    badge: 'Recommended',
    description: 'Clean ink vectors & bold die-cuts',
  },
  {
    id: 'black-forest-labs/flux-1-dev',
    name: 'FLUX.1-dev',
    badge: 'High Fidelity',
    description: 'Photorealistic and stylized automotive renderings',
  },
  {
    id: 'stabilityai/sdxl-turbo',
    name: 'SDXL Turbo',
    badge: 'Fastest',
    description: 'Sub-second real-time inference',
  },
  {
    id: 'nvidia/cosmos-nemotron-34b',
    name: 'NVIDIA Cosmos NIM',
    badge: 'Next-Gen',
    description: 'Advanced automotive physics & geometry understanding',
  },
];

const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini AI',
    subtitle: 'Recommended • Gemini Image 3.1',
    description: 'Native Google GenAI model pipeline for sharp vector stickers and prompt revisions.',
    icon: Sparkles,
    color: 'from-blue-500/20 to-indigo-500/30 text-blue-400 border-blue-500/40',
    activeBorder: 'border-blue-500 shadow-blue-500/20',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA AI Cloud NIM',
    subtitle: 'SD3 Medium • FLUX.1 • Cosmos',
    description: 'NVIDIA AI Foundation Models with custom endpoint URLs and OpenAI API compatibility.',
    icon: Cpu,
    color: 'from-emerald-500/20 to-teal-500/30 text-emerald-400 border-emerald-500/40',
    activeBorder: 'border-emerald-500 shadow-emerald-500/20',
  },
  {
    id: 'comfyui',
    name: 'ComfyUI Server',
    subtitle: 'Local / Docker Instance',
    description: 'Self-hosted Stable Diffusion pipeline connected via local network or Docker container.',
    icon: Server,
    color: 'from-purple-500/20 to-pink-500/30 text-purple-400 border-purple-500/40',
    activeBorder: 'border-purple-500 shadow-purple-500/20',
  },
  {
    id: 'local_canvas',
    name: 'Pure Vector Canvas',
    subtitle: '100% Offline • Zero API Tokens',
    description: 'CPU-based algorithmic color quantization, contrast boosting, and die-cut contouring.',
    icon: Palette,
    color: 'from-amber-500/20 to-orange-500/30 text-amber-400 border-amber-500/40',
    activeBorder: 'border-amber-500 shadow-amber-500/20',
  },
] as const;

export const GeneralSettingsSection: React.FC<GeneralSettingsSectionProps> = ({
  initialSettings,
  onSaveSettings,
  adminToken,
}) => {
  const [settings, setSettings] = useState<GeneralSettings>(
    initialSettings || DEFAULT_GENERAL_SETTINGS
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [appliedPresetTitle, setAppliedPresetTitle] = useState<string | null>(null);

  const handleApplyGeminiPreset = (preset: typeof GEMINI_PROMPT_PRESETS[0]) => {
    handleChange('stickerGlobalPrompt', preset.prompt);
    setAppliedPresetTitle(preset.title);
    setTimeout(() => {
      setAppliedPresetTitle(null);
    }, 3500);
  };

  // API Key visibility toggles
  const [showGeminiApiKey, setShowGeminiApiKey] = useState<boolean>(false);
  const [showNvidiaApiKey, setShowNvidiaApiKey] = useState<boolean>(false);

  // Diagnostic Test States
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    latency?: number;
    sampleResponse?: string;
    error?: string;
  } | null>(null);

  const [isTestingNvidia, setIsTestingNvidia] = useState<boolean>(false);
  const [nvidiaTestResult, setNvidiaTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    error?: string;
  } | null>(null);

  const [isTestingComfyUI, setIsTestingComfyUI] = useState<boolean>(false);
  const [comfyTestResult, setComfyTestResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);

  // Sync if initialSettings change
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const ok = await onSaveSettings(settings);
      if (ok) {
        setSaveStatus({
          type: 'success',
          message: 'General application and AI settings saved globally to database!',
        });
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setSaveStatus({
          type: 'error',
          message: 'Failed to save settings. Please check your credentials.',
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'An unexpected error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all general and AI settings back to system defaults?')) {
      setSettings(DEFAULT_GENERAL_SETTINGS);
      setSaveStatus({
        type: 'success',
        message: 'Settings reset to default values. Click "Save Changes" to commit.',
      });
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) {
        authHeaders['Authorization'] = `Bearer ${adminToken}`;
        authHeaders['x-admin-token'] = adminToken;
      }

      const res = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          apiKey: settings.geminiApiKey,
          model: settings.geminiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGeminiTestResult({
          success: false,
          message: 'Gemini Connection Failed',
          error: data.error || 'Server error testing Gemini API key.',
        });
      } else {
        setGeminiTestResult(data);
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: 'Connection Failed',
        error: err.message || 'Could not connect to Gemini test endpoint.',
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleTestNvidia = async () => {
    setIsTestingNvidia(true);
    setNvidiaTestResult(null);
    try {
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) {
        authHeaders['Authorization'] = `Bearer ${adminToken}`;
        authHeaders['x-admin-token'] = adminToken;
      }

      const res = await fetch('/api/test-nvidia', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          apiKey: settings.nvidiaApiKey,
          model: settings.nvidiaModel,
          baseUrl: settings.nvidiaBaseUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNvidiaTestResult({
          success: false,
          message: 'NVIDIA Connection Failed',
          error: data.error || 'Server error testing NVIDIA API key.',
        });
      } else {
        setNvidiaTestResult(data);
      }
    } catch (err: any) {
      setNvidiaTestResult({
        success: false,
        message: 'Connection Failed',
        error: err.message || 'Could not connect to NVIDIA test endpoint.',
      });
    } finally {
      setIsTestingNvidia(false);
    }
  };

  const handleTestComfyUI = async () => {
    setIsTestingComfyUI(true);
    setComfyTestResult(null);
    try {
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) {
        authHeaders['Authorization'] = `Bearer ${adminToken}`;
        authHeaders['x-admin-token'] = adminToken;
      }

      const res = await fetch('/api/test-comfyui', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          baseUrl: settings.comfyuiBaseUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComfyTestResult({
          success: false,
          message: 'ComfyUI Connection Failed',
          error: data.error || 'Could not reach ComfyUI endpoint.',
        });
      } else {
        setComfyTestResult(data);
      }
    } catch (err: any) {
      setComfyTestResult({
        success: false,
        message: 'Connection Failed',
        error: err.message || 'Could not reach ComfyUI server.',
      });
    } finally {
      setIsTestingComfyUI(false);
    }
  };

  const insertPromptToken = (token: string) => {
    setSettings((prev) => ({
      ...prev,
      stickerGlobalPrompt: (prev.stickerGlobalPrompt || '') + ' ' + token,
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>GLOBAL PLATFORM CONFIGURATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ps-text-main,#ffffff)] tracking-tight">
              General & AI Settings
            </h1>
            <p className="text-sm text-[var(--ps-text-muted,#9ca3af)] max-w-2xl leading-relaxed">
              Configure active AI sticker providers (Google Gemini API, NVIDIA NIM, ComfyUI), custom prompt templates, author support gating, and branding.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-4 py-2.5 rounded-2xl bg-[var(--ps-badge-bg,#141416)] hover:bg-neutral-800 text-[var(--ps-text-muted,#9ca3af)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div
            className={`mt-6 p-4 rounded-2xl border flex items-center justify-between animate-in fade-in duration-200 ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {saveStatus.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <p className="text-xs sm:text-sm font-semibold">{saveStatus.message}</p>
            </div>
            <button
              onClick={() => setSaveStatus(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: AI PROVIDER SELECTION & DYNAMIC ENGINE CONFIG */}
      <section className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-card-border,#2C2C2E)] flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">
                AI Sticker Generation Engine
              </h2>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">
                Select your primary AI provider below to configure its specific API credentials and model parameters.
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Engine: <strong className="text-white uppercase">{settings.aiProvider}</strong></span>
          </div>
        </div>

        {/* AI Provider Switcher Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
            Choose Active AI Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              const isSelected = settings.aiProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleChange('aiProvider', provider.id as any)}
                  className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                    isSelected
                      ? `bg-neutral-900/90 ${provider.activeBorder} shadow-lg ring-1 ring-white/10`
                      : 'bg-black/30 border-[var(--ps-card-border,#2C2C2E)] hover:bg-neutral-900/40 hover:border-neutral-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-bold font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>SELECTED</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${provider.color} border flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">{provider.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] mt-3 leading-relaxed">
                    {provider.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* PROVIDER-SPECIFIC CONFIGURATION PANELS */}

        {/* 1. GOOGLE GEMINI AI CONFIGURATION PANEL */}
        {settings.aiProvider === 'gemini' && (
          <div className="p-6 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Google Gemini AI Configuration</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  Active Provider
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                  @google/genai SDK
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 font-semibold"
              >
                <span>Get Gemini API Key (AI Studio)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Dynamic Provider Requirements Checklist */}
            <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Required Information for Google Gemini</span>
                </span>
                <span className="text-[10px] font-mono text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                  Config Checklist
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${settings.geminiApiKey ? 'text-emerald-400' : 'text-blue-400'}`} />
                  <span>
                    API Key:{' '}
                    <strong className={settings.geminiApiKey ? 'text-emerald-300' : 'text-blue-200'}>
                      {settings.geminiApiKey ? 'Custom Key Entered' : 'Server Environment Key Active'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Model: <strong className="text-white font-mono">{settings.geminiModel || 'gemini-3.1-flash-image'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Aspect Ratio: <strong className="text-white font-mono">{settings.geminiAspectRatio || '1:1'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Resolution: <strong className="text-white font-mono">{settings.geminiImageSize || '1K'}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gemini API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-300">
                    Gemini API Key
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Starts with AIzaSy...
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showGeminiApiKey ? 'text' : 'password'}
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                    placeholder="AIzaSy... (leave blank to use server environment key)"
                    className="w-full px-4 py-3 pr-20 rounded-2xl bg-neutral-900 border border-blue-500/40 text-sm font-mono text-white focus:outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-neutral-800 cursor-pointer"
                  >
                    {showGeminiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Securely stored in your backend database. Your API key is never exposed to browser clients.
                </p>
              </div>

              {/* Gemini Model Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300">
                  Gemini Model
                </label>
                <input
                  type="text"
                  value={settings.geminiModel || 'gemini-3.1-flash-image'}
                  onChange={(e) => handleChange('geminiModel', e.target.value)}
                  placeholder="e.g. gemini-3.1-flash-image"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-blue-500/40 text-sm font-mono text-white focus:outline-none focus:border-blue-400 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {GEMINI_MODEL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleChange('geminiModel', preset.id)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        settings.geminiModel === preset.id
                          ? 'bg-blue-500/30 text-blue-200 border-blue-400 font-bold'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gemini Aspect Ratio */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Ratio className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sticker Aspect Ratio</span>
                </label>
                <select
                  value={settings.geminiAspectRatio || '1:1'}
                  onChange={(e) => handleChange('geminiAspectRatio', e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-blue-500/40 text-sm font-semibold text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="1:1">1:1 Square (Classic Vinyl Sticker)</option>
                  <option value="4:3">4:3 Landscape (Vehicle Profile Banner)</option>
                  <option value="3:4">3:4 Portrait (Poster / Card)</option>
                  <option value="16:9">16:9 Widescreen (Cinematic Cut)</option>
                </select>
              </div>

              {/* Gemini Image Resolution */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Image Size / Resolution</span>
                </label>
                <select
                  value={settings.geminiImageSize || '1K'}
                  onChange={(e) => handleChange('geminiImageSize', e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-blue-500/40 text-sm font-semibold text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="1K">1K (1024x1024 - Recommended Crisp Die-Cut)</option>
                  <option value="2K">2K (2048x2048 - Ultra High Resolution)</option>
                  <option value="512px">512px (Fast Draft / Low Latency)</option>
                </select>
              </div>
            </div>

            {/* Gemini Sticker Style Presets (1-Click Apply to Prompt) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Gemini Sticker Style Presets</span>
                </span>
                {appliedPresetTitle && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-in fade-in duration-200">
                    ✓ Applied "{appliedPresetTitle}" to Prompt Template
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {GEMINI_PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleApplyGeminiPreset(preset)}
                    className="p-3 rounded-xl bg-black/40 hover:bg-blue-900/30 border border-blue-500/20 hover:border-blue-500/50 text-left transition-all group cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-blue-300">
                        {preset.title}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                      {preset.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Gemini Connection Button */}
            <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Validate Gemini API Connection</p>
                <p className="text-[11px] text-gray-400">
                  Sends a lightweight diagnostic test to verify API key validity, latency, and model responsiveness.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestGemini}
                disabled={isTestingGemini}
                className="px-4 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isTestingGemini ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isTestingGemini ? 'Testing Gemini API...' : 'Test Gemini Connection'}</span>
              </button>
            </div>

            {geminiTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
                  geminiTestResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}
              >
                {geminiTestResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{geminiTestResult.message}</p>
                  {geminiTestResult.sampleResponse && (
                    <p className="text-[11px] font-mono opacity-90">
                      Response: "{geminiTestResult.sampleResponse}"
                    </p>
                  )}
                  {geminiTestResult.error && (
                    <p className="text-[11px] opacity-80">{geminiTestResult.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. NVIDIA AI NIM CONFIGURATION PANEL */}
        {settings.aiProvider === 'nvidia' && (
          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">NVIDIA AI Foundations / NIM Configuration</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OpenAI-Compatible
                </span>
              </div>
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 font-semibold"
              >
                <span>Get NVIDIA API Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Dynamic Provider Requirements Checklist for NVIDIA */}
            <div className="p-4 rounded-2xl bg-emerald-900/20 border border-emerald-500/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Required Information for NVIDIA AI NIM</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Config Checklist
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${settings.nvidiaApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>
                    API Key:{' '}
                    <strong className={settings.nvidiaApiKey ? 'text-emerald-300' : 'text-amber-300'}>
                      {settings.nvidiaApiKey ? 'Configured' : 'Required (nvapi-...)'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Model: <strong className="text-white font-mono">{settings.nvidiaModel}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Base URL: <strong className="text-white font-mono truncate">{settings.nvidiaBaseUrl || 'Default NIM'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Format: <strong className="text-white font-mono">OpenAI-Compatible</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NVIDIA API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                    NVIDIA API Key
                  </label>
                  <span className="text-[10px] text-gray-400">nvapi-...</span>
                </div>
                <div className="relative">
                  <input
                    type={showNvidiaApiKey ? 'text' : 'password'}
                    value={settings.nvidiaApiKey || ''}
                    onChange={(e) => handleChange('nvidiaApiKey', e.target.value)}
                    placeholder="nvapi-..."
                    className="w-full px-4 py-3 pr-20 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-sm font-mono text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvidiaApiKey(!showNvidiaApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-neutral-800 cursor-pointer"
                  >
                    {showNvidiaApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* NVIDIA Model */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                  NVIDIA NIM Model Name
                </label>
                <input
                  type="text"
                  value={settings.nvidiaModel}
                  onChange={(e) => handleChange('nvidiaModel', e.target.value)}
                  placeholder="e.g. stabilityai/stable-diffusion-3-medium"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-sm font-mono text-white focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {NVIDIA_MODEL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleChange('nvidiaModel', preset.id)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        settings.nvidiaModel === preset.id
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 font-bold'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* NVIDIA Base URL */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                  NVIDIA API Base URL
                </label>
                <input
                  type="text"
                  value={settings.nvidiaBaseUrl || 'https://integrate.api.nvidia.com/v1'}
                  onChange={(e) => handleChange('nvidiaBaseUrl', e.target.value)}
                  placeholder="https://integrate.api.nvidia.com/v1"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-sm font-mono text-white focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            {/* Test NVIDIA Connection Button */}
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Validate NVIDIA API Connection</p>
                <p className="text-[11px] text-gray-400">
                  Sends a diagnostic ping to test NVIDIA NIM endpoint and model availability.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestNvidia}
                disabled={isTestingNvidia || !settings.nvidiaApiKey}
                className="px-4 py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isTestingNvidia ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isTestingNvidia ? 'Testing NVIDIA...' : 'Test NVIDIA Connection'}</span>
              </button>
            </div>

            {nvidiaTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
                  nvidiaTestResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}
              >
                {nvidiaTestResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold">{nvidiaTestResult.message}</p>
                  {nvidiaTestResult.error && <p className="text-[11px] opacity-80 mt-0.5">{nvidiaTestResult.error}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. COMFYUI CONFIGURATION PANEL */}
        {settings.aiProvider === 'comfyui' && (
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">ComfyUI Local Instance Configuration</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Self-Hosted SD
                </span>
              </div>
            </div>

            {/* Dynamic Provider Requirements Checklist for ComfyUI */}
            <div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-500/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Required Information for ComfyUI Local Instance</span>
                </span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  Config Checklist
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Endpoint URL: <strong className="text-white font-mono">{settings.comfyuiBaseUrl || 'http://127.0.0.1:8188'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Workflow JSON: <strong className="text-white font-mono">{settings.comfyuiWorkflow || 'default'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Network: <strong className="text-white">Accessible from Server Container</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Cloud API Tokens: <strong className="text-emerald-300">0 Tokens (Local GPU)</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                  ComfyUI Base URL
                </label>
                <input
                  type="text"
                  value={settings.comfyuiBaseUrl || 'http://127.0.0.1:8188'}
                  onChange={(e) => handleChange('comfyuiBaseUrl', e.target.value)}
                  placeholder="http://127.0.0.1:8188"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-purple-500/40 text-sm font-mono text-white focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                  Workflow / Checkpoint Preset
                </label>
                <input
                  type="text"
                  value={settings.comfyuiWorkflow || 'default'}
                  onChange={(e) => handleChange('comfyuiWorkflow', e.target.value)}
                  placeholder="default (or custom workflow json name)"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-purple-500/40 text-sm font-mono text-white focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            {/* Test ComfyUI Button */}
            <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Validate ComfyUI Local Instance</p>
                <p className="text-[11px] text-gray-400">
                  Tests network reachability to the local ComfyUI instance.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestComfyUI}
                disabled={isTestingComfyUI}
                className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isTestingComfyUI ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isTestingComfyUI ? 'Testing ComfyUI...' : 'Test ComfyUI Connection'}</span>
              </button>
            </div>

            {comfyTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
                  comfyTestResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}
              >
                {comfyTestResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold">{comfyTestResult.message}</p>
                  {comfyTestResult.error && <p className="text-[11px] opacity-80 mt-0.5">{comfyTestResult.error}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PURE LOCAL CANVAS VECTOR ENGINE PANEL */}
        {settings.aiProvider === 'local_canvas' && (
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Palette className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Pure Vector Canvas Engine Settings</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Zero External APIs Required
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
              <strong>100% Offline & Free:</strong> The Pure Vector Canvas engine executes locally on the CPU using Sobel edge-detection, high-contrast posterization, and SVG contour die-cutting. No API keys or cloud tokens are required.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  Color Quantization Palette (Cel-Shades)
                </label>
                <select
                  value={settings.localColorQuantization || 16}
                  onChange={(e) => handleChange('localColorQuantization', parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-amber-500/40 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={8}>8 Colors (Retro Pop-Art Comic)</option>
                  <option value={16}>16 Colors (Standard Cel-Shaded Anime)</option>
                  <option value={24}>24 Colors (Rich Graphic Illustration)</option>
                  <option value={32}>32 Colors (Smooth Automotive Paint Gradients)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  Die-Cut Contour Outline Thickness
                </label>
                <select
                  value={settings.localOutlineThickness || 3}
                  onChange={(e) => handleChange('localOutlineThickness', parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-amber-500/40 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={2}>2px (Fine Vector Inks)</option>
                  <option value={3}>3px (Classic Vinyl Sticker Border)</option>
                  <option value={4}>4px (Bold Comic Decal)</option>
                  <option value={6}>6px (Chibi Exaggerated Border)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SHARED PROMPT TEMPLATE & REVISION CONTROLS */}
        <div className="space-y-6 pt-4 border-t border-[var(--ps-card-border,#2C2C2E)]">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Sticker Prompt Engineering & Revision Tokens
            </h3>
          </div>

          {/* Dynamic Provider Prompt Engineering Advice */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/10 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Prompt Guidance for Active Provider: {AI_PROVIDERS.find(p => p.id === settings.aiProvider)?.name || settings.aiProvider}</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">Adaptive Formatting</span>
            </div>
            {settings.aiProvider === 'gemini' && (
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Google Gemini excels at natural language scene descriptions and automotive terminology. Use the <strong>Gemini Sticker Style Presets</strong> above to quickly load tested die-cut sticker formulas with sharp white borders and vector inking.
              </p>
            )}
            {settings.aiProvider === 'nvidia' && (
              <p className="text-[11px] text-gray-300 leading-relaxed">
                NVIDIA NIM Stable Diffusion models rely heavily on positive prompt tags (e.g. <em>sticker art, vector contour, chibi</em>) and negative prompts to eliminate background noise.
              </p>
            )}
            {settings.aiProvider === 'comfyui' && (
              <p className="text-[11px] text-gray-300 leading-relaxed">
                ComfyUI workflows parse prompt text nodes mapped in your workflow JSON. Ensure tokens like <code>{'{car_description}'}</code> match your prompt input node.
              </p>
            )}
            {settings.aiProvider === 'local_canvas' && (
              <p className="text-[11px] text-gray-300 leading-relaxed">
                The Pure Vector Canvas algorithm extracts colors and edge contours directly from the uploaded photo. This prompt template is saved for when cloud failover is enabled.
              </p>
            )}
          </div>

          {/* Global Sticker Prompt Template */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
                Global Sticker Prompt Template
              </label>
              <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">
                Tokens will be auto-substituted per vehicle metadata
              </span>
            </div>

            <textarea
              rows={3}
              value={settings.stickerGlobalPrompt}
              onChange={(e) => handleChange('stickerGlobalPrompt', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
              placeholder="Enter prompt instructions for AI sticker generation..."
            />

            {/* Token helper chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-semibold">Click to insert token:</span>
              {['{car_description}', '{make}', '{model}', '{color}', '{plate}', '{carName}'].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertPromptToken(token)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-blue-400 border border-white/10 transition-colors cursor-pointer"
                >
                  + {token}
                </button>
              ))}
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Negative Prompt (Undesired Attributes)
            </label>
            <input
              type="text"
              value={settings.stickerNegativePrompt || ''}
              onChange={(e) => handleChange('stickerNegativePrompt', e.target.value)}
              placeholder="e.g. photorealistic background, messy noise, blurry, watermark"
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Retries and Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
                Max Recreate Retries / Attempts
              </label>
              <select
                value={settings.maxStickerRetries}
                onChange={(e) => handleChange('maxStickerRetries', parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1 Retry</option>
                <option value={2}>2 Retries</option>
                <option value={3}>3 Retries (Default)</option>
                <option value={5}>5 Retries</option>
                <option value={10}>10 Retries</option>
              </select>
              <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">
                Limits how many times users can request revisions with feedback per vehicle.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)]">
              <div>
                <p className="text-xs font-bold text-white">Public Visitor Stickers</p>
                <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">Allow site visitors to generate stickers</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowVisitorStickers}
                onChange={(e) => handleChange('allowVisitorStickers', e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)]">
              <div>
                <p className="text-xs font-bold text-white">Local Algorithm Failover</p>
                <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">Auto-fallback if cloud AI service is offline</p>
              </div>
              <input
                type="checkbox"
                checked={settings.failoverToLocal}
                onChange={(e) => handleChange('failoverToLocal', e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: AUTHOR SUPPORT & GATING */}
      <section className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">
              Support the Author & Tipping Controls
            </h2>
            <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">
              Configure tipping modal popups for photo downloads and sticker creations with free bypass.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)]">
            <div>
              <p className="text-xs font-bold text-white">Prompt Author Support on Sticker Creation</p>
              <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">
                Shows tip modal with clear "Continue Free" button before generating stickers
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showTipBeforeSticker}
              onChange={(e) => handleChange('showTipBeforeSticker', e.target.checked)}
              className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)]">
            <div>
              <p className="text-xs font-bold text-white">Prompt Author Support on High-Res Download</p>
              <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">
                Shows tip modal before downloading photo with clear "Continue Free" button
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showTipBeforeDownload}
              onChange={(e) => handleChange('showTipBeforeDownload', e.target.checked)}
              className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Tip Modal Custom Title
            </label>
            <input
              type="text"
              value={settings.tipModalTitle}
              onChange={(e) => handleChange('tipModalTitle', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Tip Modal Subtitle / Description
            </label>
            <input
              type="text"
              value={settings.tipModalDescription}
              onChange={(e) => handleChange('tipModalDescription', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: APP BRANDING & CUSTOMIZATION */}
      <section className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">
              Site Identity & Global Branding
            </h2>
            <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">
              Customize title text, hero banners, and footer notices across the entire visitor portal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Application Name
            </label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => handleChange('appName', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              App Tagline / Subtitle
            </label>
            <input
              type="text"
              value={settings.appSubtitle}
              onChange={(e) => handleChange('appSubtitle', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Hero Headline
            </label>
            <input
              type="text"
              value={settings.heroHeadline}
              onChange={(e) => handleChange('heroHeadline', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Hero Subtitle
            </label>
            <input
              type="text"
              value={settings.heroSubtitle}
              onChange={(e) => handleChange('heroSubtitle', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ps-text-muted,#9ca3af)]">
              Footer Notice / Copyright Text
            </label>
            <input
              type="text"
              value={settings.footerText || ''}
              onChange={(e) => handleChange('footerText', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--ps-search-bg,#161618)] border border-[var(--ps-card-border,#2C2C2E)] text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Floating Save Button Bar */}
      <div className="sticky bottom-6 z-30 flex items-center justify-end">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center gap-2.5 shadow-2xl shadow-blue-600/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Saving Settings...' : 'Save All General Settings'}</span>
        </button>
      </div>
    </div>
  );
};


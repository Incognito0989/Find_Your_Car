import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Link2 } from 'lucide-react';
import { getApiBaseUrl, setCustomBackendUrl } from '../utils/apiConfig';
import { AppThemeConfig } from '../types';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  theme: AppThemeConfig;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  theme,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    database?: string;
    totalCars?: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentUrl = getApiBaseUrl();
      setUrlInput(currentUrl);
      testConnection(currentUrl);
    }
  }, [isOpen]);

  const testConnection = async (targetUrl: string) => {
    setIsTesting(true);
    setStatus(null);
    try {
      const base = targetUrl ? targetUrl.trim().replace(/\/+$/, '') : '';
      const endpoint = base ? `${base}/api/health` : '/api/health';
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();

      setStatus({
        connected: true,
        database: data.database || 'SQLite (Embedded)',
        totalCars: data.totalCarsIndexed,
        message: 'Successfully connected to backend server.',
      });
    } catch (err: any) {
      setStatus({
        connected: false,
        message: 'Could not connect. Ensure your Docker container is running and accessible (or check CORS/tunnel URL).',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setCustomBackendUrl(urlInput);
    if (onConnected) onConnected();
    onClose();
  };

  const handleResetToSameOrigin = () => {
    setUrlInput('');
    setCustomBackendUrl(null);
    testConnection('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141416] border border-[#2C2C2E] rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Docker Backend Connection</h3>
            <p className="text-xs text-gray-400">Connect this Vercel UI to your local or remote Docker API</p>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
            Backend Server URL
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. http://localhost:3000 or https://api.yourdomain.com"
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition-all placeholder:text-gray-600"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Leave blank when running the frontend directly on the same server, or enter your tunnel / IP URL if hosting frontend on Vercel.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Connection Health</span>
            <button
              onClick={() => testConnection(urlInput)}
              disabled={isTesting}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              Test Ping
            </button>
          </div>

          {status && (
            <div className={`flex items-start gap-2 text-xs pt-1 ${status.connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {status.connected ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{status.message}</p>
                {status.connected && (
                  <p className="text-[11px] text-gray-400 mt-1 font-mono">
                    Engine: {status.database} • Vehicles in database: {status.totalCars ?? 0}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToSameOrigin}
            className="text-xs text-gray-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white shadow-lg cursor-pointer"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

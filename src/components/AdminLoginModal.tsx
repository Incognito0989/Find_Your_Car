import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, AlertCircle, X, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';
import { AppThemeConfig } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, adminData: { name: string; email: string }) => void;
  theme: AppThemeConfig;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  theme,
}) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('admin@platesnapcars.local');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your password.');
      }

      // Store in localStorage for persistent admin session
      localStorage.setItem('platesnap_admin_token', data.token);
      localStorage.setItem('platesnap_admin_user', JSON.stringify(data.admin));

      onLoginSuccess(data.token, data.admin);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate admin user.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefaultPassword = () => {
    setPassword('platesnap2026');
    setError(null);
  };

  return (
    <AnimatePresence>
      <div
        id="admin-login-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="admin-login-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            color: theme.textMain,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Ambient Glow */}
          <div
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
            style={{ backgroundColor: theme.primary }}
          />

          {/* Close button */}
          <button
            id="close-admin-login-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: `${theme.primary}20`,
                border: `1px solid ${theme.primary}50`,
                color: theme.primary,
              }}
            >
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">Admin Portal Access</h3>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs font-mono tracking-wider opacity-70">
                RESTRICTED PHOTOGRAPHER STUDIO
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div
            className="p-3 mb-6 rounded-xl border text-xs flex items-center gap-2.5"
            style={{
              backgroundColor: `${theme.primary}10`,
              borderColor: `${theme.primary}30`,
              color: theme.textMain,
            }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
            <span>
              Authentication required. Only verified photographers and administrators can upload, crop, or modify car listings.
            </span>
          </div>

          {/* Error display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5 opacity-80">
                Admin Email / Identity
              </label>
              <input
                id="admin-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: theme.searchBg,
                  borderColor: theme.cardBorder,
                  color: theme.textMain,
                }}
                placeholder="admin@platesnapcars.local"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider opacity-80">
                  Master Admin Password
                </label>
                <button
                  type="button"
                  onClick={handleUseDefaultPassword}
                  className="text-xs hover:underline flex items-center gap-1 font-medium"
                  style={{ color: theme.primary }}
                >
                  <Sparkles className="w-3 h-3" />
                  Fill Default Pass
                </button>
              </div>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: theme.searchBg,
                    borderColor: theme.cardBorder,
                    color: theme.textMain,
                  }}
                  placeholder="Enter admin password..."
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-submit-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundColor: theme.primary,
                color: '#ffffff',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Admin Studio</span>
                </>
              )}
            </button>
          </form>

          {/* Master Password Helper note */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-[11px] opacity-60">
              Default Master Password: <code className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-amber-300">platesnap2026</code>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

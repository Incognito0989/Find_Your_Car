import React, { useState } from 'react';
import {
  Heart,
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldCheck,
  Smartphone,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { Photographer, CarPhoto } from '../types';

interface TipRecipient {
  photographer: Photographer;
}

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  car?: CarPhoto | null;
  photographer?: Photographer | null;
  allPhotographers?: Photographer[]; // For multi-photographer attribution
  onTipCompleted?: () => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  car,
  photographer,
  allPhotographers = [],
  onTipCompleted,
}) => {
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine unique authors
  const uniqueAuthors: Photographer[] = [];
  const authorNames = new Set<string>();

  if (allPhotographers && allPhotographers.length > 0) {
    allPhotographers.forEach((p) => {
      if (p && p.name && !authorNames.has(p.name)) {
        authorNames.add(p.name);
        uniqueAuthors.push(p);
      }
    });
  } else if (photographer) {
    uniqueAuthors.push(photographer);
  } else if (car && car.photographer) {
    uniqueAuthors.push(car.photographer);
  }

  const recipients: TipRecipient[] = uniqueAuthors.map((p) => ({
    photographer: p,
  }));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(id);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const getVenmoUrl = (handle: string) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    const note = `Automotive photo tip for ${car?.carName || car?.make || 'Vehicle'}`;
    return `https://venmo.com/${encodeURIComponent(cleanHandle)}?txn=pay&note=${encodeURIComponent(note)}`;
  };

  const getPayPalUrl = (handle: string) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    return `https://www.paypal.com/paypalme/${encodeURIComponent(cleanHandle)}`;
  };

  const getCashAppUrl = (handle: string) => {
    const cleanHandle = handle.replace(/^[$@]/, '').trim();
    return `https://cash.app/$${encodeURIComponent(cleanHandle)}`;
  };

  return (
    <div
      id="tip-modal-overlay"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="tip-modal-content"
        className="relative w-full max-w-xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[28px] p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Gradient Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[var(--ps-primary,#0A84FF)]/20 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Heart className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[var(--ps-text-main,#ffffff)] tracking-tight">
                  Tip the Photographer
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Direct to Creator
                </span>
              </div>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-0.5">
                {car
                  ? `Support the photographer for photos of ${car.carName || car.make || 'this vehicle'}`
                  : 'Send a tip directly to the photographer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
          {recipients.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white/5 rounded-2xl border border-white/10">
              No photographer assigned to this vehicle yet.
            </div>
          ) : (
            recipients.map((rec, idx) => {
              const p = rec.photographer;
              const cleanVenmo = (p.venmoHandle || '').replace(/^@/, '').trim();
              const cleanPayPal = (p.payPalHandle || '').replace(/^@/, '').trim();
              const cleanCashApp = (p.cashAppHandle || '').replace(/^[$@]/, '').trim();

              const hasAnyPayment = Boolean(cleanVenmo || cleanPayPal || cleanCashApp);

              return (
                <div
                  key={p.name + idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 transition-all duration-200 hover:border-white/20 space-y-4"
                >
                  {/* Author Profile Header */}
                  <div className="flex items-center gap-3.5">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-white/20 flex items-center justify-center text-white font-bold text-base shrink-0">
                        {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base truncate">
                          {p.name}
                        </h4>
                        {p.instagram && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            {p.instagram.startsWith('@') ? p.instagram : `@${p.instagram}`}
                          </span>
                        )}
                      </div>
                      {p.bio ? (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{p.bio}</p>
                      ) : p.title ? (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{p.title}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Payment Provider Buttons - ONLY SHOW IF SAVED */}
                  {hasAnyPayment ? (
                    <div className="space-y-2.5 pt-1">
                      {/* Venmo Button */}
                      {cleanVenmo && (
                        <div className="flex items-center gap-2">
                          <a
                            href={getVenmoUrl(cleanVenmo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onTipCompleted) onTipCompleted();
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-[#008CFF]/15 hover:bg-[#008CFF]/25 text-[#38bdf8] hover:text-white border border-[#008CFF]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip @${cleanVenmo} on Venmo`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#008CFF]/20 text-[#008CFF] group-hover:text-white">
                                <Smartphone className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">Venmo</span>
                                <span className="text-[11px] text-gray-400 font-mono">@{cleanVenmo}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(`@${cleanVenmo}`, `venmo-${p.name}`)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            title="Copy Venmo username"
                          >
                            {copiedHandle === `venmo-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* PayPal Button */}
                      {cleanPayPal && (
                        <div className="flex items-center gap-2">
                          <a
                            href={getPayPalUrl(cleanPayPal)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onTipCompleted) onTipCompleted();
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-[#0070BA]/15 hover:bg-[#0070BA]/25 text-[#60a5fa] hover:text-white border border-[#0070BA]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip ${cleanPayPal} on PayPal`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#0070BA]/20 text-[#0070BA] group-hover:text-white">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">PayPal</span>
                                <span className="text-[11px] text-gray-400 font-mono">paypal.me/{cleanPayPal}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(cleanPayPal, `paypal-${p.name}`)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            title="Copy PayPal username"
                          >
                            {copiedHandle === `paypal-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* CashApp Button */}
                      {cleanCashApp && (
                        <div className="flex items-center gap-2">
                          <a
                            href={getCashAppUrl(cleanCashApp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onTipCompleted) onTipCompleted();
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-[#00D632]/15 hover:bg-[#00D632]/25 text-[#4ade80] hover:text-white border border-[#00D632]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip $${cleanCashApp} on Cash App`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#00D632]/20 text-[#00D632] group-hover:text-white">
                                <DollarSign className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">Cash App</span>
                                <span className="text-[11px] text-gray-400 font-mono">${cleanCashApp}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(`$${cleanCashApp}`, `cashapp-${p.name}`)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            title="Copy Cash App $cashtag"
                          >
                            {copiedHandle === `cashapp-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 text-center">
                      No payment links configured for this photographer yet.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Opens official payment provider directly to photographer</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

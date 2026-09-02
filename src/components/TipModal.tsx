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
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Photographer, CarPhoto, GeneralSettings } from '../types';

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
  customTitle?: string;
  customDescription?: string;
  bypassActionLabel?: string;
  onBypass?: () => void;
  generalSettings?: GeneralSettings | null;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  car,
  photographer,
  allPhotographers = [],
  onTipCompleted,
  customTitle,
  customDescription,
  bypassActionLabel = 'Continue Without Paying',
  onBypass,
  generalSettings,
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

  const modalTitle =
    customTitle ||
    generalSettings?.tipModalTitle ||
    'Support the Photographer';

  const modalDescription =
    customDescription ||
    generalSettings?.tipModalDescription ||
    (car
      ? `Send 100% of your tip directly to the shooter who captured ${car.carName || car.make || 'this vehicle'}. You can also proceed free at any time.`
      : 'Send a tip directly to the photographer to support their automotive coverage.');

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
        <div className="relative flex items-start justify-between pb-4 border-b border-[var(--ps-card-border,#2C2C2E)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/30 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Heart className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[var(--ps-text-main,#ffffff)] tracking-tight">
                  {modalTitle}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Direct to Creator
                </span>
              </div>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-0.5">
                {modalDescription}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Bypass / Continue Free Banner */}
        {onBypass && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/15 to-purple-600/15 border border-blue-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-[var(--ps-text-main,#ffffff)] font-medium">
                Tipping is completely optional!
              </span>
            </div>
            <button
              type="button"
              onClick={onBypass}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
            >
              <span>{bypassActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
          {recipients.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--ps-text-muted,#9ca3af)] bg-[var(--ps-badge-bg,#141416)] rounded-2xl border border-[var(--ps-card-border,#2C2C2E)]">
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
                  className="bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-2xl p-5 transition-all duration-200 hover:border-[var(--ps-primary,#0A84FF)]/40 space-y-4 shadow-sm"
                >
                  {/* Author Profile Header */}
                  <div className="flex items-center gap-3.5">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[var(--ps-card-border,#2C2C2E)] shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                        {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[var(--ps-text-main,#ffffff)] text-base truncate">
                          {p.name}
                        </h4>
                        {p.instagram && (
                          <span className="text-[11px] text-[var(--ps-primary,#0A84FF)] font-mono font-medium">
                            {p.instagram.startsWith('@') ? p.instagram : `@${p.instagram}`}
                          </span>
                        )}
                      </div>
                      {p.bio ? (
                        <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] line-clamp-2 mt-0.5">{p.bio}</p>
                      ) : p.title ? (
                        <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] line-clamp-1 mt-0.5">{p.title}</p>
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
                            className="flex-1 py-3 px-4 rounded-xl bg-[#008CFF]/15 hover:bg-[#008CFF]/25 text-[#0070BA] dark:text-[#38bdf8] border border-[#008CFF]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip @${cleanVenmo} on Venmo`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#008CFF]/20 text-[#0070BA] dark:text-[#008CFF] group-hover:text-[var(--ps-primary,#0A84FF)]">
                                <Smartphone className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">Venmo</span>
                                <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-mono font-semibold">@{cleanVenmo}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(`@${cleanVenmo}`, `venmo-${p.name}`)}
                            className="p-3 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-muted,#9ca3af)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] transition-colors cursor-pointer group shadow-sm"
                            title="Copy Venmo username"
                          >
                            {copiedHandle === `venmo-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white" />
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
                            className="flex-1 py-3 px-4 rounded-xl bg-[#0070BA]/15 hover:bg-[#0070BA]/25 text-[#005ea6] dark:text-[#60a5fa] border border-[#0070BA]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip ${cleanPayPal} on PayPal`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#0070BA]/20 text-[#0070BA] group-hover:text-[var(--ps-primary,#0A84FF)]">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">PayPal</span>
                                <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-mono font-semibold">paypal.me/{cleanPayPal}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(cleanPayPal, `paypal-${p.name}`)}
                            className="p-3 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-muted,#9ca3af)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] transition-colors cursor-pointer group shadow-sm"
                            title="Copy PayPal username"
                          >
                            {copiedHandle === `paypal-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white" />
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
                            className="flex-1 py-3 px-4 rounded-xl bg-[#00D632]/15 hover:bg-[#00D632]/25 text-[#15803d] dark:text-[#4ade80] border border-[#00D632]/40 text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.99] cursor-pointer group"
                            title={`Tip $${cleanCashApp} on Cash App`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-[#00D632]/20 text-[#00D632] group-hover:text-white">
                                <DollarSign className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="block font-bold">Cash App</span>
                                <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] font-mono font-semibold">${cleanCashApp}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(`$${cleanCashApp}`, `cashapp-${p.name}`)}
                            className="p-3 rounded-xl bg-[var(--ps-card-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-muted,#9ca3af)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] transition-colors cursor-pointer group shadow-sm"
                            title="Copy Cash App $cashtag"
                          >
                            {copiedHandle === `cashapp-${p.name}` ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--ps-text-muted,#9ca3af)] group-hover:text-white" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 rounded-xl bg-[var(--ps-card-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] text-xs text-[var(--ps-text-muted,#9ca3af)] text-center font-medium">
                      No payment links configured for this photographer yet.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--ps-card-border,#2C2C2E)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[var(--ps-text-muted,#9ca3af)] flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Opens official payment provider directly to photographer</span>
          </div>

          <div className="flex items-center gap-2">
            {onBypass && (
              <button
                type="button"
                onClick={onBypass}
                className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold text-xs transition-colors cursor-pointer"
              >
                {bypassActionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:bg-[var(--ps-primary,#0A84FF)] text-[var(--ps-text-main,#ffffff)] hover:text-white border border-[var(--ps-card-border,#2C2C2E)] font-semibold text-xs transition-colors cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

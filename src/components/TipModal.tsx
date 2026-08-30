import React, { useState } from 'react';
import {
  Heart,
  ExternalLink,
  Copy,
  Check,
  X,
  Users,
  ShieldCheck,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { Photographer, CarPhoto } from '../types';

interface TipRecipient {
  photographer: Photographer;
  photoCount?: number;
  shareAmount?: number;
}

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  car?: CarPhoto | null;
  photographer?: Photographer | null;
  allPhotographers?: Photographer[]; // For batch multi-photographer split
  defaultAmount?: number;
  onTipCompleted?: (amount: number) => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  car,
  photographer,
  allPhotographers = [],
  defaultAmount = 0,
  onTipCompleted,
}) => {
  const [customAmountStr, setCustomAmountStr] = useState<string>(
    defaultAmount && defaultAmount > 0 ? String(defaultAmount) : ''
  );
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

  const parsedAmount = parseFloat(customAmountStr);
  const effectiveTotalAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const isSplit = uniqueAuthors.length > 1;
  const perAuthorAmount = isSplit && effectiveTotalAmount > 0
    ? effectiveTotalAmount / uniqueAuthors.length
    : effectiveTotalAmount;

  const recipients: TipRecipient[] = uniqueAuthors.map((p) => ({
    photographer: p,
    shareAmount: perAuthorAmount > 0 ? Number(perAuthorAmount.toFixed(2)) : undefined,
  }));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(id);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const getVenmoUrl = (handle: string, amount: number | undefined, authorName: string) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    const note = `Automotive photo tip for [${car?.carName || car?.make || 'Vehicle'}]`;
    const amountParam = amount && amount > 0 ? `&amount=${amount.toFixed(2)}` : '';
    return `https://venmo.com/${encodeURIComponent(cleanHandle)}?txn=pay&note=${encodeURIComponent(note)}${amountParam}`;
  };

  const getPayPalUrl = (handle: string, amount: number | undefined) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    const formattedAmount = amount && amount > 0 ? `/${amount.toFixed(2)}` : '';
    return `https://www.paypal.com/paypalme/${encodeURIComponent(cleanHandle)}${formattedAmount}`;
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
                  Direct to Account
                </span>
              </div>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-0.5">
                {car
                  ? `Tip photographer for photos of ${car.carName}`
                  : 'Send a custom tip directly via Venmo or PayPal'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Custom Tip Amount Input */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Optional Custom Tip Amount ($)
              </label>
              <span className="text-[11px] text-gray-400">
                Leave blank to enter amount in app
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Enter custom tip (e.g. 5, 15, 25)"
                value={customAmountStr}
                onChange={(e) => setCustomAmountStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
              />
            </div>

            {effectiveTotalAmount > 0 && isSplit && (
              <p className="text-[11px] text-blue-300">
                Total ${effectiveTotalAmount.toFixed(2)} will be split evenly across {uniqueAuthors.length} photographers (${perAuthorAmount.toFixed(2)} each).
              </p>
            )}
          </div>

          {/* Authors & Payment Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {isSplit ? 'Photographers' : 'Photographer Account'}
              </label>
              <span className="text-[11px] text-gray-400">
                Tap Venmo or PayPal to send tip
              </span>
            </div>

            {recipients.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 bg-white/5 rounded-2xl border border-white/10">
                No payment handles configured for this photographer yet.
              </div>
            ) : (
              recipients.map((rec, idx) => {
                const p = rec.photographer;
                const cleanVenmo = (p.venmoHandle || '').replace(/^@/, '').trim();
                const cleanPayPal = (p.payPalHandle || '').replace(/^@/, '').trim();
                const share = rec.shareAmount;

                return (
                  <div
                    key={p.name + idx}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-200 hover:border-white/20 space-y-3"
                  >
                    {/* Author Profile Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white/20 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm truncate">
                              {p.name}
                            </h4>
                            {p.instagram && (
                              <span className="text-[11px] text-gray-400 font-mono">
                                {p.instagram}
                              </span>
                            )}
                          </div>
                          {p.bio ? (
                            <p className="text-xs text-gray-400 line-clamp-1">{p.bio}</p>
                          ) : p.title ? (
                            <p className="text-xs text-gray-400 line-clamp-1">{p.title}</p>
                          ) : null}
                        </div>
                      </div>

                      {share !== undefined && share > 0 && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-gray-400 block">Amount</span>
                          <span className="text-base font-extrabold text-emerald-400 font-mono">
                            ${share.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Payment Buttons (Venmo & PayPal) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Venmo Button */}
                      {cleanVenmo ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getVenmoUrl(cleanVenmo, share, p.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onTipCompleted && share) onTipCompleted(share);
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-[#008CFF]/20 hover:bg-[#008CFF]/30 text-[#008CFF] hover:text-white border border-[#008CFF]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            title={`Tip @${cleanVenmo} on Venmo`}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Tip with Venmo</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(`@${cleanVenmo}`, `venmo-${p.name}`)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                            title="Copy Venmo username"
                          >
                            {copiedHandle === `venmo-${p.name}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-500 text-center">
                          No Venmo handle
                        </div>
                      )}

                      {/* PayPal Button */}
                      {cleanPayPal ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getPayPalUrl(cleanPayPal, share)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (onTipCompleted && share) onTipCompleted(share);
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0070BA]/20 hover:bg-[#0070BA]/30 text-[#40A9FF] hover:text-white border border-[#0070BA]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            title={`Tip ${cleanPayPal} on PayPal`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Tip with PayPal</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(cleanPayPal, `paypal-${p.name}`)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                            title="Copy PayPal handle"
                          >
                            {copiedHandle === `paypal-${p.name}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-500 text-center">
                          No PayPal handle
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Opens official PayPal or Venmo directly to photographer</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
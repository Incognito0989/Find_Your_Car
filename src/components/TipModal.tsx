import React, { useState } from 'react';
import {
  Heart,
  DollarSign,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  X,
  Users,
  ShieldCheck,
  QrCode,
  Smartphone,
  CreditCard,
  Camera,
} from 'lucide-react';
import { Photographer, CarPhoto } from '../types';

interface TipRecipient {
  photographer: Photographer;
  photoCount?: number;
  shareAmount: number;
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
  defaultAmount = 10,
  onTipCompleted,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<'all' | 'venmo' | 'paypal'>('all');

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

  // Fallback default author if none configured
  if (uniqueAuthors.length === 0) {
    uniqueAuthors.push({
      name: 'Alex Rivera',
      title: 'Lead Automotive Photographer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      bio: 'Motorsport & track day specialist capturing high-velocity supercars.',
      venmoHandle: 'alex-rivera-photo',
      payPalHandle: 'alexriveraphoto',
    });
  }

  const effectiveTotalAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;
  const isSplit = uniqueAuthors.length > 1;
  const perAuthorAmount = isSplit && effectiveTotalAmount > 0
    ? (effectiveTotalAmount / uniqueAuthors.length)
    : effectiveTotalAmount;

  const recipients: TipRecipient[] = uniqueAuthors.map((p) => ({
    photographer: p,
    shareAmount: Number(perAuthorAmount.toFixed(2)),
  }));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(id);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const getVenmoUrl = (handle: string, amount: number, authorName: string) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    const plate = car?.plateNumber || 'Car';
    const note = `PlateSnap tip for [${plate}] automotive photos by ${authorName}`;
    const amountParam = amount > 0 ? `&amount=${amount.toFixed(2)}` : '';
    return `https://venmo.com/${encodeURIComponent(cleanHandle)}?txn=pay&note=${encodeURIComponent(note)}${amountParam}`;
  };

  const getPayPalUrl = (handle: string, amount: number) => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    const formattedAmount = amount > 0 ? `/${amount.toFixed(2)}` : '';
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
              <Heart className="w-6 h-6 fill-amber-400 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[var(--ps-text-main,#ffffff)] tracking-tight">
                  Support the Photographers
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  100% Direct
                </span>
              </div>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-0.5">
                {car
                  ? `Tipping for photos of [${car.plateNumber}] • ${car.carName}`
                  : 'Send a tip directly via Venmo or PayPal without platform cuts'}
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
          {/* Tip Amount Selector */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2.5">
              Select Tip Amount
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[5, 10, 20].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setIsCustom(false);
                  }}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    !isCustom && selectedAmount === amt
                      ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-lg shadow-[var(--ps-primary,#0A84FF)]/30 border border-white/20 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                  }`}
                >
                  <span>${amt}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {amt === 5 ? 'Coffee' : amt === 10 ? 'Standard' : 'Hero Tip'}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isCustom
                    ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-lg shadow-[var(--ps-primary,#0A84FF)]/30 border border-white/20 scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                <span>Custom</span>
                <span className="text-[10px] font-normal opacity-80">Any $</span>
              </button>
            </div>

            {isCustom && (
              <div className="mt-3 relative flex items-center">
                <span className="absolute left-4 text-gray-400 font-bold text-base">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter custom tip amount (e.g. 15)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  autoFocus
                  className="w-full bg-white/5 border border-[var(--ps-primary,#0A84FF)] rounded-xl py-2.5 pl-8 pr-4 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-[var(--ps-primary,#0A84FF)]"
                />
              </div>
            )}
          </div>

          {/* Split Notice Banner */}
          {isSplit && (
            <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-blue-200 block">
                  Automatic Multi-Author Split Active
                </span>
                <span className="text-blue-300/80">
                  Your ${effectiveTotalAmount.toFixed(2)} tip is divided evenly between{' '}
                  <strong className="text-white">{uniqueAuthors.length} photographers</strong> ($
                  {perAuthorAmount.toFixed(2)} each).
                </span>
              </div>
            </div>
          )}

          {/* Authors & Payment Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {isSplit ? 'Photographer Split Breakdown' : 'Author Payment Direct'}
              </label>
              <span className="text-[11px] text-gray-400">
                Click to open PayPal or Venmo
              </span>
            </div>

            {recipients.map((rec, idx) => {
              const p = rec.photographer;
              const cleanVenmo = (p.venmoHandle || '').replace(/^@/, '').trim() || 'alex-rivera-photo';
              const cleanPayPal = (p.payPalHandle || '').replace(/^@/, '').trim() || 'alexriveraphoto';
              const share = rec.shareAmount;

              return (
                <div
                  key={p.name + idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-200 hover:border-white/20 space-y-3"
                >
                  {/* Author Profile Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                        alt={p.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-white/20 shrink-0"
                      />
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
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {p.bio || p.title || 'Automotive Photographer'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-400 block">Share</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        ${share.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Buttons (Venmo & PayPal) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Venmo Button */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getVenmoUrl(cleanVenmo, share, p.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (onTipCompleted) onTipCompleted(share);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#008CFF]/20 hover:bg-[#008CFF]/30 text-[#008CFF] hover:text-white border border-[#008CFF]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        title={`Pay $${share.toFixed(2)} to @${cleanVenmo} on Venmo`}
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

                    {/* PayPal Button */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getPayPalUrl(cleanPayPal, share)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (onTipCompleted) onTipCompleted(share);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#0070BA]/20 hover:bg-[#0070BA]/30 text-[#40A9FF] hover:text-white border border-[#0070BA]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        title={`Pay $${share.toFixed(2)} to ${cleanPayPal} on PayPal`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Tip with PayPal</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(cleanPayPal, `paypal-${p.name}`)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                        title="Copy PayPal.me handle"
                      >
                        {copiedHandle === `paypal-${p.name}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Opens official PayPal.me or Venmo in a secure window</span>
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

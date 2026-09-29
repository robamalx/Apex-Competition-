import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { Advertisement, AdPlacement } from '../types.js';
import { HomepageHeroCarousel } from './HomepageHeroCarousel.js';

interface AdPlacementBannerProps {
  placement: AdPlacement;
  className?: string;
  fallback?: React.ReactNode;
  onAdLoaded?: (ad: Advertisement | null) => void;
}

export const AdPlacementBanner: React.FC<AdPlacementBannerProps> = ({
  placement,
  className = '',
  fallback = null,
  onAdLoaded
}) => {
  if (placement === 'HOMEPAGE_HERO') {
    return (
      <HomepageHeroCarousel
        className={className}
        onAdLoaded={(ads) => onAdLoaded && onAdLoaded(ads[0] || null)}
      />
    );
  }

  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const bannerRef = useRef<HTMLDivElement>(null);
  const impressionRecordedRef = useRef<boolean>(false);

  // Client fingerprint helper for deduplication
  const getFingerprint = () => {
    try {
      let fp = localStorage.getItem('apex_ad_fingerprint');
      if (!fp) {
        fp = 'fp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
        localStorage.setItem('apex_ad_fingerprint', fp);
      }
      return fp;
    } catch {
      return 'fp_fallback_' + Date.now();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAd = async () => {
      try {
        const fp = getFingerprint();
        const res = await fetch(`/api/ads/delivery?placement=${encodeURIComponent(placement)}&sessionId=${encodeURIComponent(fp)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setAd(data.ad || null);
            if (onAdLoaded) onAdLoaded(data.ad || null);
          }
        }
      } catch (err) {
        // Handle fetch errors gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAd();

    return () => {
      isMounted = false;
    };
  }, [placement]);

  // Track impression once when rendered
  useEffect(() => {
    if (!ad || impressionRecordedRef.current) return;
    impressionRecordedRef.current = true;

    const recordImpression = async () => {
      try {
        const fp = getFingerprint();
        await fetch(`/api/ads/${ad.id}/impression`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placement, fingerprint: fp })
        });
      } catch (e) {
        // Silently fail telemetry
      }
    };

    recordImpression();
  }, [ad, placement]);

  const handleClick = async () => {
    if (!ad) return;

    try {
      const fp = getFingerprint();
      // Asynchronously track click without blocking navigation
      fetch(`/api/ads/${ad.id}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: fp })
      }).catch(() => {});
    } catch {
      // ignore
    }

    const targetUrl = ad.destinationUrl || ad.targetUrl || '/competitions';
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  };

  if (loading) {
    return null;
  }

  if (!ad) {
    return <>{fallback}</>;
  }

  const isExternal = ad.adClass === 'EXTERNAL_COMPANY';
  const ctaText = ad.ctaText || 'Learn More';
  const desktopImage = ad.imageUrl || ad.desktopAssetUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';
  const mobileImage = ad.tabletMobileImageUrl || desktopImage;

  // Custom styling per placement type
  const isStore = placement === 'STORE_BANNER';

  return (
    <div
      ref={bannerRef}
      id={`ad_placement_${placement.toLowerCase()}`}
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-2xl ${
        isExternal
          ? 'border-indigo-500/40 bg-slate-900/95 hover:border-indigo-400'
          : 'border-emerald-500/30 bg-slate-900/95 hover:border-emerald-400'
      } ${className}`}
    >
      {/* Responsive Background Asset */}
      <picture className="absolute inset-0 w-full h-full">
        <source media="(max-width: 640px)" srcSet={mobileImage} />
        <img
          src={desktopImage}
          alt={ad.title}
          className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </picture>

      {/* Dark gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />

      <div className={`relative z-10 flex flex-col justify-between ${isStore ? 'p-5 sm:p-6 min-h-[140px]' : 'p-4 sm:p-5 min-h-[120px]'}`}>
        <div>
          {/* Sponsor / Brand Indicator Badge */}
          <div className="flex items-center gap-2 mb-2">
            {isExternal ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Sponsored • {ad.companyName || 'Partner'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Official Apex Arena Promotion
              </span>
            )}
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              AD
            </span>
          </div>

          {/* Headline */}
          <h3 className="font-black text-white uppercase tracking-tight leading-tight group-hover:text-emerald-300 transition-colors text-base sm:text-xl max-w-xl">
            {ad.title}
          </h3>

          {/* Description */}
          {ad.description && (
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 line-clamp-2 max-w-lg leading-relaxed">
              {ad.description}
            </p>
          )}
        </div>

        {/* CTA Button and Link Indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-colors">
            <span>{ctaText}</span>
            {isExternal ? (
              <ExternalLink className="w-3.5 h-3.5" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            )}
          </div>

          {isExternal && ad.companyName && (
            <span className="text-[11px] text-slate-400 hidden sm:inline-block">
              Visit {ad.companyName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

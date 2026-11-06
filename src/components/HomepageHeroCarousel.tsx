import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Trophy
} from 'lucide-react';
import { Advertisement } from '../types.js';

interface HomepageHeroCarouselProps {
  className?: string;
  intervalMs?: number; // Configurable rotation interval, default 6000ms
  onAdLoaded?: (ads: Advertisement[]) => void;
  onSelectCompetition?: (id: string) => void;
}

export const HomepageHeroCarousel: React.FC<HomepageHeroCarouselProps> = ({
  className = '',
  intervalMs = 6000,
  onAdLoaded,
  onSelectCompetition
}) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Set of ad IDs whose impressions have been recorded during this session
  const recordedImpressionsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Client fingerprint helper for analytics deduplication
  const getFingerprint = useCallback(() => {
    try {
      let fp = localStorage.getItem('apex_ad_fingerprint');
      if (!fp) {
        fp = 'fp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
        localStorage.setItem('apex_ad_fingerprint', fp);
      }
      return fp;
    } catch {
      return 'fp_hero_' + Date.now();
    }
  }, []);

  // Fetch up to 5 eligible active ads for the homepage hero placement
  useEffect(() => {
    let isMounted = true;

    const fetchHeroAds = async () => {
      try {
        const fp = getFingerprint();
        const res = await fetch(`/api/ads/rotation?placement=HOMEPAGE_HERO&max=5&sessionId=${encodeURIComponent(fp)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const loadedAds: Advertisement[] = (data.ads || []).slice(0, 5); // strict maximum 5
            setAds(loadedAds);
            if (onAdLoaded) onAdLoaded(loadedAds);
          }
        } else {
          // Fallback to delivery endpoint
          const resFallback = await fetch(`/api/ads/delivery?placement=HOMEPAGE_HERO&sessionId=${encodeURIComponent(fp)}`);
          if (resFallback.ok) {
            const data = await resFallback.json();
            if (isMounted) {
              const list: Advertisement[] = (data.ads || (data.ad ? [data.ad] : [])).slice(0, 5);
              setAds(list);
              if (onAdLoaded) onAdLoaded(list);
            }
          }
        }
      } catch (err) {
        // Handle fetch errors gracefully and show default fallback banner
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHeroAds();

    return () => {
      isMounted = false;
    };
  }, [getFingerprint, onAdLoaded]);

  // Track impression strictly for the ad currently displayed
  useEffect(() => {
    if (ads.length === 0) return;
    const currentAd = ads[currentIndex];
    if (!currentAd) return;

    if (!recordedImpressionsRef.current.has(currentAd.id)) {
      recordedImpressionsRef.current.add(currentAd.id);

      const fp = getFingerprint();
      fetch(`/api/ads/${currentAd.id}/impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement: 'HOMEPAGE_HERO', fingerprint: fp })
      }).catch(() => {});
    }
  }, [currentIndex, ads, getFingerprint]);

  // Next slide handler
  const handleNext = useCallback(() => {
    if (ads.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % ads.length);
  }, [ads.length]);

  // Previous slide handler
  const handlePrev = useCallback(() => {
    if (ads.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + ads.length) % ads.length);
  }, [ads.length]);

  // Automatic carousel timer with pause-on-hover
  useEffect(() => {
    if (ads.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length, isPaused, intervalMs, handleNext]);

  // Mobile Touch Swipe Handling
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    // Minimum swipe threshold of 40px
    if (diffX > 40) {
      handleNext();
    } else if (diffX < -40) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  // Click & Analytics Handling
  const handleAdClick = (ad: Advertisement) => {
    try {
      const fp = getFingerprint();
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
    } else if (targetUrl.startsWith('/competition/')) {
      const compId = targetUrl.replace('/competition/', '');
      if (onSelectCompetition) {
        onSelectCompetition(compId);
      } else {
        window.location.href = targetUrl;
      }
    } else {
      window.location.href = targetUrl;
    }
  };

  if (loading) {
    return (
      <div className={`w-full h-44 sm:h-60 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Loading Apex Arena Spotlight...</span>
        </div>
      </div>
    );
  }

  // Fallback / Empty state when 0 active ads exist (Requirement 4)
  if (ads.length === 0) {
    return (
      <div
        id="homepage_hero_ad_fallback"
        className={`relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl ${className}`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Trophy className="w-3 h-3 text-emerald-400" />
              Apex Arena Partner Spotlight
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Ethiopia&apos;s Premier Football Prediction & Competition Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Compete in official Premier League, Champions League, and Ethiopian Premier League matchday predictions. Zero commission on prize pool wins.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="hero_fallback_explore_btn"
              onClick={() => onSelectCompetition ? onSelectCompetition('comp_pl_w28') : window.location.href = '#competitions'}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-colors shadow-lg flex items-center gap-2"
            >
              <span>Explore Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    );
  }

  const activeAd = ads[currentIndex] || ads[0];
  const isExternal = activeAd.adClass === 'EXTERNAL_COMPANY';
  const ctaText = activeAd.ctaText || 'Learn More';
  const desktopImage = activeAd.bannerUrl || activeAd.imageUrl || activeAd.desktopAssetUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';
  const mobileImage = activeAd.tabletMobileImageUrl || desktopImage;

  return (
    <div
      id="homepage_hero_carousel_container"
      className={`relative w-full max-w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
        isExternal
          ? 'border-indigo-500/40 bg-slate-950 shadow-indigo-950/20'
          : 'border-emerald-500/30 bg-slate-950 shadow-emerald-950/20'
      } shadow-2xl ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Homepage Hero Rotating Banner"
    >
      {/* Clickable Banner Area */}
      <div
        id={`hero_ad_slide_${activeAd.id}`}
        onClick={() => handleAdClick(activeAd)}
        className="group relative w-full cursor-pointer min-h-[190px] sm:min-h-[240px] flex flex-col justify-between overflow-hidden"
      >
        {/* Background Digital Banner Artwork (Advertiser-supplied artwork) */}
        <picture className="absolute inset-0 w-full h-full">
          <source media="(max-width: 640px)" srcSet={mobileImage} />
          <img
            src={desktopImage}
            alt={activeAd.title}
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </picture>

        {/* Readability Gradient Layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />

        {/* Foreground Content */}
        <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between h-full">
          <div className="space-y-2">
            {/* Header badges: Ad Classification & Spot Indicator */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {isExternal ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    Sponsored • {activeAd.companyName || 'Verified Partner'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Official Apex Arena Promotion
                  </span>
                )}

                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                  AD
                </span>
              </div>

              {/* Status pill: Ad N of Total */}
              {ads.length > 1 && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                  {isPaused ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                  <span>{currentIndex + 1} / {ads.length}</span>
                </div>
              )}
            </div>

            {/* Campaign Title */}
            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight group-hover:text-emerald-300 transition-colors max-w-2xl">
              {activeAd.title}
            </h2>

            {/* Campaign Description */}
            {activeAd.description && (
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl leading-relaxed">
                {activeAd.description}
              </p>
            )}
          </div>

          {/* Bottom Action Row */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all">
              <span>{ctaText}</span>
              {isExternal ? (
                <ExternalLink className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              )}
            </div>

            {isExternal && activeAd.companyName && (
              <span className="text-[11px] text-slate-400 hidden sm:inline-block font-medium">
                Visit {activeAd.companyName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Manual Navigation Controls (if more than 1 ad) */}
      {ads.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            id="hero_carousel_prev_btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous advertisement"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700/80 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Button */}
          <button
            id="hero_carousel_next_btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next advertisement"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700/80 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Carousel Indicators / Dot Navigation */}
          <div
            id="hero_carousel_indicators"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-800/80"
          >
            {ads.map((ad, idx) => (
              <button
                key={ad.id}
                id={`hero_indicator_${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-5 h-2 bg-emerald-400'
                    : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

import {
  AdClass,
  AdPlacement,
  LegacyAdPosition,
  AdPackageId,
  AdPackageConfig,
  AdCompany,
  AdCompanyStatus,
  CampaignStatus,
  AdPaymentStatus,
  AdCreative,
  AdPayment,
  AdCampaign,
  Advertisement,
  PlacementSpec,
  CreativeValidationResult,
  AuditLog,
  User
} from '../types.js';
import { db } from './db.js';

// ============================================================================
// 1. CONFIGURABLE ADVERTISING PACKAGES & PRICING
// ============================================================================

export const DEFAULT_AD_PACKAGES: AdPackageConfig[] = [
  {
    id: 'STARTER',
    name: 'Starter Promotional Package',
    durationDays: 7,
    priceETB: 1500,
    priority: 20,
    allowedPlacements: ['HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER'],
    isExclusive: false,
    description: '7-day entry-level promotional placement across cards and banners.'
  },
  {
    id: 'STANDARD',
    name: 'Standard Commercial Package',
    durationDays: 14,
    priceETB: 3500,
    priority: 40,
    allowedPlacements: ['HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER'],
    isExclusive: false,
    description: '14-day expanded placement coverage with elevated priority.'
  },
  {
    id: 'PREMIUM',
    name: 'Premium Spotlight Package',
    durationDays: 30,
    priceETB: 7500,
    priority: 60,
    allowedPlacements: ['HOMEPAGE_HERO', 'HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER'],
    isExclusive: false,
    description: '30-day top-tier placement including Homepage Hero spotlight.'
  },
  {
    id: 'FOOTBALL_PARTNER',
    name: 'Official Football Partner',
    durationDays: 30,
    priceETB: 15000,
    priority: 80,
    allowedPlacements: ['HOMEPAGE_HERO', 'HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER'],
    isExclusive: false,
    description: '30-day multi-placement sports brand partnership with high rotation weight.'
  },
  {
    id: 'MAIN_SPONSOR',
    name: 'Apex Arena Main Sponsor',
    durationDays: 30,
    priceETB: 25000,
    priority: 100,
    allowedPlacements: ['HOMEPAGE_HERO', 'HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER'],
    isExclusive: true,
    maxActiveConcurrent: 1,
    description: '30-day exclusive headline sponsorship with guaranteed top priority.'
  }
];

// ============================================================================
// DIGITAL BANNER SPECIFICATIONS & PLACEMENT CONSTRAINTS
// ============================================================================
export const PLACEMENT_SPECS: Record<AdPlacement, PlacementSpec> = {
  HOMEPAGE_HERO: {
    placement: 'HOMEPAGE_HERO',
    name: 'Homepage Main Hero',
    requiredWidth: 1200,
    requiredHeight: 240,
    aspectRatio: 5.0,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Premier rotating billboard on Apex Arena home screen. Max 5 active ads in fair rotation.'
  },
  HOMEPAGE_PROMO: {
    placement: 'HOMEPAGE_PROMO',
    name: 'Homepage Promotion Banner',
    requiredWidth: 1200,
    requiredHeight: 160,
    aspectRatio: 7.5,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Mid-feed promotional strip across homepage game tiles.'
  },
  COMPETITION_BANNER: {
    placement: 'COMPETITION_BANNER',
    name: 'Competition Page Banner',
    requiredWidth: 1200,
    requiredHeight: 200,
    aspectRatio: 6.0,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Header billboard inside tournament and competition views.'
  },
  PREDICTION_BANNER: {
    placement: 'PREDICTION_BANNER',
    name: 'Prediction Page Banner',
    requiredWidth: 1200,
    requiredHeight: 200,
    aspectRatio: 6.0,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Targeted banner on active match prediction submission screen.'
  },
  STORE_BANNER: {
    placement: 'STORE_BANNER',
    name: 'Store Page Banner',
    requiredWidth: 1200,
    requiredHeight: 240,
    aspectRatio: 5.0,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'Billboard inside Apex Arena coin store & redemption catalog.'
  }
};

// ============================================================================
// CREATIVE VALIDATION: DIGITAL BANNER WORKFLOW
// ============================================================================
export function validateCreativeBanner(params: {
  placement: AdPlacement;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  fileSizeBytes?: number;
  fileType?: string;
  format?: string;
  bannerUrl?: string;
  destinationUrl?: string;
}): CreativeValidationResult {
  const spec = PLACEMENT_SPECS[params.placement] || PLACEMENT_SPECS.HOMEPAGE_HERO;
  const errors: string[] = [];

  const width = params.width ?? params.dimensions?.width;
  const height = params.height ?? params.dimensions?.height;
  const uploadedDimensions = (width && height) ? { width, height } : undefined;

  let aspectRatioMatch = true;
  let fileSizeValid = true;
  let formatValid = true;
  let safeUrlValid = true;
  let readabilityApproved = true;

  // 1. Validate pixel dimensions (Strict: do not automatically resize)
  if (uploadedDimensions) {
    if (uploadedDimensions.width !== spec.requiredWidth || uploadedDimensions.height !== spec.requiredHeight) {
      errors.push(
        `Creative dimensions (${uploadedDimensions.width}×${uploadedDimensions.height} px) do not match required dimensions (${spec.requiredWidth}×${spec.requiredHeight} px) for ${params.placement}. Automatic resizing is forbidden to preserve artwork fidelity. Please upload a finished banner with exact dimensions.`
      );
    }
    const uploadedRatio = Number((uploadedDimensions.width / uploadedDimensions.height).toFixed(2));
    const expectedRatio = Number(spec.aspectRatio.toFixed(2));
    if (Math.abs(uploadedRatio - expectedRatio) > 0.05) {
      aspectRatioMatch = false;
      if (!errors.some(e => e.includes('Creative dimensions'))) {
        errors.push(`Aspect ratio ${uploadedRatio}:1 does not match required ratio ${expectedRatio}:1.`);
      }
    }
  } else {
    errors.push(`Pixel dimensions are required for banner validation.`);
  }

  // 2. Validate maximum file size
  if (params.fileSizeBytes !== undefined) {
    if (params.fileSizeBytes > spec.maxFileSizeBytes) {
      fileSizeValid = false;
      errors.push(
        `File size ${(params.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB exceeds maximum allowed size ${(spec.maxFileSizeBytes / (1024 * 1024))} MB.`
      );
    }
  }

  // 3. Validate file format / type
  const format = params.fileType || params.format;
  if (format) {
    const normalized = format.toLowerCase();
    const isAllowed = spec.allowedFormats.some(f => normalized.includes(f.replace('image/', '')) || normalized === f);
    if (!isAllowed) {
      formatValid = false;
      errors.push(`File type "${format}" is not supported. Allowed formats: JPEG, PNG, WebP.`);
    }
  }

  // 4. Validate banner image readability / file presence
  if (params.bannerUrl !== undefined) {
    if (!params.bannerUrl || params.bannerUrl.trim().length === 0) {
      readabilityApproved = false;
      errors.push('Banner image file or URL is required and cannot be empty.');
    }
  }

  // 5. Safe URL validation if destination URL exists
  if (params.destinationUrl) {
    try {
      sanitizeAdUrl(params.destinationUrl);
    } catch (err: any) {
      safeUrlValid = false;
      errors.push(`Invalid or unsafe destination URL: ${err.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requiredDimensions: { width: spec.requiredWidth, height: spec.requiredHeight },
    uploadedDimensions,
    aspectRatioMatch,
    fileSizeValid,
    formatValid,
    safeUrlValid,
    readabilityApproved
  };
}

// Map legacy positions to official placements
export function mapLegacyPositionToPlacement(pos?: string): AdPlacement {
  if (!pos) return 'HOMEPAGE_HERO';
  switch (pos) {
    case 'HOMEPAGE_TOP':
    case 'HOMEPAGE_HERO':
      return 'HOMEPAGE_HERO';
    case 'COMPETITION_SIDEBAR':
    case 'COMPETITION_BANNER':
      return 'COMPETITION_BANNER';
    case 'STORE_BANNER':
      return 'STORE_BANNER';
    case 'PREDICTION_BANNER':
      return 'PREDICTION_BANNER';
    case 'SPONSORED_CARD':
    case 'HOMEPAGE_PROMO':
    default:
      return 'HOMEPAGE_PROMO';
  }
}

// URL Sanitization: blocks javascript:, data:text/html, <script>, and malformed protocols
export function sanitizeAdUrl(rawUrl?: string): { safeUrl: string; isExternal: boolean } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safeUrl: '/competitions', isExternal: false };
  }
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  // Explicitly disallow malicious / script injection schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.includes('<script') ||
    lower.includes('%3cscript')
  ) {
    throw new Error('Unsafe destination URL protocol or script injection detected.');
  }

  // Internal route check
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return { safeUrl: trimmed, isExternal: false };
  }

  // External URL must be http: or https:
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return { safeUrl: trimmed, isExternal: true };
      }
    } catch (e) {
      throw new Error('Malformed destination URL format.');
    }
  }

  throw new Error('Destination URL must start with http://, https://, or an internal path (/).');
}

// XSS Sanitization for plain text strings
export function sanitizeAdText(rawText?: string, maxLength = 250): string {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/[<>"]/g, '')
    .trim()
    .slice(0, maxLength);
}

// ============================================================================
// 2. ADVERTISING SERVICE ENGINE
// ============================================================================

export class AdvertisingService {
  // In-memory impression deduplication cache: key -> timestamp (expires in 60s)
  private static impressionCache = new Map<string, number>();
  // In-memory click debounce cache: key -> timestamp (expires in 3s)
  private static clickCache = new Map<string, number>();

  // Cleanup old deduplication entries periodically
  private static pruneCache() {
    const now = Date.now();
    for (const [key, ts] of this.impressionCache.entries()) {
      if (now - ts > 60000) this.impressionCache.delete(key);
    }
    for (const [key, ts] of this.clickCache.entries()) {
      if (now - ts > 3000) this.clickCache.delete(key);
    }
  }

  // Audit logging helper ensuring required id
  private static logAudit(entry: Omit<AuditLog, 'id'>) {
    const audit: AuditLog = {
      id: `audit_ad_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...entry
    };
    db.createAuditLog(audit);
  }

  // --------------------------------------------------------------------------
  // PACKAGES
  // --------------------------------------------------------------------------
  public static getPackages(): AdPackageConfig[] {
    const dbPackages = (db.data as any).adPackages;
    if (Array.isArray(dbPackages) && dbPackages.length > 0) {
      return dbPackages;
    }
    return DEFAULT_AD_PACKAGES;
  }

  public static getPackageById(packageId: string): AdPackageConfig {
    const pkgs = this.getPackages();
    const found = pkgs.find(p => p.id === packageId);
    if (!found) {
      throw new Error(`Invalid advertising package ID: "${packageId}".`);
    }
    return found;
  }

  // Authoritative server-side price calculation (blocks client price tampering)
  public static calculateAuthoritativePrice(packageId: AdPackageId): {
    packageId: AdPackageId;
    packageName: string;
    durationDays: number;
    amountETB: number;
    currency: 'ETB';
  } {
    const pkg = this.getPackageById(packageId);
    return {
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      amountETB: pkg.priceETB,
      currency: 'ETB'
    };
  }

  // --------------------------------------------------------------------------
  // COMPANIES
  // --------------------------------------------------------------------------
  public static getCompanies(): AdCompany[] {
    const companies = (db.data as any).adCompanies;
    return Array.isArray(companies) ? companies : [];
  }

  public static getCompanyById(companyId: string): AdCompany | undefined {
    return this.getCompanies().find(c => c.companyId === companyId);
  }

  public static createCompany(
    data: {
      companyName: string;
      logoUrl?: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
    },
    actor: User
  ): AdCompany {
    if (!data.companyName || data.companyName.trim().length < 2) {
      throw new Error('Company name must be at least 2 characters.');
    }
    if (!data.contactEmail || !data.contactEmail.includes('@')) {
      throw new Error('Valid contact email is required.');
    }

    const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCompany: AdCompany = {
      companyId,
      companyName: sanitizeAdText(data.companyName, 80),
      logoUrl: data.logoUrl ? data.logoUrl.trim() : undefined,
      contactName: sanitizeAdText(data.contactName || 'Marketing Lead', 60),
      contactEmail: data.contactEmail.trim().toLowerCase(),
      contactPhone: data.contactPhone ? sanitizeAdText(data.contactPhone, 30) : undefined,
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (!(db.data as any).adCompanies) {
      (db.data as any).adCompanies = [];
    }
    (db.data as any).adCompanies.unshift(newCompany);
    db.save();

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'COMPANY_CREATED',
      target: companyId,
      resourceType: 'AD_COMPANY',
      resourceId: companyId,
      result: 'SUCCESS',
      details: `Registered external advertising partner company: "${newCompany.companyName}".`,
      timestamp: nowIso
    });

    return newCompany;
  }

  public static updateCompany(
    companyId: string,
    updates: Partial<Pick<AdCompany, 'companyName' | 'logoUrl' | 'contactName' | 'contactEmail' | 'contactPhone' | 'status'>>,
    actor: User
  ): AdCompany {
    const list = this.getCompanies();
    const idx = list.findIndex(c => c.companyId === companyId);
    if (idx === -1) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const current = list[idx];
    const nowIso = new Date().toISOString();

    const updated: AdCompany = {
      ...current,
      ...updates,
      companyName: updates.companyName ? sanitizeAdText(updates.companyName, 80) : current.companyName,
      contactName: updates.contactName ? sanitizeAdText(updates.contactName, 60) : current.contactName,
      contactEmail: updates.contactEmail ? updates.contactEmail.trim().toLowerCase() : current.contactEmail,
      contactPhone: updates.contactPhone !== undefined ? sanitizeAdText(updates.contactPhone, 30) : current.contactPhone,
      updatedAt: nowIso
    };

    list[idx] = updated;
    (db.data as any).adCompanies = list;
    db.save();

    const action = updates.status === 'SUSPENDED' ? 'COMPANY_SUSPENDED' : 'COMPANY_UPDATED';
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      target: companyId,
      resourceType: 'AD_COMPANY',
      resourceId: companyId,
      result: 'SUCCESS',
      details: `Updated company profile for "${updated.companyName}" (status: ${updated.status}).`,
      timestamp: nowIso
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // CREATIVES
  // --------------------------------------------------------------------------
  public static getCreatives(): AdCreative[] {
    const creatives = (db.data as any).adCreatives;
    return Array.isArray(creatives) ? creatives : [];
  }

  public static getCreativeById(creativeId: string): AdCreative | undefined {
    return this.getCreatives().find(c => c.creativeId === creativeId);
  }

  public static createCreative(
    data: {
      campaignId: string;
      desktopAssetUrl: string;
      tabletMobileAssetUrl?: string;
      title: string;
      headline?: string;
      description?: string;
      ctaText: string;
      altText?: string;
    },
    actor: User
  ): AdCreative {
    if (!data.desktopAssetUrl || !data.desktopAssetUrl.startsWith('http')) {
      throw new Error('Valid desktop creative image URL (http/https) is required.');
    }
    if (data.tabletMobileAssetUrl && !data.tabletMobileAssetUrl.startsWith('http')) {
      throw new Error('Tablet/Mobile creative image URL must use http/https.');
    }

    const creativeId = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCreative: AdCreative = {
      creativeId,
      campaignId: data.campaignId,
      desktopAssetUrl: data.desktopAssetUrl.trim(),
      tabletMobileAssetUrl: data.tabletMobileAssetUrl ? data.tabletMobileAssetUrl.trim() : undefined,
      title: sanitizeAdText(data.title, 100),
      headline: data.headline ? sanitizeAdText(data.headline, 120) : undefined,
      description: data.description ? sanitizeAdText(data.description, 250) : undefined,
      ctaText: sanitizeAdText(data.ctaText || 'Learn More', 40),
      altText: data.altText ? sanitizeAdText(data.altText, 100) : sanitizeAdText(data.title, 100),
      status: 'APPROVED',
      dimensions: { width: 1200, height: 630 },
      format: 'image/jpeg',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (!(db.data as any).adCreatives) {
      (db.data as any).adCreatives = [];
    }
    (db.data as any).adCreatives.unshift(newCreative);
    db.save();

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATIVE_UPLOADED',
      target: creativeId,
      resourceType: 'AD_CREATIVE',
      resourceId: creativeId,
      result: 'SUCCESS',
      details: `Created creative asset "${newCreative.title}" for campaign ${data.campaignId}.`,
      timestamp: nowIso
    });

    return newCreative;
  }

  // --------------------------------------------------------------------------
  // CONFLICT MANAGEMENT (Exclusive placement check)
  // --------------------------------------------------------------------------
  public static checkPlacementConflicts(
    packageId: AdPackageId,
    placements: AdPlacement[],
    startAt: string,
    endAt: string,
    excludeCampaignId?: string
  ): void {
    const pkg = this.getPackageById(packageId);
    if (!pkg.isExclusive) {
      return; // Non-exclusive packages allow multiple concurrent campaigns with rotation
    }

    const newStart = new Date(startAt).getTime();
    const newEnd = new Date(endAt).getTime();

    if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) {
      throw new Error('Invalid campaign start/end schedule dates.');
    }

    const allAds = db.getAds();
    // Check overlapping campaigns occupying any of the requested placements with exclusive flag
    for (const ad of allAds) {
      if (ad.id === excludeCampaignId || ad.campaignId === excludeCampaignId) continue;
      // Only active or scheduled campaigns can conflict
      const adStatus = ad.status || (ad.active ? 'ACTIVE' : 'DRAFT');
      if (adStatus !== 'ACTIVE' && adStatus !== 'SCHEDULED' && adStatus !== 'APPROVED') {
        continue;
      }
      if (ad.packageId !== 'MAIN_SPONSOR' && !(ad as any).isExclusive) {
        continue;
      }

      const existingStart = new Date(ad.startAt || ad.startDate).getTime();
      const existingEnd = new Date(ad.endAt || ad.endDate).getTime();

      // Check if date ranges overlap
      const overlaps = newStart <= existingEnd && newEnd >= existingStart;
      if (overlaps) {
        const adPlacements = ad.placements || [mapLegacyPositionToPlacement(ad.position)];
        const hasPlacementConflict = placements.some(p => adPlacements.includes(p));
        if (hasPlacementConflict) {
          const formattedStart = new Date(existingStart).toISOString().split('T')[0];
          const formattedEnd = new Date(existingEnd).toISOString().split('T')[0];
          throw new Error(
            `Main Sponsor placement is already reserved from ${formattedStart} to ${formattedEnd}.`
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // CAMPAIGN MANAGEMENT & LIFECYCLE
  // --------------------------------------------------------------------------

  // Sync / refresh authoritative statuses based on current timestamp
  public static refreshCampaignStatuses(now = Date.now()): void {
    const ads = db.getAds();
    let updated = false;

    for (const ad of ads) {
      const startMs = new Date(ad.startAt || ad.startDate).getTime();
      const endMs = new Date(ad.endAt || ad.endDate).getTime();

      // If expired
      if (now > endMs && ad.status !== 'EXPIRED' && ad.status !== 'CANCELLED') {
        ad.status = 'EXPIRED';
        ad.active = false;
        updated = true;
      }
      // If scheduled and start time has arrived
      else if (ad.status === 'SCHEDULED' && now >= startMs && now <= endMs) {
        // Only external ads with verified payment or APEX_ARENA ads can become active
        const isEligible = ad.adClass === 'APEX_ARENA' || ad.paymentStatus === 'VERIFIED';
        if (isEligible) {
          ad.status = 'ACTIVE';
          ad.active = true;
          updated = true;
        }
      }
      // If active but end time passed
      else if (ad.status === 'ACTIVE' && (now < startMs || now > endMs)) {
        if (now > endMs) {
          ad.status = 'EXPIRED';
          ad.active = false;
        } else if (now < startMs) {
          ad.status = 'SCHEDULED';
          ad.active = false;
        }
        updated = true;
      }
    }

    if (updated) {
      db.save();
    }
  }

  public static getCampaigns(): Advertisement[] {
    this.refreshCampaignStatuses();
    return db.getAds();
  }

  public static getCampaignById(id: string): Advertisement | undefined {
    this.refreshCampaignStatuses();
    return db.getAds().find(a => a.id === id || a.campaignId === id);
  }

  // Create Campaign
  public static createCampaign(
    params: {
      adClass: AdClass;
      companyId?: string;
      campaignName: string;
      description?: string;
      packageId: AdPackageId;
      placements?: AdPlacement[];
      primaryPlacement?: AdPlacement;
      desktopAssetUrl: string;
      tabletMobileAssetUrl?: string;
      ctaText?: string;
      destinationUrl: string;
      startAt?: string;
      endAt?: string;
      initialStatus?: 'DRAFT' | 'SUBMITTED';
    },
    actor: User
  ): Advertisement {
    // 1. Classification Validation
    if (!params.adClass || !['APEX_ARENA', 'EXTERNAL_COMPANY'].includes(params.adClass)) {
      throw new Error('Authoritative adClass must be either "APEX_ARENA" or "EXTERNAL_COMPANY".');
    }

    // 2. Company Association for EXTERNAL_COMPANY
    let companyName = 'APEX ARENA';
    if (params.adClass === 'EXTERNAL_COMPANY') {
      if (!params.companyId) {
        throw new Error('External company advertisement requires an associated companyId.');
      }
      const comp = this.getCompanyById(params.companyId);
      if (!comp) {
        throw new Error(`Associated external company not found: ${params.companyId}`);
      }
      if (comp.status !== 'ACTIVE') {
        throw new Error(`External company is ${comp.status}. Cannot launch campaigns for inactive companies.`);
      }
      companyName = comp.companyName;
    }

    // 3. Package and Authoritative Pricing
    const pkg = this.getPackageById(params.packageId);
    const authoritativePricing = this.calculateAuthoritativePrice(pkg.id);

    // 4. Placement Validation against package rules
    const requestedPlacements: AdPlacement[] = 
      params.placements && params.placements.length > 0
        ? params.placements
        : [params.primaryPlacement || pkg.allowedPlacements[0]];

    for (const p of requestedPlacements) {
      if (!pkg.allowedPlacements.includes(p)) {
        throw new Error(
          `Placement "${p}" is not permitted under the "${pkg.name}" package. Allowed: ${pkg.allowedPlacements.join(', ')}`
        );
      }
    }

    const primaryPlacement = requestedPlacements[0];

    // 5. URL & Content Sanitization
    const { safeUrl, isExternal } = sanitizeAdUrl(params.destinationUrl);
    const sanitizedTitle = sanitizeAdText(params.campaignName, 100);
    const sanitizedDesc = sanitizeAdText(params.description || '', 250);
    const sanitizedCta = sanitizeAdText(params.ctaText || 'Learn More', 35);

    // 6. Schedule Calculation
    const now = Date.now();
    const startMs = params.startAt ? new Date(params.startAt).getTime() : now;
    const endMs = params.endAt
      ? new Date(params.endAt).getTime()
      : startMs + pkg.durationDays * 86400000;

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      throw new Error('Invalid campaign start/end schedule dates.');
    }

    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();

    // 7. Check exclusive placement conflicts
    this.checkPlacementConflicts(pkg.id, requestedPlacements, startIso, endIso);

    // 8. Determine initial lifecycle & payment state
    const campaignId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    let initialStatus: CampaignStatus = 'DRAFT';
    if (params.initialStatus === 'SUBMITTED') {
      initialStatus = 'UNDER_REVIEW';
    }

    const paymentStatus: AdPaymentStatus = params.adClass === 'APEX_ARENA' ? 'EXEMPT' : 'PENDING';

    // 9. Creative Asset Creation
    const creative = this.createCreative(
      {
        campaignId,
        desktopAssetUrl: params.desktopAssetUrl,
        tabletMobileAssetUrl: params.tabletMobileAssetUrl,
        title: sanitizedTitle,
        headline: sanitizedTitle,
        description: sanitizedDesc,
        ctaText: sanitizedCta
      },
      actor
    );

    const newAd: Advertisement = {
      id: campaignId,
      campaignId,
      title: sanitizedTitle,
      campaignName: sanitizedTitle,
      description: sanitizedDesc,
      adClass: params.adClass,
      companyId: params.companyId,
      companyName,
      packageId: pkg.id,
      placements: requestedPlacements,
      primaryPlacement,
      position: primaryPlacement,
      imageUrl: creative.desktopAssetUrl,
      tabletMobileImageUrl: creative.tabletMobileAssetUrl,
      creativeId: creative.creativeId,
      creative,
      ctaText: sanitizedCta,
      destinationUrl: safeUrl,
      targetUrl: safeUrl,
      destinationType: isExternal ? 'EXTERNAL' : 'INTERNAL',
      startAt: startIso,
      startDate: startIso,
      endAt: endIso,
      endDate: endIso,
      priority: pkg.priority,
      status: initialStatus,
      active: false, // Never active at creation; requires approval & verified payment
      paymentStatus,
      pricing: authoritativePricing,
      analytics: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        dailyImpressions: {},
        dailyClicks: {}
      },
      impressions: 0,
      clicks: 0,
      createdBy: actor.id,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    db.createAd(newAd);

    // If external company, create pending payment record
    if (params.adClass === 'EXTERNAL_COMPANY' && params.companyId) {
      this.createPaymentRecord({
        campaignId,
        campaignName: newAd.campaignName!,
        companyId: params.companyId,
        companyName,
        packageId: pkg.id,
        amountETB: authoritativePricing.amountETB
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_CREATED',
      target: campaignId,
      resourceType: 'AD_CAMPAIGN',
      resourceId: campaignId,
      result: 'SUCCESS',
      details: `Created ${params.adClass} campaign "${sanitizedTitle}" under package ${pkg.id} (${authoritativePricing.amountETB} ETB).`,
      timestamp: nowIso
    });

    return newAd;
  }

  // Submit Campaign for Review
  public static submitCampaign(campaignId: string, actor: User): Advertisement {
    const ad = this.getCampaignById(campaignId);
    if (!ad) throw new Error(`Campaign not found: ${campaignId}`);

    if (ad.status !== 'DRAFT' && ad.status !== 'CHANGES_REQUESTED') {
      throw new Error(`Cannot submit campaign in status "${ad.status}".`);
    }

    const nowIso = new Date().toISOString();
    const updated = db.updateAd(ad.id, {
      status: 'UNDER_REVIEW',
      updatedAt: nowIso
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_SUBMITTED',
      target: ad.id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: ad.id,
      result: 'SUCCESS',
      details: `Submitted campaign "${ad.title}" for editorial review.`,
      timestamp: nowIso
    });

    return updated!;
  }

  // Review Campaign: APPROVE, REQUEST_CHANGES, REJECT
  public static reviewCampaign(
    campaignId: string,
    reviewAction: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT',
    notes: string,
    actor: User
  ): Advertisement {
    const ad = this.getCampaignById(campaignId);
    if (!ad) throw new Error(`Campaign not found: ${campaignId}`);

    const now = Date.now();
    const nowIso = new Date().toISOString();

    if (reviewAction === 'REQUEST_CHANGES') {
      const updated = db.updateAd(ad.id, {
        status: 'CHANGES_REQUESTED',
        changeRequestNotes: sanitizeAdText(notes, 300),
        updatedAt: nowIso
      });
      this.logAudit({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'CAMPAIGN_CHANGES_REQUESTED',
        target: ad.id,
        resourceType: 'AD_CAMPAIGN',
        resourceId: ad.id,
        result: 'SUCCESS',
        details: `Requested editorial changes for "${ad.title}": ${notes}`,
        timestamp: nowIso
      });
      return updated!;
    }

    if (reviewAction === 'REJECT') {
      const updated = db.updateAd(ad.id, {
        status: 'REJECTED',
        rejectionReason: sanitizeAdText(notes, 300),
        active: false,
        updatedAt: nowIso
      });
      this.logAudit({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'CAMPAIGN_REJECTED',
        target: ad.id,
        resourceType: 'AD_CAMPAIGN',
        resourceId: ad.id,
        result: 'SUCCESS',
        details: `Rejected campaign "${ad.title}": ${notes}`,
        timestamp: nowIso
      });
      return updated!;
    }

    // APPROVE action
    // Check conflicts again at approval time
    this.checkPlacementConflicts(
      ad.packageId || 'STANDARD',
      ad.placements || [mapLegacyPositionToPlacement(ad.position)],
      ad.startAt || ad.startDate,
      ad.endAt || ad.endDate,
      ad.id
    );

    const startMs = new Date(ad.startAt || ad.startDate).getTime();
    const endMs = new Date(ad.endAt || ad.endDate).getTime();

    // Crucial rule: For EXTERNAL_COMPANY, approval alone MUST NOT make an unpaid campaign active!
    // It is active only if payment is VERIFIED.
    const isPaymentSatisfied = ad.adClass === 'APEX_ARENA' || ad.paymentStatus === 'VERIFIED';

    let nextStatus: CampaignStatus = 'APPROVED';
    let isActive = false;

    if (isPaymentSatisfied) {
      if (now >= startMs && now <= endMs) {
        nextStatus = 'ACTIVE';
        isActive = true;
      } else if (now < startMs) {
        nextStatus = 'SCHEDULED';
        isActive = false;
      } else {
        nextStatus = 'EXPIRED';
        isActive = false;
      }
    } else {
      // Payment still pending/submitted: campaign is APPROVED but awaiting payment
      nextStatus = 'APPROVED';
      isActive = false;
    }

    const updated = db.updateAd(ad.id, {
      status: nextStatus,
      active: isActive,
      approvedBy: actor.id,
      updatedAt: nowIso
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_APPROVED',
      target: ad.id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: ad.id,
      result: 'SUCCESS',
      details: `Approved campaign "${ad.title}" (status: ${nextStatus}, payment: ${ad.paymentStatus}).`,
      timestamp: nowIso
    });

    return updated!;
  }

  // --------------------------------------------------------------------------
  // PAYMENT WORKFLOW (LOGICALLY SEPARATE FROM PLAYER FUNDS)
  // --------------------------------------------------------------------------
  public static getPayments(): AdPayment[] {
    const payments = (db.data as any).adPayments;
    return Array.isArray(payments) ? payments : [];
  }

  public static getPaymentById(paymentId: string): AdPayment | undefined {
    return this.getPayments().find(p => p.paymentId === paymentId);
  }

  private static createPaymentRecord(params: {
    campaignId: string;
    campaignName: string;
    companyId: string;
    companyName: string;
    packageId: AdPackageId;
    amountETB: number;
  }): AdPayment {
    const paymentId = `adpay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newPayment: AdPayment = {
      paymentId,
      campaignId: params.campaignId,
      campaignName: params.campaignName,
      companyId: params.companyId,
      companyName: params.companyName,
      packageId: params.packageId,
      amountETB: params.amountETB,
      currency: 'ETB',
      status: 'PENDING',
      paymentMethod: 'TELEBIRR',
      reference: `REF-${Date.now().toString().slice(-6)}`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (!(db.data as any).adPayments) {
      (db.data as any).adPayments = [];
    }
    (db.data as any).adPayments.unshift(newPayment);
    db.save();

    return newPayment;
  }

  public static submitPayment(
    paymentId: string,
    params: {
      paymentMethod: string;
      reference: string;
      notes?: string;
    },
    actor: User
  ): AdPayment {
    const list = this.getPayments();
    const idx = list.findIndex(p => p.paymentId === paymentId);
    if (idx === -1) throw new Error(`Payment record not found: ${paymentId}`);

    const current = list[idx];
    if (current.status === 'VERIFIED') {
      throw new Error('Payment has already been verified.');
    }

    const nowIso = new Date().toISOString();
    const updated: AdPayment = {
      ...current,
      paymentMethod: sanitizeAdText(params.paymentMethod, 40),
      reference: sanitizeAdText(params.reference, 60),
      notes: params.notes ? sanitizeAdText(params.notes, 200) : current.notes,
      status: 'SUBMITTED',
      submittedAt: nowIso,
      updatedAt: nowIso
    };

    list[idx] = updated;
    (db.data as any).adPayments = list;

    // Update campaign payment status to SUBMITTED
    db.updateAd(current.campaignId, {
      paymentStatus: 'SUBMITTED',
      updatedAt: nowIso
    });
    db.save();

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PAYMENT_SUBMITTED',
      target: paymentId,
      resourceType: 'AD_PAYMENT',
      resourceId: paymentId,
      result: 'SUCCESS',
      details: `Submitted ad payment of ${current.amountETB} ETB for campaign ${current.campaignName} via ${params.paymentMethod} (Ref: ${params.reference}).`,
      timestamp: nowIso
    });

    return updated;
  }

  // Verify advertising payment (IDEMPOTENT)
  public static verifyPayment(
    paymentId: string,
    isApproved: boolean,
    notes: string,
    actor: User
  ): AdPayment {
    const list = this.getPayments();
    const idx = list.findIndex(p => p.paymentId === paymentId);
    if (idx === -1) throw new Error(`Payment record not found: ${paymentId}`);

    const current = list[idx];
    const nowIso = new Date().toISOString();

    // Idempotency: if already verified and approved, return current without double processing
    if (isApproved && current.status === 'VERIFIED') {
      return current;
    }

    const nextStatus: AdPayment['status'] = isApproved ? 'VERIFIED' : 'REJECTED';

    const updated: AdPayment = {
      ...current,
      status: nextStatus,
      verifiedAt: nowIso,
      verifiedBy: actor.id,
      verifiedByName: actor.name,
      rejectionReason: !isApproved ? sanitizeAdText(notes, 200) : undefined,
      notes: notes ? sanitizeAdText(notes, 200) : current.notes,
      updatedAt: nowIso
    };

    list[idx] = updated;
    (db.data as any).adPayments = list;

    // Update campaign paymentStatus
    const campaign = this.getCampaignById(current.campaignId);
    if (campaign) {
      const now = Date.now();
      const startMs = new Date(campaign.startAt || campaign.startDate).getTime();
      const endMs = new Date(campaign.endAt || campaign.endDate).getTime();

      let campaignStatus = campaign.status;
      let isActive = campaign.active;

      if (isApproved) {
        // If campaign is already APPROVED, check if it can become ACTIVE or SCHEDULED
        if (campaign.status === 'APPROVED' || campaign.status === 'SCHEDULED') {
          if (now >= startMs && now <= endMs) {
            campaignStatus = 'ACTIVE';
            isActive = true;
          } else if (now < startMs) {
            campaignStatus = 'SCHEDULED';
            isActive = false;
          }
        }
      }

      db.updateAd(campaign.id, {
        paymentStatus: isApproved ? 'VERIFIED' : 'REJECTED',
        status: campaignStatus,
        active: isActive,
        updatedAt: nowIso
      });
    }

    db.save();

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: isApproved ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
      target: paymentId,
      resourceType: 'AD_PAYMENT',
      resourceId: paymentId,
      result: 'SUCCESS',
      details: `${isApproved ? 'Verified' : 'Rejected'} advertising payment of ${current.amountETB} ETB for campaign ${current.campaignName}.`,
      timestamp: nowIso
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // EMERGENCY CONTROLS: PAUSE, RESUME, DISABLE
  // --------------------------------------------------------------------------
  public static pauseCampaign(campaignId: string, reason: string, actor: User): Advertisement {
    const ad = this.getCampaignById(campaignId);
    if (!ad) throw new Error(`Campaign not found: ${campaignId}`);

    const nowIso = new Date().toISOString();
    const updated = db.updateAd(ad.id, {
      status: 'PAUSED',
      active: false,
      updatedAt: nowIso
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_PAUSED',
      target: ad.id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: ad.id,
      result: 'SUCCESS',
      details: `Paused campaign "${ad.title}". Immediate delivery stopped. Reason: ${sanitizeAdText(reason, 200)}`,
      timestamp: nowIso
    });

    return updated!;
  }

  public static resumeCampaign(campaignId: string, actor: User): Advertisement {
    const ad = this.getCampaignById(campaignId);
    if (!ad) throw new Error(`Campaign not found: ${campaignId}`);

    if (ad.status !== 'PAUSED') {
      throw new Error(`Only paused campaigns can be resumed. Current status: ${ad.status}`);
    }

    // Eligibility check: must be approved, paid, and within valid schedule
    const isPaymentSatisfied = ad.adClass === 'APEX_ARENA' || ad.paymentStatus === 'VERIFIED';
    if (!isPaymentSatisfied) {
      throw new Error('Cannot resume campaign: payment is not verified.');
    }

    const now = Date.now();
    const startMs = new Date(ad.startAt || ad.startDate).getTime();
    const endMs = new Date(ad.endAt || ad.endDate).getTime();

    if (now > endMs) {
      throw new Error('Cannot resume campaign: scheduled end date has already passed.');
    }

    const nextStatus: CampaignStatus = now >= startMs ? 'ACTIVE' : 'SCHEDULED';
    const isActive = nextStatus === 'ACTIVE';
    const nowIso = new Date().toISOString();

    const updated = db.updateAd(ad.id, {
      status: nextStatus,
      active: isActive,
      updatedAt: nowIso
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_RESUMED',
      target: ad.id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: ad.id,
      result: 'SUCCESS',
      details: `Resumed campaign "${ad.title}" (status: ${nextStatus}, active: ${isActive}).`,
      timestamp: nowIso
    });

    return updated!;
  }

  public static disableCampaign(campaignId: string, reason: string, actor: User): Advertisement {
    const ad = this.getCampaignById(campaignId);
    if (!ad) throw new Error(`Campaign not found: ${campaignId}`);

    const nowIso = new Date().toISOString();
    const updated = db.updateAd(ad.id, {
      status: 'DISABLED',
      active: false,
      updatedAt: nowIso
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_DISABLED',
      target: ad.id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: ad.id,
      result: 'SUCCESS',
      details: `Emergency disabled campaign "${ad.title}". Delivery permanently stopped. Reason: ${sanitizeAdText(reason, 200)}`,
      timestamp: nowIso
    });

    return updated!;
  }

  // --------------------------------------------------------------------------
  // SERVER-AUTHORITATIVE PLAYER AD DELIVERY & 5-AD ROTATION
  // --------------------------------------------------------------------------
  public static getRotatedAdsForPlacement(
    placement: AdPlacement,
    maxAds = 5,
    now = Date.now()
  ): Advertisement[] {
    this.refreshCampaignStatuses(now);
    const allAds = db.getAds();

    // Filter strictly eligible ads:
    // 1. Status is ACTIVE and active flag is true
    // 2. Current time >= start time && Current time < end time
    // 3. Placement matches requested placement
    // 4. If EXTERNAL_COMPANY: paymentStatus must be VERIFIED
    // 5. Excludes EXPIRED, PAUSED, REJECTED, DISABLED, DRAFT, SUBMITTED, UNDER_REVIEW
    const eligibleAds = allAds.filter(ad => {
      if (ad.status !== 'ACTIVE' || !ad.active) return false;

      const startMs = new Date(ad.startAt || ad.startDate).getTime();
      const endMs = new Date(ad.endAt || ad.endDate).getTime();
      // Only ads where current time >= start time and current time < end time
      if (now < startMs || now >= endMs) return false;

      const adPlacements = ad.placements || [mapLegacyPositionToPlacement(ad.position)];
      if (!adPlacements.includes(placement)) return false;

      if (ad.adClass === 'EXTERNAL_COMPANY' && ad.paymentStatus !== 'VERIFIED') {
        return false;
      }

      return true;
    });

    if (eligibleAds.length === 0) {
      return [];
    }

    // Sort predictable & fair:
    // 1. Priority descending (higher tiers given higher weighting)
    // 2. Start time ascending
    // 3. ID
    eligibleAds.sort((a, b) => {
      const pDiff = (b.priority || 0) - (a.priority || 0);
      if (pDiff !== 0) return pDiff;
      const aStart = new Date(a.startAt || a.startDate).getTime();
      const bStart = new Date(b.startAt || b.startDate).getTime();
      if (aStart !== bStart) return aStart - bStart;
      return a.id.localeCompare(b.id);
    });

    // Never show more than 5 ads in the homepage hero rotation
    const cappedLimit = Math.min(maxAds, 5);
    return eligibleAds.slice(0, cappedLimit);
  }

  public static getDeliveredAdForPlacement(
    placement: AdPlacement,
    sessionId?: string,
    now = Date.now()
  ): Advertisement | null {
    const rotated = this.getRotatedAdsForPlacement(placement, 5, now);
    if (rotated.length === 0) {
      return null;
    }

    if (rotated.length === 1) {
      return rotated[0];
    }

    // If highest priority is exclusive or lone top-tier, deliver it
    const topPriority = rotated[0].priority || 0;
    const topTierAds = rotated.filter(a => (a.priority || 0) === topPriority);

    if (topTierAds.length === 1) {
      return topTierAds[0];
    }

    // Deterministic rotation among equal-priority eligible ads based on current minute/session
    const seed = sessionId ? sessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 0;
    const timeSlice = Math.floor(now / 30000); // changes every 30s
    const index = (seed + timeSlice) % topTierAds.length;

    return topTierAds[index];
  }

  // --------------------------------------------------------------------------
  // DEDUPLICATED ANALYTICS: IMPRESSIONS & CLICKS
  // --------------------------------------------------------------------------
  public static recordImpression(
    adId: string,
    placement: AdPlacement,
    clientFingerprint = 'anon',
    now = Date.now()
  ): { recorded: boolean; deduplicated: boolean; impressions: number } {
    this.pruneCache();

    // Deduplication key per ad + fingerprint + 60-second window
    const minuteWindow = Math.floor(now / 60000);
    const dedupKey = `${adId}_${clientFingerprint}_${minuteWindow}`;

    if (this.impressionCache.has(dedupKey)) {
      const ad = this.getCampaignById(adId);
      return { recorded: false, deduplicated: true, impressions: ad?.impressions || 0 };
    }

    this.impressionCache.set(dedupKey, now);

    const ad = this.getCampaignById(adId);
    if (!ad) {
      return { recorded: false, deduplicated: false, impressions: 0 };
    }

    const currentImpressions = (ad.impressions || 0) + 1;
    const currentClicks = ad.clicks || 0;
    const ctr = Number((currentClicks / currentImpressions).toFixed(4));

    // Update daily breakdown
    const todayKey = new Date(now).toISOString().split('T')[0];
    const dailyImpressions = { ...(ad.analytics?.dailyImpressions || {}) };
    dailyImpressions[todayKey] = (dailyImpressions[todayKey] || 0) + 1;

    db.updateAd(ad.id, {
      impressions: currentImpressions,
      analytics: {
        ...(ad.analytics || { clicks: currentClicks, ctr }),
        impressions: currentImpressions,
        clicks: currentClicks,
        ctr,
        dailyImpressions
      }
    });

    return { recorded: true, deduplicated: false, impressions: currentImpressions };
  }

  public static recordClick(
    adId: string,
    clientFingerprint = 'anon',
    now = Date.now()
  ): { recorded: boolean; deduplicated: boolean; clicks: number; targetUrl: string } {
    this.pruneCache();

    // 3-second rapid double-click debounce
    const dedupKey = `click_${adId}_${clientFingerprint}`;
    const lastClick = this.clickCache.get(dedupKey);

    const ad = this.getCampaignById(adId);
    if (!ad) {
      return { recorded: false, deduplicated: false, clicks: 0, targetUrl: '/competitions' };
    }

    if (lastClick && now - lastClick < 3000) {
      return { recorded: false, deduplicated: true, clicks: ad.clicks || 0, targetUrl: ad.targetUrl || '/competitions' };
    }

    this.clickCache.set(dedupKey, now);

    const currentClicks = (ad.clicks || 0) + 1;
    const currentImpressions = Math.max(ad.impressions || 0, currentClicks);
    const ctr = Number((currentClicks / currentImpressions).toFixed(4));

    const todayKey = new Date(now).toISOString().split('T')[0];
    const dailyClicks = { ...(ad.analytics?.dailyClicks || {}) };
    dailyClicks[todayKey] = (dailyClicks[todayKey] || 0) + 1;

    db.updateAd(ad.id, {
      clicks: currentClicks,
      analytics: {
        ...(ad.analytics || { impressions: currentImpressions, ctr }),
        impressions: currentImpressions,
        clicks: currentClicks,
        ctr,
        dailyClicks
      }
    });

    return { recorded: true, deduplicated: false, clicks: currentClicks, targetUrl: ad.targetUrl || '/competitions' };
  }

  public static updateCampaign(id: string, updates: Partial<Advertisement>, actor: { id: string; name: string; role: string }) {
    const updated = db.updateAd(id, { ...updates, updatedAt: new Date().toISOString() });
    if (!updated) throw new Error(`Campaign with ID '${id}' not found.`);
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_UPDATED',
      target: id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: id,
      result: 'SUCCESS',
      details: `Updated ad campaign '${id}'.`,
      timestamp: new Date().toISOString()
    });
    return updated;
  }

  public static deleteCampaign(id: string, actor: { id: string; name: string; role: string }) {
    const deleted = db.deleteAd ? db.deleteAd(id) : false;
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CAMPAIGN_DELETED',
      target: id,
      resourceType: 'AD_CAMPAIGN',
      resourceId: id,
      result: deleted ? 'SUCCESS' : 'FAILURE',
      details: `Deleted ad campaign '${id}'.`,
      timestamp: new Date().toISOString()
    });
    return deleted;
  }

  public static purgeDemoAds(actor: { id: string; name: string; role: string }) {
    const result = db.purgeDemoAdvertisements();
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DEMO_ADS_PURGED',
      target: 'AD_SYSTEM',
      resourceType: 'AD_CAMPAIGN',
      resourceId: 'ALL_DEMO',
      result: 'SUCCESS',
      details: `Purged ${result.deletedCount} demo/test ads. Placements and financial records safely preserved.`,
      timestamp: new Date().toISOString()
    });
    return result;
  }
}

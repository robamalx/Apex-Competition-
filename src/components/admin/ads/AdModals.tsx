import React, { useState } from 'react';
import {
  X,
  Megaphone,
  Building2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Upload,
  Link2,
  Calendar,
  Layers,
  Shield,
  FileText,
  Smartphone,
  Monitor
} from 'lucide-react';
import {
  Advertisement,
  AdCompany,
  AdPackageConfig,
  AdPayment,
  AdClass,
  AdPlacement,
  AdPackageId,
  getPlacementDisplayName,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

export const PLACEMENT_SPECS_INFO: Record<AdPlacement, { width: number; height: number; ratio: string; desc: string; maxKb: number }> = {
  HOMEPAGE_HERO: { width: 1200, height: 240, ratio: '5:1', desc: 'Homepage Hero Rotating Banner (Max 5 in rotation)', maxKb: 2048 },
  HOMEPAGE_PROMO: { width: 1200, height: 160, ratio: '7.5:1', desc: 'Homepage Mid-Feed Sponsor Bar', maxKb: 2048 },
  COMPETITION_BANNER: { width: 1200, height: 200, ratio: '6:1', desc: 'Competition Detail Top Sponsor Banner', maxKb: 2048 },
  PREDICTION_BANNER: { width: 1200, height: 200, ratio: '6:1', desc: 'Match Prediction Slip Footnote Banner', maxKb: 2048 },
  STORE_BANNER: { width: 1200, height: 240, ratio: '5:1', desc: 'Merchandise & VIP Store Banner', maxKb: 2048 }
};

// ============================================================================
// 1. CAMPAIGN CREATE / EDIT MODAL
// ============================================================================
interface AdCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  editingCampaign: Advertisement | null;
  companies: AdCompany[];
  packages: AdPackageConfig[];
}

export const AdCampaignModal: React.FC<AdCampaignModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCampaign,
  companies,
  packages
}) => {
  const [formData, setFormData] = useState(() => {
    if (editingCampaign) {
      return {
        adClass: editingCampaign.adClass || 'APEX_ARENA',
        companyId: editingCampaign.companyId || '',
        campaignName: editingCampaign.campaignName || editingCampaign.title || '',
        description: editingCampaign.description || '',
        packageId: (editingCampaign.packageId || 'PREMIUM') as AdPackageId,
        primaryPlacement: (editingCampaign.primaryPlacement || editingCampaign.position || 'HOMEPAGE_HERO') as AdPlacement,
        desktopAssetUrl: editingCampaign.desktopAssetUrl || editingCampaign.imageUrl || '',
        tabletMobileImageUrl: editingCampaign.tabletMobileImageUrl || '',
        ctaText: editingCampaign.ctaText || 'Explore Now',
        destinationUrl: editingCampaign.destinationUrl || editingCampaign.targetUrl || '/competitions',
        destinationType: (editingCampaign.destinationType || 'INTERNAL') as 'INTERNAL' | 'EXTERNAL',
        startAt: editingCampaign.startAt ? editingCampaign.startAt.split('T')[0] : (editingCampaign.startDate ? editingCampaign.startDate.split('T')[0] : new Date().toISOString().split('T')[0]),
        endAt: editingCampaign.endAt ? editingCampaign.endAt.split('T')[0] : (editingCampaign.endDate ? editingCampaign.endDate.split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      };
    }
    return {
      adClass: 'APEX_ARENA' as AdClass,
      companyId: companies[0]?.companyId || '',
      campaignName: '',
      description: '',
      packageId: 'PREMIUM' as AdPackageId,
      primaryPlacement: 'HOMEPAGE_HERO' as AdPlacement,
      desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      tabletMobileImageUrl: '',
      ctaText: 'Explore Now',
      destinationUrl: '/competitions',
      destinationType: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL',
      startAt: new Date().toISOString().split('T')[0],
      endAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [uploadedDims, setUploadedDims] = useState<{ width: number; height: number } | null>(null);
  const [bannerFileSize, setBannerFileSize] = useState<number | null>(null);
  const [readabilityApproved, setReadabilityApproved] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentPlacementSpec = PLACEMENT_SPECS_INFO[formData.primaryPlacement] || PLACEMENT_SPECS_INFO.HOMEPAGE_HERO;

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setValidationSuccess(null);

    // 1. Check size limit
    if (file.size > currentPlacementSpec.maxKb * 1024) {
      setValidationError(`Uploaded file (${(file.size / 1024).toFixed(1)} KB) exceeds the maximum allowed limit of ${currentPlacementSpec.maxKb} KB.`);
      return;
    }

    // 2. Check format
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setValidationError(`Unsupported file format '${file.type}'. Allowed formats: PNG, JPEG, or WebP.`);
      return;
    }

    setBannerFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setUploadedDims({ width: w, height: h });

        if (w !== currentPlacementSpec.width || h !== currentPlacementSpec.height) {
          setValidationError(
            `Artwork dimensions (${w}×${h} px) do not match required dimensions (${currentPlacementSpec.width}×${currentPlacementSpec.height} px) for ${formData.primaryPlacement}. APEX ARENA does not auto-resize banners to prevent distortion. Please upload a finished banner with exact dimensions.`
          );
        } else {
          setValidationSuccess(
            `✅ Finished Digital Banner Verified: Exact ${w}×${h} px match (${currentPlacementSpec.ratio} aspect ratio) • ${(file.size / 1024).toFixed(1)} KB. Ready for production.`
          );
          setFormData(prev => ({ ...prev, desktopAssetUrl: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.campaignName.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (formData.adClass === 'EXTERNAL_COMPANY' && !formData.companyId) {
      setError('Please select a commercial partner company.');
      return;
    }
    if (!formData.desktopAssetUrl.trim()) {
      setError('Finished digital banner artwork is required.');
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!readabilityApproved) {
      setError('Please verify banner readability and safe-zone compliance before submission.');
      return;
    }
    if (!formData.destinationUrl.trim()) {
      setError('Destination URL is required.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...formData,
        requiredDimensions: `${currentPlacementSpec.width}x${currentPlacementSpec.height}`,
        uploadedDimensions: uploadedDims ? `${uploadedDims.width}x${uploadedDims.height}` : `${currentPlacementSpec.width}x${currentPlacementSpec.height}`,
        fileSizeBytes: bannerFileSize || undefined,
        readabilityApproved: readabilityApproved,
        bannerUrl: formData.desktopAssetUrl
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === formData.packageId) || packages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            {editingCampaign ? 'Edit Advertising Campaign' : 'Create New Campaign'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Ad Class Selection */}
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1.5">
              1. Campaign Classification & Billing Model *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, adClass: 'APEX_ARENA', companyId: '' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.adClass === 'APEX_ARENA'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-sm">APEX ARENA</strong>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">Internal</span>
                </div>
                <span className="text-[11px] block mt-1 text-slate-400">
                  Platform tournaments & feature promos. Fee exempt, instant review eligibility.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, adClass: 'EXTERNAL_COMPANY', companyId: companies[0]?.companyId || '' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.adClass === 'EXTERNAL_COMPANY'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-sm">EXTERNAL PARTNER</strong>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400">Commercial</span>
                </div>
                <span className="text-[11px] block mt-1 text-slate-400">
                  Commercial sponsor brands. Invoiced via isolated ledger, activated upon payment verification.
                </span>
              </button>
            </div>
          </div>

          {/* Partner Company (if external) */}
          {formData.adClass === 'EXTERNAL_COMPANY' && (
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                2. Commercial Partner Brand *
              </label>
              <select
                value={formData.companyId}
                onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select registered partner brand...</option>
                {companies.map(c => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.companyName} ({c.contactName} • {c.contactEmail})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campaign Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
                placeholder="e.g. Telebirr 5G Super-Boost Bonus"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Package Tier *
              </label>
              <select
                value={formData.packageId}
                onChange={e => {
                  const pkgId = e.target.value as AdPackageId;
                  const targetPkg = packages.find(p => p.id === pkgId);
                  setFormData({
                    ...formData,
                    packageId: pkgId,
                    primaryPlacement: targetPkg?.allowedPlacements[0] || formData.primaryPlacement
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.priceETB.toLocaleString()} ETB ({p.durationDays}d) {p.isExclusive ? '⭐ EXCLUSIVE' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
              Campaign Description / Copy
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Highlight promotional value, terms, or bonus eligibility..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Placement & CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Primary Placement Slot *
              </label>
              <select
                value={formData.primaryPlacement}
                onChange={e => setFormData({ ...formData, primaryPlacement: e.target.value as AdPlacement })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500 text-xs"
              >
                {(selectedPkg?.allowedPlacements || ['HOMEPAGE_HERO', 'HOMEPAGE_PROMO', 'COMPETITION_BANNER', 'PREDICTION_BANNER', 'STORE_BANNER']).map(p => (
                  <option key={p} value={p}>{getPlacementDisplayName(p)} ({p})</option>
                ))}
              </select>
              <div className="mt-2">
                <PlacementDisplay placement={formData.primaryPlacement} variant="stacked" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Call To Action (CTA) Button Text
              </label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="e.g. Join Now, Claim Bonus, View Store"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Destination URL & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Destination Target URL *
              </label>
              <input
                type="text"
                value={formData.destinationUrl}
                onChange={e => setFormData({ ...formData, destinationUrl: e.target.value })}
                placeholder="/competitions or https://partner.com/deal"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Destination Type
              </label>
              <select
                value={formData.destinationType}
                onChange={e => setFormData({ ...formData, destinationType: e.target.value as 'INTERNAL' | 'EXTERNAL' })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="INTERNAL">Internal Route (/)</option>
                <option value="EXTERNAL">External Website (https://)</option>
              </select>
            </div>
          </div>

          {/* Finished Digital Banner Creative Upload & Validation */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-white font-bold text-xs flex items-center gap-1.5 uppercase">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Finished Digital Banner Artwork
                </span>
                <p className="text-[11px] text-slate-400">
                  Advertiser provides final digital banner. APEX ARENA does not design materials or auto-resize artwork.
                </p>
              </div>

              {/* Required Dimensions Spec Pill */}
              <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shrink-0">
                Required: {currentPlacementSpec.width} × {currentPlacementSpec.height} px ({currentPlacementSpec.ratio})
              </div>
            </div>

            {/* Banner File Upload Dropzone / Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col justify-center p-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/50 text-center transition-colors">
                <input
                  type="file"
                  id="ad_banner_file_upload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleBannerFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="ad_banner_file_upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1 py-2 text-slate-300 hover:text-white"
                >
                  <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold">Upload Digital Banner File</span>
                  <span className="text-[10px] text-slate-400">PNG, JPEG, or WebP up to {currentPlacementSpec.maxKb / 1024}MB</span>
                </label>
              </div>

              {/* Or Direct Image URL Input */}
              <div className="flex flex-col justify-center space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">
                  Or Creative Asset URL
                </label>
                <input
                  type="url"
                  value={formData.desktopAssetUrl}
                  onChange={e => {
                    setFormData({ ...formData, desktopAssetUrl: e.target.value });
                    setValidationError(null);
                    setValidationSuccess(null);
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.desktopAssetUrl) return;
                      const img = new Image();
                      img.onload = () => {
                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        setUploadedDims({ width: w, height: h });
                        if (w !== currentPlacementSpec.width || h !== currentPlacementSpec.height) {
                          setValidationError(
                            `Artwork dimensions (${w}×${h} px) do not match required dimensions (${currentPlacementSpec.width}×${currentPlacementSpec.height} px). No auto-resizing is applied.`
                          );
                          setValidationSuccess(null);
                        } else {
                          setValidationSuccess(`✅ Verified Dimensions: ${w}×${h} px (${currentPlacementSpec.ratio})`);
                          setValidationError(null);
                        }
                      };
                      img.onerror = () => {
                        setValidationError('Failed to load image from URL.');
                      };
                      img.src = formData.desktopAssetUrl;
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors"
                  >
                    Check Dimensions
                  </button>
                  <span className="text-[10px] text-slate-500">
                    Max size: {currentPlacementSpec.maxKb} KB
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Feedback Banner */}
            {validationError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Creative Rejected — Invalid Dimensions:</strong>
                  <span>{validationError}</span>
                </div>
              </div>
            )}

            {validationSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{validationSuccess}</span>
              </div>
            )}

            {/* Live Banner Preview */}
            {formData.desktopAssetUrl && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                  <span>Live Production Banner Preview</span>
                  {uploadedDims && <span>{uploadedDims.width} × {uploadedDims.height} px</span>}
                </div>
                <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative">
                  <img
                    src={formData.desktopAssetUrl}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-emerald-400 border border-slate-800">
                    {formData.primaryPlacement} • {currentPlacementSpec.ratio}
                  </div>
                </div>
              </div>
            )}

            {/* Readability & Safe Zones Checkbox */}
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={readabilityApproved}
                onChange={e => setReadabilityApproved(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>I confirm banner text is legible, safe margins are respected, and content adheres to APEX ARENA guidelines.</span>
            </label>
          </div>

          {/* Optional Tablet/Mobile Asset */}
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
              Mobile/Tablet Asset URL (Optional)
            </label>
            <input
              type="url"
              value={formData.tabletMobileImageUrl}
              onChange={e => setFormData({ ...formData, tabletMobileImageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Schedule Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Campaign Start Date *
              </label>
              <input
                type="date"
                value={formData.startAt}
                onChange={e => setFormData({ ...formData, startAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                Campaign End Date *
              </label>
              <input
                type="date"
                value={formData.endAt}
                onChange={e => setFormData({ ...formData, endAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign (Draft)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. COMPANY CREATE / EDIT MODAL
// ============================================================================
interface AdCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  editingCompany: AdCompany | null;
}

export const AdCompanyModal: React.FC<AdCompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCompany
}) => {
  const [formData, setFormData] = useState({
    companyName: editingCompany?.companyName || '',
    logoUrl: editingCompany?.logoUrl || '',
    contactName: editingCompany?.contactName || '',
    contactEmail: editingCompany?.contactEmail || '',
    contactPhone: editingCompany?.contactPhone || '',
    notes: editingCompany?.notes || '',
    status: editingCompany?.status || 'ACTIVE'
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!formData.contactName.trim() || !formData.contactEmail.trim()) {
      setError('Contact name and email are required.');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            {editingCompany ? 'Edit Partner Company' : 'Register Brand Partner'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Company / Brand Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Ethio Telecom, Heineken, Dashen Bank"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Contact Person *</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Almaz Bekele"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Contact Email *</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="partner@telecom.et"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+251 911 000000"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Brand Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Commercial Notes / Terms</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Billing contracts, SLA details, designated brand reps..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingCompany ? 'Update Partner' : 'Register Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. CAMPAIGN REVIEW / APPROVAL MODAL
// ============================================================================
interface AdReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReview: (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', notes: string) => Promise<void>;
  targetCampaign: Advertisement | null;
}

export const AdReviewModal: React.FC<AdReviewModalProps> = ({
  isOpen,
  onClose,
  onReview,
  targetCampaign
}) => {
  const [action, setAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetCampaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if ((action === 'REQUEST_CHANGES' || action === 'REJECT') && !notes.trim()) {
      setError(`Notes/reason is strictly required when ${action === 'REQUEST_CHANGES' ? 'requesting changes' : 'rejecting'}.`);
      return;
    }

    try {
      setSubmitting(true);
      await onReview(action, notes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Review action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Ad Campaign Editorial Review
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Campaign Summary */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500">ID: {targetCampaign.id}</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {targetCampaign.status}
            </span>
          </div>
          <h4 className="text-white font-extrabold text-sm">{targetCampaign.campaignName || targetCampaign.title}</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div>Class: <strong className="text-slate-200">{targetCampaign.adClass}</strong></div>
            <div>Package: <strong className="text-slate-200">{targetCampaign.packageId || 'PREMIUM'}</strong></div>
            <div className="col-span-2">Destination: <span className="text-cyan-400 font-mono text-[10px] truncate block">{targetCampaign.destinationUrl || targetCampaign.targetUrl}</span></div>
            <div className="col-span-2 pt-2 border-t border-slate-800/80">
              <PlacementDisplay placement={targetCampaign.primaryPlacement || targetCampaign.position} variant="stacked" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1.5">Review Decision *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('APPROVE')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  action === 'APPROVE'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>

              <button
                type="button"
                onClick={() => setAction('REQUEST_CHANGES')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  action === 'REQUEST_CHANGES'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Changes
              </button>

              <button
                type="button"
                onClick={() => setAction('REJECT')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  action === 'REJECT'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
              Review Notes & Feedback {action !== 'APPROVE' && <span className="text-rose-400">* (Mandatory)</span>}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={
                action === 'APPROVE'
                  ? 'Optional approval comments or special instructions...'
                  : action === 'REQUEST_CHANGES'
                  ? 'Specify required modifications (e.g. adjust logo contrast, fix destination URL)...'
                  : 'Specify reason for rejection (e.g. inappropriate content, prohibited sponsor)...'
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              required={action !== 'APPROVE'}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl font-black transition-colors disabled:opacity-50 ${
                action === 'APPROVE'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : action === 'REQUEST_CHANGES'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {submitting ? 'Processing...' : `Confirm ${action}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. AD PAYMENT SUBMISSION MODAL
// ============================================================================
interface AdPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPayment: (paymentId: string, paymentData: { paymentMethod: string; reference: string; notes?: string }) => Promise<void>;
  targetPayment: AdPayment | null;
}

export const AdPaymentModal: React.FC<AdPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmitPayment,
  targetPayment
}) => {
  const [paymentMethod, setPaymentMethod] = useState('TELEBIRR_COMMERCIAL');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetPayment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reference.trim()) {
      setError('Transaction / Reference ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitPayment(targetPayment.paymentId, {
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Submit Advertising Payment Proof
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Brief */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500">Invoice: {targetPayment.paymentId}</span>
            <span className="text-lg font-black text-emerald-400">{targetPayment.amountETB.toLocaleString()} ETB</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block">Campaign:</span>
            <span className="text-white font-extrabold text-sm">{targetPayment.campaignName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block">Partner Brand:</span>
            <span className="text-indigo-300 font-semibold">{targetPayment.companyName}</span>
          </div>
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
            🛡️ <strong>Isolated Commercial Ledger</strong>: This payment will be credited directly to commercial advertising revenue and will not touch player wallets.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Commercial Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="TELEBIRR_COMMERCIAL">Telebirr Commercial Merchant</option>
              <option value="CBE_BIRR_COMMERCIAL">CBE Birr Commercial Partner</option>
              <option value="BANK_WIRE_TRANSFER">Commercial Bank Wire Transfer</option>
              <option value="DIRECT_SPONSOR_AGREEMENT">Direct Corporate Sponsorship Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
              Transaction / Reference Number *
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. TLB-COMM-99823104 or CBE-FT-883491"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Internal Billing Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Bank branch, receipt scan ref, accounting ledger voucher code..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting Proof...' : 'Submit Payment for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

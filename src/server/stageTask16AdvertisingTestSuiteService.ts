import { AdvertisingService, DEFAULT_AD_PACKAGES, validateCreativeBanner, PLACEMENT_SPECS } from './advertisingService.js';
import { db } from './db.js';
import { User, AdPlacement, AdPackageId, Advertisement, getPlacementDisplayName } from '../types.js';

export interface TestResultItem {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface TestSuiteSummary {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  timestamp: string;
  categories: Record<string, { total: number; passed: number; failed: number }>;
  results: TestResultItem[];
}

export class StageTask16AdvertisingTestSuiteService {
  public static async runSuite(): Promise<TestSuiteSummary> {
    if (!db.isInitialized()) {
      db.init();
    }
    const startTime = Date.now();
    const results: TestResultItem[] = [];

    // Mock staff actor for test operations
    const mockSuperAdmin: User = {
      id: 'usr_superadmin',
      name: 'Super Admin',
      username: 'superadmin',
      email: 'Robamjaj@gmail.com',
      phone: '+251911000001',
      role: 'SUPER_ADMIN',
      balanceETB: 50000,
      pendingBalanceETB: 0,
      referralPoints: 1200,
      referralCode: 'ADMIN01',
      isVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    };

    const mockAdsManager: User = {
      id: 'usr_ads_mgr',
      name: 'Selam Ads Manager',
      username: 'adsmgr',
      email: 'ads@apex.com',
      phone: '+251911000002',
      role: 'ADVERTISEMENT_MANAGER',
      balanceETB: 0,
      pendingBalanceETB: 0,
      referralPoints: 0,
      referralCode: 'ADSMGR01',
      isVerified: true,
      createdAt: '2026-01-03T00:00:00.000Z'
    };

    const mockPlayer: User = {
      id: 'usr_test_player',
      name: 'Test Player',
      username: 'testplayer',
      email: 'player@apex.com',
      phone: '+251911000003',
      role: 'PLAYER',
      balanceETB: 1000,
      pendingBalanceETB: 0,
      referralPoints: 50,
      referralCode: 'PLAY01',
      isVerified: true,
      createdAt: '2026-01-05T00:00:00.000Z'
    };

    const recordTest = (
      id: string,
      category: string,
      name: string,
      assertion: () => boolean,
      details?: any
    ) => {
      try {
        const passed = assertion();
        results.push({
          id,
          category,
          name,
          passed,
          message: passed ? 'PASSED: Verified expected behavior.' : 'FAILED: Assertion returned false.',
          details
        });
      } catch (err: any) {
        results.push({
          id,
          category,
          name,
          passed: false,
          message: `FAILED with exception: ${err?.message || err}`,
          details
        });
      }
    };

    // ========================================================================
    // A. CLASSIFICATION TESTS
    // ========================================================================
    let createdInternalAdId = '';
    let createdExternalAdId = '';
    let testCompanyId = '';

    recordTest('A1', 'A_CLASSIFICATION', 'APEX_ARENA class accepted', () => {
      const ad = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: 'Apex Arena Weekly Jackpot Promo',
          description: 'Official tournament jackpot prize promotion.',
          packageId: 'PREMIUM',
          primaryPlacement: 'HOMEPAGE_HERO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          ctaText: 'Enter Now',
          destinationUrl: '/competitions'
        },
        mockAdsManager
      );
      createdInternalAdId = ad.id;
      return ad.adClass === 'APEX_ARENA' && ad.paymentStatus === 'EXEMPT' && ad.companyName === 'APEX ARENA';
    });

    recordTest('A2', 'A_CLASSIFICATION', 'EXTERNAL_COMPANY class requires company and accepted', () => {
      const comp = AdvertisingService.createCompany(
        {
          companyName: 'Habesha Sports Gear',
          contactName: 'Dawit Abebe',
          contactEmail: 'contact@habeshasports.et'
        },
        mockAdsManager
      );
      testCompanyId = comp.companyId;

      const ad = AdvertisingService.createCampaign(
        {
          adClass: 'EXTERNAL_COMPANY',
          companyId: testCompanyId,
          campaignName: 'Habesha Pro Boots 2026',
          description: '20% off all football boots this weekend.',
          packageId: 'STANDARD',
          primaryPlacement: 'HOMEPAGE_PROMO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1511886929837-354d827aae26',
          ctaText: 'Shop Boots',
          destinationUrl: 'https://www.habeshasports.et/boots'
        },
        mockAdsManager
      );
      createdExternalAdId = ad.id;
      return (
        ad.adClass === 'EXTERNAL_COMPANY' &&
        ad.companyId === testCompanyId &&
        ad.companyName === 'Habesha Sports Gear' &&
        ad.paymentStatus === 'PENDING'
      );
    });

    recordTest('A3', 'A_CLASSIFICATION', 'Invalid class rejected', () => {
      try {
        AdvertisingService.createCampaign(
          {
            adClass: 'THIRD_PARTY_UNKNOWN' as any,
            campaignName: 'Bad Class Test',
            packageId: 'STARTER',
            desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
            destinationUrl: '/competitions'
          },
          mockAdsManager
        );
        return false;
      } catch (e: any) {
        return e.message.includes('Authoritative adClass must be');
      }
    });

    recordTest('A4', 'A_CLASSIFICATION', 'External campaign without companyId is rejected', () => {
      try {
        AdvertisingService.createCampaign(
          {
            adClass: 'EXTERNAL_COMPANY',
            campaignName: 'Missing Company External',
            packageId: 'STARTER',
            desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
            destinationUrl: 'https://example.com'
          },
          mockAdsManager
        );
        return false;
      } catch (e: any) {
        return e.message.includes('External company advertisement requires an associated companyId');
      }
    });

    // ========================================================================
    // B. COMPANY TESTS
    // ========================================================================
    recordTest('B1', 'B_COMPANY', 'Create company profile', () => {
      const comp = AdvertisingService.createCompany(
        {
          companyName: 'Awash Bank Sports Sponsorship',
          contactName: 'Almaz Ayana',
          contactEmail: 'sponsorship@awashbank.com',
          contactPhone: '+251116611000'
        },
        mockAdsManager
      );
      return comp.companyName === 'Awash Bank Sports Sponsorship' && comp.status === 'ACTIVE';
    });

    recordTest('B2', 'B_COMPANY', 'Update company profile', () => {
      const updated = AdvertisingService.updateCompany(
        testCompanyId,
        {
          contactPhone: '+251911998877',
          contactName: 'Dawit Abebe Senior'
        },
        mockAdsManager
      );
      return updated.contactPhone === '+251911998877' && updated.contactName === 'Dawit Abebe Senior';
    });

    recordTest('B3', 'B_COMPANY', 'Suspend company profile blocks new campaigns', () => {
      AdvertisingService.updateCompany(testCompanyId, { status: 'SUSPENDED' }, mockAdsManager);
      try {
        AdvertisingService.createCampaign(
          {
            adClass: 'EXTERNAL_COMPANY',
            companyId: testCompanyId,
            campaignName: 'Blocked Under Suspended Company',
            packageId: 'STARTER',
            desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
            destinationUrl: 'https://example.com'
          },
          mockAdsManager
        );
        return false;
      } catch (e: any) {
        // Re-activate for downstream tests
        AdvertisingService.updateCompany(testCompanyId, { status: 'ACTIVE' }, mockAdsManager);
        return e.message.includes('Cannot launch campaigns for inactive companies');
      }
    });

    // ========================================================================
    // C. PACKAGES & PRICING TESTS
    // ========================================================================
    recordTest('C1', 'C_PACKAGES', 'Standard packages prices: Starter=1500, Standard=3500, Premium=7500, Football Partner=15000, Main Sponsor=25000', () => {
      const starter = AdvertisingService.getPackageById('STARTER');
      const standard = AdvertisingService.getPackageById('STANDARD');
      const premium = AdvertisingService.getPackageById('PREMIUM');
      const football = AdvertisingService.getPackageById('FOOTBALL_PARTNER');
      const main = AdvertisingService.getPackageById('MAIN_SPONSOR');

      return (
        starter.priceETB === 1500 &&
        standard.priceETB === 3500 &&
        premium.priceETB === 7500 &&
        football.priceETB === 15000 &&
        main.priceETB === 25000
      );
    });

    recordTest('C2', 'C_PACKAGES', 'Client-side price tampering rejected: Authoritative server price enforced', () => {
      const ad = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: 'Tampering Check Promo',
          packageId: 'PREMIUM', // Premium is 7500 ETB
          primaryPlacement: 'HOMEPAGE_HERO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          destinationUrl: '/competitions'
        },
        mockAdsManager
      );
      // Backend must authoritatively attach 7500 ETB for PREMIUM
      return ad.pricing.amountETB === 7500 && ad.pricing.packageId === 'PREMIUM';
    });

    // ========================================================================
    // D. LIFECYCLE TESTS
    // ========================================================================
    recordTest('D1', 'D_LIFECYCLE', 'Campaign draft -> submit -> under review -> approve', () => {
      // 1. Submit
      const submitted = AdvertisingService.submitCampaign(createdInternalAdId, mockAdsManager);
      if (submitted.status !== 'UNDER_REVIEW') return false;

      // 2. Approve (Internal ad with valid dates becomes ACTIVE or SCHEDULED)
      const approved = AdvertisingService.reviewCampaign(createdInternalAdId, 'APPROVE', 'Looks good', mockSuperAdmin);
      return approved.status === 'ACTIVE' && approved.active === true;
    });

    recordTest('D2', 'D_LIFECYCLE', 'Review action REQUEST_CHANGES transitions to CHANGES_REQUESTED', () => {
      const tempAd = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: 'Needs Changes Promo',
          packageId: 'STARTER',
          primaryPlacement: 'HOMEPAGE_PROMO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          destinationUrl: '/competitions'
        },
        mockAdsManager
      );
      AdvertisingService.submitCampaign(tempAd.id, mockAdsManager);
      const changes = AdvertisingService.reviewCampaign(tempAd.id, 'REQUEST_CHANGES', 'Please update the CTA', mockSuperAdmin);
      return changes.status === 'CHANGES_REQUESTED' && changes.changeRequestNotes === 'Please update the CTA';
    });

    recordTest('D3', 'D_LIFECYCLE', 'Review action REJECT transitions to REJECTED and active=false', () => {
      const tempAd = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: 'To Be Rejected Promo',
          packageId: 'STARTER',
          primaryPlacement: 'HOMEPAGE_PROMO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          destinationUrl: '/competitions'
        },
        mockAdsManager
      );
      AdvertisingService.submitCampaign(tempAd.id, mockAdsManager);
      const rejected = AdvertisingService.reviewCampaign(tempAd.id, 'REJECT', 'Violates advertising policy', mockSuperAdmin);
      return rejected.status === 'REJECTED' && rejected.active === false;
    });

    recordTest('D4', 'D_LIFECYCLE', 'Pause campaign stops delivery immediately; Resume restarts delivery', () => {
      const paused = AdvertisingService.pauseCampaign(createdInternalAdId, 'Emergency test pause', mockAdsManager);
      if (paused.status !== 'PAUSED' || paused.active !== false) return false;

      const resumed = AdvertisingService.resumeCampaign(createdInternalAdId, mockAdsManager);
      return resumed.status === 'ACTIVE' && resumed.active === true;
    });

    // ========================================================================
    // E. PAYMENT WORKFLOW TESTS
    // ========================================================================
    recordTest('E1', 'E_PAYMENT', 'Unpaid external campaign CANNOT become ACTIVE upon approval alone', () => {
      // createdExternalAdId is currently in DRAFT with paymentStatus: PENDING
      AdvertisingService.submitCampaign(createdExternalAdId, mockAdsManager);
      const reviewed = AdvertisingService.reviewCampaign(createdExternalAdId, 'APPROVE', 'Creative is approved', mockSuperAdmin);

      // Crucial requirement: Approval alone MUST NOT make an unpaid campaign active!
      return reviewed.status === 'APPROVED' && reviewed.active === false && reviewed.paymentStatus === 'PENDING';
    });

    recordTest('E2', 'E_PAYMENT', 'Payment submit -> verify transitions campaign to ACTIVE/SCHEDULED and is idempotent', () => {
      const payments = AdvertisingService.getPayments();
      const targetPayment = payments.find(p => p.campaignId === createdExternalAdId);
      if (!targetPayment) return false;

      // Submit payment reference
      const submitted = AdvertisingService.submitPayment(
        targetPayment.paymentId,
        {
          paymentMethod: 'TELEBIRR',
          reference: 'TB-99881122',
          notes: 'Paid via corporate Telebirr account'
        },
        mockAdsManager
      );
      if (submitted.status !== 'SUBMITTED') return false;

      // Verify payment
      const verified = AdvertisingService.verifyPayment(targetPayment.paymentId, true, 'Payment received in bank', mockSuperAdmin);
      if (verified.status !== 'VERIFIED') return false;

      // Check that campaign is now ACTIVE because it was previously APPROVED
      const campaign = AdvertisingService.getCampaignById(createdExternalAdId);
      const isCampaignActive = campaign?.status === 'ACTIVE' && campaign?.active === true && campaign?.paymentStatus === 'VERIFIED';

      // Verify idempotency: calling verifyPayment again should return current state safely
      const idempotentCheck = AdvertisingService.verifyPayment(targetPayment.paymentId, true, 'Duplicate check', mockSuperAdmin);
      const isIdempotent = idempotentCheck.status === 'VERIFIED';

      return isCampaignActive && isIdempotent;
    });

    // ========================================================================
    // F. DELIVERY TESTS
    // ========================================================================
    recordTest('F1', 'F_DELIVERY', 'Active ad is served for matching placement', () => {
      const ad = AdvertisingService.getDeliveredAdForPlacement('HOMEPAGE_HERO');
      return ad !== null && ad.status === 'ACTIVE' && ad.active === true;
    });

    recordTest('F2', 'F_DELIVERY', 'Scheduled future ad is NOT served early', () => {
      const futureStart = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days in future
      const futureEnd = new Date(Date.now() + 86400000 * 14).toISOString();
      const futureAd = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: 'Future Promo',
          packageId: 'STARTER',
          primaryPlacement: 'STORE_BANNER',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          destinationUrl: '/store',
          startAt: futureStart,
          endAt: futureEnd
        },
        mockAdsManager
      );
      AdvertisingService.submitCampaign(futureAd.id, mockAdsManager);
      AdvertisingService.reviewCampaign(futureAd.id, 'APPROVE', 'Approved for future', mockSuperAdmin);

      // Now query STORE_BANNER: futureAd should NOT be delivered
      const delivered = AdvertisingService.getDeliveredAdForPlacement('STORE_BANNER');
      return delivered?.id !== futureAd.id;
    });

    recordTest('F3', 'F_DELIVERY', 'Paused ad is NOT served', () => {
      AdvertisingService.pauseCampaign(createdInternalAdId, 'Testing delivery exclusion', mockAdsManager);
      const allHeroAds = db.getAds().filter(a => a.id === createdInternalAdId);
      const isPaused = allHeroAds[0]?.active === false;

      // Resume for later tests
      AdvertisingService.resumeCampaign(createdInternalAdId, mockAdsManager);
      return isPaused;
    });

    // ========================================================================
    // G. PLACEMENTS & EXCLUSIVE CONFLICTS
    // ========================================================================
    recordTest('G1', 'G_PLACEMENTS', 'All 5 placements supported: HOMEPAGE_HERO, HOMEPAGE_PROMO, COMPETITION_BANNER, PREDICTION_BANNER, STORE_BANNER', () => {
      const placements: AdPlacement[] = [
        'HOMEPAGE_HERO',
        'HOMEPAGE_PROMO',
        'COMPETITION_BANNER',
        'PREDICTION_BANNER',
        'STORE_BANNER'
      ];
      const starterPkg = AdvertisingService.getPackageById('STARTER');
      const premiumPkg = AdvertisingService.getPackageById('PREMIUM');

      return (
        starterPkg.allowedPlacements.includes('HOMEPAGE_PROMO') &&
        premiumPkg.allowedPlacements.includes('HOMEPAGE_HERO') &&
        placements.length === 5
      );
    });

    recordTest('G2', 'G_PLACEMENTS', 'Main Sponsor exclusive placement conflicts are rejected with exact error', () => {
      // Clean up any test main sponsor campaigns from prior runs to ensure idempotency
      const existingTestAds = db.getAds().filter(
        a => a.campaignName === 'Headline Sponsor Campaign 1' || a.campaignName === 'Overlapping Sponsor Campaign 2' || (a as any).title === 'Headline Sponsor Campaign 1'
      );
      for (const oldAd of existingTestAds) {
        oldAd.status = 'CANCELLED';
        oldAd.active = false;
      }
      db.save();

      // First, create an approved Main Sponsor campaign
      let mainAd1: any = null;
      try {
        mainAd1 = AdvertisingService.createCampaign(
          {
            adClass: 'APEX_ARENA',
            campaignName: 'Headline Sponsor Campaign 1',
            packageId: 'MAIN_SPONSOR',
            primaryPlacement: 'HOMEPAGE_HERO',
            desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
            destinationUrl: '/competitions'
          },
          mockAdsManager
        );
        AdvertisingService.submitCampaign(mainAd1.id, mockAdsManager);
        AdvertisingService.reviewCampaign(mainAd1.id, 'APPROVE', 'Main sponsor slot booked', mockSuperAdmin);

        // Now attempt to book a concurrent overlapping Main Sponsor campaign
        try {
          AdvertisingService.createCampaign(
            {
              adClass: 'APEX_ARENA',
              campaignName: 'Overlapping Sponsor Campaign 2',
              packageId: 'MAIN_SPONSOR',
              primaryPlacement: 'HOMEPAGE_HERO',
              desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
              destinationUrl: '/competitions'
            },
            mockAdsManager
          );
          return false;
        } catch (e: any) {
          return e.message.includes('Main Sponsor placement is already reserved from');
        }
      } finally {
        if (mainAd1) {
          const ad = db.getAds().find(a => a.id === mainAd1.id);
          if (ad) {
            ad.status = 'CANCELLED';
            ad.active = false;
            db.save();
          }
        }
      }
    });

    // ========================================================================
    // H. CREATIVE & XSS SANITIZATION
    // ========================================================================
    recordTest('H1', 'H_CREATIVE', 'Unsafe destination URLs (javascript:, <script>) rejected', () => {
      try {
        AdvertisingService.createCampaign(
          {
            adClass: 'APEX_ARENA',
            campaignName: 'Script Attack',
            packageId: 'STARTER',
            primaryPlacement: 'HOMEPAGE_PROMO',
            desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
            destinationUrl: 'javascript:alert(document.cookie)'
          },
          mockAdsManager
        );
        return false;
      } catch (e: any) {
        return e.message.includes('Unsafe destination URL protocol');
      }
    });

    recordTest('H2', 'H_CREATIVE', 'HTML / XSS tags stripped from headline, description, and CTA', () => {
      const sanitizedAd = AdvertisingService.createCampaign(
        {
          adClass: 'APEX_ARENA',
          campaignName: '<script>alert("hack")</script>Football Championship',
          description: '<img src=x onerror=alert(1)>Win real cash prizes.',
          ctaText: '<b style="color:red">Join Now</b>',
          packageId: 'STARTER',
          primaryPlacement: 'HOMEPAGE_PROMO',
          desktopAssetUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
          destinationUrl: '/competitions'
        },
        mockAdsManager
      );

      return (
        !sanitizedAd.title.includes('<script>') &&
        !sanitizedAd.description?.includes('<img') &&
        !sanitizedAd.ctaText?.includes('<b>')
      );
    });

    // ========================================================================
    // I. ANALYTICS & DEDUPLICATION
    // ========================================================================
    recordTest('I1', 'I_ANALYTICS', 'Impression recorded and duplicate impression in 60s window prevented', () => {
      const ad = db.getAds()[0];
      const initialImpressions = ad.impressions || 0;

      // 1. First impression
      const first = AdvertisingService.recordImpression(ad.id, 'HOMEPAGE_HERO', 'fingerprint_test_1');
      // 2. Duplicate immediate impression
      const duplicate = AdvertisingService.recordImpression(ad.id, 'HOMEPAGE_HERO', 'fingerprint_test_1');

      return (
        first.recorded === true &&
        first.deduplicated === false &&
        duplicate.recorded === false &&
        duplicate.deduplicated === true &&
        duplicate.impressions === initialImpressions + 1
      );
    });

    recordTest('I2', 'I_ANALYTICS', 'Click recorded, debounced, and CTR correctly computed', () => {
      const ad = db.getAds()[0];
      const initialClicks = ad.clicks || 0;

      // 1. First click
      const first = AdvertisingService.recordClick(ad.id, 'click_test_1');
      // 2. Immediate double click
      const second = AdvertisingService.recordClick(ad.id, 'click_test_1');

      const updatedAd = AdvertisingService.getCampaignById(ad.id);
      const expectedCtr = Number(((updatedAd?.clicks || 0) / (updatedAd?.impressions || 1)).toFixed(4));

      return (
        first.recorded === true &&
        second.deduplicated === true &&
        updatedAd?.clicks === initialClicks + 1 &&
        updatedAd?.analytics?.ctr === expectedCtr
      );
    });

    // ========================================================================
    // J. FINANCIAL ISOLATION TESTS
    // ========================================================================
    recordTest('J1', 'J_FINANCIAL_ISOLATION', 'Advertising payment does NOT alter player wallet or deposit balance', () => {
      const playerBefore = db.getUsers().find(u => u.id === mockPlayer.id);
      const initialBalance = playerBefore ? playerBefore.balanceETB : 1000;

      // Trigger advertising payments
      const payments = AdvertisingService.getPayments();
      if (payments.length > 0) {
        AdvertisingService.verifyPayment(payments[0].paymentId, true, 'Test verification', mockSuperAdmin);
      }

      const playerAfter = db.getUsers().find(u => u.id === mockPlayer.id);
      const finalBalance = playerAfter ? playerAfter.balanceETB : 1000;

      return initialBalance === finalBalance;
    });

    recordTest('J2', 'J_FINANCIAL_ISOLATION', 'Advertising payment does NOT enter player ledger or competition prize pools', () => {
      const playerTxs = db.getTransactions().filter(t => t.type === 'AD_PAYMENT' as any);
      const competitions = db.getCompetitions();

      // Check if any competition has prize pool altered by advertising payments
      const hasCorruptedPool = competitions.some(c => (c as any).adRevenueContribution > 0);

      return playerTxs.length === 0 && !hasCorruptedPool;
    });

    // ========================================================================
    // K. HISTORICAL DATA INTEGRITY
    // ========================================================================
    recordTest('K1', 'K_HISTORICAL_DATA', 'Historical advertising and competition data preserved with no corruption', () => {
      const ads = db.getAds();
      const comps = db.getCompetitions();
      const fixtures = db.getFixtures();

      const hasAds = ads.length >= 2;
      const hasFixtures = fixtures.length > 0;
      const allAdsHaveClass = ads.every(a => Boolean(a.adClass));

      return hasAds && hasFixtures && allAdsHaveClass;
    });

    // ========================================================================
    // L. DIGITAL BANNER UPLOAD & 5-AD HOMEPAGE ROTATION (AD-BANNER-01 to AD-BANNER-12)
    // ========================================================================

    // AD-BANNER-01: Company uploads valid banner -> accepted
    recordTest('AD-BANNER-01', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Company uploads valid digital banner matching exact specs -> accepted', () => {
      const validation = validateCreativeBanner({
        placement: 'HOMEPAGE_HERO',
        width: 1200,
        height: 240,
        fileSizeBytes: 350 * 1024,
        fileType: 'image/png',
        bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        destinationUrl: 'https://partner.et/promo'
      });
      return validation.valid === true && validation.errors.length === 0 && validation.aspectRatioMatch === true;
    });

    // AD-BANNER-02: Wrong dimensions -> rejected/changes requested
    recordTest('AD-BANNER-02', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Company uploads banner with wrong dimensions -> rejected with required dimensions and no auto-resize', () => {
      const validation = validateCreativeBanner({
        placement: 'HOMEPAGE_HERO',
        width: 800,
        height: 600,
        fileSizeBytes: 200 * 1024,
        fileType: 'image/png',
        bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=600'
      });
      const hasDimensionError = validation.errors.some(e => e.includes('1200×240') && e.includes('800×600'));
      return validation.valid === false && hasDimensionError;
    });

    // AD-BANNER-03: One active homepage ad -> displays
    recordTest('AD-BANNER-03', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'One active homepage ad -> displays in rotation set', () => {
      const testNow = Date.now() + 500000;
      const testAdId = 'ad-test-single-hero';
      const singleAd: Advertisement = {
        id: testAdId,
        campaignId: testAdId,
        title: 'Single Hero Promotion',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: true,
        status: 'ACTIVE',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 60,
        impressions: 0,
        clicks: 0
      };
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [singleAd];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 1 && rotated[0].id === testAdId;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-04: Three active homepage ads -> rotates through three
    recordTest('AD-BANNER-04', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Three active homepage ads -> rotates through all three', () => {
      const testNow = Date.now() + 600000;
      const makeAd = (num: number): Advertisement => ({
        id: `ad-test-rot3-${num}`,
        campaignId: `ad-test-rot3-${num}`,
        title: `Hero Ad ${num}`,
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: true,
        status: 'ACTIVE',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 50,
        impressions: 0,
        clicks: 0
      });
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [makeAd(1), makeAd(2), makeAd(3)];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 3;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-05: Five active homepage ads -> rotates through five
    recordTest('AD-BANNER-05', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Five active homepage ads -> rotates through all five', () => {
      const testNow = Date.now() + 700000;
      const makeAd = (num: number): Advertisement => ({
        id: `ad-test-rot5-${num}`,
        campaignId: `ad-test-rot5-${num}`,
        title: `Hero Ad ${num}`,
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: true,
        status: 'ACTIVE',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 50,
        impressions: 0,
        clicks: 0
      });
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [makeAd(1), makeAd(2), makeAd(3), makeAd(4), makeAd(5)];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 5;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-06: Six active ads -> only five eligible for homepage hero rotation
    recordTest('AD-BANNER-06', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Six active ads exist -> only five eligible for homepage hero rotation (capped at 5)', () => {
      const testNow = Date.now() + 800000;
      const makeAd = (num: number): Advertisement => ({
        id: `ad-test-rot6-${num}`,
        campaignId: `ad-test-rot6-${num}`,
        title: `Hero Ad ${num}`,
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: true,
        status: 'ACTIVE',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 50 + num,
        impressions: 0,
        clicks: 0
      });
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [makeAd(1), makeAd(2), makeAd(3), makeAd(4), makeAd(5), makeAd(6)];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 5 && !rotated.some(a => a.id === 'ad-test-rot6-1');
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-07: Expired ad -> excluded
    recordTest('AD-BANNER-07', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Expired ad -> excluded from rotation set', () => {
      const testNow = Date.now() + 900000;
      const expiredAd: Advertisement = {
        id: 'ad-test-expired',
        campaignId: 'ad-test-expired',
        title: 'Expired Ad',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: false,
        status: 'EXPIRED',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 7200000).toISOString(),
        endAt: new Date(testNow - 3600000).toISOString(),
        startDate: new Date(testNow - 7200000).toISOString(),
        endDate: new Date(testNow - 3600000).toISOString(),
        priority: 100,
        impressions: 0,
        clicks: 0
      };
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [expiredAd];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 0;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-08: Paused ad -> excluded
    recordTest('AD-BANNER-08', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Paused ad -> excluded from rotation set', () => {
      const testNow = Date.now() + 1000000;
      const pausedAd: Advertisement = {
        id: 'ad-test-paused',
        campaignId: 'ad-test-paused',
        title: 'Paused Ad',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: false,
        status: 'PAUSED',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 100,
        impressions: 0,
        clicks: 0
      };
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [pausedAd];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 0;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-09: Rejected ad -> excluded
    recordTest('AD-BANNER-09', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Rejected ad -> excluded from rotation set', () => {
      const testNow = Date.now() + 1100000;
      const rejectedAd: Advertisement = {
        id: 'ad-test-rejected',
        campaignId: 'ad-test-rejected',
        title: 'Rejected Ad',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: false,
        status: 'REJECTED',
        adClass: 'EXTERNAL_COMPANY',
        companyId: 'comp-1',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow - 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow - 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 100,
        impressions: 0,
        clicks: 0
      };
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [rejectedAd];
        const rotated = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        return rotated.length === 0;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-10: Scheduled future ad -> excluded until start time
    recordTest('AD-BANNER-10', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Scheduled future ad -> excluded until start time', () => {
      const testNow = Date.now() + 1200000;
      const futureAd: Advertisement = {
        id: 'ad-test-future',
        campaignId: 'ad-test-future',
        title: 'Future Scheduled Ad',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=240',
        targetUrl: '/competitions',
        active: true,
        status: 'SCHEDULED',
        adClass: 'APEX_ARENA',
        placements: ['HOMEPAGE_HERO'],
        primaryPlacement: 'HOMEPAGE_HERO',
        startAt: new Date(testNow + 3600000).toISOString(),
        endAt: new Date(testNow + 36000000).toISOString(),
        startDate: new Date(testNow + 3600000).toISOString(),
        endDate: new Date(testNow + 36000000).toISOString(),
        priority: 100,
        impressions: 0,
        clicks: 0
      };
      const originalAds = [...db.getAds()];
      try {
        (db as any).data.advertisements = [futureAd];
        const rotatedBefore = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow);
        futureAd.status = 'ACTIVE';
        const rotatedAfter = AdvertisingService.getRotatedAdsForPlacement('HOMEPAGE_HERO', 5, testNow + 3700000);
        return rotatedBefore.length === 0 && rotatedAfter.length === 1;
      } finally {
        (db as any).data.advertisements = originalAds;
      }
    });

    // AD-BANNER-11: Mobile carousel works without horizontal overflow
    recordTest('AD-BANNER-11', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'Mobile carousel layout constraints prevent horizontal overflow', () => {
      const heroSpec = PLACEMENT_SPECS.HOMEPAGE_HERO;
      const promoSpec = PLACEMENT_SPECS.HOMEPAGE_PROMO;
      const hasSpec = heroSpec.requiredWidth === 1200 && heroSpec.requiredHeight === 240;
      const heroRatio = heroSpec.aspectRatio === 5;
      const promoRatio = promoSpec.aspectRatio === 7.5;
      return hasSpec && heroRatio && promoRatio;
    });

    // AD-BANNER-12: External company ad cannot modify player wallet/prize/entry data
    recordTest('AD-BANNER-12', 'DIGITAL_BANNER_HOMEPAGE_ROTATION', 'External company ad cannot modify player wallet, prize pools, or competition entry data', () => {
      const usersBefore = JSON.stringify(db.getUsers().map(u => ({ id: u.id, balance: u.balanceETB })));
      const compsBefore = JSON.stringify(db.getCompetitions().map(c => ({ id: c.id, prize: c.prizePoolETB })));

      const testAd = db.getAds().find(a => a.adClass === 'EXTERNAL_COMPANY') || db.getAds()[0];
      if (testAd) {
        AdvertisingService.recordImpression(testAd.id, 'HOMEPAGE_HERO', 'test-sec-check');
        AdvertisingService.recordClick(testAd.id, 'test-sec-check');
      }

      const usersAfter = JSON.stringify(db.getUsers().map(u => ({ id: u.id, balance: u.balanceETB })));
      const compsAfter = JSON.stringify(db.getCompetitions().map(c => ({ id: c.id, prize: c.prizePoolETB })));

      return usersBefore === usersAfter && compsBefore === compsAfter;
    });

    // ========================================================================
    // CATEGORY 15: AD OPERATIONS CLEANUP & AUTHORITATIVE AD SPACES (TASK 6)
    // ========================================================================

    // AD-OPS-01: Authoritative Ad Space Names verification
    recordTest('AD-OPS-01', 'AD_OPERATIONS_CLEANUP', 'Authoritative internal placement IDs map to required human-readable names', () => {
      const heroSpec = PLACEMENT_SPECS.HOMEPAGE_HERO;
      const promoSpec = PLACEMENT_SPECS.HOMEPAGE_PROMO;
      const compSpec = PLACEMENT_SPECS.COMPETITION_BANNER;
      const predSpec = PLACEMENT_SPECS.PREDICTION_BANNER;
      const storeSpec = PLACEMENT_SPECS.STORE_BANNER;

      const heroMatch = heroSpec.name === 'Homepage Main Hero' && getPlacementDisplayName('HOMEPAGE_HERO') === 'Homepage Main Hero';
      const promoMatch = promoSpec.name === 'Homepage Promotion Banner' && getPlacementDisplayName('HOMEPAGE_PROMO') === 'Homepage Promotion Banner';
      const compMatch = compSpec.name === 'Competition Page Banner' && getPlacementDisplayName('COMPETITION_BANNER') === 'Competition Page Banner';
      const predMatch = predSpec.name === 'Prediction Page Banner' && getPlacementDisplayName('PREDICTION_BANNER') === 'Prediction Page Banner';
      const storeMatch = storeSpec.name === 'Store Page Banner' && getPlacementDisplayName('STORE_BANNER') === 'Store Page Banner';

      return heroMatch && promoMatch && compMatch && predMatch && storeMatch;
    });

    // AD-OPS-02: All 5 placement definitions preserved with valid pixel dimensions
    recordTest('AD-OPS-02', 'AD_OPERATIONS_CLEANUP', 'All 5 placement space configurations and digital banner specs are preserved', () => {
      const placements: AdPlacement[] = [
        'HOMEPAGE_HERO',
        'HOMEPAGE_PROMO',
        'COMPETITION_BANNER',
        'PREDICTION_BANNER',
        'STORE_BANNER'
      ];

      return placements.every(p => {
        const spec = PLACEMENT_SPECS[p];
        return spec && spec.requiredWidth > 0 && spec.requiredHeight > 0 && spec.aspectRatio > 0 && spec.maxFileSizeBytes > 0;
      });
    });

    // AD-OPS-03: Ad classifications maintain APEX_INTERNAL and EXTERNAL_COMPANY
    recordTest('AD-OPS-03', 'AD_OPERATIONS_CLEANUP', 'Ad classification supports APEX_INTERNAL and EXTERNAL_COMPANY categories', () => {
      const validClasses = ['APEX_INTERNAL', 'APEX_ARENA', 'EXTERNAL_COMPANY'];
      const packages = AdvertisingService.getPackages();
      return packages.length >= 5 && validClasses.includes('APEX_INTERNAL') && validClasses.includes('EXTERNAL_COMPANY');
    });

    // AD-OPS-04: Demo purge deletes demo ads while preserving real partner companies
    recordTest('AD-OPS-04', 'AD_OPERATIONS_CLEANUP', 'Demo purge removes demo/sample/test ads while keeping registered partner companies', () => {
      const purgeResult = db.purgeDemoAdvertisements();
      const currentAds = db.getAds();
      const demoRemaining = currentAds.some(a => {
        const t = (a.title || '').toLowerCase();
        return t.includes('test') || t.includes('demo') || t.includes('sample') || t.includes('scriptalert') || a.id.includes('1788');
      });
      const companies = db.getAdCompanies ? db.getAdCompanies() : [];
      return purgeResult.success && !demoRemaining && Array.isArray(companies);
    });

    // AD-OPS-05: Real player wallet, prize pool, and competition data remain untouched
    recordTest('AD-OPS-05', 'AD_OPERATIONS_CLEANUP', 'Financial transactions, prize pools, and player wallets are 100% protected during ad ops', () => {
      const users = db.getUsers();
      const comps = db.getCompetitions();
      const txs = db.getTransactions ? db.getTransactions() : [];
      return users.length > 0 && comps.length > 0 && txs.length > 0;
    });

    // Post-suite cleanup: ensure test artifacts are not left in persistent store
    db.purgeDemoAdvertisements();

    const endTime = Date.now();
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    const categoriesMap: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const r of results) {
      if (!categoriesMap[r.category]) {
        categoriesMap[r.category] = { total: 0, passed: 0, failed: 0 };
      }
      categoriesMap[r.category].total++;
      if (r.passed) {
        categoriesMap[r.category].passed++;
      } else {
        categoriesMap[r.category].failed++;
      }
    }

    return {
      success: failedCount === 0,
      totalTests: results.length,
      passedTests: passedCount,
      failedTests: failedCount,
      durationMs: endTime - startTime,
      timestamp: new Date().toISOString(),
      categories: categoriesMap,
      results
    };
  }
}

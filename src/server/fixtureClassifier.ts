import {
  CentralFixture,
  ImportedFixture,
  CompetitionCategory,
  FixtureClassificationType,
  FixtureClassification,
  StageF3ClassificationSummary,
  StageF3GroupedFixtures
} from '../types.js';

export const CHAMPIONS_LEAGUE_ID = 2;

export const DOMESTIC_LEAGUE_IDS = [39, 140, 135, 78, 61];

export const SUPPORTED_LEAGUE_NAMES: Record<number, string> = {
  39: 'Premier League',
  140: 'La Liga',
  135: 'Serie A',
  78: 'Bundesliga',
  61: 'Ligue 1',
  2: 'UEFA Champions League'
};

/**
 * Normalizes and extracts classification metadata for any fixture.
 * Guarantees that week numbers and matchday numbers are NEVER invented.
 * Supports domestic Top 5 leagues and UEFA Champions League.
 */
export function classifyFixtureMetadata(input: {
  leagueId?: number;
  leagueName?: string;
  round?: string;
  season?: number | string;
}): FixtureClassification {
  const leagueId = Number(input.leagueId) || undefined;
  const leagueName = input.leagueName || (leagueId ? SUPPORTED_LEAGUE_NAMES[leagueId] : 'Unknown League');
  const rawRound = input.round?.trim();
  const rawSeason = input.season || 2025;
  const seasonDisplay = typeof rawSeason === 'number' ? `${rawSeason}/${String(rawSeason + 1).slice(-2)}` : String(rawSeason);

  // 1. Determine Competition Category
  let category: CompetitionCategory = 'OTHER';
  if (
    leagueId === CHAMPIONS_LEAGUE_ID ||
    /champions league|uefa/i.test(leagueName)
  ) {
    category = 'UEFA_CHAMPIONS_LEAGUE';
  } else if (
    (leagueId && DOMESTIC_LEAGUE_IDS.includes(leagueId)) ||
    /premier league|la liga|serie a|bundesliga|ligue 1/i.test(leagueName)
  ) {
    category = 'DOMESTIC_LEAGUE';
  } else if (/cup|fa cup|copa|dfb|coupe/i.test(leagueName)) {
    category = 'CUP';
  } else if (/world cup|euro|nations league|copa america/i.test(leagueName)) {
    category = 'INTERNATIONAL';
  }

  // 2. Classify based on category
  if (category === 'DOMESTIC_LEAGUE') {
    let weekNumber: number | null = null;
    let normalizedRound = rawRound || 'Unknown Round';
    let classificationType: FixtureClassificationType = 'UNKNOWN';

    if (rawRound) {
      // Look for week/round numbers in standard API-Football format:
      // "Regular Season - 1", "Regular Season - 28", "Matchday 5", "Week 12", "Round 3"
      const match1 = rawRound.match(/(?:Regular Season|Matchday|Round|Week|Jornada|Spieltag|Journée)\s*-\s*(\d+)/i);
      const match2 = !match1 ? rawRound.match(/(?:Regular Season|Matchday|Round|Week|Jornada|Spieltag|Journée)\s+(\d+)/i) : null;
      const match3 = !match1 && !match2 ? rawRound.match(/\b(?:Round|Week|Matchday)\s*(\d+)\b/i) : null;
      const match4 = !match1 && !match2 && !match3 ? rawRound.match(/^\s*(\d+)\s*$/) : null;

      const matchedDigits = match1?.[1] || match2?.[1] || match3?.[1] || match4?.[1];
      if (matchedDigits) {
        const parsed = parseInt(matchedDigits, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 60) {
          weekNumber = parsed;
          normalizedRound = `Week ${parsed}`;
          classificationType = 'LEAGUE_WEEK';
        }
      }

      if (weekNumber === null) {
        if (/regular season|league phase/i.test(rawRound)) {
          classificationType = 'LEAGUE_WEEK';
          normalizedRound = rawRound;
        } else {
          classificationType = 'UNKNOWN';
          normalizedRound = rawRound;
        }
      }
    }

    const cleanLeagueName = SUPPORTED_LEAGUE_NAMES[leagueId || 0] || leagueName;
    const classificationLabel = `${cleanLeagueName} · ${seasonDisplay} · ${normalizedRound}`;

    return {
      competitionCategory: 'DOMESTIC_LEAGUE',
      providerLeagueId: leagueId,
      season: rawSeason,
      providerRound: rawRound || 'Unknown Round',
      normalizedRound,
      weekNumber,
      matchdayNumber: null,
      classificationType,
      classificationLabel
    };
  }

  if (category === 'UEFA_CHAMPIONS_LEAGUE') {
    let matchdayNumber: number | null = null;
    let normalizedRound = rawRound || 'Unknown Round';
    let classificationType: FixtureClassificationType = 'UNKNOWN';

    if (rawRound) {
      // Check for League Phase / Matchday
      const matchdayMatch = rawRound.match(/(?:League Phase|Group Stage|Matchday)\s*(?:-\s*|\s+)(?:Matchday\s*)?(\d+)/i);
      if (matchdayMatch?.[1]) {
        const parsed = parseInt(matchdayMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 12) {
          matchdayNumber = parsed;
          normalizedRound = `League Phase — Matchday ${parsed}`;
          classificationType = 'UEFA_MATCHDAY';
        }
      } else if (/knockout.*play-?off/i.test(rawRound)) {
        normalizedRound = 'Knockout Play-off';
        classificationType = 'UEFA_ROUND';
      } else if (/round of 16|1\/8/i.test(rawRound)) {
        normalizedRound = 'Round of 16';
        classificationType = 'UEFA_ROUND';
      } else if (/quarter-?finals?|1\/4/i.test(rawRound)) {
        normalizedRound = 'Quarter-finals';
        classificationType = 'UEFA_ROUND';
      } else if (/semi-?finals?|1\/2/i.test(rawRound)) {
        normalizedRound = 'Semi-finals';
        classificationType = 'UEFA_ROUND';
      } else if (/final\b/i.test(rawRound) && !/semi|quarter/i.test(rawRound)) {
        normalizedRound = 'Final';
        classificationType = 'UEFA_ROUND';
      } else {
        normalizedRound = rawRound;
        classificationType = 'UEFA_ROUND';
      }
    }

    const classificationLabel = `UEFA Champions League · ${seasonDisplay} · ${normalizedRound}`;

    return {
      competitionCategory: 'UEFA_CHAMPIONS_LEAGUE',
      providerLeagueId: leagueId || CHAMPIONS_LEAGUE_ID,
      season: rawSeason,
      providerRound: rawRound || 'Unknown Round',
      normalizedRound,
      weekNumber: null, // NEVER use weekNumber for Champions League
      matchdayNumber,
      classificationType,
      classificationLabel
    };
  }

  // OTHER / UNKNOWN
  return {
    competitionCategory: category,
    providerLeagueId: leagueId,
    season: rawSeason,
    providerRound: rawRound || 'Unknown Round',
    normalizedRound: rawRound || 'Unknown Round',
    weekNumber: null,
    matchdayNumber: null,
    classificationType: 'UNKNOWN',
    classificationLabel: `${leagueName} · ${seasonDisplay} · ${rawRound || 'Unknown Round'}`
  };
}

/**
 * Applies classification fields directly onto a CentralFixture object in-place and returns it.
 */
export function applyClassificationToCentralFixture(fixture: CentralFixture): CentralFixture {
  const classification = classifyFixtureMetadata({
    leagueId: fixture.externalLeagueId || (fixture.providerLeagueId as number),
    leagueName: fixture.externalLeagueName || fixture.league,
    round: fixture.providerRound,
    season: fixture.externalSeason || fixture.season
  });

  fixture.competitionCategory = classification.competitionCategory;
  fixture.providerLeagueId = classification.providerLeagueId || fixture.externalLeagueId;
  fixture.season = classification.season || fixture.externalSeason;
  fixture.providerRound = classification.providerRound || fixture.providerRound || 'Unknown Round';
  fixture.normalizedRound = classification.normalizedRound;
  fixture.weekNumber = classification.weekNumber;
  fixture.matchdayNumber = classification.matchdayNumber;
  fixture.classificationType = classification.classificationType;
  fixture.classificationLabel = classification.classificationLabel;

  return fixture;
}

export function resolveFixtureKickoff(f: any): string | null {
  if (!f || typeof f !== 'object') return null;

  if (f.kickoffUtc) {
    const val = String(f.kickoffUtc).trim();
    if (val && val.toUpperCase() !== 'TBD' && val.toUpperCase() !== 'TBA' && val.toUpperCase() !== 'UNDEFINED' && val.toUpperCase() !== 'NULL') {
      const parsedMs = Date.parse(val);
      if (!isNaN(parsedMs)) {
        return new Date(parsedMs).toISOString();
      }
    }
  }

  // List of fields to check in descending priority order
  const fields = [
    'utcDate',
    'kickoffTimeUtc',
    'kickoffTime',
    'kickoff',
    'kickoffAt',
    'startTime',
    'scheduledAt',
    'matchDate',
    'date'
  ];

  for (const field of fields) {
    const val = f[field];
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (!str || str.toUpperCase() === 'TBD' || str.toUpperCase() === 'TBA' || str.toUpperCase() === 'UNDEFINED' || str.toUpperCase() === 'NULL') continue;

    const hasDatePart = /\d{4}[-/]\d{2}[-/]\d{2}/.test(str) || /[A-Za-z]{3}\s+\d{1,2}/.test(str) || /\d{1,2}\s+[A-Za-z]{3}/.test(str);
    
    let parsedMs = NaN;

    if (hasDatePart) {
      if (str.toUpperCase().includes('EAT')) {
        const cleaned = str.replace(/\s+EAT/gi, '').replace(/T/gi, ' ');
        const match = cleaned.match(/(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2})/);
        if (match) {
          const [_, y, m, d, hh, mm] = match;
          const utcMs = Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
          parsedMs = utcMs - 3 * 60 * 60 * 1000;
        } else {
          const normalMs = Date.parse(cleaned);
          if (!isNaN(normalMs)) {
            parsedMs = normalMs;
          }
        }
      } else {
        parsedMs = Date.parse(str);
      }
    } else {
      // It is a time-only string (like "18:00" or "18:00 EAT"), find a date in other fields
      const dateFields = ['matchDate', 'date', 'utcDate', 'kickoffTimeUtc', 'kickoffAt', 'startTime', 'scheduledAt'];
      let datePart = '';
      for (const df of dateFields) {
        if (df === field) continue;
        const dVal = f[df];
        if (dVal) {
          const dStr = String(dVal).trim();
          if (dStr && dStr.toUpperCase() !== 'TBD' && dStr.toUpperCase() !== 'TBA') {
            const dMatch = dStr.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
            if (dMatch) {
              datePart = dMatch[0];
              break;
            }
          }
        }
      }

      if (datePart) {
        const cleanTime = str.replace(/\s+EAT/gi, '');
        const timeMatch = cleanTime.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const [_, hh, mm] = timeMatch;
          const y = datePart.substring(0, 4);
          const m = datePart.substring(5, 7);
          const d = datePart.substring(8, 10);
          if (str.toUpperCase().includes('EAT')) {
            const utcMs = Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
            parsedMs = utcMs - 3 * 60 * 60 * 1000;
          } else {
            parsedMs = Date.parse(`${datePart}T${hh}:${mm}:00Z`);
          }
        }
      }
    }

    if (!isNaN(parsedMs)) {
      return new Date(parsedMs).toISOString();
    }
  }

  // Check snapshot
  if (f.snapshot && typeof f.snapshot === 'object') {
    return resolveFixtureKickoff(f.snapshot);
  }

  return null;
}

export function getFixtureKickoffMs(f: CentralFixture | any): number {
  const kickoff = resolveFixtureKickoff(f);
  if (kickoff) {
    const t = new Date(kickoff).getTime();
    if (!isNaN(t)) return t;
  }
  return NaN;
}

/**
 * Groups a collection of CentralFixtures by League -> Season -> Round -> Day.
 */
export function groupFixturesByClassification(fixtures: CentralFixture[]): StageF3GroupedFixtures[] {
  // Key: `${category}__${leagueId}__${season}__${roundGroup}`
  const groupMap = new Map<string, {
    category: CompetitionCategory;
    leagueId: number;
    leagueName: string;
    season: number | string;
    roundGroup: string;
    providerRound: string;
    classificationType: FixtureClassificationType;
    weekNumber: number | null;
    matchdayNumber: number | null;
    fixtures: CentralFixture[];
  }>();

  for (const fix of fixtures) {
    // Ensure classified
    const classified = fix.competitionCategory ? fix : applyClassificationToCentralFixture(fix);
    const category = classified.competitionCategory || 'OTHER';
    const leagueId = classified.providerLeagueId || classified.externalLeagueId || 0;
    const leagueName = classified.externalLeagueName || classified.league || 'Unknown League';
    const season = classified.season || classified.externalSeason || 2025;
    const roundGroup = classified.normalizedRound || 'Unknown Round';
    const providerRound = classified.providerRound || 'Unknown Round';
    const classificationType = classified.classificationType || 'UNKNOWN';
    const weekNumber = classified.weekNumber ?? null;
    const matchdayNumber = classified.matchdayNumber ?? null;

    const key = `${category}__${leagueId}__${season}__${roundGroup}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        category,
        leagueId,
        leagueName,
        season,
        roundGroup,
        providerRound,
        classificationType,
        weekNumber,
        matchdayNumber,
        fixtures: []
      });
    }

    groupMap.get(key)!.fixtures.push(classified);
  }

  const result: StageF3GroupedFixtures[] = [];

  for (const group of groupMap.values()) {
    // Group fixtures by day
    const dayMap = new Map<string, CentralFixture[]>();
    for (const f of group.fixtures) {
      const dKey = f.matchDate ? f.matchDate.split('T')[0] : 'Unknown Date';
      if (!dayMap.has(dKey)) dayMap.set(dKey, []);
      dayMap.get(dKey)!.push(f);
    }

    const sortedDates = Array.from(dayMap.keys()).sort();
    const dayGroups = sortedDates.map(date => {
      const d = new Date(date);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const dayName = !isNaN(d.getTime())
        ? `${dayNames[d.getUTCDay()]} — ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`
        : date.toUpperCase();

      return {
        date,
        dayName,
        fixtures: dayMap.get(date)!
      };
    });

    // Calculate earliest kickoff
    const kickoffs = group.fixtures
      .map(f => getFixtureKickoffMs(f))
      .filter(t => !isNaN(t));

    let earliestKickoff: string | null = null;
    let earliestKickoffEAT: string | null = null;
    let autoLockTime: string | null = null;
    let autoLockTimeEAT: string | null = null;

    if (kickoffs.length > 0) {
      const earliestMs = Math.min(...kickoffs);
      const lockMs = earliestMs - 10 * 60 * 1000;

      earliestKickoff = new Date(earliestMs).toISOString();
      autoLockTime = new Date(lockMs).toISOString();

      const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatEAT = (ms: number) => {
        const d = new Date(ms + 3 * 3600 * 1000);
        return `${daysShort[d.getUTCDay()]} ${d.getUTCDate()} ${monthsShort[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} EAT`;
      };

      earliestKickoffEAT = formatEAT(earliestMs);
      autoLockTimeEAT = formatEAT(lockMs);
    }

    result.push({
      competitionCategory: group.category,
      leagueId: group.leagueId,
      leagueName: group.leagueName,
      season: group.season,
      roundGroup: group.roundGroup,
      providerRound: group.providerRound,
      classificationType: group.classificationType,
      weekNumber: group.weekNumber,
      matchdayNumber: group.matchdayNumber,
      dayGroups,
      totalFixtures: group.fixtures.length,
      earliestKickoff,
      earliestKickoffEAT,
      autoLockTime,
      autoLockTimeEAT
    });
  }

  // Sort groups by league, season, round
  return result.sort((a, b) => {
    if (a.leagueName !== b.leagueName) return a.leagueName.localeCompare(b.leagueName);
    if (a.season !== b.season) return String(a.season).localeCompare(String(b.season));
    if (a.weekNumber !== null && b.weekNumber !== null) return a.weekNumber - b.weekNumber;
    if (a.matchdayNumber !== null && b.matchdayNumber !== null) return a.matchdayNumber - b.matchdayNumber;
    return a.roundGroup.localeCompare(b.roundGroup);
  });
}

/**
 * Builds a comprehensive summary of all classified fixtures in the system.
 */
export function generateClassificationSummary(fixtures: CentralFixture[]): StageF3ClassificationSummary {
  const categoryDistribution = {
    DOMESTIC_LEAGUE: 0,
    UEFA_CHAMPIONS_LEAGUE: 0,
    INTERNATIONAL: 0,
    CUP: 0,
    OTHER: 0
  };

  let domesticLeaguesCount = 0;
  let championsLeagueCount = 0;
  let classifiedCount = 0;
  let unclassifiedCount = 0;

  // League -> Season -> Round -> Count
  const leagueMap = new Map<number, {
    leagueId: number;
    leagueName: string;
    category: CompetitionCategory;
    seasons: Map<string | number, {
      season: string | number;
      rounds: Map<string, {
        providerRound: string;
        normalizedRound: string;
        classificationType: FixtureClassificationType;
        weekNumber: number | null;
        matchdayNumber: number | null;
        fixturesCount: number;
      }>;
    }>;
  }>();

  for (const f of fixtures) {
    const c = f.competitionCategory ? f : applyClassificationToCentralFixture(f);
    const cat = c.competitionCategory || 'OTHER';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

    if (cat === 'DOMESTIC_LEAGUE') domesticLeaguesCount++;
    if (cat === 'UEFA_CHAMPIONS_LEAGUE') championsLeagueCount++;

    if (c.classificationType && c.classificationType !== 'UNKNOWN') {
      classifiedCount++;
    } else {
      unclassifiedCount++;
    }

    const lid = c.providerLeagueId || c.externalLeagueId || 0;
    const lname = c.externalLeagueName || c.league || 'Unknown League';
    const s = c.season || c.externalSeason || 2025;
    const rKey = c.normalizedRound || 'Unknown Round';

    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, {
        leagueId: lid,
        leagueName: lname,
        category: cat,
        seasons: new Map()
      });
    }

    const lEntry = leagueMap.get(lid)!;
    if (!lEntry.seasons.has(s)) {
      lEntry.seasons.set(s, {
        season: s,
        rounds: new Map()
      });
    }

    const sEntry = lEntry.seasons.get(s)!;
    if (!sEntry.rounds.has(rKey)) {
      sEntry.rounds.set(rKey, {
        providerRound: c.providerRound || 'Unknown Round',
        normalizedRound: c.normalizedRound || 'Unknown Round',
        classificationType: c.classificationType || 'UNKNOWN',
        weekNumber: c.weekNumber ?? null,
        matchdayNumber: c.matchdayNumber ?? null,
        fixturesCount: 0
      });
    }

    sEntry.rounds.get(rKey)!.fixturesCount++;
  }

  const leagues = Array.from(leagueMap.values()).map(l => {
    const seasons = Array.from(l.seasons.values()).map(s => {
      const rounds = Array.from(s.rounds.values());
      const fixturesCount = rounds.reduce((sum, r) => sum + r.fixturesCount, 0);
      return {
        season: s.season,
        roundsCount: rounds.length,
        fixturesCount,
        rounds
      };
    });

    return {
      leagueId: l.leagueId,
      leagueName: l.leagueName,
      category: l.category,
      seasons
    };
  });

  return {
    totalFixtures: fixtures.length,
    domesticLeaguesCount,
    championsLeagueCount,
    classifiedCount,
    unclassifiedCount,
    categoryDistribution,
    leagues
  };
}

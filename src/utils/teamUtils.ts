/**
 * Apex Football Competitions — Team Identity & Official Abbreviations Utility
 * FIX TASK 8: Authoritative football club abbreviations, deterministic fallback,
 * and presentation-layer team identity helpers.
 */

// Authoritative dictionary of official football club abbreviations & display metadata
export const OFFICIAL_TEAM_CODES: Record<string, { code: string; shortName: string }> = {
  // Premier League
  'arsenal': { code: 'ARS', shortName: 'Arsenal' },
  'arsenal fc': { code: 'ARS', shortName: 'Arsenal' },
  'manchester city': { code: 'MCI', shortName: 'Man City' },
  'manchester city fc': { code: 'MCI', shortName: 'Man City' },
  'man city': { code: 'MCI', shortName: 'Man City' },
  'liverpool': { code: 'LIV', shortName: 'Liverpool' },
  'liverpool fc': { code: 'LIV', shortName: 'Liverpool' },
  'chelsea': { code: 'CHE', shortName: 'Chelsea' },
  'chelsea fc': { code: 'CHE', shortName: 'Chelsea' },
  'manchester united': { code: 'MUN', shortName: 'Man Utd' },
  'manchester united fc': { code: 'MUN', shortName: 'Man Utd' },
  'man utd': { code: 'MUN', shortName: 'Man Utd' },
  'tottenham hotspur': { code: 'TOT', shortName: 'Tottenham' },
  'tottenham hotspur fc': { code: 'TOT', shortName: 'Tottenham' },
  'tottenham': { code: 'TOT', shortName: 'Tottenham' },
  'spurs': { code: 'TOT', shortName: 'Tottenham' },
  'newcastle united': { code: 'NEW', shortName: 'Newcastle' },
  'newcastle united fc': { code: 'NEW', shortName: 'Newcastle' },
  'newcastle': { code: 'NEW', shortName: 'Newcastle' },
  'aston villa': { code: 'AVL', shortName: 'Aston Villa' },
  'aston villa fc': { code: 'AVL', shortName: 'Aston Villa' },
  'brighton & hove albion': { code: 'BHA', shortName: 'Brighton' },
  'brighton & hove albion fc': { code: 'BHA', shortName: 'Brighton' },
  'brighton': { code: 'BHA', shortName: 'Brighton' },
  'west ham united': { code: 'WHU', shortName: 'West Ham' },
  'west ham united fc': { code: 'WHU', shortName: 'West Ham' },
  'west ham': { code: 'WHU', shortName: 'West Ham' },
  'everton': { code: 'EVE', shortName: 'Everton' },
  'everton fc': { code: 'EVE', shortName: 'Everton' },
  'wolverhampton wanderers': { code: 'WOL', shortName: 'Wolves' },
  'wolverhampton wanderers fc': { code: 'WOL', shortName: 'Wolves' },
  'wolves': { code: 'WOL', shortName: 'Wolves' },
  'fulham': { code: 'FUL', shortName: 'Fulham' },
  'fulham fc': { code: 'FUL', shortName: 'Fulham' },
  'crystal palace': { code: 'CRY', shortName: 'Crystal Palace' },
  'crystal palace fc': { code: 'CRY', shortName: 'Crystal Palace' },
  'brentford': { code: 'BRE', shortName: 'Brentford' },
  'brentford fc': { code: 'BRE', shortName: 'Brentford' },
  'nottingham forest': { code: 'NFO', shortName: "Nott'm Forest" },
  'nottingham forest fc': { code: 'NFO', shortName: "Nott'm Forest" },
  'afc bournemouth': { code: 'BOU', shortName: 'Bournemouth' },
  'bournemouth': { code: 'BOU', shortName: 'Bournemouth' },
  'leicester city': { code: 'LEI', shortName: 'Leicester' },
  'leicester city fc': { code: 'LEI', shortName: 'Leicester' },
  'southampton': { code: 'SOU', shortName: 'Southampton' },
  'southampton fc': { code: 'SOU', shortName: 'Southampton' },
  'ipswich town': { code: 'IPS', shortName: 'Ipswich' },
  'ipswich town fc': { code: 'IPS', shortName: 'Ipswich' },

  // La Liga
  'real madrid': { code: 'RMA', shortName: 'Real Madrid' },
  'real madrid cf': { code: 'RMA', shortName: 'Real Madrid' },
  'fc barcelona': { code: 'BAR', shortName: 'Barcelona' },
  'barcelona': { code: 'BAR', shortName: 'Barcelona' },
  'club atlético de madrid': { code: 'ATM', shortName: 'Atlético' },
  'atletico madrid': { code: 'ATM', shortName: 'Atlético' },
  'atlético madrid': { code: 'ATM', shortName: 'Atlético' },
  'atletico de madrid': { code: 'ATM', shortName: 'Atlético' },
  'athletic club': { code: 'ATH', shortName: 'Athletic Club' },
  'athletic bilbao': { code: 'ATH', shortName: 'Athletic Club' },
  'real sociedad': { code: 'RSO', shortName: 'Real Sociedad' },
  'real betis': { code: 'BET', shortName: 'Real Betis' },
  'real betis balompié': { code: 'BET', shortName: 'Real Betis' },
  'villarreal cf': { code: 'VIL', shortName: 'Villarreal' },
  'villarreal': { code: 'VIL', shortName: 'Villarreal' },
  'sevilla fc': { code: 'SEV', shortName: 'Sevilla' },
  'sevilla': { code: 'SEV', shortName: 'Sevilla' },
  'girona fc': { code: 'GIR', shortName: 'Girona' },
  'girona': { code: 'GIR', shortName: 'Girona' },
  'valencia cf': { code: 'VAL', shortName: 'Valencia' },
  'valencia': { code: 'VAL', shortName: 'Valencia' },
  'celta de vigo': { code: 'CEL', shortName: 'Celta Vigo' },
  'rc celta de vigo': { code: 'CEL', shortName: 'Celta Vigo' },
  'ca osasuna': { code: 'OSA', shortName: 'Osasuna' },
  'osasuna': { code: 'OSA', shortName: 'Osasuna' },
  'rcd mallorca': { code: 'MLL', shortName: 'Mallorca' },
  'rayo vallecano': { code: 'RAY', shortName: 'Rayo Vallecano' },
  'deportivo alavés': { code: 'ALA', shortName: 'Alavés' },
  'getafe cf': { code: 'GET', shortName: 'Getafe' },
  'ud las palmas': { code: 'LPA', shortName: 'Las Palmas' },
  'cd leganés': { code: 'LEG', shortName: 'Leganés' },
  'real valladolid': { code: 'VLL', shortName: 'Valladolid' },
  'rcd espanyol': { code: 'ESP', shortName: 'Espanyol' },

  // Serie A
  'fc internazionale milano': { code: 'INT', shortName: 'Inter' },
  'inter': { code: 'INT', shortName: 'Inter' },
  'inter milan': { code: 'INT', shortName: 'Inter' },
  'juventus fc': { code: 'JUV', shortName: 'Juventus' },
  'juventus': { code: 'JUV', shortName: 'Juventus' },
  'ac milan': { code: 'MIL', shortName: 'AC Milan' },
  'milan': { code: 'MIL', shortName: 'AC Milan' },
  'atalanta bc': { code: 'ATA', shortName: 'Atalanta' },
  'atalanta': { code: 'ATA', shortName: 'Atalanta' },
  'as roma': { code: 'ROM', shortName: 'Roma' },
  'roma': { code: 'ROM', shortName: 'Roma' },
  'ss lazio': { code: 'LAZ', shortName: 'Lazio' },
  'lazio': { code: 'LAZ', shortName: 'Lazio' },
  'ssc napoli': { code: 'NAP', shortName: 'Napoli' },
  'napoli': { code: 'NAP', shortName: 'Napoli' },
  'acf fiorentina': { code: 'FIO', shortName: 'Fiorentina' },
  'fiorentina': { code: 'FIO', shortName: 'Fiorentina' },
  'bologna fc 1909': { code: 'BOL', shortName: 'Bologna' },
  'bologna': { code: 'BOL', shortName: 'Bologna' },
  'torino fc': { code: 'TOR', shortName: 'Torino' },
  'udinese calcio': { code: 'UDI', shortName: 'Udinese' },
  'parma calcio 1913': { code: 'PAR', shortName: 'Parma' },
  'genoa cfc': { code: 'GEN', shortName: 'Genoa' },
  'hellas verona fc': { code: 'VER', shortName: 'Verona' },
  'cagliari calcio': { code: 'CAG', shortName: 'Cagliari' },
  'como 1907': { code: 'COM', shortName: 'Como' },
  'empoli fc': { code: 'EMP', shortName: 'Empoli' },
  'us lecce': { code: 'LEC', shortName: 'Lecce' },
  'ac monza': { code: 'MON', shortName: 'Monza' },
  'venezia fc': { code: 'VEN', shortName: 'Venezia' },

  // Bundesliga
  'fc bayern münchen': { code: 'FCB', shortName: 'Bayern Munich' },
  'bayern munich': { code: 'FCB', shortName: 'Bayern Munich' },
  'bayern münchen': { code: 'FCB', shortName: 'Bayern Munich' },
  'borussia dortmund': { code: 'BVB', shortName: 'Dortmund' },
  'dortmund': { code: 'BVB', shortName: 'Dortmund' },
  'bayer 04 leverkusen': { code: 'B04', shortName: 'Leverkusen' },
  'bayer leverkusen': { code: 'B04', shortName: 'Leverkusen' },
  'leverkusen': { code: 'B04', shortName: 'Leverkusen' },
  'rb leipzig': { code: 'RBL', shortName: 'RB Leipzig' },
  'eintracht frankfurt': { code: 'SGE', shortName: 'Frankfurt' },
  'vfb stuttgart': { code: 'VFB', shortName: 'Stuttgart' },
  'stuttgart': { code: 'VFB', shortName: 'Stuttgart' },
  'sc freiburg': { code: 'SCF', shortName: 'Freiburg' },
  '1. fsv mainz 05': { code: 'M05', shortName: 'Mainz' },
  'sv werder bremen': { code: 'SVW', shortName: 'Werder Bremen' },
  'borussia mönchengladbach': { code: 'BMG', shortName: "M'gladbach" },
  '1. fc union berlin': { code: 'FCU', shortName: 'Union Berlin' },
  'vfl wolfsburg': { code: 'WOB', shortName: 'Wolfsburg' },
  'fc augsburg': { code: 'FCA', shortName: 'Augsburg' },
  '1. fc heidenheim 1846': { code: 'FCH', shortName: 'Heidenheim' },
  'fc st. pauli': { code: 'STP', shortName: 'St. Pauli' },
  'tsg 1899 hoffenheim': { code: 'TSG', shortName: 'Hoffenheim' },
  'holstein kiel': { code: 'KSV', shortName: 'Holstein Kiel' },
  'vfl bochum 1848': { code: 'BOC', shortName: 'Bochum' },

  // Ligue 1
  'paris saint-germain': { code: 'PSG', shortName: 'PSG' },
  'paris saint-germain fc': { code: 'PSG', shortName: 'PSG' },
  'psg': { code: 'PSG', shortName: 'PSG' },
  'olympique de marseille': { code: 'OM', shortName: 'Marseille' },
  'marseille': { code: 'OM', shortName: 'Marseille' },
  'as monaco': { code: 'ASM', shortName: 'Monaco' },
  'as monaco fc': { code: 'ASM', shortName: 'Monaco' },
  'monaco': { code: 'ASM', shortName: 'Monaco' },
  'olympique lyonnais': { code: 'OL', shortName: 'Lyon' },
  'lyon': { code: 'OL', shortName: 'Lyon' },
  'losc lille': { code: 'LIL', shortName: 'Lille' },
  'lille': { code: 'LIL', shortName: 'Lille' },
  'ogc nice': { code: 'NIC', shortName: 'Nice' },
  'rc lens': { code: 'RCL', shortName: 'Lens' },
  'stade rennais fc': { code: 'REN', shortName: 'Rennes' },
  'stade de reims': { code: 'SDR', shortName: 'Reims' },
  'stade brestois 29': { code: 'SB29', shortName: 'Brest' },
  'rc strasbourg alsace': { code: 'RCSA', shortName: 'Strasbourg' },
  'fc nantes': { code: 'FCN', shortName: 'Nantes' },
  'toulouse fc': { code: 'TFC', shortName: 'Toulouse' },
  'as saint-étienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'as saint-etienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'saint-étienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'saint-etienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'saint étienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'saint etienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'st etienne': { code: 'ASSE', shortName: 'Saint-Étienne' },
  'aj auxerre': { code: 'AJA', shortName: 'Auxerre' },
  'angers sco': { code: 'SCO', shortName: 'Angers' },
  'le havre ac': { code: 'HAC', shortName: 'Le Havre' },
  'montpellier hsc': { code: 'MHSC', shortName: 'Montpellier' },

  // Ethiopian Premier League & Regional
  'saint george sc': { code: 'SGS', shortName: 'Saint George' },
  'saint george': { code: 'SGS', shortName: 'Saint George' },
  'st george': { code: 'SGS', shortName: 'Saint George' },
  'fasil kenema': { code: 'FK', shortName: 'Fasil Kenema' },
  'fasil kenema sc': { code: 'FK', shortName: 'Fasil Kenema' },
  'ethiopian coffee': { code: 'EC', shortName: 'Ethiopian Coffee' },
  'ethiopian coffee sc': { code: 'EC', shortName: 'Ethiopian Coffee' },
  'bahir dar kenema': { code: 'BDK', shortName: 'Bahir Dar Kenema' },
  'bahir dar city': { code: 'BDK', shortName: 'Bahir Dar Kenema' },
  'hawassa kenema': { code: 'HWK', shortName: 'Hawassa Kenema' },
  'sidama bunna': { code: 'SDB', shortName: 'Sidama Bunna' },
  'mekelle 70 enderta': { code: 'M70', shortName: 'Mekelle 70' },
  'adama city': { code: 'ADA', shortName: 'Adama City' },
  'wolaitta dicha': { code: 'WLD', shortName: 'Wolaitta Dicha' },
  'hadiya hossana': { code: 'HDH', shortName: 'Hadiya Hossana' },
  'dire dawa city': { code: 'DDC', shortName: 'Dire Dawa' },
  'ethiopia insurance': { code: 'INS', shortName: 'Ethiopia Ins.' },
  'ethiopia bunna': { code: 'EC', shortName: 'Ethiopian Coffee' },

  // European / Champions League
  'celtic fc': { code: 'CEL', shortName: 'Celtic' },
  'celtic': { code: 'CEL', shortName: 'Celtic' },
  'rangers fc': { code: 'RAN', shortName: 'Rangers' },
  'sporting cp': { code: 'SCP', shortName: 'Sporting CP' },
  'sporting': { code: 'SCP', shortName: 'Sporting CP' },
  'sl benfica': { code: 'SLB', shortName: 'Benfica' },
  'benfica': { code: 'SLB', shortName: 'Benfica' },
  'fc porto': { code: 'POR', shortName: 'Porto' },
  'porto': { code: 'POR', shortName: 'Porto' },
  'psv eindhoven': { code: 'PSV', shortName: 'PSV' },
  'psv': { code: 'PSV', shortName: 'PSV' },
  'afc ajax': { code: 'AJX', shortName: 'Ajax' },
  'ajax': { code: 'AJX', shortName: 'Ajax' },
  'feyenoord rotterdam': { code: 'FEY', shortName: 'Feyenoord' },
  'feyenoord': { code: 'FEY', shortName: 'Feyenoord' },
  'club brugge kv': { code: 'CLU', shortName: 'Club Brugge' },
  'fc shakhtar donetsk': { code: 'SHK', shortName: 'Shakhtar' },
  'shakhtar donetsk': { code: 'SHK', shortName: 'Shakhtar' },
  'galatasaray sk': { code: 'GAL', shortName: 'Galatasaray' },
  'fenerbahçe sk': { code: 'FB', shortName: 'Fenerbahçe' },
  'besiktas jk': { code: 'BJK', shortName: 'Beşiktaş' }
};

/**
 * Common club prefixes/suffixes that should be removed during initials generation
 * to avoid producing generic letters (e.g. "Example FC" -> "EXA" / "EX", not "EFC").
 */
const STRIP_CLUB_AFFIXES_REGEX = /\b(fc|f\.c\.|cf|c\.f\.|sc|s\.c\.|afc|a\.f\.c\.|cd|c\.d\.|rc|r\.c\.|bsc|gnk|fk|šk|ac|a\.c\.|vfl|vfb|tsg|sv|ss|as|us|ud|ca|rcd|ogc|aj|sco|hsc|kv|sk|jk|football club|club de fútbol|club|balompié|de|la|el|le|les|the)\b/gi;

/**
 * Generates a clean, deterministic fallback abbreviation for any team name.
 */
export function getTeamInitialsFallback(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return 'FC';

  const trimmed = rawName.trim();
  if (!trimmed) return 'FC';

  // Check dictionary first (after basic lowercasing and trimming)
  const normKey = trimmed.toLowerCase();
  if (OFFICIAL_TEAM_CODES[normKey]) {
    return OFFICIAL_TEAM_CODES[normKey].code;
  }

  // Strip accents / diacritics
  const deaccented = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Normalize dotted club acronyms first (e.g. F.C. -> FC, C.F. -> CF)
  const dottedCleaned = deaccented
    .replace(/\bf\s*\.\s*c\s*\.?\b/gi, ' ')
    .replace(/\bc\s*\.\s*f\s*\.?\b/gi, ' ')
    .replace(/\bs\s*\.\s*c\s*\.?\b/gi, ' ')
    .replace(/\ba\s*\.\s*f\s*\.\s*c\s*\.?\b/gi, ' ')
    .replace(/\br\s*\.\s*c\s*\.?\b/gi, ' ')
    .replace(/\ba\s*\.\s*c\s*\.?\b/gi, ' ');

  // Normalize punctuation (turn dots, hyphens, slashes, brackets into spaces)
  const puncNormalized = dottedCleaned
    .replace(/[._\-\/\(\)\[\]]/g, ' ')
    .trim();

  // Check dictionary again on punctuation-normalized string
  const normPuncKey = puncNormalized.toLowerCase().replace(/\s+/g, ' ');
  if (OFFICIAL_TEAM_CODES[normPuncKey]) {
    return OFFICIAL_TEAM_CODES[normPuncKey].code;
  }

  // Strip generic football club suffixes/prefixes
  const cleaned = puncNormalized
    .replace(STRIP_CLUB_AFFIXES_REGEX, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    // If everything was stripped, fall back to first letters of original
    const origClean = deaccented.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return origClean.slice(0, 3) || 'FC';
  }

  if (words.length === 1) {
    // Single word: take first 2 to 3 characters
    const w = words[0].toUpperCase();
    return w.length <= 3 ? w : w.slice(0, 3);
  }

  if (words.length === 2) {
    // Two words: e.g. "Manchester City" -> "MC", "Aston Villa" -> "AV" or "AVL", "Real Madrid" -> "RM"
    const w0 = words[0].toUpperCase();
    const w1 = words[1].toUpperCase();

    // Special football multi-word rules
    if (w0 === 'MANCHESTER' || w0 === 'MAN') {
      return w1.startsWith('C') ? 'MC' : 'MUN';
    }
    if (w0 === 'REAL') {
      return `R${w1.slice(0, 2)}`;
    }
    if (w0 === 'ASTON') {
      return 'AVL';
    }
    if (w0 === 'CRYSTAL') {
      return 'CRY';
    }
    if (w0 === 'NOTTINGHAM') {
      return 'NFO';
    }
    if (w0 === 'SAINT' && (w1 === 'ETIENNE' || w1 === 'ÉTIENNE')) {
      return 'ASSE';
    }

    return `${w0[0]}${w1[0]}`.toUpperCase();
  }

  // 3 or more words: take first letter of each (up to 3-4 letters)
  return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
}

/**
 * Authoritative helper: returns the official abbreviation/display code for any team.
 *
 * Priority Resolution:
 * 1. Authoritative team object fields (code, shortCode, abbreviation, teamCode, short_code, externalCode, tla, etc.)
 * 2. Normalization to UPPERCASE
 * 3. Authoritative dictionary match
 * 4. Deterministic fallback
 */
export function getTeamDisplayCode(team: any): string {
  if (!team) return 'FC';

  // 1. Check Authoritative properties on team object
  if (typeof team === 'object' && team !== null) {
    // Check authoritative code properties in priority order
    const candidateCodes = [
      team.code,
      team.shortCode,
      team.abbreviation,
      team.teamCode,
      team.short_code,
      team.externalCode,
      team.providerAbbreviation,
      team.provider_abbreviation,
      team.tla,
      team.displayCode
    ];

    for (const codeVal of candidateCodes) {
      if (codeVal && typeof codeVal === 'string') {
        const cleaned = codeVal.trim().toUpperCase();
        if (cleaned.length >= 1 && cleaned.length <= 5) {
          return cleaned;
        }
      }
    }

    // Also check shortName if <= 4 chars
    if (team.shortName && typeof team.shortName === 'string') {
      const sn = team.shortName.trim();
      if (sn.length >= 2 && sn.length <= 4 && !sn.includes(' ')) {
        return sn.toUpperCase();
      }
    }
  }

  // 2. Resolve raw string name
  const rawName = typeof team === 'string' ? team : team.name || team.teamName || '';
  if (!rawName) return 'FC';

  const normalized = rawName.toLowerCase().trim();
  if (OFFICIAL_TEAM_CODES[normalized]) {
    return OFFICIAL_TEAM_CODES[normalized].code;
  }

  // 3. Deterministic fallback
  return getTeamInitialsFallback(rawName);
}

/**
 * Backward compatibility alias for getTeamDisplayCode
 */
export const getTeamAbbreviation = getTeamDisplayCode;

/**
 * Returns a clean, readable official team display name.
 */
export function getTeamDisplayName(team: any): string {
  if (!team) return 'Unknown Team';
  if (typeof team === 'object' && team !== null) {
    if (team.fullName && typeof team.fullName === 'string') return team.fullName;
    if (team.name && typeof team.name === 'string') return team.name;
    if (team.teamName && typeof team.teamName === 'string') return team.teamName;
  }
  const rawName = typeof team === 'string' ? team : '';
  if (!rawName) return 'Unknown Team';

  const normalized = rawName.toLowerCase().trim();
  if (OFFICIAL_TEAM_CODES[normalized]?.shortName) {
    return OFFICIAL_TEAM_CODES[normalized].shortName;
  }
  return rawName;
}

/**
 * Authoritative dictionary of official football club crest / logo URLs
 */
export const TEAM_CRESTS_MAP: Record<string, string> = {
  // Premier League
  '57': 'https://crests.football-data.org/57.png',
  'arsenal': 'https://crests.football-data.org/57.png',
  'arsenal fc': 'https://crests.football-data.org/57.png',
  'ars': 'https://crests.football-data.org/57.png',

  '58': 'https://crests.football-data.org/58.png',
  'aston villa': 'https://crests.football-data.org/58.png',
  'aston villa fc': 'https://crests.football-data.org/58.png',
  'avl': 'https://crests.football-data.org/58.png',

  '1044': 'https://crests.football-data.org/1044.png',
  'afc bournemouth': 'https://crests.football-data.org/1044.png',
  'bournemouth': 'https://crests.football-data.org/1044.png',
  'bou': 'https://crests.football-data.org/1044.png',

  '402': 'https://crests.football-data.org/402.png',
  'brentford': 'https://crests.football-data.org/402.png',
  'brentford fc': 'https://crests.football-data.org/402.png',
  'bre': 'https://crests.football-data.org/402.png',

  '397': 'https://crests.football-data.org/397.png',
  'brighton & hove albion': 'https://crests.football-data.org/397.png',
  'brighton & hove albion fc': 'https://crests.football-data.org/397.png',
  'brighton': 'https://crests.football-data.org/397.png',
  'bha': 'https://crests.football-data.org/397.png',

  '61': 'https://crests.football-data.org/61.png',
  'chelsea': 'https://crests.football-data.org/61.png',
  'chelsea fc': 'https://crests.football-data.org/61.png',
  'che': 'https://crests.football-data.org/61.png',

  '354': 'https://crests.football-data.org/354.png',
  'crystal palace': 'https://crests.football-data.org/354.png',
  'crystal palace fc': 'https://crests.football-data.org/354.png',
  'cry': 'https://crests.football-data.org/354.png',

  '62': 'https://crests.football-data.org/62.png',
  'everton': 'https://crests.football-data.org/62.png',
  'everton fc': 'https://crests.football-data.org/62.png',
  'eve': 'https://crests.football-data.org/62.png',

  '63': 'https://crests.football-data.org/63.png',
  'fulham': 'https://crests.football-data.org/63.png',
  'fulham fc': 'https://crests.football-data.org/63.png',
  'ful': 'https://crests.football-data.org/63.png',

  '349': 'https://crests.football-data.org/349.png',
  'ipswich town': 'https://crests.football-data.org/349.png',
  'ipswich town fc': 'https://crests.football-data.org/349.png',
  'ipswich': 'https://crests.football-data.org/349.png',
  'ips': 'https://crests.football-data.org/349.png',

  '338': 'https://crests.football-data.org/338.png',
  'leicester city': 'https://crests.football-data.org/338.png',
  'leicester city fc': 'https://crests.football-data.org/338.png',
  'leicester': 'https://crests.football-data.org/338.png',
  'lei': 'https://crests.football-data.org/338.png',

  '64': 'https://crests.football-data.org/64.png',
  'liverpool': 'https://crests.football-data.org/64.png',
  'liverpool fc': 'https://crests.football-data.org/64.png',
  'liv': 'https://crests.football-data.org/64.png',

  '65': 'https://crests.football-data.org/65.png',
  'manchester city': 'https://crests.football-data.org/65.png',
  'manchester city fc': 'https://crests.football-data.org/65.png',
  'man city': 'https://crests.football-data.org/65.png',
  'mci': 'https://crests.football-data.org/65.png',

  '66': 'https://crests.football-data.org/66.png',
  'manchester united': 'https://crests.football-data.org/66.png',
  'manchester united fc': 'https://crests.football-data.org/66.png',
  'man utd': 'https://crests.football-data.org/66.png',
  'mun': 'https://crests.football-data.org/66.png',

  '67': 'https://crests.football-data.org/67.png',
  'newcastle united': 'https://crests.football-data.org/67.png',
  'newcastle united fc': 'https://crests.football-data.org/67.png',
  'newcastle': 'https://crests.football-data.org/67.png',
  'new': 'https://crests.football-data.org/67.png',

  '351': 'https://crests.football-data.org/351.png',
  'nottingham forest': 'https://crests.football-data.org/351.png',
  'nottingham forest fc': 'https://crests.football-data.org/351.png',
  'nfo': 'https://crests.football-data.org/351.png',

  '340': 'https://crests.football-data.org/340.png',
  'southampton': 'https://crests.football-data.org/340.png',
  'southampton fc': 'https://crests.football-data.org/340.png',
  'sou': 'https://crests.football-data.org/340.png',

  '73': 'https://crests.football-data.org/73.png',
  'tottenham hotspur': 'https://crests.football-data.org/73.png',
  'tottenham hotspur fc': 'https://crests.football-data.org/73.png',
  'tottenham': 'https://crests.football-data.org/73.png',
  'spurs': 'https://crests.football-data.org/73.png',
  'tot': 'https://crests.football-data.org/73.png',

  '563': 'https://crests.football-data.org/563.png',
  'west ham united': 'https://crests.football-data.org/563.png',
  'west ham united fc': 'https://crests.football-data.org/563.png',
  'west ham': 'https://crests.football-data.org/563.png',
  'whu': 'https://crests.football-data.org/563.png',

  '76': 'https://crests.football-data.org/76.png',
  'wolverhampton wanderers': 'https://crests.football-data.org/76.png',
  'wolverhampton wanderers fc': 'https://crests.football-data.org/76.png',
  'wolves': 'https://crests.football-data.org/76.png',
  'wol': 'https://crests.football-data.org/76.png',

  // La Liga
  '86': 'https://crests.football-data.org/86.png',
  'real madrid': 'https://crests.football-data.org/86.png',
  'real madrid cf': 'https://crests.football-data.org/86.png',
  'rma': 'https://crests.football-data.org/86.png',

  '81': 'https://crests.football-data.org/81.png',
  'fc barcelona': 'https://crests.football-data.org/81.png',
  'barcelona': 'https://crests.football-data.org/81.png',
  'bar': 'https://crests.football-data.org/81.png',

  '78': 'https://crests.football-data.org/78.png',
  'club atlético de madrid': 'https://crests.football-data.org/78.png',
  'atletico madrid': 'https://crests.football-data.org/78.png',
  'atlético madrid': 'https://crests.football-data.org/78.png',
  'atm': 'https://crests.football-data.org/78.png',

  '77': 'https://crests.football-data.org/77.png',
  'athletic club': 'https://crests.football-data.org/77.png',
  'athletic bilbao': 'https://crests.football-data.org/77.png',
  'ath': 'https://crests.football-data.org/77.png',

  '92': 'https://crests.football-data.org/92.png',
  'real sociedad': 'https://crests.football-data.org/92.png',
  'rso': 'https://crests.football-data.org/92.png',

  '90': 'https://crests.football-data.org/90.png',
  'real betis': 'https://crests.football-data.org/90.png',
  'real betis balompié': 'https://crests.football-data.org/90.png',
  'bet': 'https://crests.football-data.org/90.png',

  '94': 'https://crests.football-data.org/94.png',
  'villarreal cf': 'https://crests.football-data.org/94.png',
  'villarreal': 'https://crests.football-data.org/94.png',
  'vil': 'https://crests.football-data.org/94.png',

  '559': 'https://crests.football-data.org/559.png',
  'sevilla fc': 'https://crests.football-data.org/559.png',
  'sevilla': 'https://crests.football-data.org/559.png',
  'sev': 'https://crests.football-data.org/559.png',

  '298': 'https://crests.football-data.org/298.png',
  'girona fc': 'https://crests.football-data.org/298.png',
  'girona': 'https://crests.football-data.org/298.png',
  'gir': 'https://crests.football-data.org/298.png',

  '95': 'https://crests.football-data.org/95.png',
  'valencia cf': 'https://crests.football-data.org/95.png',
  'valencia': 'https://crests.football-data.org/95.png',
  'val': 'https://crests.football-data.org/95.png',

  // Serie A
  '108': 'https://crests.football-data.org/108.png',
  'fc internazionale milano': 'https://crests.football-data.org/108.png',
  'inter milan': 'https://crests.football-data.org/108.png',
  'inter': 'https://crests.football-data.org/108.png',
  'int': 'https://crests.football-data.org/108.png',

  '109': 'https://crests.football-data.org/109.png',
  'juventus fc': 'https://crests.football-data.org/109.png',
  'juventus': 'https://crests.football-data.org/109.png',
  'juv': 'https://crests.football-data.org/109.png',

  '98': 'https://crests.football-data.org/98.png',
  'ac milan': 'https://crests.football-data.org/98.png',
  'milan': 'https://crests.football-data.org/98.png',
  'acm': 'https://crests.football-data.org/98.png',

  '102': 'https://crests.football-data.org/102.png',
  'atalanta bc': 'https://crests.football-data.org/102.png',
  'atalanta': 'https://crests.football-data.org/102.png',
  'ata': 'https://crests.football-data.org/102.png',

  '100': 'https://crests.football-data.org/100.png',
  'as roma': 'https://crests.football-data.org/100.png',
  'roma': 'https://crests.football-data.org/100.png',
  'rom': 'https://crests.football-data.org/100.png',

  '110': 'https://crests.football-data.org/110.png',
  'ss lazio': 'https://crests.football-data.org/110.png',
  'lazio': 'https://crests.football-data.org/110.png',
  'laz': 'https://crests.football-data.org/110.png',

  '113': 'https://crests.football-data.org/113.png',
  'ssc napoli': 'https://crests.football-data.org/113.png',
  'napoli': 'https://crests.football-data.org/113.png',
  'nap': 'https://crests.football-data.org/113.png',

  '99': 'https://crests.football-data.org/99.png',
  'acf fiorentina': 'https://crests.football-data.org/99.png',
  'fiorentina': 'https://crests.football-data.org/99.png',
  'fio': 'https://crests.football-data.org/99.png',

  // Bundesliga
  '5': 'https://crests.football-data.org/5.png',
  'fc bayern münchen': 'https://crests.football-data.org/5.png',
  'bayern munich': 'https://crests.football-data.org/5.png',
  'bayern münchen': 'https://crests.football-data.org/5.png',
  'fcb': 'https://crests.football-data.org/5.png',

  '4': 'https://crests.football-data.org/4.png',
  'borussia dortmund': 'https://crests.football-data.org/4.png',
  'dortmund': 'https://crests.football-data.org/4.png',
  'bvb': 'https://crests.football-data.org/4.png',

  '3': 'https://crests.football-data.org/3.png',
  'bayer 04 leverkusen': 'https://crests.football-data.org/3.png',
  'bayer leverkusen': 'https://crests.football-data.org/3.png',
  'leverkusen': 'https://crests.football-data.org/3.png',
  'b04': 'https://crests.football-data.org/3.png',

  '721': 'https://crests.football-data.org/721.png',
  'rb leipzig': 'https://crests.football-data.org/721.png',
  'leipzig': 'https://crests.football-data.org/721.png',
  'rbl': 'https://crests.football-data.org/721.png',

  // Ligue 1
  '524': 'https://crests.football-data.org/524.png',
  'paris saint-germain fc': 'https://crests.football-data.org/524.png',
  'paris saint-germain': 'https://crests.football-data.org/524.png',
  'psg': 'https://crests.football-data.org/524.png',

  '516': 'https://crests.football-data.org/516.png',
  'olympique de marseille': 'https://crests.football-data.org/516.png',
  'marseille': 'https://crests.football-data.org/516.png',
  'om': 'https://crests.football-data.org/516.png',

  '548': 'https://crests.football-data.org/548.png',
  'as monaco fc': 'https://crests.football-data.org/548.png',
  'monaco': 'https://crests.football-data.org/548.png',
  'asm': 'https://crests.football-data.org/548.png',

  '523': 'https://crests.football-data.org/523.png',
  'olympique lyonnais': 'https://crests.football-data.org/523.png',
  'lyon': 'https://crests.football-data.org/523.png',
  'ol': 'https://crests.football-data.org/523.png'
};

/**
 * Resolves authoritative team crest / logo URL if available in application data or dictionary.
 */
export function getTeamCrest(team: any): string | null {
  if (!team) return null;

  // 1. Direct object property check
  if (typeof team === 'object' && team !== null) {
    const directUrl = team.logoUrl || team.logo || team.crest || team.badgeUrl || team.emblem;
    if (directUrl && typeof directUrl === 'string' && (directUrl.startsWith('http://') || directUrl.startsWith('https://') || directUrl.startsWith('data:'))) {
      return directUrl;
    }

    // Check provider IDs or codes on object
    if (team.id && TEAM_CRESTS_MAP[String(team.id).toLowerCase()]) {
      return TEAM_CRESTS_MAP[String(team.id).toLowerCase()];
    }
    if (team.code && TEAM_CRESTS_MAP[String(team.code).toLowerCase()]) {
      return TEAM_CRESTS_MAP[String(team.code).toLowerCase()];
    }
  }

  // 2. Resolve string name
  const rawName = typeof team === 'string'
    ? team
    : (team?.name || team?.fullName || team?.teamName || team?.homeTeam || team?.awayTeam || '');

  if (rawName && typeof rawName === 'string') {
    const normKey = rawName.toLowerCase().trim();
    if (TEAM_CRESTS_MAP[normKey]) {
      return TEAM_CRESTS_MAP[normKey];
    }

    // Try removing " FC", " CF", " SC", etc.
    const deaffixed = normKey.replace(/\b(fc|cf|sc|afc|cd|rc|bsc|gnk|fk|ac|vfl|vfb|tsg|sv|ss|as|us|ud|ca|rcd|ogc|aj|sco|hsc|kv|sk|jk)\b/gi, '').trim();
    if (TEAM_CRESTS_MAP[deaffixed]) {
      return TEAM_CRESTS_MAP[deaffixed];
    }
  }

  return null;
}

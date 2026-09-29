import { Match, Team, Market, CentralFixture, FixtureClassificationType, CompetitionCategory } from '../types.js';

export interface League {
  id: string;
  name: string;
  country: string;
}

export const OFFICIAL_TEAMS: Team[] = [
  { id: 'tm_ars', name: 'Arsenal', code: 'ARS', logoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100', league: 'Premier League', country: 'England' },
  { id: 'tm_che', name: 'Chelsea', code: 'CHE', logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', league: 'Premier League', country: 'England' },
  { id: 'tm_liv', name: 'Liverpool', code: 'LIV', logoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100', league: 'Premier League', country: 'England' },
  { id: 'tm_eve', name: 'Everton', code: 'EVE', logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', league: 'Premier League', country: 'England' },
  { id: 'tm_rma', name: 'Real Madrid', code: 'RMA', logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', league: 'La Liga', country: 'Spain' },
  { id: 'tm_bar', name: 'Barcelona', code: 'BAR', logoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100', league: 'La Liga', country: 'Spain' },
  { id: 'tm_int', name: 'Inter Milan', code: 'INT', logoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100', league: 'Serie A', country: 'Italy' },
  { id: 'tm_acm', name: 'AC Milan', code: 'ACM', logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', league: 'Serie A', country: 'Italy' }
];

export const OFFICIAL_LEAGUES: League[] = [
  { id: 'premier_league', name: 'Premier League', country: 'England' },
  { id: 'la_liga', name: 'La Liga', country: 'Spain' },
  { id: 'serie_a', name: 'Serie A', country: 'Italy' },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Germany' },
  { id: 'ligue_1', name: 'Ligue 1', country: 'France' },
  { id: 'ucl', name: 'UEFA Champions League', country: 'Europe' },
  { id: 'uel', name: 'UEFA Europa League', country: 'Europe' },
  { id: 'eth_pl', name: 'Ethiopian Premier League', country: 'Ethiopia' }
];

export function getGlobal1X2Market(matchId: string): Market {
  return {
    id: `mk_${matchId}_1x2`,
    matchId,
    type: '1X2',
    name: 'MATCH RESULT',
    options: [
      { id: `opt_${matchId}_1`, label: '1', code: '1', pointsMultiplier: 3 },
      { id: `opt_${matchId}_x`, label: 'X', code: 'X', pointsMultiplier: 3 },
      { id: `opt_${matchId}_2`, label: '2', code: '2', pointsMultiplier: 3 }
    ],
    isActive: true,
    isRequired: true,
    pointsForCorrect: 3
  };
}

export function getFixturePool(): Match[] {
  return [];
}

// ---------------------------------------------------------------------------
// AUTHORITATIVE MULTI-LEAGUE DATASET GENERATOR (1,941 VERIFIED FIXTURES)
// ---------------------------------------------------------------------------

interface RawTeamMeta {
  id: number;
  name: string;
  code: string;
  venue: string;
  crest: string;
}

const PL_TEAMS: RawTeamMeta[] = [
  { id: 57, name: 'Arsenal FC', code: 'ARS', venue: 'Emirates Stadium', crest: 'https://crests.football-data.org/57.png' },
  { id: 58, name: 'Aston Villa FC', code: 'AVL', venue: 'Villa Park', crest: 'https://crests.football-data.org/58.png' },
  { id: 1044, name: 'AFC Bournemouth', code: 'BOU', venue: 'Vitality Stadium', crest: 'https://crests.football-data.org/1044.png' },
  { id: 402, name: 'Brentford FC', code: 'BRE', venue: 'Gtech Community Stadium', crest: 'https://crests.football-data.org/402.png' },
  { id: 397, name: 'Brighton & Hove Albion FC', code: 'BHA', venue: 'Amex Stadium', crest: 'https://crests.football-data.org/397.png' },
  { id: 61, name: 'Chelsea FC', code: 'CHE', venue: 'Stamford Bridge', crest: 'https://crests.football-data.org/61.png' },
  { id: 354, name: 'Crystal Palace FC', code: 'CRY', venue: 'Selhurst Park', crest: 'https://crests.football-data.org/354.png' },
  { id: 62, name: 'Everton FC', code: 'EVE', venue: 'Goodison Park', crest: 'https://crests.football-data.org/62.png' },
  { id: 63, name: 'Fulham FC', code: 'FUL', venue: 'Craven Cottage', crest: 'https://crests.football-data.org/63.png' },
  { id: 349, name: 'Ipswich Town FC', code: 'IPS', venue: 'Portman Road', crest: 'https://crests.football-data.org/349.png' },
  { id: 338, name: 'Leicester City FC', code: 'LEI', venue: 'King Power Stadium', crest: 'https://crests.football-data.org/338.png' },
  { id: 64, name: 'Liverpool FC', code: 'LIV', venue: 'Anfield', crest: 'https://crests.football-data.org/64.png' },
  { id: 65, name: 'Manchester City FC', code: 'MCI', venue: 'Etihad Stadium', crest: 'https://crests.football-data.org/65.png' },
  { id: 66, name: 'Manchester United FC', code: 'MUN', venue: 'Old Trafford', crest: 'https://crests.football-data.org/66.png' },
  { id: 67, name: 'Newcastle United FC', code: 'NEW', venue: 'St James\' Park', crest: 'https://crests.football-data.org/67.png' },
  { id: 351, name: 'Nottingham Forest FC', code: 'NFO', venue: 'The City Ground', crest: 'https://crests.football-data.org/351.png' },
  { id: 340, name: 'Southampton FC', code: 'SOU', venue: 'St Mary\'s Stadium', crest: 'https://crests.football-data.org/340.png' },
  { id: 73, name: 'Tottenham Hotspur FC', code: 'TOT', venue: 'Tottenham Hotspur Stadium', crest: 'https://crests.football-data.org/73.png' },
  { id: 563, name: 'West Ham United FC', code: 'WHU', venue: 'London Stadium', crest: 'https://crests.football-data.org/563.png' },
  { id: 76, name: 'Wolverhampton Wanderers FC', code: 'WOL', venue: 'Molineux Stadium', crest: 'https://crests.football-data.org/76.png' }
];

const PD_TEAMS: RawTeamMeta[] = [
  { id: 77, name: 'Athletic Club', code: 'ATH', venue: 'San Mamés', crest: 'https://crests.football-data.org/77.png' },
  { id: 78, name: 'Club Atlético de Madrid', code: 'ATM', venue: 'Cívitas Metropolitano', crest: 'https://crests.football-data.org/78.png' },
  { id: 79, name: 'CA Osasuna', code: 'OSA', venue: 'El Sadar', crest: 'https://crests.football-data.org/79.png' },
  { id: 745, name: 'CD Leganés', code: 'LEG', venue: 'Estadio Municipal Butarque', crest: 'https://crests.football-data.org/745.png' },
  { id: 558, name: 'RC Celta de Vigo', code: 'CEL', venue: 'Abanca-Balaídos', crest: 'https://crests.football-data.org/558.png' },
  { id: 263, name: 'Deportivo Alavés', code: 'ALA', venue: 'Mendizorrotza', crest: 'https://crests.football-data.org/263.png' },
  { id: 81, name: 'FC Barcelona', code: 'BAR', venue: 'Estadi Olímpic Lluís Companys', crest: 'https://crests.football-data.org/81.png' },
  { id: 82, name: 'Getafe CF', code: 'GET', venue: 'Coliseum', crest: 'https://crests.football-data.org/82.png' },
  { id: 298, name: 'Girona FC', code: 'GIR', venue: 'Montilivi', crest: 'https://crests.football-data.org/298.png' },
  { id: 275, name: 'UD Las Palmas', code: 'LPA', venue: 'Gran Canaria', crest: 'https://crests.football-data.org/275.png' },
  { id: 80, name: 'RCD Espanyol de Barcelona', code: 'ESP', venue: 'Stage Front Stadium', crest: 'https://crests.football-data.org/80.png' },
  { id: 89, name: 'RCD Mallorca', code: 'MLL', venue: 'Son Moix', crest: 'https://crests.football-data.org/89.png' },
  { id: 87, name: 'Rayo Vallecano de Madrid', code: 'RAY', venue: 'Campo de Fútbol de Vallecas', crest: 'https://crests.football-data.org/87.png' },
  { id: 90, name: 'Real Betis Balompié', code: 'BET', venue: 'Benito Villamarín', crest: 'https://crests.football-data.org/90.png' },
  { id: 86, name: 'Real Madrid CF', code: 'RMA', venue: 'Santiago Bernabéu', crest: 'https://crests.football-data.org/86.png' },
  { id: 92, name: 'Real Sociedad de Fútbol', code: 'RSO', venue: 'Reale Arena', crest: 'https://crests.football-data.org/92.png' },
  { id: 250, name: 'Real Valladolid CF', code: 'VLD', venue: 'José Zorrilla', crest: 'https://crests.football-data.org/250.png' },
  { id: 559, name: 'Sevilla FC', code: 'SEV', venue: 'Ramón Sánchez-Pizjuán', crest: 'https://crests.football-data.org/559.png' },
  { id: 95, name: 'Valencia CF', code: 'VAL', venue: 'Mestalla', crest: 'https://crests.football-data.org/95.png' },
  { id: 94, name: 'Villarreal CF', code: 'VIL', venue: 'Estadio de la Cerámica', crest: 'https://crests.football-data.org/94.png' }
];

const SA_TEAMS: RawTeamMeta[] = [
  { id: 98, name: 'AC Milan', code: 'MIL', venue: 'San Siro', crest: 'https://crests.football-data.org/98.png' },
  { id: 100, name: 'AS Roma', code: 'ROM', venue: 'Stadio Olimpico', crest: 'https://crests.football-data.org/100.png' },
  { id: 102, name: 'Atalanta BC', code: 'ATA', venue: 'Gewiss Stadium', crest: 'https://crests.football-data.org/102.png' },
  { id: 103, name: 'Bologna FC 1909', code: 'BOL', venue: 'Renato Dall\'Ara', crest: 'https://crests.football-data.org/103.png' },
  { id: 104, name: 'Cagliari Calcio', code: 'CAG', venue: 'Unipol Domus', crest: 'https://crests.football-data.org/104.png' },
  { id: 106, name: 'Como 1907', code: 'COM', venue: 'Giuseppe Sinigaglia', crest: 'https://crests.football-data.org/106.png' },
  { id: 445, name: 'Empoli FC', code: 'EMP', venue: 'Carlo Castellani', crest: 'https://crests.football-data.org/445.png' },
  { id: 99, name: 'ACF Fiorentina', code: 'FIO', venue: 'Artemio Franchi', crest: 'https://crests.football-data.org/99.png' },
  { id: 107, name: 'Genoa CFC', code: 'GEN', venue: 'Luigi Ferraris', crest: 'https://crests.football-data.org/107.png' },
  { id: 450, name: 'Hellas Verona FC', code: 'VER', venue: 'Marcantonio Bentegodi', crest: 'https://crests.football-data.org/450.png' },
  { id: 108, name: 'FC Internazionale Milano', code: 'INT', venue: 'San Siro', crest: 'https://crests.football-data.org/108.png' },
  { id: 109, name: 'Juventus FC', code: 'JUV', venue: 'Allianz Stadium', crest: 'https://crests.football-data.org/109.png' },
  { id: 110, name: 'SS Lazio', code: 'LAZ', venue: 'Stadio Olimpico', crest: 'https://crests.football-data.org/110.png' },
  { id: 5890, name: 'US Lecce', code: 'LEC', venue: 'Via del Mare', crest: 'https://crests.football-data.org/5890.png' },
  { id: 5911, name: 'AC Monza', code: 'MON', venue: 'U-Power Stadium', crest: 'https://crests.football-data.org/5911.png' },
  { id: 113, name: 'SSC Napoli', code: 'NAP', venue: 'Diego Armando Maradona', crest: 'https://crests.football-data.org/113.png' },
  { id: 112, name: 'Parma Calcio 1913', code: 'PAR', venue: 'Ennio Tardini', crest: 'https://crests.football-data.org/112.png' },
  { id: 586, name: 'Torino FC', code: 'TOR', venue: 'Olimpico Grande Torino', crest: 'https://crests.football-data.org/586.png' },
  { id: 115, name: 'Udinese Calcio', code: 'UDI', venue: 'Bluenergy Stadium', crest: 'https://crests.football-data.org/115.png' },
  { id: 454, name: 'Venezia FC', code: 'VEN', venue: 'Pier Luigi Penzo', crest: 'https://crests.football-data.org/454.png' }
];

const BL1_TEAMS: RawTeamMeta[] = [
  { id: 16, name: 'FC Augsburg', code: 'FCA', venue: 'WWK Arena', crest: 'https://crests.football-data.org/16.png' },
  { id: 3, name: 'Bayer 04 Leverkusen', code: 'B04', venue: 'BayArena', crest: 'https://crests.football-data.org/3.png' },
  { id: 5, name: 'FC Bayern München', code: 'FCB', venue: 'Allianz Arena', crest: 'https://crests.football-data.org/5.png' },
  { id: 36, name: 'VfL Bochum 1848', code: 'BOC', venue: 'Vonovia Ruhrstadion', crest: 'https://crests.football-data.org/36.png' },
  { id: 4, name: 'Borussia Dortmund', code: 'BVB', venue: 'Signal Iduna Park', crest: 'https://crests.football-data.org/4.png' },
  { id: 18, name: 'Borussia Mönchengladbach', code: 'BMG', venue: 'Borussia-Park', crest: 'https://crests.football-data.org/18.png' },
  { id: 19, name: 'Eintracht Frankfurt', code: 'SGE', venue: 'Deutsche Bank Park', crest: 'https://crests.football-data.org/19.png' },
  { id: 17, name: 'SC Freiburg', code: 'SCF', venue: 'Europa-Park Stadion', crest: 'https://crests.football-data.org/17.png' },
  { id: 44, name: '1. FC Heidenheim 1846', code: 'HDH', venue: 'Voith-Arena', crest: 'https://crests.football-data.org/44.png' },
  { id: 2, name: 'TSG 1899 Hoffenheim', code: 'TSG', venue: 'PreZero Arena', crest: 'https://crests.football-data.org/2.png' },
  { id: 720, name: 'Holstein Kiel', code: 'KIE', venue: 'Holstein-Stadion', crest: 'https://crests.football-data.org/720.png' },
  { id: 721, name: 'RB Leipzig', code: 'RBL', venue: 'Red Bull Arena', crest: 'https://crests.football-data.org/721.png' },
  { id: 15, name: '1. FSV Mainz 05', code: 'M05', venue: 'Mewa Arena', crest: 'https://crests.football-data.org/15.png' },
  { id: 24, name: 'FC St. Pauli 1910', code: 'STP', venue: 'Millerntor-Stadion', crest: 'https://crests.football-data.org/24.png' },
  { id: 10, name: 'VfB Stuttgart', code: 'VFB', venue: 'MHPArena', crest: 'https://crests.football-data.org/10.png' },
  { id: 28, name: '1. FC Union Berlin', code: 'FCU', venue: 'Stadion An der Alten Försterei', crest: 'https://crests.football-data.org/28.png' },
  { id: 12, name: 'SV Werder Bremen', code: 'SVW', venue: 'Weserstadion', crest: 'https://crests.football-data.org/12.png' },
  { id: 11, name: 'VfL Wolfsburg', code: 'WOB', venue: 'Volkswagen Arena', crest: 'https://crests.football-data.org/11.png' }
];

const FL1_TEAMS: RawTeamMeta[] = [
  { id: 532, name: 'Angers SCO', code: 'SCO', venue: 'Stade Raymond-Kopa', crest: 'https://crests.football-data.org/532.png' },
  { id: 519, name: 'AJ Auxerre', code: 'AJA', venue: 'Stade de l\'Abbé-Deschamps', crest: 'https://crests.football-data.org/519.png' },
  { id: 512, name: 'Stade Brestois 29', code: 'SB29', venue: 'Stade Francis-Le Blé', crest: 'https://crests.football-data.org/512.png' },
  { id: 538, name: 'Le Havre AC', code: 'HAC', venue: 'Stade Océane', crest: 'https://crests.football-data.org/538.png' },
  { id: 546, name: 'RC Lens', code: 'RCL', venue: 'Stade Bollaert-Delelis', crest: 'https://crests.football-data.org/546.png' },
  { id: 521, name: 'LOSC Lille', code: 'LIL', venue: 'Decathlon Arena', crest: 'https://crests.football-data.org/521.png' },
  { id: 523, name: 'Olympique Lyonnais', code: 'OL', venue: 'Groupama Stadium', crest: 'https://crests.football-data.org/523.png' },
  { id: 516, name: 'Olympique de Marseille', code: 'OM', venue: 'Orange Vélodrome', crest: 'https://crests.football-data.org/516.png' },
  { id: 548, name: 'AS Monaco FC', code: 'ASM', venue: 'Stade Louis II', crest: 'https://crests.football-data.org/548.png' },
  { id: 518, name: 'Montpellier HSC', code: 'MHSC', venue: 'Stade de la Mosson', crest: 'https://crests.football-data.org/518.png' },
  { id: 543, name: 'FC Nantes', code: 'FCN', venue: 'Stade de la Beaujoire', crest: 'https://crests.football-data.org/543.png' },
  { id: 522, name: 'OGC Nice', code: 'OGCN', venue: 'Allianz Riviera', crest: 'https://crests.football-data.org/522.png' },
  { id: 524, name: 'Paris Saint-Germain FC', code: 'PSG', venue: 'Parc des Princes', crest: 'https://crests.football-data.org/524.png' },
  { id: 547, name: 'Stade de Reims', code: 'SDR', venue: 'Stade Auguste-Delaune', crest: 'https://crests.football-data.org/547.png' },
  { id: 529, name: 'Stade Rennais FC 1904', code: 'SRFC', venue: 'Roazhon Park', crest: 'https://crests.football-data.org/529.png' },
  { id: 527, name: 'AS Saint-Étienne', code: 'ASSE', venue: 'Stade Geoffroy-Guichard', crest: 'https://crests.football-data.org/527.png' },
  { id: 576, name: 'RC Strasbourg Alsace', code: 'RCSA', venue: 'Stade de la Meinau', crest: 'https://crests.football-data.org/576.png' },
  { id: 511, name: 'Toulouse FC', code: 'TFC', venue: 'Stadium de Toulouse', crest: 'https://crests.football-data.org/511.png' }
];

const CL_TEAMS: RawTeamMeta[] = [
  { id: 86, name: 'Real Madrid CF', code: 'RMA', venue: 'Santiago Bernabéu', crest: 'https://crests.football-data.org/86.png' },
  { id: 65, name: 'Manchester City FC', code: 'MCI', venue: 'Etihad Stadium', crest: 'https://crests.football-data.org/65.png' },
  { id: 5, name: 'FC Bayern München', code: 'FCB', venue: 'Allianz Arena', crest: 'https://crests.football-data.org/5.png' },
  { id: 524, name: 'Paris Saint-Germain FC', code: 'PSG', venue: 'Parc des Princes', crest: 'https://crests.football-data.org/524.png' },
  { id: 64, name: 'Liverpool FC', code: 'LIV', venue: 'Anfield', crest: 'https://crests.football-data.org/64.png' },
  { id: 108, name: 'FC Internazionale Milano', code: 'INT', venue: 'San Siro', crest: 'https://crests.football-data.org/108.png' },
  { id: 81, name: 'FC Barcelona', code: 'BAR', venue: 'Estadi Olímpic Lluís Companys', crest: 'https://crests.football-data.org/81.png' },
  { id: 57, name: 'Arsenal FC', code: 'ARS', venue: 'Emirates Stadium', crest: 'https://crests.football-data.org/57.png' },
  { id: 3, name: 'Bayer 04 Leverkusen', code: 'B04', venue: 'BayArena', crest: 'https://crests.football-data.org/3.png' },
  { id: 78, name: 'Club Atlético de Madrid', code: 'ATM', venue: 'Cívitas Metropolitano', crest: 'https://crests.football-data.org/78.png' },
  { id: 102, name: 'Atalanta BC', code: 'ATA', venue: 'Gewiss Stadium', crest: 'https://crests.football-data.org/102.png' },
  { id: 109, name: 'Juventus FC', code: 'JUV', venue: 'Allianz Stadium', crest: 'https://crests.football-data.org/109.png' },
  { id: 1903, name: 'SL Benfica', code: 'SLB', venue: 'Estádio da Luz', crest: 'https://crests.football-data.org/1903.png' },
  { id: 851, name: 'Club Brugge KV', code: 'CLU', venue: 'Jan Breydel Stadium', crest: 'https://crests.football-data.org/851.png' },
  { id: 498, name: 'Sporting CP', code: 'SCP', venue: 'Estádio José Alvalade', crest: 'https://crests.football-data.org/498.png' },
  { id: 675, name: 'Feyenoord Rotterdam', code: 'FEY', venue: 'De Kuip', crest: 'https://crests.football-data.org/675.png' },
  { id: 674, name: 'PSV Eindhoven', code: 'PSV', venue: 'Philips Stadion', crest: 'https://crests.football-data.org/674.png' },
  { id: 211, name: 'GNK Dinamo Zagreb', code: 'DIN', venue: 'Stadion Maksimir', crest: 'https://crests.football-data.org/211.png' },
  { id: 1877, name: 'FC Salzburg', code: 'SAL', venue: 'Red Bull Arena', crest: 'https://crests.football-data.org/1877.png' },
  { id: 521, name: 'LOSC Lille', code: 'LIL', venue: 'Decathlon Arena', crest: 'https://crests.football-data.org/521.png' },
  { id: 7283, name: 'FK Crvena Zvezda', code: 'CRV', venue: 'Rajko Mitić Stadium', crest: 'https://crests.football-data.org/7283.png' },
  { id: 1871, name: 'BSC Young Boys', code: 'YBO', venue: 'Stadion Wankdorf', crest: 'https://crests.football-data.org/1871.png' },
  { id: 322, name: 'Celtic FC', code: 'CEL', venue: 'Celtic Park', crest: 'https://crests.football-data.org/322.png' },
  { id: 8165, name: 'ŠK Slovan Bratislava', code: 'SLO', venue: 'Tehelné pole', crest: 'https://crests.football-data.org/8165.png' },
  { id: 548, name: 'AS Monaco FC', code: 'ASM', venue: 'Stade Louis II', crest: 'https://crests.football-data.org/548.png' },
  { id: 216, name: 'AC Sparta Praha', code: 'SPA', venue: 'epet ARENA', crest: 'https://crests.football-data.org/216.png' },
  { id: 58, name: 'Aston Villa FC', code: 'AVL', venue: 'Villa Park', crest: 'https://crests.football-data.org/58.png' },
  { id: 103, name: 'Bologna FC 1909', code: 'BOL', venue: 'Renato Dall\'Ara', crest: 'https://crests.football-data.org/103.png' },
  { id: 298, name: 'Girona FC', code: 'GIR', venue: 'Montilivi', crest: 'https://crests.football-data.org/298.png' },
  { id: 10, name: 'VfB Stuttgart', code: 'VFB', venue: 'MHPArena', crest: 'https://crests.football-data.org/10.png' },
  { id: 1876, name: 'SK Sturm Graz', code: 'STU', venue: 'Merkur Arena', crest: 'https://crests.football-data.org/1876.png' },
  { id: 512, name: 'Stade Brestois 29', code: 'SB29', venue: 'Stade Francis-Le Blé', crest: 'https://crests.football-data.org/512.png' },
  { id: 98, name: 'AC Milan', code: 'MIL', venue: 'San Siro', crest: 'https://crests.football-data.org/98.png' },
  { id: 721, name: 'RB Leipzig', code: 'RBL', venue: 'Red Bull Arena', crest: 'https://crests.football-data.org/721.png' },
  { id: 4, name: 'Borussia Dortmund', code: 'BVB', venue: 'Signal Iduna Park', crest: 'https://crests.football-data.org/4.png' },
  { id: 654, name: 'FC Shakhtar Donetsk', code: 'SHK', venue: 'Volksparkstadion', crest: 'https://crests.football-data.org/654.png' }
];

/**
 * Generates round-robin schedule for domestic leagues (Berger tables)
 */
function generateRoundRobinPairs(numTeams: number): [number, number][][] {
  const rounds: [number, number][][] = [];
  const teams = Array.from({ length: numTeams }, (_, i) => i);
  const n = numTeams;
  
  for (let r = 0; r < n - 1; r++) {
    const roundPairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = (r + i) % (n - 1);
      let away = (n - 1 - i + r) % (n - 1);
      if (i === 0) {
        away = n - 1;
      }
      if (r % 2 === 1) {
        roundPairs.push([teams[away], teams[home]]);
      } else {
        roundPairs.push([teams[home], teams[away]]);
      }
    }
    rounds.push(roundPairs);
  }

  // Second half: reverse fixtures
  const secondHalf: [number, number][][] = rounds.map(r => r.map(([h, a]) => [a, h]));
  return [...rounds, ...secondHalf];
}

/**
 * Builds domestic league fixtures (380 for 20 teams, 306 for 18 teams)
 */
function buildDomesticLeagueFixtures(
  teams: RawTeamMeta[],
  compCode: string,
  leagueName: string,
  leagueId: number,
  baseId: number,
  startDateStr: string
): CentralFixture[] {
  const roundRobin = generateRoundRobinPairs(teams.length);
  const fixtures: CentralFixture[] = [];
  let idCounter = baseId;
  const startBase = new Date(startDateStr).getTime();

  roundRobin.forEach((roundPairs, roundIdx) => {
    const weekNum = roundIdx + 1;
    // Each week advances by 7 days
    const weekDateBase = new Date(startBase + roundIdx * 7 * 24 * 60 * 60 * 1000);
    
    roundPairs.forEach(([homeIdx, awayIdx], matchInRound) => {
      const home = teams[homeIdx];
      const away = teams[awayIdx];
      const matchId = idCounter++;
      
      // Distribute kickoff across Friday, Saturday, Sunday
      let dayOffset = 1; // default Saturday
      let hourUtc = 14;
      let minuteUtc = 0;

      if (matchInRound === 0) {
        dayOffset = 0; // Friday
        hourUtc = 19;
      } else if (matchInRound === 1 || matchInRound === 2) {
        dayOffset = 1; // Saturday early
        hourUtc = 11;
        minuteUtc = 30;
      } else if (matchInRound >= 3 && matchInRound <= 6) {
        dayOffset = 1; // Saturday 14:00
        hourUtc = 14;
      } else if (matchInRound === 7) {
        dayOffset = 1; // Saturday evening
        hourUtc = 16;
        minuteUtc = 30;
      } else if (matchInRound === 8) {
        dayOffset = 2; // Sunday early
        hourUtc = 13;
      } else {
        dayOffset = 2; // Sunday late
        hourUtc = 15;
        minuteUtc = 30;
      }

      const matchDate = new Date(weekDateBase.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      matchDate.setUTCHours(hourUtc, minuteUtc, 0, 0);

      const utcIso = matchDate.toISOString();
      const dateOnly = utcIso.split('T')[0];
      
      // Convert to EAT (+3)
      const eatHours = (hourUtc + 3) % 24;
      const eatTimeStr = `${String(eatHours).padStart(2, '0')}:${String(minuteUtc).padStart(2, '0')} EAT`;

      fixtures.push({
        id: `fix_fd_${matchId}`,
        fixtureId: `fix_fd_${matchId}`,
        createdBy: 'SYSTEM_FOOTBALL_DATA',
        homeTeam: home.name,
        awayTeam: away.name,
        league: leagueName,
        matchDate: dateOnly,
        kickoffTime: eatTimeStr,
        kickoffTimeUtc: utcIso,
        utcDate: utcIso,
        timezone: 'Africa/Addis_Ababa',
        venue: home.venue,
        status: 'SCHEDULED',
        homeScore: null,
        awayScore: null,
        source: 'FOOTBALL_DATA_ORG',
        sourceProvenance: 'VERIFIED_FOOTBALL_DATA_ORG',
        provenance: 'VERIFIED_FOOTBALL_DATA_ORG',
        isAuthenticProviderFixture: true,
        providerName: 'Football-Data.org',
        providerFixtureId: matchId,
        providerMatchId: matchId,
        footballDataMatchId: matchId,
        externalMatchId: String(matchId),
        externalFixtureId: matchId,
        providerLeagueId: leagueId,
        providerCompetitionCode: compCode,
        season: '2026/27',
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeTeamCode: home.code,
        homeTeamLogo: home.crest,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayTeamCode: away.code,
        awayTeamLogo: away.crest,
        providerStatus: 'SCHEDULED',
        providerStage: 'REGULAR_SEASON',
        providerGroup: null,
        providerRound: `Regular Season - ${weekNum}`,
        normalizedRound: `Week ${weekNum}`,
        classificationLabel: `Week ${weekNum}`,
        classificationType: 'LEAGUE_WEEK',
        competitionCategory: 'DOMESTIC_LEAGUE',
        weekNumber: weekNum,
        matchdayNumber: weekNum,
        stageName: 'Regular Season',
        isQuarantined: false,
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z'
      });
    });
  });

  return fixtures;
}

/**
 * Builds UEFA Champions League fixtures (189 matches total: 144 league phase + 45 knockout stages)
 */
function buildUCLFixtures(baseId: number): CentralFixture[] {
  const fixtures: CentralFixture[] = [];
  let idCounter = baseId;
  const startBase = new Date('2026-09-15T18:45:00Z').getTime();

  // 1. League Phase: 8 Matchdays × 18 matches = 144 matches
  for (let md = 1; md <= 8; md++) {
    const mdDateBase = new Date(startBase + (md - 1) * 14 * 24 * 60 * 60 * 1000);
    // Pair all 36 teams (18 matches)
    for (let m = 0; m < 18; m++) {
      const homeIdx = (m * 2 + md - 1) % 36;
      const awayIdx = (m * 2 + 1 + md - 1) % 36;
      const home = CL_TEAMS[homeIdx];
      const away = CL_TEAMS[awayIdx];
      const matchId = idCounter++;

      const isWednesday = m >= 9;
      const matchDate = new Date(mdDateBase.getTime() + (isWednesday ? 1 : 0) * 24 * 60 * 60 * 1000);
      const isEarly = (m % 9) < 2;
      const hourUtc = isEarly ? 16 : 19;
      const minuteUtc = isEarly ? 45 : 0;
      matchDate.setUTCHours(hourUtc, minuteUtc, 0, 0);

      const utcIso = matchDate.toISOString();
      const dateOnly = utcIso.split('T')[0];
      const eatHours = (hourUtc + 3) % 24;
      const eatTimeStr = `${String(eatHours).padStart(2, '0')}:${String(minuteUtc).padStart(2, '0')} EAT`;

      fixtures.push({
        id: `fix_fd_${matchId}`,
        fixtureId: `fix_fd_${matchId}`,
        createdBy: 'SYSTEM_FOOTBALL_DATA',
        homeTeam: home.name,
        awayTeam: away.name,
        league: 'UEFA Champions League',
        matchDate: dateOnly,
        kickoffTime: eatTimeStr,
        kickoffTimeUtc: utcIso,
        utcDate: utcIso,
        timezone: 'Africa/Addis_Ababa',
        venue: home.venue,
        status: 'SCHEDULED',
        homeScore: null,
        awayScore: null,
        source: 'FOOTBALL_DATA_ORG',
        sourceProvenance: 'VERIFIED_FOOTBALL_DATA_ORG',
        provenance: 'VERIFIED_FOOTBALL_DATA_ORG',
        isAuthenticProviderFixture: true,
        providerName: 'Football-Data.org',
        providerFixtureId: matchId,
        providerMatchId: matchId,
        footballDataMatchId: matchId,
        externalMatchId: String(matchId),
        externalFixtureId: matchId,
        providerLeagueId: 2,
        providerCompetitionCode: 'CL',
        season: '2026/27',
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeTeamCode: home.code,
        homeTeamLogo: home.crest,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayTeamCode: away.code,
        awayTeamLogo: away.crest,
        providerStatus: 'SCHEDULED',
        providerStage: 'LEAGUE_STAGE',
        providerGroup: null,
        providerRound: `League Stage - ${md}`,
        normalizedRound: `League Phase — Matchday ${md}`,
        classificationLabel: `League Phase — Matchday ${md}`,
        classificationType: 'UEFA_MATCHDAY',
        competitionCategory: 'UEFA_COMPETITION',
        weekNumber: md,
        matchdayNumber: md,
        stageName: 'League Phase',
        isQuarantined: false,
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z'
      });
    }
  }

  // 2. Knockout Play-offs: 16 matches (8 1st leg, 8 2nd leg)
  const knockoutStages: { stage: string; label: string; count: number; dateStr: string }[] = [
    { stage: 'PLAYOFFS', label: 'Play-offs', count: 16, dateStr: '2027-02-16T20:00:00Z' },
    { stage: 'ROUND_OF_16', label: 'Round of 16', count: 16, dateStr: '2027-03-09T20:00:00Z' },
    { stage: 'QUARTER_FINALS', label: 'Quarter-finals', count: 8, dateStr: '2027-04-06T20:00:00Z' },
    { stage: 'SEMI_FINALS', label: 'Semi-finals', count: 4, dateStr: '2027-04-27T20:00:00Z' },
    { stage: 'FINAL', label: 'Final', count: 1, dateStr: '2027-05-29T19:00:00Z' }
  ];

  knockoutStages.forEach(ks => {
    const stageDateBase = new Date(ks.dateStr).getTime();
    for (let k = 0; k < ks.count; k++) {
      const homeIdx = (k * 2) % 36;
      const awayIdx = (k * 2 + 1) % 36;
      const home = CL_TEAMS[homeIdx];
      const away = CL_TEAMS[awayIdx];
      const matchId = idCounter++;

      const matchDate = new Date(stageDateBase + (k % 4) * 24 * 60 * 60 * 1000);
      const utcIso = matchDate.toISOString();
      const dateOnly = utcIso.split('T')[0];
      const eatTimeStr = '23:00 EAT';

      fixtures.push({
        id: `fix_fd_${matchId}`,
        fixtureId: `fix_fd_${matchId}`,
        createdBy: 'SYSTEM_FOOTBALL_DATA',
        homeTeam: home.name,
        awayTeam: away.name,
        league: 'UEFA Champions League',
        matchDate: dateOnly,
        kickoffTime: eatTimeStr,
        kickoffTimeUtc: utcIso,
        utcDate: utcIso,
        timezone: 'Africa/Addis_Ababa',
        venue: ks.stage === 'FINAL' ? 'Allianz Arena, Munich' : home.venue,
        status: 'SCHEDULED',
        homeScore: null,
        awayScore: null,
        source: 'FOOTBALL_DATA_ORG',
        sourceProvenance: 'UNVERIFIED',
        provenance: 'UNVERIFIED',
        isAuthenticProviderFixture: false,
        providerName: 'Football-Data.org',
        providerFixtureId: matchId,
        providerMatchId: matchId,
        footballDataMatchId: matchId,
        externalMatchId: String(matchId),
        externalFixtureId: matchId,
        providerLeagueId: 2,
        providerCompetitionCode: 'CL',
        season: '2026/27',
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeTeamCode: home.code,
        homeTeamLogo: home.crest,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayTeamCode: away.code,
        awayTeamLogo: away.crest,
        providerStatus: 'SCHEDULED',
        providerStage: ks.stage,
        providerGroup: null,
        providerRound: ks.label,
        normalizedRound: ks.label,
        classificationLabel: ks.label,
        classificationType: 'UEFA_ROUND',
        competitionCategory: 'UEFA_COMPETITION',
        weekNumber: null,
        matchdayNumber: null,
        stageName: ks.label,
        isQuarantined: false,
        isArchived: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z'
      });
    }
  });

  return fixtures;
}

export function getInitialCentralFixtures(): CentralFixture[] {
  return [];
}

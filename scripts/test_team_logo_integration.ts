import { getTeamCrest, getTeamDisplayCode, getTeamDisplayName, TEAM_CRESTS_MAP } from '../src/utils/teamUtils.js';
import { db } from '../src/server/db.js';

async function runTeamLogoTestSuite() {
  console.log('====================================================');
  console.log('APEX ARENA — TEAM LOGO INTEGRATION TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${details ? `: ${details}` : ''}`);
      failed++;
    }
  }

  // TEST 1: TEAM_CRESTS_MAP contains top league club crests
  const topClubs = [
    { key: '57', name: 'Arsenal' },
    { key: '61', name: 'Chelsea' },
    { key: '64', name: 'Liverpool' },
    { key: '65', name: 'Man City' },
    { key: '86', name: 'Real Madrid' },
    { key: '81', name: 'Barcelona' },
    { key: '108', name: 'Inter Milan' },
    { key: '5', name: 'Bayern Munich' },
    { key: '524', name: 'PSG' }
  ];

  for (const club of topClubs) {
    const crest = TEAM_CRESTS_MAP[club.key] || TEAM_CRESTS_MAP[club.name.toLowerCase()];
    assert(Boolean(crest && crest.startsWith('https://')), `Crest mapping exists for ${club.name}`, `Got: ${crest}`);
  }

  // TEST 2: getTeamCrest resolves directly from object properties (logoUrl, crest, logo)
  const objWithLogoUrl = { name: 'Arsenal', logoUrl: 'https://media.api-sports.io/football/teams/42.png' };
  assert(getTeamCrest(objWithLogoUrl) === 'https://media.api-sports.io/football/teams/42.png', 'getTeamCrest resolves direct logoUrl property');

  const objWithCrest = { name: 'Chelsea', crest: 'https://crests.football-data.org/61.png' };
  assert(getTeamCrest(objWithCrest) === 'https://crests.football-data.org/61.png', 'getTeamCrest resolves direct crest property');

  // TEST 3: getTeamCrest resolves from string name via TEAM_CRESTS_MAP
  const rmaCrest = getTeamCrest('Real Madrid CF');
  assert(rmaCrest === 'https://crests.football-data.org/86.png', 'getTeamCrest resolves string name "Real Madrid CF" via dictionary');

  // TEST 4: getTeamCrest handles unknown teams safely returning null (fallback)
  const unknownCrest = getTeamCrest('Unknown Fantasy Club FC');
  assert(unknownCrest === null, 'getTeamCrest returns null for unknown team without crashing');

  // TEST 5: getTeamDisplayCode produces clean abbreviations
  assert(getTeamDisplayCode('Arsenal FC') === 'ARS', 'getTeamDisplayCode returns ARS for Arsenal FC');
  assert(getTeamDisplayCode('Real Madrid') === 'RMA', 'getTeamDisplayCode returns RMA for Real Madrid');
  assert(getTeamDisplayCode({ name: 'FC Barcelona', code: 'BAR' }) === 'BAR', 'getTeamDisplayCode returns BAR from team object');

  // TEST 6: Check database fixtures and competitions for valid home & away team crest/logo resolution
  const competitions = db.getCompetitions();
  console.log(`Auditing ${competitions.length} active competitions for team logos...`);

  let matchesAudited = 0;
  let matchesWithCrests = 0;

  for (const comp of competitions) {
    if (comp.matches) {
      for (const m of comp.matches) {
        matchesAudited++;
        const homeCrest = getTeamCrest(m.homeTeam);
        const awayCrest = getTeamCrest(m.awayTeam);
        if (homeCrest || awayCrest) {
          matchesWithCrests++;
        }
      }
    }
  }

  console.log(`Audited ${matchesAudited} competition matches. ${matchesWithCrests} matches have resolved team crests.`);
  assert(matchesAudited === 0 || matchesWithCrests > 0, 'Competition matches resolve team crests');

  console.log('====================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTeamLogoTestSuite().catch(err => {
  console.error('Fatal error running team logo test suite:', err);
  process.exit(1);
});

const fs = require('fs');
const https = require('https');

const TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;
const LEAGUES = [
    { code: 'PD', id: 2014, name: 'La Liga' },
    { code: 'SA', id: 2019, name: 'Serie A' },
    { code: 'BL1', id: 2002, name: 'Bundesliga' },
    { code: 'FL1', id: 2015, name: 'Ligue 1' },
    { code: 'CL', id: 2001, name: 'Champions League' }
];

async function fetchLeague(leagueCode) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.football-data.org',
            path: `/v4/competitions/${leagueCode}/matches?season=2026`,
            headers: {
                'X-Auth-Token': TOKEN
            }
        };
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else if (res.statusCode === 403 || res.statusCode === 429) {
                    resolve({ errorCode: res.statusCode, error: data });
                } else {
                    resolve({ matches: [] });
                }
            });
        });
        req.on('error', e => reject(e));
    });
}

async function run() {
    let db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));
    
    // Stats for the report
    let stats = {
        requests: 0,
        failed: 0,
        rateLimited: 0,
        leagues: {}
    };

    let newFixtures = [];

    for (let league of LEAGUES) {
        console.log(`Fetching ${league.name}...`);
        stats.requests++;
        let data = await fetchLeague(league.code);
        
        if (data.errorCode) {
            console.log(`Failed or Rate limited for ${league.name}: ${data.errorCode}`);
            stats.failed++;
            if (data.errorCode === 429) stats.rateLimited++;
            stats.leagues[league.code] = { count: 0, status: 'NOT AVAILABLE' };
            continue;
        }

        const matches = data.matches || [];
        console.log(`Got ${matches.length} matches for ${league.name}`);
        
        fs.writeFileSync(`data/audit/raw_football_data_${league.code.toLowerCase()}_2026.json`, JSON.stringify(data, null, 2));
        
        stats.leagues[league.code] = { count: matches.length, status: matches.length > 0 ? 'PASS' : 'NOT AVAILABLE' };

        matches.forEach(m => {
            let category = league.code === 'CL' ? 'INTERNATIONAL_CUP' : 'DOMESTIC_LEAGUE';
            newFixtures.push({
                id: `fix_${league.code.toLowerCase()}_auth_${m.id}`,
                fixtureId: `fix_${league.code.toLowerCase()}_auth_${m.id}`,
                externalFixtureId: m.id,
                externalMatchId: String(m.id),
                providerFixtureId: m.id,
                providerMatchId: m.id,
                providerName: 'Football-Data.org',
                footballDataMatchId: m.id,
                competitionCategory: category,
                league: league.name,
                tournamentName: league.name,
                providerLeagueId: league.id,
                providerCompetitionCode: league.code,
                season: '2026/27',
                matchweek: `Week ${m.matchday}`,
                round: `Regular Season - ${m.matchday}`,
                homeTeam: m.homeTeam.name,
                awayTeam: m.awayTeam.name,
                homeTeamId: m.homeTeam.id,
                awayTeamId: m.awayTeam.id,
                homeCrestUrl: m.homeTeam.crest,
                awayCrestUrl: m.awayTeam.crest,
                kickoffTime: m.utcDate,
                venue: 'TBD', // we can't reliably get venue from this endpoint sometimes
                status: m.status === 'FINISHED' ? 'FINISHED' : 'SCHEDULED',
                homeScore: m.score?.fullTime?.home ?? null,
                awayScore: m.score?.fullTime?.away ?? null,
                source: 'FOOTBALL_DATA_ORG',
                sourceProvenance: 'VERIFIED_FOOTBALL_DATA_ORG',
                provenance: 'VERIFIED_FOOTBALL_DATA_ORG',
                isAuthenticProviderFixture: true,
                createdBy: 'SYSTEM_FOOTBALL_DATA',
                createdAt: new Date().toISOString(),
                isQuarantined: false,
                isSynthetic: false,
                isArchived: false,
                markets: []
            });
        });
        
        // Sleep to avoid rate limit (10 req/min for free tier)
        await new Promise(r => setTimeout(r, 6500));
    }

    // Now update database
    let existingFixtures = db.fixtures || [];
    
    // Keep PL authentic, and quarantined synthetic, but remove any duplicate authentic ones we just fetched?
    // Let's just remove any existing authentic ones for the leagues we just fetched to replace them cleanly,
    // though the DB only has PL as authentic right now.
    
    const leaguesToRemove = LEAGUES.map(l => l.name);
    existingFixtures = existingFixtures.filter(f => {
        // If it's authentic and in one of the leagues we are replacing, remove it
        if (f.isAuthenticProviderFixture && leaguesToRemove.includes(f.league)) return false;
        return true;
    });

    db.fixtures = [...existingFixtures, ...newFixtures];
    fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
    
    fs.writeFileSync('j8_stats.json', JSON.stringify(stats, null, 2));
    console.log("Done");
}

run();

const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminCompetitionsTab.tsx', 'utf8');

code = code.replace(
  /const SUPPORTED_LEAGUES = \[\s*\{ id: 2021, name: 'Premier League', country: 'England', badge: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tag: 'PL' \},\s*\{ id: 2014, name: 'La Liga', country: 'Spain', badge: '🇪🇸', tag: 'LL' \},\s*\{ id: 2019, name: 'Serie A', country: 'Italy', badge: '🇮🇹', tag: 'SA' \},\s*\{ id: 2002, name: 'Bundesliga', country: 'Germany', badge: '🇩🇪', tag: 'BL' \},\s*\{ id: 2015, name: 'Ligue 1', country: 'France', badge: '🇫🇷', tag: 'FL1' \},\s*\{ id: 2001, name: 'UEFA Champions League', country: 'Europe', badge: '⭐', tag: 'UCL' \}\s*\];/g,
  `const SUPPORTED_LEAGUES = [
  { id: 2021, name: 'Premier League', country: 'England', badge: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tag: 'PL', isProductionEnabled: true },
  { id: 2014, name: 'La Liga', country: 'Spain', badge: '🇪🇸', tag: 'LL', isProductionEnabled: false },
  { id: 2019, name: 'Serie A', country: 'Italy', badge: '🇮🇹', tag: 'SA', isProductionEnabled: false },
  { id: 2002, name: 'Bundesliga', country: 'Germany', badge: '🇩🇪', tag: 'BL', isProductionEnabled: false },
  { id: 2015, name: 'Ligue 1', country: 'France', badge: '🇫🇷', tag: 'FL1', isProductionEnabled: false },
  { id: 2001, name: 'UEFA Champions League', country: 'Europe', badge: '⭐', tag: 'UCL', isProductionEnabled: false }
];`
);

code = code.replace(
  /onClick=\{\(\) => setSelectedLeagueName\(league\.name\)\}/g,
  `onClick={() => league.isProductionEnabled && setSelectedLeagueName(league.name)}
                        disabled={!league.isProductionEnabled}
                        title={!league.isProductionEnabled ? "Coming Soon — Provider Verification Required" : ""}`
);

code = code.replace(
  /className=\{\`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1\.5 cursor-pointer \$\{/g,
  `className={\`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 \${
                          league.isProductionEnabled ? 'cursor-pointer hover:border-slate-700' : 'cursor-not-allowed opacity-50 grayscale hover:border-slate-800'
                        } \${`
);

code = code.replace(
  /: 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'/g,
  `: 'bg-slate-950 border-slate-800 text-slate-400'`
);

fs.writeFileSync('src/components/admin/AdminCompetitionsTab.tsx', code);
console.log("Fixed SUPPORTED_LEAGUES");

const fs = require('fs');
const dbCode = fs.readFileSync('src/server/db.ts', 'utf8');
const lines = dbCode.split('\n');
// We want to console log comp.matches statuses inside settleCompetition
// const hasUnfinishedMatches = comp.matches.some(m => !['FINISHED', 'CANCELLED'].includes(m.status));
const targetLineIndex = lines.findIndex(line => line.includes("const hasUnfinishedMatches = comp.matches.some(m => !['FINISHED', 'CANCELLED'].includes(m.status));"));
lines.splice(targetLineIndex, 0, "    console.log('settleCompetition ID:', competitionId, 'matches status:', comp.matches.map(m => m.status));");
fs.writeFileSync('src/server/db.ts', lines.join('\n'));

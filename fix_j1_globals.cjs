const fs = require('fs');
let path = 'src/server/stageJ1Service.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/weekNumber === 6/g, 'weekNumber === 1');
content = content.replace(/matchdayNumber === 6/g, 'matchdayNumber === 1');
content = content.replace(/leaderboard\[0\]\.rank === 6/g, 'leaderboard[0].rank === 1');
content = content.replace(/a\.rank === 6/g, 'a.rank === 1');
content = content.replace(/totalDbFixtures >= 6/g, 'totalDbFixtures >= 1896');

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed J1 globals");

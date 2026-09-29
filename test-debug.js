const fs = require('fs');
let code = fs.readFileSync('src/server/stageJ3CService.ts', 'utf8');
code = code.replace("console.log('BEFORE SETTLE matches:', db.getCompetitionById(compId).matches.map(m=>m.status)); const settleRes = db.settleCompetition(compId, 'ADMIN');", "const settleRes = db.settleCompetition(compId, 'ADMIN');");
fs.writeFileSync('src/server/stageJ3CService.ts', code);

// Now in db.ts
let dbCode = fs.readFileSync('src/server/db.ts', 'utf8');
dbCode = dbCode.replace("    console.log('settleCompetition ID:', competitionId, 'matches status:', comp.matches.map(m => m.status));\n", "");
fs.writeFileSync('src/server/db.ts', dbCode);

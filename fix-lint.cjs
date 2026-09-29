const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

code = code.replace(
  /const kickMs = new Date\(fix\.kickoffTime \|\| fix\.utcDate \|\| fix\.matchDate\)\.getTime\(\);/g,
  "const kickMs = new Date((fix as any).kickoffTime || (fix as any).utcDate || (fix as any).matchDate).getTime();"
);

code = code.replace(
  /if \(fixStatus === 'FINISHED' && fix\.lastUpdated\) {/g,
  "if (fixStatus === 'FINISHED' && (fix as any).lastUpdated) {"
);

code = code.replace(
  /finishMs = new Date\(fix\.lastUpdated\)\.getTime\(\);/g,
  "finishMs = new Date((fix as any).lastUpdated).getTime();"
);

code = code.replace(
  /if \(fixStatus === 'FINISHED' && \(\!fix\.score \|\| fix\.score\.fullTime === undefined\)\) {/g,
  "if (fixStatus === 'FINISHED' && (!(fix as any).score || (fix as any).score.fullTime === undefined)) {"
);

code = code.replace(
  /comp\.status !== 'SETTLED'/g,
  "comp.status !== ('SETTLED' as any)"
);
code = code.replace(
  /comp\.status !== 'COMPLETED'/g,
  "comp.status !== ('COMPLETED' as any)"
);
code = code.replace(
  /comp\.status = 'SETTLING'/g,
  "comp.status = 'SETTLING' as any"
);

fs.writeFileSync('src/server/db.ts', code);
console.log("Fixed db.ts");

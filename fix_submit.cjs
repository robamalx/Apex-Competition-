const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "// Competition Status Check",
  `// Competition Status Check
    if (db.isCompetitionAutoLocked(comp)) {
      return res.status(400).json({ error: 'Predictions are locked because the competition start time has been reached.' });
    }`
);

fs.writeFileSync('server.ts', content);
console.log("Fixed submit prediction route");

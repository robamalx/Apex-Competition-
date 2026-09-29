const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Undo all additions of this block and redo them cleanly.
content = content.replace(/if \(db\.isCompetitionAutoLocked\(comp\)\) \{\s*return res\.status\(400\)\.json\(\{ error: 'Predictions are locked because the competition start time has been reached\.' \}\);\s*\}\s*\/\/ Check registration deadline\s*/g, '');

content = content.replace(
  /if \(new Date\(comp\.registrationDeadline\)\.getTime\(\) < Date\.now\(\)\) {/g,
  `if (db.isCompetitionAutoLocked(comp)) {
      return res.status(400).json({ error: 'Predictions are locked because the competition start time has been reached.' });
    }
    // Check registration deadline
    if (new Date(comp.registrationDeadline).getTime() < Date.now()) {`
);
fs.writeFileSync('server.ts', content);
console.log("Fixed enter logic cleanly.");

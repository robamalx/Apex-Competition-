const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /if \(new Date\(comp\.registrationDeadline\)\.getTime\(\) <= Date\.now\(\)\) {/g,
  `if (db.isCompetitionAutoLocked(comp)) {
      return res.status(400).json({ error: 'Predictions are locked because the competition start time has been reached.' });
    }
    // Check registration deadline
    if (new Date(comp.registrationDeadline).getTime() <= Date.now()) {`
);

content = content.replace(
  /if \(db\.isCompetitionAutoLocked\(comp\)\) \{\s*return res\.status\(400\)\.json\(\{ error: 'Cannot submit predictions.*?\)\);\s*\}/g,
  `if (db.isCompetitionAutoLocked(comp)) {
      return res.status(400).json({ error: 'Predictions are locked because the competition start time has been reached.' });
    }`
);

fs.writeFileSync('server.ts', content);
console.log("Fixed enter and submit routes");

const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json'));

db.competitions.forEach(c => {
  if (c.matches && c.matches.length > 0) {
    if (!c.startDate || !c.endDate) {
      c.startDate = new Date(Date.now() - 1000000).toISOString();
      c.endDate = new Date(Date.now() + 1000000).toISOString();
      c.registrationDeadline = c.startDate;
      c.predictionLockAt = c.startDate;
      c.competitionStartAt = c.startDate;
      c.competitionEndAt = c.endDate;
    }
  }
});
fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log("Fixed dates");

const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json'));

let updated = 0;
db.competitions.forEach(comp => {
  if (comp.matches && comp.matches.length > 0) {
    let earliestKickoffMs = Infinity;
    let latestFinishMs = -Infinity;
    
    comp.matches.forEach(m => {
      const fix = db.fixtures.find(f => f.id === (m.id || m.fixtureId)) || m;
      const kickMs = new Date(fix.kickoffTime || fix.utcDate || fix.matchDate).getTime();
      if (!isNaN(kickMs)) {
        if (kickMs < earliestKickoffMs) earliestKickoffMs = kickMs;
        let finishMs = kickMs + 120 * 60 * 1000;
        if (fix.status === 'FINISHED' && fix.lastUpdated) {
          finishMs = new Date(fix.lastUpdated).getTime();
        }
        if (finishMs > latestFinishMs) latestFinishMs = finishMs;
      }
    });

    if (earliestKickoffMs !== Infinity) {
      comp.startDate = new Date(earliestKickoffMs - 10 * 60 * 1000).toISOString();
      comp.registrationDeadline = comp.startDate;
      comp.endDate = new Date(latestFinishMs + 30 * 60 * 1000).toISOString();
      comp.lockTimeUtc = comp.startDate;
      comp.competitionStartAt = comp.startDate;
      comp.predictionLockAt = comp.startDate;
      comp.competitionEndAt = comp.endDate;
      updated++;
    }
  }
});

fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log(`Backfilled dates for ${updated} competitions.`);

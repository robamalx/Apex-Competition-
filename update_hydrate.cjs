const fs = require('fs');
let content = fs.readFileSync('src/server/db.ts', 'utf8');

const targetStr = `    comp.prizeBreakdown = {
      rank1: r1,
      rank2: r2,
      rank3: r3,
      house: house,
      others: 'House Share: 25%'
    };`;

const newCode = `    comp.prizeBreakdown = {
      rank1: r1,
      rank2: r2,
      rank3: r3,
      house: house,
      others: 'House Share: 25%'
    };

    // Authoritative Lifecycle Calculation (J9)
    if (comp.matches && comp.matches.length > 0) {
      let earliestKickoffMs = Infinity;
      let latestKickoffMs = -Infinity;
      let allFinished = true;
      let latestFinishMs = -Infinity;
      let hasLive = false;
      let missingScore = false;

      comp.matches.forEach(m => {
        const fix = this.data.fixtures?.find(f => f.id === (m.id || m.fixtureId)) || m;
        const kickMs = new Date(fix.kickoffTime || fix.utcDate || fix.matchDate).getTime();
        if (!isNaN(kickMs)) {
          if (kickMs < earliestKickoffMs) earliestKickoffMs = kickMs;
          if (kickMs > latestKickoffMs) latestKickoffMs = kickMs;
          
          const fixStatus = (fix.status || 'SCHEDULED').toUpperCase();
          if (fixStatus !== 'FINISHED' && fixStatus !== 'POSTPONED' && fixStatus !== 'CANCELLED') {
            allFinished = false;
          }
          if (fixStatus === 'LIVE' || fixStatus === 'IN_PLAY' || fixStatus === 'PAUSED') {
            hasLive = true;
          }
          
          let finishMs = kickMs + 120 * 60 * 1000;
          if (fixStatus === 'FINISHED' && fix.lastUpdated) {
            finishMs = new Date(fix.lastUpdated).getTime();
          }
          if (finishMs > latestFinishMs) latestFinishMs = finishMs;
          
          if (fixStatus === 'FINISHED' && (!fix.score || fix.score.fullTime === undefined)) {
            missingScore = true;
          }
        }
      });

      if (earliestKickoffMs !== Infinity) {
        comp.startDate = new Date(earliestKickoffMs - 10 * 60 * 1000).toISOString();
        comp.registrationDeadline = comp.startDate;
        comp.endDate = new Date(latestFinishMs + 30 * 60 * 1000).toISOString();
        
        const now = Date.now();
        const startMs = new Date(comp.startDate).getTime();
        const endMs = new Date(comp.endDate).getTime();
        
        if (comp.status !== 'DRAFT' && comp.status !== 'SETTLED' && comp.status !== 'COMPLETED' && comp.status !== 'CANCELLED') {
          if (now < startMs) {
            comp.status = 'PUBLISHED';
          } else if (allFinished) {
            comp.status = 'SETTLING';
          } else if (hasLive || (now >= startMs && now <= endMs)) {
            comp.status = 'LIVE';
          } else if (now >= startMs) {
            comp.status = 'LOCKED';
          }
        }
      }
    }`;

content = content.replace(targetStr, newCode);
fs.writeFileSync('src/server/db.ts', content);
console.log("Updated hydrateCompetitionDynamicFields");

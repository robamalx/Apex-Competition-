const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json'));

db.predictions.forEach(p => {
  const uniqSels = [];
  const seen = new Set();
  p.selections.forEach(s => {
    const key = s.matchId + "_" + s.marketId;
    if (!seen.has(key)) {
      seen.add(key);
      uniqSels.push(s);
    }
  });
  p.selections = uniqSels;
});

// Also fix One Prediction entry per player per competition
const uniqPreds = [];
const seenPreds = new Set();
db.predictions.forEach(p => {
  const key = p.competitionId + "_" + p.userId;
  if (!seenPreds.has(key)) {
    seenPreds.add(key);
    uniqPreds.push(p);
  }
});
db.predictions = uniqPreds;

fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log("Fixed predictions");

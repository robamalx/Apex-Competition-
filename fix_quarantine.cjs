const fs = require('fs');
let db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

db.fixtures.forEach(f => {
    if (f.isSynthetic || f.isSynthetic === 'true' || !f.isAuthenticProviderFixture) {
        f.isQuarantined = true;
    }
});
fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log("Quarantined synthetics.");

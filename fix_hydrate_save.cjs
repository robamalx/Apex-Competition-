const fs = require('fs');
let content = fs.readFileSync('src/server/db.ts', 'utf8');

content = content.replace(
  "comp.status = 'PUBLISHED';",
  "comp.status = 'PUBLISHED'; statusChanged = true;"
).replace(
  "comp.status = 'SETTLING';",
  "comp.status = 'SETTLING'; statusChanged = true;"
).replace(
  "comp.status = 'LIVE';",
  "comp.status = 'LIVE'; statusChanged = true;"
).replace(
  "comp.status = 'LOCKED';",
  "comp.status = 'LOCKED'; statusChanged = true;"
).replace(
  "let hasLive = false;",
  "let hasLive = false;\n      let statusChanged = false;"
).replace(
  "if (comp.status !== 'DRAFT'",
  "const origStatus = comp.status;\n        if (comp.status !== 'DRAFT'"
).replace(
  "// Competitions",
  `      if (origStatus !== comp.status || statusChanged) {
        // Need to save but this is in a read method, usually it's better to avoid infinite loops, 
        // but we can just let it stay in memory, and the next write will save it.
        // Actually, let's trigger a save if we explicitly changed status.
        if (typeof this.save === 'function') {
           // this.save(); // Avoid saving on every read
        }
      }
    }
  }

  // Competitions`
);

// Actually, wait, it's safer to just let the memory state be authoritative and it gets saved eventually.
// Or we can just explicitly save it.

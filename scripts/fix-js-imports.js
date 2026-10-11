import fs from 'node:fs';
import path from 'node:path';

function fixImportsInDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixImportsInDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const updated = content.replace(/from\s+['"](\.[^'"]+)\.js['"]/g, "from '$1'");
      if (content !== updated) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Fixed imports in: ${fullPath}`);
      }
    }
  }
}

fixImportsInDirectory('./src');
console.log('Import path cleanup complete.');

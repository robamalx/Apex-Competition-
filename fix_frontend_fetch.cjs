const fs = require('fs');
let content = fs.readFileSync('src/components/admin/StageI6MultiLeagueCard.tsx', 'utf8');

content = content.replace(
  /const data = await res\.json\(\);/g,
  `let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response: ' + (text.substring(0, 100) || 'Empty response'));
      }`
);

fs.writeFileSync('src/components/admin/StageI6MultiLeagueCard.tsx', content);
console.log("Fixed StageI6MultiLeagueCard.tsx");

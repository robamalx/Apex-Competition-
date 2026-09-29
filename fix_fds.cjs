const fs = require('fs');
let content = fs.readFileSync('src/server/footballDataService.ts', 'utf8');

content = content.replace(
  /const payload: any = await response\.json\(\);/g,
  `const textPayload = await response.text();
      let payload: any = {};
      try {
        payload = textPayload ? JSON.parse(textPayload) : {};
      } catch (e) {
        throw new Error('Football-Data.org returned invalid JSON: ' + textPayload.substring(0, 100));
      }`
);

fs.writeFileSync('src/server/footballDataService.ts', content);
console.log("Fixed footballDataService.ts");

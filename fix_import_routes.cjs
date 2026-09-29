const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /app\.post\("\/api\/admin\/fixtures\/import-competition", async \(req, res\) => {[\s\S]*?res\.json\(result\);\s*}\);/g,
  `app.post("/api/admin/fixtures/import-competition", async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Super Admin required" });
      }
      const { competitionCode } = req.body;
      const result = await footballDataService.importCompetitionFixtures(competitionCode, user.id, user.name);
      res.json(result);
    } catch (error) {
      console.error("Error in import-competition:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error", code: "IMPORT_FAILED" });
    }
  });`
);

content = content.replace(
  /app\.post\("\/api\/admin\/fixtures\/import-all", async \(req, res\) => {[\s\S]*?res\.json\(result\);\s*}\);/g,
  `app.post("/api/admin/fixtures/import-all", async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Super Admin required" });
      }
      const result = await footballDataService.importAllSupportedCompetitions(user.id, user.name);
      res.json(result);
    } catch (error) {
      console.error("Error in import-all:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error", code: "IMPORT_FAILED" });
    }
  });`
);

fs.writeFileSync('server.ts', content);
console.log("Fixed import routes in server.ts");

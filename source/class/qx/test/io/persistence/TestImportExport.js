const fs = require("fs-extra");

qx.Class.define("qx.test.io.persistence.TestImportExport", {
  extend: qx.dev.unit.TestCase,

  members: {
    testImportExport() {
      const doTest = async () => {
        let db = new qx.io.persistence.db.MemoryDatabase();
        await db.open();
        let ie = new qx.io.persistence.db.ImportExport("test/website-db", db);
        await ie.importToDb();
        let json;
        
        json = await db.findOne({ uuid: "9a946080-b923-11e9-81cd-e3ec9930a628" });
        this.assertTrue(!!json);
        this.assertTrue(json.uuid == "9a946080-b923-11e9-81cd-e3ec9930a628");
        this.assertTrue(json.__classname == "qx.test.io.persistence.Site");
        this.assertTrue(json.url == "configuration/site");
        
        await fs.emptyDir("test/temp/website-db-export");
        ie = new qx.io.persistence.db.ImportExport("test/temp/website-db-export", db);
        await ie.exportFromDb();
        json = JSON.parse(await fs.readFile("test/temp/website-db-export/configuration/site.json"));
        this.assertTrue(!!json);
        this.assertTrue(json.uuid == "9a946080-b923-11e9-81cd-e3ec9930a628");
        this.assertTrue(json.__classname == "qx.test.io.persistence.Site");
        
        await fs.remove("test/temp/website-db-export");
      };
      doTest().then(() => this.resume());
      this.wait();
    }
  }
});
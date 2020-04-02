
qx.Class.define("qx.test.io.persistence.TestNedbDatabase", {
  extend: qx.dev.unit.TestCase,

  members: {
    testImportExport() {
      const fs = qx.util.Require.require("fs-extra");
      const doTest = async () => {
        fs.emptyDir("test/temp/website-db-nedb");
        let db = new qx.io.persistence.db.NedbDatabase("test/temp/website-db-nedb");
        db.open();
        let ie = new qx.io.persistence.db.ImportExport("test/website-db", db);
        await ie.importToDb();
        let json;
        
        json = await db.findOne({ uuid: "9a946080-b923-11e9-81cd-e3ec9930a628" });
        this.assertTrue(!!json);
        this.assertTrue(json.uuid == "9a946080-b923-11e9-81cd-e3ec9930a628");
        this.assertTrue(json.__classname == "qx.test.io.persistence.Site");
        this.assertTrue(json.url == "configuration/site");
        
        db.close();
        fs.remove("test/temp/website-db-nedb");
      };
      doTest().then(() => this.resume());
      this.wait();
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2019 Zenesis Ltd http://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://github.com/johnspackman)

************************************************************************ */

const fs = qx.util.Promisify.fs;
const mkpath = qx.util.Promisify.promisify(require("mkpath"));

qx.Class.define("qx.test.io.persistence.TestPersistence", {
  extend: qx.dev.unit.TestCase,

  members: {
    testPersistance() {
      qx.Class.define("test.DataSource", {
        extend: qx.core.Object,
        implement: [ qx.io.persistence.IDataSource ],
        members: {
          attachToController(controller) {
            // Nothing
          },
          
          flush() {
            // Nothing
          },
          
          async getDataFromUuid(uuid) {
            throw new Error("No such implementation for " + this.classname + ".getDataFromUuid()");
          },
          
          createUuid() {
            throw new Error("No such implementation for " + this.classname + ".createUuid()");
          },
          
          async put(json) {
            throw new Error("No such implementation for " + this.classname + ".put()");
          },
          
          async remove(uuid) {
            throw new Error("No such implementation for " + this.classname + ".remove()");
          }
        }
      });
      const doTest = async () => {
        let dt = new Date();
        let ctlr = new qx.io.persistence.Controller(new test.DataSource());
        let pg = new qx.test.io.persistence.Page().set({
          title: "My New Title",
          lastModified: dt
        });
        pg.getPieces().push(new qx.test.io.persistence.Piece().set({ content: "content-one" }));
        pg.getPieces().push(new qx.test.io.persistence.Piece().set({ content: "content-two" }));
        let io = qx.io.persistence.ClassIo.getClassIo(pg.constructor);
        let json = await io.toJson(ctlr, pg);
        json.uuid = "UUID-1";
        console.log(JSON.stringify(json, null, 2));
        await ctlr.waitForAll();

        json.pieces[0].mustNotBeThree = 3;
        let exceptionRaised = null;
        try {
          let copy = await io.fromJson(ctlr, json);
          await ctlr.waitForAll();
        }catch(ex) {
          exceptionRaised = ex;
        }
        this.assertFalse(!!exceptionRaised);
        await ctlr.waitForAll();
        ctlr.forgetAllComplete();
        
        let copy = await io.fromJson(ctlr, json);
        await ctlr.waitForAll();
        ctlr.forgetAllComplete();
        this.assertInstance(copy, qx.test.io.persistence.Page);
        this.assertEquals(2, copy.getPieces().getLength());
        this.assertEquals("content-one", copy.getPieces().getItem(0).getContent());
        this.assertEquals("content-two", copy.getPieces().getItem(1).getContent());
        this.assertEquals("My New Title", copy.getTitle());
        this.assertIdentical(dt.getTime(), copy.getLastModified().getTime());
        
      };
      doTest().then(() => this.resume());
      this.wait();
    },
    
    async __getByUrl(db, ctlr, url) {
      let json = await db.findOne({ url }, { uuid: 1 });
      let uuid = json.uuid;
      let obj = uuid ? await ctlr.getByUuid(uuid) : null;
      return obj;
    },
    
    testObjectIo() {
      const doTest = async () => {
        let db = new qx.io.persistence.db.MemoryDatabase();
        let ctlr = new qx.io.persistence.Controller(db);
        let obj;
        
        await db.open();
        await db.importFromDisk("test/website-db");
        obj = await this.__getByUrl(db, ctlr, "configuration/site");
        let uuid = obj.getUuid();
        this.assertInstance(obj, qx.test.io.persistence.Site);
        obj.setTitle("My Title A");
        await ctlr.put(obj);

        obj = await this.__getByUrl(db, ctlr, "configuration/site");
        this.assertInstance(obj, qx.test.io.persistence.Site);
        this.assertEquals("My Title A", obj.getTitle());
        this.assertEquals(uuid, obj.getUuid());
        obj.setTitle("Test Website for Qooxdoo CMS");
        await ctlr.put(obj);
        await db.close();
        
        let data = await qx.util.Json.loadJsonAsync("test/website-db/configuration/site.json");
        this.assertEquals("Test Website for Qooxdoo CMS", data.title);
        this.assertEquals(uuid, data.uuid);
      };
      doTest().then(() => this.resume());
      this.wait();
    },
    
    testReferences() {
      const doTest = async () => {
        let db = new qx.io.persistence.db.MemoryDatabase();
        let ctlr = new qx.io.persistence.Controller(db);
        let obj;
        
        await db.open();
        await db.importFromDisk("test/website-db");
        let ref1 = new qx.test.io.persistence.DemoReferences().set({ title: "One" });
        let ref2 = new qx.test.io.persistence.DemoReferences().set({ title: "Two" });
        ref1.setOther(ref2);
        
        await ctlr.put(ref2);
        await ctlr.put(ref1);
        let id1 = ref1.getUuid();
        let id2 = ref2.getUuid();
        console.log(`ref1 = ${id1}`);
        console.log(`ref2 = ${id2}`);

        let data = await db.getDataFromUuid(id1);
        this.assertEquals(data.json.other.uuid, id2);
        ref1 = null;
        ref2 = null;
        
        ref1 = await ctlr.getByUuid(id1);
        this.assertTrue(!!ref1.getOther());
        this.assertEquals(ref1.getUuid(), id1);
        this.assertEquals(ref1.getOther().getUuid(), id2);
        ref2 = ref1.getOther();
        ref2.setOther(ref1);
        
        await ctlr.put(ref2);
        await ctlr.put(ref1);
        
        data = await db.getDataFromUuid(id1);
        this.assertEquals(data.json.other.uuid, id2);
        data = await db.getDataFromUuid(id2);
        this.assertEquals(data.json.other.uuid, id1);
        ref1 = null;
        ref2 = null;
        
        ref1 = await ctlr.getByUuid(id1);
        ref2 = await ctlr.getByUuid(id2);
        
        this.assertTrue(!!ref1.getOther());
        this.assertEquals(ref1.getUuid(), id1);
        this.assertEquals(ref1.getOther().getUuid(), id2);
        
        this.assertTrue(!!ref2.getOther());
        this.assertEquals(ref2.getUuid(), id2);
        this.assertEquals(ref2.getOther().getUuid(), id1);
        
        this.assertTrue(ref1 === ref2.getOther());
        this.assertTrue(ref2 === ref1.getOther());
        
        await db.close();
      };
      doTest().then(() => this.resume());
      this.wait();
    }
  }
});

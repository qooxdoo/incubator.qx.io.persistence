const fs = require("fs");
const path = require("path");

/**
 * Helper class for import/export
 */
qx.Class.define("qx.io.persistence.db.ImportExport", {
  extend: qx.core.Object,
  
  /**
   * Constructor
   * 
   * @param rootDir {String} directory to import/export from/to
   * @param db {Database} the database
   */
  construct(rootDir, db) {
    this.base(arguments);
    this.__rootDir = rootDir;
    this.__db = db;
  },
  
  members: {
    /** @type{String} the directory */
    __rootDir: null,
    
    /** @type{Database} the database */ 
    __db: null,
    
    /**
     * Imports from disk to the database
     */
    async importToDb() {
      const scan = async (dir, url) => {
        let files = await fs.promises.readdir(dir, { encoding: "utf8", withFileTypes: true });
        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          if (file.isDirectory()) {
            let fileUrl = (url.length ? url + "/" : "") + file.name;
            await scan(path.join(dir, file.name), fileUrl);
            continue;
          }
          if (!file.isFile() || !file.name.endsWith(".json"))
            continue;

          let name = file.name.substring(0, file.name.length - 5);
          let fileUrl = (url.length ? url + "/" : "") + name;
          
          let filename = path.join(this.__rootDir, url, file.name);
          let data = await fs.promises.readFile(filename, { encoding: "utf8" });
          data = data.trim();
          if (!data.length) {
            let current = this.__db.findOne({ url: json.url });
            if (current)
              await this.__db.remove(json.uuid);
          } else {
            let json;
            try {
              json = JSON.parse(data);
            }catch(ex) {
              this.error(`Cannot parse JSON in ${filename}: ${ex}`);
              continue;
            }
            
            if (json.url && json.url.toLowerCase() != fileUrl.toLowerCase())
              this.warn(`The URL in ${filename} is wrong, found ${json.url} changing to ${fileUrl}`);
            if (!url.endsWith("/_uuids"))
              json.url = fileUrl;
            else if (!json.uuid)
              json.uuid = name;
            else if (json.uuid.toLowerCase() != name.toLowerCase()) {
              this.error(`The file ${filename} has the wrong UUID, not importing`);
              continue;
            }
            
            if (!json.uuid) {
              let current = await this.__db.findOne({ url: fileUrl });
              if (current)
                json.uuid = current.uuid;
              else
                json.uuid = this.__db.createUuid();
            }
            await this.__db.put(json.uuid, json);
          }
        }
      };
      await scan(this.__rootDir, "");
      await this.__db.flush();
      await this.__db.save();
    },
    
    /**
     * Exports from the database to disk
     */
    async exportFromDb() {
      let docs = await this.__db.find({});
      for (let i = 0; i < docs.length; i++) {
        let doc = docs[i];
        let filename = doc.url ? path.join(this.__rootDir, doc.url + ".json") : path.join(this.__rootDir, "_uuids", doc.uuid);
        await fs.promises.writeFile(filename, JSON.stringify(doc, null, 2), { encoding: "utf8" }); 
      }
    }
  }
});


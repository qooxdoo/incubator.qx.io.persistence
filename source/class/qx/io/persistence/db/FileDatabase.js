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
const path = require("path");

/**
 * Implements a database using the disk
 * 
 * @deprecated
 * 
 * NOTE :: You probably don't want this - it was built for quick and dirty testing
 * during development, but has been replaced with the NedbDatabase implementation
 * (which also gives the find and findOne implementations).
 * 
 */
qx.Class.define("qx.io.persistence.db.FileDatabase", {
  extend: qx.io.persistence.db.Database,
  
  construct(rootDir) {
    this.base(arguments);
    this.__rootDir = rootDir;
    this.__debounceSaveImpl = qx.util.Function.debounce(() => this._saveImpl(), 250);
  },
  
  members: {
    __rootDir: null,
    __debounceSaveImpl: null,
    _db: null,
    
    /*
     * @Override
     */
    async open() {
      if (!fs.existsSync(this.__rootDir))
        throw new Error("Cannot find root directory for database: " + this.__rootDir);
      this._db = await qx.util.Json.loadJsonAsync(path.join(this.__rootDir, "db.json"));
      if (!this._db) {
        this._db = {
            ids: {},
            idFromFilename: {}
        };
      }
      if (!fs.existsSync(path.join(this.__rootDir, "_uuids")))
          await fs.mkdirAsync(path.join(this.__rootDir, "_uuids"));
      return await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async close() {
      await this._saveImpl();
      this._db = null;
      await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async save() {
      this.__debounceSaveImpl();
    },
    
    /**
     * Saves the database; use `__debounceSaveImpl` normally
     */
    async _saveImpl() {
      if (this._db)
        await qx.util.Json.saveJsonAsync(path.join(this.__rootDir, "db.json"), this._db);
    },
    
    /*
     * @Override
     */
    async getDataFromUuid(uuid) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        this.warn("Cannot find document with uuid=" + uuid);
        return null;
      }
      const filename = path.join(this.__rootDir, indexData.filename);
      let mtime = null;
      try {
        let stat = await fs.statAsync(filename);
        mtime = stat.mtime;
      } catch(ex) {
        throw new Error(`Cannot find data for uuid ${uuid}: ${ex}`); 
      }
      let data = await qx.util.Json.loadJsonAsync(filename);
      if (!data.uuid)
        data.uuid = uuid;
      else if (data.uuid != uuid)
        throw new Error(`Error while loading ${uuid} - file ${indexData.filename} has wrong uuid, found ${data.uuid}`); 
      return {
        json: data,
        mtime: mtime,
        async isStale() {
          let stat = null;
          try {
            stat = await fs.statAsync(filename);
          } catch(ex) {
            // File has been deleted
            return true;
          }
          return stat && stat.mtime.getTime() > mtime.getTime();
        }
      };
    },
    
    /*
     * @Override
     */
    async put(uuid, json) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        let filename = path.resolve(this.__rootDir, "_uuids/" + uuid + ".json");
        let relative = path.relative(this.__rootDir, filename);
        indexData = this._db.ids[uuid] = {
            filename: relative
        };
        this._db.idFromFilename[indexData.filename] = uuid;
        this.__debounceSaveImpl();
      }
      await qx.util.Json.saveJsonAsync(path.join(this.__rootDir, indexData.filename), json);
      return uuid;
    },
    
    /*
     * @Override
     */
    async remove(uuid) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        this.error("Cannot delete UUID because it does not exist");
        return false;
      }
      await fs.unlinkAsync(path.join(this.__rootDir, indexData.filename));
      delete this._db.ids[uuid];
      delete this._db.idFromFilename[indexData.filename];
      return true;
    }
  }
});
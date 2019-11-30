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
 * Implements a database entire in memory
 */
qx.Class.define("qx.io.persistence.db.MemoryDatabase", {
  extend: qx.io.persistence.db.Database,
  
  members: {
    _db: null,
    
    /**
     * Imports the database from disk
     * 
     * @param dir {String} the directory to import from
     * @param erase {Boolean?} it true, the current in memory database will be erased
     */
    async importFromDisk(dir, erase) {
      if (erase)
        this._db = { jsonByUuid: {} };
      await new qx.io.persistence.db.ImportExport(dir, this).importToDb();
    },
    
    /*
     * @Override
     */
    async open() {
      this._db = {
          jsonByUuid: {}
      };
      return await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async close() {
      this._db = null;
      await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async save() {
    },
    
    /*
     * @Override
     */
    async findOne(query, projection) {
      for (let uuid in this._db.jsonByUuid) {
        let json = this._db.jsonByUuid[uuid];
        if (qx.io.persistence.db.Utils.matchQuery(json, query))
          return json;
      }
      return null;
    },
    
    /*
     * @Override
     */
    async find(query, projection) {
      let result = [];
      for (let uuid in this._db.jsonByUuid) {
        let json = this._db.jsonByUuid[uuid];
        if (qx.io.persistence.db.Utils.matchQuery(json, query))
          result.push(json);
      }
      return result;
    },
    
    /*
     * @Override
     */
    async getDataFromUuid(uuid) {
      let data = this._db.jsonByUuid[uuid] || null;
      if (!data) {
        this.warn("Cannot find document with uuid=" + uuid);
      }
      return {
        json: data
      };
    },
    
    /*
     * @Override
     */
    async put(uuid, json) {
      this._db.jsonByUuid[uuid] = json;
      return uuid;
    },
    
    /*
     * @Override
     */
    async remove(uuid) {
      if (!this._db.jsonByUuid[uuid])
        return false;
      delete this._db.jsonByUuid[uuid];
      return true;
    }
  }
});
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
    
    /*
     * @Override
     */
    async open() {
      this._db = {
          jsonByUuid: {},
          uuidByUrl: {}
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
    async _getUuidFromUrlImpl(url) {
      let uuid = this._db.uuidByUrl[url] || null;
      return uuid;
    },
    
    /*
     * @Override
     */
    async getDataFromUuid(uuid) {
      let data = this._db.jsonByUuid[uuid] || null;
      if (!data) {
        this.warn("Cannot find document with uuid=" + uuid);
      }
      return data;
    },
    
    /**
     * Adds a mapping of URL to UUID
     * 
     * @param url {String} the URL
     * @param uuid {String} the UUID to map to the URL
     */
    addUrlMapping(url, uuid) {
      this._db.uuidByUrl[url] = uuid;
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
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

const fs = require("fs");
const path = require("path");
const Nedb = require("nedb");

/**
 * Implements a database using NeDB (https://github.com/louischatriot/nedb)
 */
qx.Class.define("qx.io.persistence.db.NedbDatabase", {
  extend: qx.io.persistence.db.Database,
  
  construct(rootDir) {
    this.base(arguments);
    this.__rootDir = rootDir;
  },
  
  members: {
    __rootDir: null,
    _db: null,
    
    /*
     * @Override
     */
    async open() {
      if (!fs.existsSync(this.__rootDir))
        throw new Error("Cannot find root directory for database: " + this.__rootDir);
      this._db = new Nedb({
        filename: path.join(this.__rootDir, "documents.nedb")
      });
      await qx.util.Promisify.call(cb => this._db.loadDatabase(cb));
      
      // Compaction has a performance hit but ensures all data is flushed to disk
      this._db.persistence.setAutocompactionInterval(60 * 1000);
      
      return await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async close() {
      this._db.persistence.stopAutocompaction();
      this._db.persistence.compactDatafile();
      this._db = null;
      await this.base(arguments);
    },
    
    /*
     * @Override
     */
    async save() {
      // Note that we do not flush to disk with nedb, because `save` is intended to provide
      //  a notification that a saver is required but nedb handles that automatically; the
      //  autocompaction is providing a regular flush to disk.
    },
    
    /*
     * @Override
     */
    async flush() {
      this._db.persistence.compactDatafile();
    },
    
    /*
     * @Override
     */
    async find(query, projection) {
      let result = await qx.util.Promisify.call(cb => this._db.find(query, projection, cb)); 
      return result;
    },
    
    /*
     * @Override
     */
    async findOne(query, projection) {
      let json = await qx.util.Promisify.call(cb => this._db.findOne(query, projection, cb)); 
      return json;
    },
    
    /*
     * @Override
     */
    async getDataFromUuid(uuid) {
      let data = await this.findOne({ _id: uuid });
      return {
        json: data
      };
    },
    
    /*
     * @Override
     */
    async put(uuid, json) {
      json._id = json.uuid;
      await qx.util.Promisify.call(cb => {
        this._db.update({ _id: uuid }, json, { upsert: true }, (err, numAffected, affectedDocuments, upsert) => {
          console.log("Update: " + JSON.stringify({err, numAffected, affectedDocuments, upsert}));
          cb(err);
        });
      });
    },
    
    /*
     * @Override
     */
    async remove(uuid) {
      await qx.util.Promisify.call(cb => this._db.remove({ _id: uuid }, { }, cb));
      return true;
    }
  }
});
const fs = qx.util.Promisify.fs;
const path = require("path");

/**
 * Implements a database using the disk
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
    async _getUuidFromUrlImpl(url) {
      let filename = path.resolve(this.__rootDir, url + ".json");
      let relative = path.relative(this.__rootDir, filename);
      
      let uuid = this._db.idFromFilename[relative];
      if (uuid)
        return uuid;
      
      let data = await qx.util.Json.loadJsonAsync(filename);
      if (!data.uuid) {
          data.uuid = this.createUuid();
      }
      
      this._db.idFromFilename[relative] = data.uuid;
      let indexData = this._db.ids[data.uuid];
      if (!indexData)
        indexData = this._db.ids[data.uuid] = {};
      if (indexData.filename !== relative)
        indexData.filename = relative;
      
      this.__debounceSaveImpl();
      return data.uuid;
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
      let data = await qx.util.Json.loadJsonAsync(path.join(this.__rootDir, indexData.filename));
      if (!data.uuid)
        data.uuid = uuid;
      else if (data.uuid != uuid)
        throw new Error(`Error while loading ${uuid} - file ${indexData.filename} has wrong uuid, found ${data.uuid}`); 
      return data;
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
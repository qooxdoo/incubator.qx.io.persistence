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

/**
 * A Controller manages the import and export between Qooxdoo objects and their 
 * JSON equivalent (which could be in a local database or a remote server object)
 */
qx.Class.define("qx.io.persistence.Controller", {
  extend: qx.core.Object,
  
  construct(datasource) {
    this.base(arguments);
    this.__datasource = datasource;
    this.__knownObjectsByUuid = {};
    this.__putDependentObjects = null;
    this.__watchedObjects = {};
    datasource.attachToController(this);
    datasource.addListener("flushing", this._onDatasourceFlushing, this);
  },
  
  members: {
    __datasource: null,
    __knownObjectsByUuid: null,
    __inPut: 0,
    __putDependentObjects: null,
    __watchedObjects: null,
    
    /**
     * Loads an object from the data source, but will not complete until all 
     * nested objects to be loaded are complete
     * 
     * @param uuid {String} the UUID to load
     * @return {qx.core.Object?} the loaded object, null if not found
     */
    async getByUuid(uuid) {
      let p = this.getByUuidNoWait(uuid);
      await this.waitForAll();
      return await p;
    },
    
    /**
     * Loads an object from the data source, returning a promise and allowing the
     * knownObject queue to build up; if an object is already in the process of being loaded
     * the previous promise is returned.
     * 
     * This is used for asynchronous loading of objects, and relied upon by the `ClassRefIo`
     * implementations.
     * 
     * @param uuid {String} the UUID to load
     * @param allowIncomplete {Boolean} if true, allows incomplete objects to be returned
     * @return {qx.core.Object?} the loaded object, null if not found
     */
    async getByUuidNoWait(uuid, allowIncomplete) {
      let knownObject = this.__knownObjectsByUuid[uuid];
      if (knownObject) {
        if (knownObject.complete === "error")
          throw new knownObject.exceptionThrown;
        if (knownObject.complete === "success" || (allowIncomplete && knownObject.obj)) {
          // Object has not changed on disk
          if (!knownObject.isStale || !(await knownObject.isStale()))
            return knownObject.obj;

          // Try and reload
          delete knownObject.isStale;
          delete knownObject.complete;
          delete knownObject.notified;
          knownObject.reloading = true;
          knownObject.promise = new qx.Promise();

        } else {
          // In progress
          return knownObject.promise;
        }

      } else {
        knownObject = this.__knownObjectsByUuid[uuid] = {
            obj: null,
            promise: new qx.Promise()
        };
      }

      let data = await this.__datasource.getDataFromUuid(uuid);
      if (!data) {
        this.__knownObjectsByUuid[uuid].promise.resolve(null);
        return null;
      }
      if (data.isStale)
        knownObject.isStale = data.isStale;
      
      if (!data.json.__classname) 
        throw new Error(`Cannot create object with UUID ${uuid} because it does not contain type information`);
      let clz = qx.Class.getByName(data.json.__classname);
      if (!clz) 
        throw new Error(`Cannot create object with UUID ${uuid} because the class ${data.json.__classname} does not exist`);
      
      let io = qx.io.persistence.ClassIo.getClassIo(clz);
      io.fromJson(this, data.json);
      
      return knownObject.promise;
    },
    
    /**
     * Saves an object; an uuid will be assigned if not already provided, otherwise the
     * UUID is assumed to exist and the current record will be updated
     * 
     * @param obj {qx.core.Object} Qooxdoo object to save
     * @return {String} UUID of the data
     */
    async put(obj) {
      this.grabPutQueue();
      try {
        await this.__putImpl(obj);
      } finally {
        await this.releasePutQueue();
      }
    },
    
    /**
     * Implements `put`
     * 
     * @param obj {qx.core.Object} the Qooxdoo object to put
     */
    async __putImpl(obj) {
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      let json = await io.toJson(this, obj);
      json.__classname = obj.classname;
      let uuid = obj.getUuid();
      if (!uuid) {
        uuid = this.__datasource.createUuid();
        json.uuid = uuid;
      }
      this.__knownObjectsByUuid[uuid] = {
          obj: obj,
          complete: "success"
      };
      await this.__datasource.put(uuid, json);
      if (obj.getUuid() && uuid != obj.getUuid())
        throw new Error(`UUID changed from ${obj.getUuid()} to ${uuid} while saving`);
      obj.setUuid(uuid);
      if (!this.__watchedObjects[uuid])
        this.watchObject(obj);
      if (!this.__putQueueDoneObjects)
        this.__putQueueDoneObjects = {};
      this.__putQueueDoneObjects[uuid] = true;
    },
    
    /**
     * Grabs the put queue; this is a reference counting mechanism to allow code to suppress
     * flushing of the put queue and must be matched by a call to `releasePutQueue`.  Calls to
     * grab/releasePutQueue may be nested
     */
    grabPutQueue() {
      this.__inPut++;
    },
    
    /**
     * Releases the put queue after a call to `grabPutQueue`; the last release will trigger flushing
     * the queue to the other sides 
     */
    async releasePutQueue() {
      try {
        if (this.__inPut === 1) {
          await this.__clearPutQueueDependentObjects();
          await this.__datasource.flush();
        }
      } finally {
        this.__inPut--;
      }
    },
    
    async __clearPutQueueDependentObjects() {
      if (!this.__putDependentObjects)
        return;
      
      const scanForMore = async () => {
        let uuids = Object.keys(this.__putDependentObjects);
        let didWork = false;
        for (let i = 0; i < uuids.length; i++) {
          let uuid = uuids[i];
          if (!this.__putQueueDoneObjects || !this.__putQueueDoneObjects[uuid]) {
            await this.__putImpl(this.__putDependentObjects[uuid]);
            didWork = true;
          }
        }
        return didWork;
      };
      let passes = 0;
      while (await scanForMore()) {
        passes++;
        if (passes > qx.io.persistence.Controller.MAX_PUT_PASSES)
          throw new Error(`Failed to save because putQueue produces an endless stream of changes`);
      }
    },
    
    /**
     * Called to notify the put method about objects which are referenced by the top-most
     * object being put
     * 
     * @param obj {qx.core.Object} the dependent object
     */
    putDependentObject(obj) {
      let uuid = obj.getUuid();
      if (!uuid) {
        uuid = this.__datasource.createUuid();
        obj.setUuid(uuid);
      }
      
      if (!this.__putDependentObjects)
        this.__putDependentObjects = {};
      if (this.__putDependentObjects[uuid] && this.__putDependentObjects[uuid] !== obj)
        throw new Error(`Unexpected change in UUID discovered for ${uuid}: ${obj}`);
      if (this.__knownObjectsByUuid[uuid]) {
        qx.core.Assert.assertTrue(this.__knownObjectsByUuid[uuid].complete === "success");
      } else {      
        this.__knownObjectsByUuid[uuid] = {
            obj: obj,
            complete: "success"
        };
      }
      this.__putDependentObjects[uuid] = obj;
    },
    
    /**
     * Flushes the queue
     */
    async flush() {
      if (this.__putDependentObjects) {
        await this.__clearPutQueueDependentObjects();
      }
      await this.__datasource.flush();
    },
    
    /**
     * Handler for datasource flushing event, this is where we flush properties
     */
    async _onDatasourceFlushing() {
      if (this.__propertyChangeStore) {
        let store = this.__propertyChangeStore;
        this.__propertyChangeStore = null;
        this.__datasource.putPropertyChanges(store);
      }
      this.__putQueueDoneObjects = null;
      this.__putDependentObjects = null;
    },
    
    /**
     * Removes an object
     * 
     * @param obj {qx.core.Object} Qooxdoo object to save
     */
    async remove(obj) {
      this.unwatchObject(obj);
      let uuid = obj.getUuid();
      if (uuid) {
        await this.__datasource.remove(uuid);
        obj.setUuid(null);
      }
    },
    
    /**
     * Waits for all objects to finish loading
     */
    async waitForAll() {
      let uuids = Object.keys(this.__knownObjectsByUuid);
      await qx.Promise.all(Object.values(this.__knownObjectsByUuid).map(knownObject => knownObject.promise));
    },
    
    /**
     * Removes an object from the list of known objects
     * 
     * @param obj {qx.core.Object}
     */
    forgetObject(obj) {
      let uuid = obj.toHashCode();
      let knownObject = this.__knownObjectsByUuid[uuid];
      if (!knownObject) {
        uuid = obj.getUuid();
        knownObject = this.__knownObjectsByUuid[uuid];
      }
      if (knownObject) {
        delete this.__knownObjectsByUuid[uuid];
      }
    },
    
    /**
     * Starts watching an object for changes; the changes are recorded in a serialised form
     * and can be played back locally, or transmitted across a network first
     * 
     * @param obj {qx.io.persistence.IObject} the object
     */
    watchObject(obj) {
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      let uuid = obj.getUuid();
      if (this.__watchedObjects[uuid])
        throw new Error("Cannot watch an object multiple times");
      this.__watchedObjects[uuid] = io.watchForChanges(this, obj, (...args) => this.__onWatchChange(...args));
    },
    
    /**
     * Callback for changes to a property
     * 
     * @param obj {qx.io.persistence.IObject} the object
     * @param propertyName {String} the name of the property that changed
     * @param changeType {String} the type of change, eg "setValue", "arrayChange", etc
     * @param value {Object} native JSON representation of the property
     */
    __onWatchChange(obj, propertyName, changeType, value) {
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      let uuid = obj.getUuid();
      if (value && qx.Interface.classImplements(value.constructor, qx.io.persistence.IObject)) {
        let valueUuid = value.getUuid();
        if (!this.__knownObjectsByUuid[valueUuid]) {
          this.putDependentObject(value);
        }
      }
      if (!this.__propertyChangeStore)
        this.__propertyChangeStore = {};
      let store = this.__propertyChangeStore[uuid];
      if (!store)
        store = this.__propertyChangeStore[uuid] = {};
      io.storeChange(store, propertyName, changeType, value);
    },
    
    /**
     * Replays a set of recorded changes on a known object, used for when a change set
     * is received over the network
     * 
     * @param uuid {String} the UUID of the object
     * @param store {Map} map of changes
     */
    async restoreRemoteChanges(uuid, store) {
      let obj = this.__knownObjectsByUuid[uuid].obj;
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      await io.restoreChanges(this, store, obj);
    },
    
    /**
     * Reverses the effect of watchObject
     * 
     * @param obj {qx.io.persistence.IObject} the object
     */
    unwatchObject(obj) {
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      let uuid = obj.getUuid();
      io.unwatchForChanges(this, this.__watchedObjects[uuid]);
      delete this.__watchedObjects[uuid];
      delete this.__propertyChangeStore[uuid];
    },
    
    /**
     * Returns the list of serialised property chnages; unsupported method used for unit 
     * testing.  Do not edit the results.
     * 
     * @return {Map} Undocumented value.  Do not use.
     */
    getPropertyChangeStore() {
      return this.__propertyChangeStore;
    },
    
    /**
     * Detects whether all objects are completed
     * 
     * @return {Boolean} true if all loaded
     */
    isAllComplete() {
      return !Object.values(this.__knownObjectsByUuid).some(knownObject => !knownObject.complete);
    },

    /**
     * Removes all objects from the list of known objects which are complete
     */
    forgetAllComplete() {
      Object.keys(this.__knownObjectsByUuid)
        .forEach(uuid => {
          let knownObject = this.__knownObjectsByUuid[uuid];
          if (!!knownObject.complete)
            delete this.__knownObjectsByUuid[uuid];
        });
    },
    
    /**
     * Creates an instance of a class for a given UUID; used by `ClassIo` and `ClassRefIo` to 
     * communicate the progress of objects so that recursive/knownObject loading works properly
     * 
     * @param clazz {qx.Class} the class to load
     * @param uuid {String} the UUID of the object being created
     * @return {qx.core.Object} the new object instance of `clazz`
     */
    createObject(clazz, uuid) {
      let knownObject = this.__knownObjectsByUuid[uuid];
      if (knownObject && knownObject.obj) {
        if (knownObject.reloading)
          return knownObject.obj;
        throw new Error(`Cannot create an object twice during load for the same uuid (${uuid} for class ${clazz.classname})`);
      }
      
      let obj = new clazz();
      
      if (qx.Interface.classImplements(clazz, qx.io.persistence.IObjectNotifications)) {
        obj.receiveDataNotification("created", this);
      }
      
      // Embedded objects don't have a UUID, use the hash code instead
      if (!uuid)
        uuid = obj.toHashCode();
      else
        obj.setUuid(uuid);
      
      if (!knownObject) {
        knownObject = this.__knownObjectsByUuid[uuid] = {
          obj: null,
          promise: new qx.Promise()
        };
      }
      knownObject.obj = obj;

      return obj;
    },
    
    /**
     * Indicates that the object has finished being loaded, although not including any promises
     * which are yet to resolve to populate properties of the object (eg knownObject loads)
     * 
     * @param err {Error} the error, if there was one
     * @param obj {qx.core.Object} the object
     */
    setObjectComplete(obj, err) {
      let uuid = obj.toHashCode();
      let knownObject = this.__knownObjectsByUuid[uuid];
      if (!knownObject) {
        uuid = obj.getUuid();
        knownObject = this.__knownObjectsByUuid[uuid];
      }

      if (knownObject) {
        qx.core.Assert.assertFalse(!!knownObject.complete);
        qx.core.Assert.assertTrue(knownObject.obj === obj);
        
        if (err) {
          this.error(`Error during object initialisation of ${obj} (${obj.classname}): ${err}`);
          knownObject.complete = "error";
          knownObject.exceptionThrown = err;
          knownObject.promise.reject(err);
        } else {
          knownObject.complete = "success";
          knownObject.promise.resolve(obj);
        }
        delete knownObject.reloading;
        
        if (this.isAllComplete()) {
          Object.values(this.__knownObjectsByUuid).forEach(knownObject => {
            if (!knownObject.notified) {
              if (qx.Interface.classImplements(knownObject.obj.constructor, qx.io.persistence.IObjectNotifications)) {
                knownObject.notified = true;
                knownObject.obj.receiveDataNotification(qx.io.persistence.IObjectNotifications.DATA_LOAD_COMPLETE);
              }
            }
          });
        }
      } else {
        qx.core.Assert.assertFalse(true);
      }
    },
    
    /**
     * Returns the datasource
     * 
     * @return {IDataSource}
     */
    getDataSource() {
      return this.__datasource;
    }
  },
  
  statics: {
    /** `put()` recursively saves objects until there are no more to save; that could cause an infinite
     * loop if there was a bug in one of the objects, and MAX_PUT_PASSES is there to limit that
     */
    MAX_PUT_PASSES: 50
  }
});
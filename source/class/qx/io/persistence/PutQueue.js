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
 * PutQueue records the objects being put to the other side in a single transmission; its
 * purpose is to allow object references, including recursive references, to be collated into
 * a list where objects are sent together, and a list of referenced objects is recorded.
 * 
 * It is important that this is synchronous because we sometimes need to collect data without
 * it being added to by calling code - for example, when an end point is added, we need to collect
 * data on certain existing objects, and we do NOT want the user to add other objects while
 * we do it.
 * 
 */
qx.Class.define("qx.io.persistence.PutQueue", {
  extend: qx.core.Object,
  
  construct(controller, writer) {
    this.base(arguments);
    this.__controller = controller;
    this.__writer = writer;
    this.__doneObjects = {};
    this.__dependentObjects = {};
    this.__queue = {};
  },
  
  members: {
    __doneObjects: null,
    __dependentObjects: null,
    __queue: null,
    
    put(obj) {
      let uuid = obj.getUuid();
      if (uuid && this.__queue[uuid])
        return;
      
      let io = qx.io.persistence.ClassIo.getClassIo(obj.constructor);
      let json = await io.toJson(this, obj);
      json.$$classname = obj.classname;
      if (!uuid) {
        uuid = this.__controller.getDatasource().createUuid();
        json.uuid = uuid;
      }
      this.__queue[uuid] = {
          json, 
          obj
      };
      obj.setUuid(uuid);
      this.__doneObjects[uuid] = true;
    },
    
    async writeAllTo(writer) {
      let promises = Object.keys(this.__queue).map(uuid => {
        let { uuid, json } = this.__queue[uuid];
        return writer(uuid, json);
      });
      await qx.Promise.all(promises);
    },
    
    flush() {
      const scanForMore = () => {
        let uuids = Object.keys(this.__dependentObjects);
        let didWork = false;
        uuids.forEach(uuid => {
          if (!doneObjects[uuid]) {
            this.put(this.__dependentObjects[uuid]);
            didWork = true;
          }
        });
        return didWork;
      };
      let passes = 0;
      while (scanForMore()) {
        passes++;
        if (passes > qx.io.persistence.Controller.MAX_PUT_PASSES)
          throw new Error(`Failed to save ${obj} with uuid=${obj.getUuid()} because it produces an endless stream of changes`);
      }
    },
    
    /**
     * Called to notify the put method about objects which are referenced by the top-most
     * object being put
     * 
     * @param obj {qx.core.Object} the dependent object
     */
    addDependentObject(obj) {
      this.__dependentObjects[obj.getUuid()] = obj;
    },
  }
});
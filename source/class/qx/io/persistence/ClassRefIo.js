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
 * Handles persistence of a reference to a qx.core.Object
 */
qx.Class.define("qx.io.persistence.ClassRefIo", {
  extend: qx.core.Object,
  implement: [ qx.io.persistence.IIo ],
  
  construct(clazz) {
    this.base(arguments);
    this.__clazz = clazz;
  },
  
  members: {
    /** {qx.Class} The class */
    __clazz: null,
    
    /**
     * Returns the class this works on
     * 
     * @return {qx.Class}
     */
    getClass() {
      return this.__clazz;
    },

    /**
     * Takes a JSON value and returns an object; this could be a reference or a full object, or null.  
     * It is up to the implementation to determine how it gets the instance, eg it could locate it in a
     * pool, load it, or create a brand new one
     * 
     * @param json {Object?} the JSON to decode
     * @return {qx.core.Object?} the found object
     */
    async fromJson(ctlr, json) {
      if (json === null)
        return null;
      let clazz = qx.Class.getByName(json.$$classname);
      if (!clazz) {
        this.error(`Cannot deserialize class because there is no class called ${json.$$classname}`);
        return null;
      }
      let obj = ctlr.getByUuidNoWait(json.uuid, true);
      return obj;
    },
    
    /**
     * Serialises an object into JSON in a way that can be retrieved later via fromJson.  It is up to the 
     * implementation how it serialises it and in what form, but it must be reversible via fromJson
     * 
     * @param obj {qx.core.Object?} the object to serialize
     * @return {Object?} the JSON
     * @async May return a Promise
     */
    toJson(ctlr, obj) {
      if (obj === null)
        return null;
      ctlr.putDependentObject(obj);
      return { uuid: obj.getUuid(), $$classname: obj.classname };
    }
  },
  
  statics: {
    __refIos: {},
    
    /**
     * Registers the default class for persisting references to qx.core.Object instances
     * 
     * @param refio {ClassRefIo} the [de]serializer
     */
    registerDefaultRefIo(refio, suppressWarnings) {
      let ClassRefIo = qx.io.persistence.ClassRefIo;
      let classname = refio.getClass().classname;
      if (ClassRefIo.__refIos[classname]) {
        if (!suppressWarnings)
          qx.log.Logger.warn(ClassRefIo, `Replacing default ClassRefIo for ${classname}`);
      }
      ClassRefIo.__refIos[classname] = refio;
    },
    
    /**
     * Gets the default class for persisting references to qx.core.Object instances
     * 
     * @return {ClassRefIo} the [de]serializer
     */
    getDefaultRefIo(clazz) {
      let ClassRefIo = qx.io.persistence.ClassRefIo;
      if (typeof clazz == "string")
        clazz = qx.Class.getByName(clazz);
      let io = ClassRefIo.__refIos[clazz.classname];
      if (!io) {
        let classAnnos = qx.Annotation.getClass(clazz, qx.io.persistence.anno.Class);
        for (let i = classAnnos.length - 1; i >= 0; i--) {
          io = classAnnos[i].getRefIo();
          if (io != null)
            break;
        }
      }
      return io;
    }
  }
});

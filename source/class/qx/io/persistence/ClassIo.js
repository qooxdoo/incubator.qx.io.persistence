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
 * Handles persistence for a specific class derived from qx.core.Object
 *
 */
qx.Class.define("qx.io.persistence.ClassIo", {
  extend: qx.core.Object,
  implement: [ qx.io.persistence.IIo ],

  /**
   * Constructor
   * @param clazz {qx.Class} the class that this instance will be able to persist
   */
  construct(clazz) {
    this.base(arguments);
    this.__clazz = clazz;

    // Get a list of all properties, all the way up the class heirarchy, and their property
    //  definition; along the way we merge property definitions (which means merging init values
    //  and annotations)
    let properties = {};
    qx.Class.getProperties(clazz).forEach(propertyName => {
      let pdOrig = qx.Class.getPropertyDefinition(clazz, propertyName);
      let propertyDef = {};
      [ "init", "check", "name", "nullable" ].forEach(key => {
        if (pdOrig[key] !== undefined)
          propertyDef[key] = pdOrig[key];
      });
      let annos = pdOrig["@"];
      if (annos) {
        if (!qx.lang.Type.isArray(annos))
          annos = [annos];
        else
          annos = qx.lang.Array.clone(annos);
      }

      let current = properties[propertyName];
      if (current) {
        if (propertyDef.init !== undefined)
          current.init = propertyDef.init;
        if (annos) {
          if (!current["@"])
            current["@"] = annos;
          else {
            let arr = [];
            qx.lang.Array.append(arr, annos);
            qx.lang.Array.append(arr, current["@"]);
            current["@"] = arr;
          }
        }
      } else {
        if (propertyDef.check && typeof propertyDef.check == "string") {
          let cls = qx.Class.getByName(propertyDef.check);
          if (cls)
            propertyDef.check = cls;
        }
        if (annos)
          propertyDef["@"] = annos;
        properties[propertyName] = propertyDef;
      }
    });

    // Ignore any properties which do not have annotations that we're interested in
    Object.keys(properties).forEach(propertyName => {
      let propertyDef = properties[propertyName];
      let allAnnos = propertyDef["@"]||[];

      let annos = allAnnos.filter(anno => qx.Class.isSubClassOf(anno.constructor, qx.io.persistence.anno.Array));
      let arrayType = null;
      if (annos.length)
        arrayType = propertyDef.arrayType = annos[annos.length - 1].getArrayType();

      annos = allAnnos.filter(anno => qx.Class.isSubClassOf(anno.constructor, qx.io.persistence.anno.Property));
      if (!annos.length) {
        delete properties[propertyName];
        return;
      }
      propertyDef["@"] = annos;

      // Embed or just have a reference to?
      for (let i = annos.length - 1; i >= 0; i--) {
        if (annos[i].isEmbed()) {
          propertyDef.embed = true;
          break;
        }
      }

      // Check for explicit IO on the property
      for (let i = annos.length - 1; i >= 0; i--) {
        let refIo = propertyDef.embed ? annos[i].getIo() : annos[i].getRefIo();
        if (refIo != null) {
          propertyDef.refIo = refIo;
          break;
        }
      }

      // What type to look for
      let refType = null;
      if (propertyDef.check) {
        if (propertyDef.check === "Array") {
          refType = arrayType;

        } else if (typeof propertyDef.check != "string") {
          if (qx.Class.isSubClassOf(propertyDef.check, qx.data.Array))
            refType = arrayType;
          else if (qx.Class.isSubClassOf(propertyDef.check, qx.core.Object))
            refType = propertyDef.check;
        }
      }
      propertyDef.refType = refType;

      // See if we can guess
      if (refType) {
        // Get the default, registered implementation
        let refIo = propertyDef.embed ? qx.io.persistence.ClassIo.getClassIo(refType) : qx.io.persistence.ClassRefIo.getDefaultRefIo(refType);
        if (refIo)
          propertyDef.defaultRefIo = refIo;
      }
    });

    this.__properties = properties;
  },

  members: {
    /** {qx.Class} The class */
    __clazz: null,

    /** {Map} A map of property definitions, indexed by property name */
    __properties: null,

    /**
     * Reads JSON data and populates an object, creating it if required
     *
     * @param json {Object} the JSON data to load
     * @param obj {qx.core.Object?} the object to populate, created if not provided
     * @return {qx.core.Object} the populated object
     */
    async fromJson(ctlr, json, obj) {
      if (!obj)
        obj = ctlr.createObject(this.__clazz, json.uuid);

      let promises = [];
      for (let propertyName in this.__properties) {
        if (json[propertyName] === undefined)
          continue;

        let propertyDef = this.__properties[propertyName];
        let propertyPath = this.__clazz.classname + "." + propertyName;
        let annos = propertyDef["@"];
        let check = propertyDef.check;

        let value = this._fromJsonValue(ctlr, json[propertyName], propertyDef, propertyPath);
        let promise = qx.util.Promisify.resolveNow(value, value => this._setPropertyValueImpl(ctlr, obj, propertyName, value, propertyDef, propertyPath));
        if (promise)
          promises.push(promise);
      }

      return qx.util.Promisify.allNow(promises,
          () => {
            ctlr.setObjectComplete(obj);
            return obj;
          },
          err => {
            ctlr.setObjectComplete(obj, err);
            return obj;
          });
    },

    /**
     * Serialises a single property value from JSON
     *
     * @param ctlr {qx.io.persistence.Controller} the controller
     * @param value {Object?} the value to deserialize
     * @param propertyDef {Map?} normalized map of property definition
     * @param propertyMap {String?} property path for debug output
     * @return {Object?} the deserialised version
     *
     * @async Note that this may return a promise
     */
    _fromJsonValue(ctlr, value, propertyDef, propertyPath) {
      function getRefIo(clazz) {
        if (propertyDef) {
          if (propertyDef.refIo)
            return propertyDef.refIo;
          if (propertyDef.embed)
            return qx.io.persistence.ClassIo.getClassIo(clazz);
        }
        return qx.io.persistence.ClassRefIo.getDefaultRefIo(clazz);
      }

      const convertArray = arr => {
        if (!qx.lang.Type.isArray(arr))
          arr = [arr];
        else
          arr = qx.lang.Array.clone(arr);
        for (let i = 0; i < arr.length; i++) {
          if (arr[i]) {
            let arrayType = null;
            if (typeof arr[i].$$classname == "string") {
              arrayType = qx.Class.getByName(arr[i].$$classname);
              if (!arrayType) {
                this.error(`Unable to convert IObject in _fromJsonValue because cannot find class ${arr[i].$$classname}`);
              }
            }
            if (!arrayType && propertyDef)
              arrayType = propertyDef.arrayType;
            if (!arrayType) {
              this.error(`Unable to convert IObject in _fromJsonValue because cannot determine the type, value=${arr[i]} (${arr[i].$$classname})`);
            } else {
              let refIo = getRefIo(arrayType);
              if (refIo) {
                let source = arr[i];
                arr[i] = refIo.fromJson(ctlr, source)
                  .then(value => {
                    if (!value)
                      this.error(`Unable to obtain IObject in _fromJsonValue, value=${JSON.stringify(source, null, 2)}`);
                    return value;
                  });
              }
            }
          }
        }
        return qx.util.Promisify.allNow(arr);
      }

      if (value === null || value === undefined)
        return value;

      let check = propertyDef.check;

      if (check && typeof check != "string") {
        if (qx.Class.isSubClassOf(check, qx.data.Array)) {
          value = qx.util.Promisify.resolveNow(convertArray(value), arr => new qx.data.Array(arr));

        } else if (qx.Class.isSubClassOf(check, qx.core.Object)) {
          let refIo = propertyDef.refIo || propertyDef.defaultRefIo;
          if (refIo) {
            value = refIo.fromJson(ctlr, value)
              .then(obj => {
                if (obj === null || obj === undefined) {
                  this.warn(`Failed to deserialize object: property=${propertyPath}, class=${check.classname}, value=${JSON.stringify(value)}`);
                  return null;
                }
                return obj;
              });
          } else {
            this.warn(`Missing ClassRefIo required to deserialized object: property=${propertyPath}, class=${check.classname}, value=${JSON.stringify(value)}`);
            value = null;
          }
        }

      } else if (check === "Array") {
        value = convertArray(value);

      } else if (check === "Date") {
        if (typeof value == "string") {
          try {
            value = new Date(value);
          } catch(ex) {
            this.warn(`Cannot parse date: property=${propertyPath}, value=${JSON.stringify(value)}`);
            value = null;
          }
        } else {
          this.warn(`Cannot parse date which is not a string: property=${propertyPath}, value=${JSON.stringify(value)}`);
          value = null;
        }

      } else if (check === "Integer") {
        value = parseInt(value, 10);
        if (isNaN(value)) {
          this.warn(`Cannot parse integer: property=${propertyPath}, value=${JSON.stringify(value)}`);
          value = null;
        }

      } else if (check === "Number") {
        value = parseFloat(value);
        if (isNaN(value)) {
          this.warn(`Cannot parse float: property=${propertyPath}, value=${JSON.stringify(value)}`);
          value = null;
        }

      } else if (check === "Boolean") {
        value = !!value;

      } else if (check && qx.lang.Type.isArray(check)) {
        if (!qx.lang.Array.contains(check, value)) {
          this.warn(`Cannot apply invalid value: property=${propertyPath}, value=${JSON.stringify(value)}`);
          value = null;
        }
      }

      return value;
    },

    /**
     * Serializes the object into JSON
     *
     * @param ctlr {qx.io.persistence.Controller} the controller
     * @param obj {qx.core.Object} the object to serialize
     * @param json {Object?} the JSON to update, created if not provided
     * @return {Object} serialized JSON object
     */
    async toJson(ctlr, obj, json) {
      if (!json)
        json = {};
      json.$$classname = obj.classname;

      for (let propertyName in this.__properties) {
        let propertyDef = this.__properties[propertyName];
        let propertyPath = this.__clazz.classname + "." + propertyName;
        let annos = propertyDef["@"];
        let check = propertyDef.check;

        let value = obj["get" + qx.lang.String.firstUp(propertyName)]();
        let jsonValue = await this._toJsonValue(ctlr, value, propertyDef, propertyPath);
        json[propertyName] = jsonValue;
      }

      return json;
    },

    /**
     * Serialises a single property value into JSON
     *
     * @param ctlr {qx.io.persistence.Controller} the controller
     * @param value {Object?} the value to serialize
     * @param propertyDef {Map?} normalized map of property definition
     * @param propertyMap {String?} property path for debug output
     * @return {Object?} the serialised version
     *
     * @async Note may return a promise
     */
    _toJsonValue(ctlr, value, propertyDef, propertyPath) {
      if (!propertyPath)
        propertyPath = "(unspecified)";

      function getRefIo(clazz) {
        if (propertyDef) {
          if (propertyDef.refIo)
            return propertyDef.refIo;
          if (propertyDef.embed)
            return qx.io.persistence.ClassIo.getClassIo(clazz);
        }
        return qx.io.persistence.ClassRefIo.getDefaultRefIo(clazz);
      }

      function convertArray(arr) {
        for (let i = 0; i < arr.length; i++) {
          let refIo = getRefIo(arr[i].constructor);
          if (refIo) {
            arr[i] = refIo.toJson(ctlr, arr[i]);
          }
        }
        return qx.util.Promisify.allNow(arr);
      }

      if (qx.io.persistence.ClassIo.isIObject(value)) {
        let refIo = getRefIo(value.constructor);
        value = refIo.toJson(ctlr, value);

      } else if (value instanceof qx.data.Array) {
        value = qx.lang.Array.clone(value.toArray());
        value = convertArray(value);

      } else if (qx.lang.Type.isArray(value)) {
        value = qx.lang.Array.clone(value);
        value = convertArray(value);

      } else if (value instanceof Date) {
        value = value.toISOString();

      } else if (value instanceof qx.core.Object) {
        let refIo = propertyDef && (propertyDef.refIo || propertyDef.defaultRefIo);
        if (refIo) {
          value = qx.util.Promisify.resolveNow(refIo.toJson(ctlr, value), tmp => {
            if (tmp === null || tmp === undefined) {
              this.warn(`Failed to serialize object: property=${propertyPath}, class=${value.classname}, value=${value}`);
              return null;
            } else {
              return tmp;
            }
          });
        } else {
          this.warn(`Missing ClassRefIo required to serialized object: property=${propertyPath}, class=${value.classname}, value=${value}`);
          value = null;
        }
      }

      return value;
    },

    watchForChanges(ctlr, obj, callback) {
      const ClassRefIo = qx.io.persistence.ClassRefIo.ClassRefIo;
      let state = {
          obj,
          properties: {},
          callback
      };

      Object.keys(this.__properties).forEach(propertyName => {
        let upname = qx.lang.String.firstUp(propertyName);
        let propertyDef = this.__properties[propertyName];
        let propertyPath = this.__clazz.classname + "." + propertyName;
        let annos = propertyDef["@"];
        let check = propertyDef.check;
        let propState = state.properties[propertyName] = {};

        if (qx.Class.isSubClassOf(propertyDef.check, qx.data.Array)) {
          const onArrayChange = evt => {
            let data = evt.getData();
            if (data.type == "order") {
              let value = this._toJsonValue(ctlr, evt.getTarget(), propertyDef, propertyPath);
              return qx.util.Promisify.resolveNow(value, value => callback(obj, propertyName, "arrayReplace", value));
            } else {
              let removed = (data.removed||[]).map(item => this._toJsonValue(ctlr, item, propertyDef, propertyPath));
              let added = (data.added||[]).map(item => this._toJsonValue(ctlr, item, propertyDef, propertyPath));

              if (added.length || removed.length) {
                return qx.util.Promisify.allNow(removed, removed => {
                  return qx.util.Promisify.allNow(added, added => {
                    let data = {};
                    if (removed.length)
                      data.removed = removed;
                    if (added.length)
                      data.added = added;
                    callback(obj, propertyName, "arrayChange", data);
                  });
                });
              }
            }
          };

          const onValueChange = evt => {
            let data = evt.getData();
            let oldData = evt.getOldData();
            if (propState.arrayChangeListenerId) {
              oldData.removeListenerById(propState.arrayChangeListenerId);
              propState.arrayChangeListenerId = null;
            }
            let value = this._toJsonValue(ctlr, data, propertyDef, propertyPath);
            if (data) {
              propState.arrayChangeListenerId = data.addListener("change", onArrayChange);
              return qx.util.Promisify.resolveNow(value, value => callback(obj, propertyName, "arrayReplace", value));
            } else {
              return qx.util.Promisify.resolveNow(value, value => callback(obj, propertyName, "setValue", value));
            }
          };

          propState.changeListenerId = obj.addListener("change" + upname, onValueChange);
          let array = obj["get" + upname]();
          if (array)
            propState.arrayChangeListenerId = array.addListener("change", onArrayChange);

        } else {
          propState.changeListenerId = obj.addListener("change" + upname, evt => {
            let value = this._toJsonValue(ctlr, evt.getData(), propertyDef, propertyPath);
            return qx.util.Promisify.resolveNow(value, value => callback(obj, propertyName, "setValue", value));
          });
        }
      });

      return state;
    },

    setPropertyValue(ctlr, obj, propertyName, changeType, value) {
      let propertyDef = this.__properties[propertyName];
      let propertyPath = this.__clazz.classname + "." + propertyName;

      if (changeType == "arrayChange") {
        if (!qx.lang.Type.isArray(value))
          value = [value];
        let promises = value.map(value => {
          let removed = this._fromJsonValue(ctlr, value.removed, propertyDef, propertyPath)||[];
          let added = this._fromJsonValue(ctlr, value.added, propertyDef, propertyPath)||[];

          return qx.util.Promisify.resolveNow(removed, removed => {
            return qx.util.Promisify.resolveNow(added, added => {
              let array = obj["get" + qx.lang.String.firstUp(propertyName)]();
              removed.forEach(item => array.remove(item));
              added.forEach(item => array.push(item));
            });
          });
        });
        return qx.util.Promisify.allNow(promises);

      } else if (changeType == "setValue" || changeType == "arrayReplace") {
        value = this._fromJsonValue(ctlr, value, propertyDef, propertyPath);
        return qx.util.Promisify.resolveNow(value, value => {
          return this._setPropertyValueImpl(ctlr, obj, propertyName, value, propertyDef, propertyPath);
        });


      } else {
        throw new Error(`Unexpected type of change ${changeType} for ${obj} (${obj.classname})`);
      }
    },

    _setPropertyValueImpl(ctlr, obj, propertyName, value, propertyDef, propertyPath) {
      if (propertyDef.nullable !== true && value === null) {
        this.warn(`Cannot apply null value: property=${propertyPath}`);
        return null;
      }

      if (value instanceof Promise)
        value = qx.Promise.resolve(value);

      let setName = "set" + qx.lang.String.firstUp(propertyName);
      let promise = null;
      if (typeof obj[setName + "Async"] == "function") {
        promise = obj[setName + "Async"](value);
      } else {
        qx.util.Promisify.resolveNow(value, value => obj[setName](value));
      }

      return promise;
    },

    storeChange(store, propertyName, changeType, value) {
      if (changeType == "arrayChange") {
        if (store.arrayChange === undefined)
          store.arrayChange = {};
        if (store.arrayChange[propertyName] === undefined)
          store.arrayChange[propertyName] = [];
        store.arrayChange[propertyName].push(value);
        if (store.setValue !== undefined)
          delete store.setValue[propertyName];

      } else {
        if (store.setValue === undefined)
          store.setValue = {};
        store.setValue[propertyName] = value;
        if (store.arrayChange !== undefined)
          delete store.arrayChange[propertyName];
      }
    },

    async restoreChanges(ctlr, store, obj) {
      let promises = [];
      if (store.setValue) {
        for (let key in store.setValue)
          promises.push(this.setPropertyValue(ctlr, obj, key, "setValue", store.setValue[key]));
      }
      if (store.arrayChange) {
        for (let key in store.arrayChange)
          promises.push(this.setPropertyValue(ctlr, obj, key, "arrayChange", store.arrayChange[key]));
      }

      await qx.Promise.all(promises);
    },

    unwatchForChanges(ctlr, state) {
      Object.keys(state.properties).forEach(propertyName => {
        let propState = state.properties[propertyName];
        state.obj.removeListenerById(propState.changeListenerId);
        if (propState.arrayChangeListenerId) {
          let upname = qx.lang.String.firstUp(propertyName);
          let array = state.obj["get" + upname]();
          array.removeListenerById(propState.arrayChangeListenerId);
        }
      });
      delete state.properties;
    }
  },

  statics: {
    __classIos: {},

    /**
     * Registers the class for persisting references to qx.core.Object instances; this can be
     * overridden using annotations, but if specified manually this will override any annotations
     * on the actual class
     *
     * @param io {ClassIo} the [de]serializer
     */
    registerClassIo(io, suppressWarnings) {
      let ClassIo = qx.io.persistence.ClassIo;
      let classname = io.getClass().classname;
      if (ClassIo.__classIos[classname]) {
        if (!suppressWarnings)
          qx.log.Logger.warn(ClassIo, `Replacing default ClassIo for ${classname}`);
      }
      ClassIo.__classIos[classname] = io;
    },

    /**
     * Gets the default class for persisting references to qx.core.Object instances
     *
     * @return {ClassIo} the [de]serializer
     */
    getClassIo(clazz) {
      let ClassIo = qx.io.persistence.ClassIo;
      if (typeof clazz == "string")
        clazz = qx.Class.getByName(clazz);
      let io = ClassIo.__classIos[clazz.classname];
      if (!io) {
        let classAnnos = qx.Annotation.getClass(clazz, qx.io.persistence.anno.Class);
        for (let i = classAnnos.length - 1; i >= 0; i--) {
          io = classAnnos[i].getIo();
          if (io != null)
            break;
        }
      }
      if (!io) {
        io = ClassIo.__classIos[clazz.classname] = new ClassIo(clazz);
      }
      return io;
    },

    isIObject(obj) {
      return obj &&
        obj instanceof qx.core.Object &&
        qx.Interface.classImplements(obj.constructor, qx.io.persistence.IObject);
    }
  }
});

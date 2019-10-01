/**
 * ClassRefIo and ClassIo share this interface
 */
qx.Interface.define("qx.io.persistence.IIo", {
  
  members: {
    /**
     * Reads JSON data and populates an object, creating it if required
     * 
     * @param ctlr {Controller} the controller
     * @param json {Object} the JSON data to load
     * @return {qx.core.Object} the populated object
     */
    async fromJson(ctlr, json) {
    },
    
    /**
     * Serializes the object into JSON
     * 
     * @param ctlr {Controller} the controller
     * @param obj {qx.core.Object} the object to serialize
     * @return {Object} serialized JSON object
     */
    async toJson(ctlr, obj) {
    }
  }
});
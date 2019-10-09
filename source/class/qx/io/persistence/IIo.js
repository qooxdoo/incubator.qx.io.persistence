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
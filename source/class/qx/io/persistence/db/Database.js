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
 * Base class for database implementations
 */
qx.Class.define("qx.io.persistence.db.Database", {
  type: "abstract",
  extend: qx.core.Object,
  implement: [ qx.io.persistence.IDataSource ],
  
  events: {
    "flushing": "qx.event.type.Event"
  },
  
  members: {
    __controller: null,
    
    /**
     * @Override
     */
    attachToController(controller) {
      this.__controller = controller;
    },
    
    /**
     * Opens the database
     */
    async open() {
      // Nothing
    },
    
    /**
     * Closes the database
     */
    async close() {
      // Nothing
    },
    
    /*
     * @Override
     */
    async flush() {
      // Nothing
    },
    
    /**
     * Loads an object from a URL
     * 
     * @param url {String} the path (not including `.html`)
     * @return {qx.core.Object}
     */
    async getUuidFromUrl(url) {
      if (url === "/") {
        url = "index";
      } else if (url[url.length - 1] === "/") {
        url = url + "index";
      }
      return this._getUuidFromUrlImpl(url);
    },
   
    /**
     * Creates a UUID for the ID
     */
    createUuid() {
      let uuid = qx.util.Uuid.createUuidV4();
      return uuid;
    },
    
    /**
     * Maps a URL to a UUID - this is the implementation behind `getUuidFromUrl()`
     * 
     * @param url {String} the URl to lookup
     * @return {String?} the UUID, or null if not found
     */
    async _getUuidFromUrlImpl(url) {
      throw new Error("No such implementation for " + this.classname + "._getUuidFromUrlImpl()");
    }
  }
});
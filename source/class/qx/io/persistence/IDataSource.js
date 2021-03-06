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
 * Interface which gives the Controller access to the raw JSON data that is being
 * mapped into Qooxdoo objects.
 * 
 * The two implementations of this are a `qx.io.persistence.db.Database` and the upcoming
 * client-server REST API 
 */
qx.Interface.define("qx.io.persistence.IDataSource", {
  events: {
    /** Emitted when the datasource is flushing */
    "flushing": "qx.event.type.Event"
  },
  
  members: {
    /**
     * Called by the controller to connect to the datasource
     * 
     * @param controller {Controller}
     */
    attachToController(controller) {
    },
    
    /**
     * Loads JSON data for a UUID
     * 
     * @param uuid {String} the UUID to load
     * @return {Map} containing:
     *  json {Object} the data
     *  isStale {Function?} an optional function to check whether the data has become stale (ie reload is required)
     */
    async getDataFromUuid(uuid) {
    },
    
    /**
     * Creates a UUID
     * 
     * @return {String} a UUID
     */
    createUuid() {
    },
    
    /**
     * Saves an object, the UUID may or may not exist in the datasource, if it already 
     * exists the record will be updated
     * 
     * @param uuid {String} the UUID of the object
     * @param json {Object} POJO data to save
     * @return {String} UUID of the data
     */
    async put(uuid, json) {
    },
    
    /**
     * Removes an object
     * 
     * @param uuid {String} the UUID of the object to delete
     */
    async remove(uuid) {
    },
    
    /**
     * Notifies the data source that there are no further `put` operations pending; this
     * could be used to commit database transactions or to deliver queued data to the
     * far side of the end points.
     */
    async flush() {
      // Nothing
    }
  }
});

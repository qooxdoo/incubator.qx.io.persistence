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
     * Searches the database, and returns the first JSON object that matches.
     * Note that the functionality of this is really determined by the underlying
     * implementation, but a facility to compare objects (see NeDB or MongoDB)
     * is expected.
     * 
     * @param query {Object} NeDB query
     * @param projection {Object?} NeDB projection
     * @return {Object?} the matched data, or null
     */
    async findOne(query, projection) {
      throw new Error(`No implementation for ${this.classname}.findOne`);
    },
    
    /**
     * Searches the database, and returns all the JSON objects that match.
     * Note that the functionality of this is really determined by the underlying
     * implementation, but a facility to compare objects (see NeDB or MongoDB)
     * is expected.
     * 
     * @param query {Object} NeDB query
     * @param projection {Object?} NeDB projection
     * @return {Object[]} the matched data, or empty array
     */
    async find(query, projection, cb) {
      throw new Error(`No implementation for ${this.classname}.find`);
    },
    
    /**
     * Creates a UUID for the ID
     */
    createUuid() {
      let uuid = qx.util.Uuid.createUuidV4();
      return uuid;
    }
  }
});
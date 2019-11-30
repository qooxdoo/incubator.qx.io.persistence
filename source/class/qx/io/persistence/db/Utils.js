/**
 * Helper methods
 */
qx.Class.define("qx.io.persistence.db.Utils", {
  extend: qx.core.Object,
  
  statics: {
    /**
     * Quick check to see if an objecrt matches a query; this is used for the really basic
     * find/findOne implementations in MemoryDatabase.  If you want something
     * smart, switch to NeDB or MongoDB implementations.
     */
    matchQuery(json, query) {
      for (let keys = Object.keys(query), i = 0; i < keys.length; i++) {
        let key = keys[i];
        let value = query[key];
        if (json[key] !== value)
          return false;
      }
      return true;
    }
  }
});

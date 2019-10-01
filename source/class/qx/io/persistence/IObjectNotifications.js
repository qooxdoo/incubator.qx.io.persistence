/**
 * This interface is optional, but if implemented it allows the object to receive
 * notifications
 */
qx.Interface.define("qx.io.persistence.IObjectNotifications", {
  
  statics: {
    /** Sent after creation, data is the controller */ 
    CREATED: "created",
    
    /** Sent after loading */
    DATA_LOAD_COMPLETE: "dataLoadComplete"
  },

  members: {
    /**
     * Called with notifications from the controller
     * 
     * @param key {String} the event type
     * @param data {Object} data relevant to the key value
     */
    receiveDataNotification(key, data) {
    }
  }
});

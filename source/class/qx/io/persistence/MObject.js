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
 * Mixin for objects which can be persisted.  You do not have to use this mixin, it's just here 
 * as a helpful utility - but your classes must implement `qx.io.persistence.IObject`
 * 
 */
qx.Mixin.define("qx.io.persistence.MObject", {
  
  destruct() {
    if (this.__controller)
      this.__controller.forgetObject(this);
  },
  
  properties: {
    /** {String} Every object has a UUID */
    uuid: {
      init: null,
      nullable: true,
      check: "String",
      apply: "_applyUuid",
      event: "changeUuid",
      "@": qx.io.persistence.anno.Property.DEFAULT
    }
  },
  
  "events": {
    "dataLoadComplete": "qx.event.type.Event"
  },
  
  members: {
    __controller: null,
    __dataLoadComplete: false,
    
    _applyUuid(value, oldValue) {
      if (value && oldValue) {
        this.error(`Changing UUID from ${oldValue} to ${value} - this may cause issues for persistence and network IO`); 
      }
    },
    
    receiveDataNotification(key, data) {
      switch (key) {
      case qx.io.persistence.IObjectNotifications.CREATED:
        this.__controller = data;
        return;
        
      case qx.io.persistence.IObjectNotifications.DATA_LOAD_COMPLETE:
        this.__dataLoaded = true;
        this.fireEvent("dataLoadComplete");
        return;
      }
    },
    
    isDataLoadComplete() {
      return this.__dataComplete;
    }
  }
  
});
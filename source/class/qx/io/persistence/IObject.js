/**
 * This interface has to be implemented by all classes that are import/exported via
 * the `qx.data.io` package.
 */
qx.Interface.define("qx.io.persistence.IObject", {
  properties: {
    /** {String} Every object has a UUID */
    uuid: {
      init: null,
      nullable: true,
      check: "String"
    }
  }
  
});


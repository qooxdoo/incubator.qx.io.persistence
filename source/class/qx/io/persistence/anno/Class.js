/**
 * Annotation used to adjust persistence of classes; it is not necessary to add this
 * to classes because all classes can be de/serialized by default, this annotation is
 * used to adjust the de/serialisation (eg specify own ClassIo and ClassRefIo instances)
 */
qx.Class.define("qx.io.persistence.anno.Class", {
  extend: qx.core.Object,
  
  properties: {
    /** Specify the default class used to de/serialize references to instances of this class */  
    refIo: {
      init: null,
      nullable: true,
      check: "qx.io.persistence.ClassRefIo"
    },
    
    /** Specify the default class used to de/serialize instances of this class */  
    io: {
      init: null,
      nullable: true,
      check: "qx.io.persistence.ClassIo"
    }
  }
});


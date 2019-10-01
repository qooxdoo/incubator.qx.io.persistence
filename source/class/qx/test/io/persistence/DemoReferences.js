qx.Class.define("qx.test.io.persistence.DemoReferences", {
  extend: qx.io.persistence.Object,
  
  properties: {
    title: {
      nullable: false,
      check: "String",
      event: "changeTitle",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    other: {
      init: null,
      nullable: true,
      async: true,
      event: "changeOther",
      check: "qx.test.io.persistence.DemoReferences",
      "@": qx.io.persistence.anno.Property.DEFAULT
    }
  }
});
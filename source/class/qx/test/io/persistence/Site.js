qx.Class.define("qx.test.io.persistence.Site", {
  extend: qx.io.persistence.Object,
  
  properties: {
    title: {
      nullable: false,
      check: "String",
      event: "changeTitle",
      "@": [ qx.io.persistence.anno.Property.DEFAULT ]
    }
  },
  
  members: {
  }
});

qx.Class.define("qx.test.io.persistence.Piece", {
  extend: qx.core.Object,
  
  properties: {
    content: {
      init: "",
      check: "String",
      event: "changeContent",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    mustNotBeThree: {
      init: 0,
      nullable: false,
      check: "Integer",
      apply: "_applyMustNotBeThree",
      async: true
    }
  },
  
  members: {
    _applyMustNotBeThree(value) {
      return new qx.Promise((resolve, reject) => {
        setTimeout(() => {
          if (value == 3)
            reject("Must Not Be Three!!");
          else
            resolve();
        }, 100);
      });
    }
  }
});
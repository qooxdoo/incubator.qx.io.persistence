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
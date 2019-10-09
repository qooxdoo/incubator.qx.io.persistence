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
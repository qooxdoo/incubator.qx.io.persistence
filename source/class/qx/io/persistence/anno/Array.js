/**
 * Used to provide extra information about array properties
 */
qx.Class.define("qx.io.persistence.anno.Array", {
  extend: qx.core.Object,
  
  properties: {
    arrayType: {
      check: "Class"
    }
  }
});
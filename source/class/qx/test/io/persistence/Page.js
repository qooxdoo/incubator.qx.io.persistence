/**
 * Demo class for persistence tests 
 */
qx.Class.define("qx.test.io.persistence.Page", {
  extend: qx.io.persistence.Object,
  
  construct() {
    this.base(arguments);
    this.setPieces(new qx.data.Array());
  },
  
  properties: {
    /** Title of the page */
    title: {
      init: "Untitled Page",
      check: "String",
      event: "changeTitle",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    /** Last modified date */
    lastModified: {
      init: null,
      nullable: true,
      check: "Date",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    /** Pieces in the Page */
    pieces: {
      nullable: false,
      check: "qx.data.Array",
      transform: "__transformPieces",
      "@": [ 
        qx.io.persistence.anno.Property.EMBED,
        new qx.io.persistence.anno.Array().set({ arrayType: qx.test.io.persistence.Piece })
      ]
    }
  },
  
  members: {
    __transformPieces(value, oldValue) {
      if (oldValue) {
        oldValue.replace(value ? value : []);
        return oldValue;
      }
      return value;
    }
  }
});
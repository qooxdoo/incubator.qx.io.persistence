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
 * Annotation used to indicate properties which can be persisted in the database.  Properties are
 * not de/serialized by default, so this must be added to all properties
 */
qx.Class.define("qx.io.persistence.anno.Property", {
  extend: qx.core.Object,
  
  properties: {
    /** If true, then an object will be embedded (if derived from qx.core.Object) */ 
    embed: {
      init: false,
      check: "Boolean"
    },
    
    /** Override the ClassIo when `embed` is true */  
    io: {
      init: null,
      nullable: true,
      check: "qx.io.persistence.ClassIo"
    },
    
    /** Override the default ClassRefIo instance used to de/serialize this property, when `embed` is false */
    refIo: {
      init: null,
      nullable: true,
      check: "qx.io.persistence.ClassRefIo"
    }
  },
  
  statics: {
    /** Default settings for including a property in persistence */
    DEFAULT: null,
    
    /** Objects derived from `qx.core.Object` will be embedded (as opposed to referenced) */
    EMBED: null
  },
  
  defer(statics) {
    statics.DEFAULT = new qx.io.persistence.anno.Property();
    statics.EMBED = new qx.io.persistence.anno.Property().set({ embed: true });
  }
});


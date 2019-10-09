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


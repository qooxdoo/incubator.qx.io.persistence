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
 * Base class for objects which can be persisted.  You do not have to derive from this
 * base class, it's just here as a helpful utility - but your classes must implement
 * `qx.io.persistence.IObject`
 * 
 */
qx.Class.define("qx.io.persistence.Object", {
  extend: qx.core.Object,
  type: "abstract",
  include: [ qx.io.persistence.MObject ],
  
  implement: [ qx.io.persistence.IObject, qx.io.persistence.IObjectNotifications ],
  
  "@": [
    new qx.io.persistence.anno.Class().set({ refIo: new qx.io.persistence.ClassRefIo() })
  ]
  
});
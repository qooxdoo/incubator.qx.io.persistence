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
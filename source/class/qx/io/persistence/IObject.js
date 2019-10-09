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
 * This interface has to be implemented by all classes that are import/exported via
 * the `qx.data.io` package.
 */
qx.Interface.define("qx.io.persistence.IObject", {
  properties: {
    /** {String} Every object has a UUID */
    uuid: {
      init: null,
      nullable: true,
      check: "String"
    }
  }
  
});


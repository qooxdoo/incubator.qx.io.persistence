/**
 * @require(qx.core.Init)
 * @ignore(process)
 * @ignore(require)
 */

qx.Class.define("qx.test.io.persistence.TestRunnerApp", {
  extend: qx.application.Basic,
  
  members: {
    async main() {
      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
      }
      
      qx.dev.TestRunner.runAll(qx.test.io.persistence.TestPersistence);
    }
  }
});

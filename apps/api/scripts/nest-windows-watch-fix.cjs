// Nest CLI 11 puede intentar ejecutar taskkill sobre un proceso que ya termino
// durante un reinicio incremental en Windows. Ese caso devuelve status 255 y
// no debe cerrar el watcher completo.
if (process.platform === 'win32') {
  const childProcess = require('node:child_process');
  const execSyncOriginal = childProcess.execSync;

  childProcess.execSync = function execSyncSeguro(command, ...args) {
    try {
      return execSyncOriginal.call(this, command, ...args);
    } catch (error) {
      const procesoYaFinalizado =
        typeof command === 'string' &&
        command.startsWith('taskkill /pid ') &&
        error &&
        typeof error === 'object' &&
        (error.status === 255 || error.status === 128);

      if (procesoYaFinalizado) {
        return Buffer.alloc(0);
      }
      throw error;
    }
  };
}

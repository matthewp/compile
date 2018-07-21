const path = require('path');
const { spawn } = require('child_process');

const CLI = path.join(__dirname, '..', 'index.js');
const DEBUG = process.env.DEBUG != null;

exports.run = function(pth, flags = []){
  let args = flags.concat([pth]);
  let proc = spawn(CLI, args);

  if(DEBUG) {
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  }
  
  return new Promise(function(resolve, reject){
    proc.on('close', function(code){
      if(code) return reject();
      resolve();
    });
  });
};

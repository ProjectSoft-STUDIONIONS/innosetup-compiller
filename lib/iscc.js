'use strict';

const path = require('path');
const spawn = require('child_process').spawn;
const readline = require('readline');

module.exports = function(scriptPath, options, callback) {
  // Let's perform a surface copy
  options = Object.assign({
    colors: false,           // true or false
    guid: false,             // Renamed gui to guid
    arch: 'x86',             // x86 or x64
    verbose: false,          // Output verbose true or false
    signtoolname: false,     // String param or false
    signtoolcommand: false   // String param or false
  }, options);
  const promise = new Promise(function(resolve, reject) {
    try {
      let cmdLine, args, colors = false;
      if (options && options.guid) {
        cmdLine = path.resolve(__dirname, '..', 'bin', options.arch, 'ISIDE.exe');
        args = ['/cc', scriptPath];
      } else {
        cmdLine = path.resolve(__dirname, '..', 'bin', options.arch, 'ISCC.exe');
        args = [scriptPath];
        if (!(options && options.verbose)) {
          args.push('/q');
        }
        if (options && options.signtoolname && options.signtoolcommand) {
          args.push('/S' + options.signtoolname + '=' + options.signtoolcommand.replace(/['"]/g, '$q'));
        }
      }
      // options is always present. if() is not needed
      //if (options) {
        //reset pre-processed options
        colors = options.colors ? true : false;
        delete options.colors;
        delete options.guid;
        delete options.verbose;
        delete options.signtoolname;
        delete options.signtoolcommand;
        delete options.arch;
        delete options.gui;
        
        //cycle all other options and add it to args
        Object.keys(options).forEach(function(key) {
          let val = options[key];
          if(/^D/.test(key)) {
            args.push('/' + key + '=' + val);
          } else {
            args.push('/' + key + val);
          }
        });
      //}
      
      if (!/^win/.test(process.platform)) {
        args.unshift(cmdLine);
        cmdLine = "wine";
      }

      let stderr = '';
    
      const child = spawn(cmdLine, args);
      const readOut = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
      const readErr = readline.createInterface({ input: child.stderr, crlfDelay: Infinity });

      readOut.on('line', line => {
        // Here you can use regular expressions to keep a beautiful log.
        // Ignoring uppercase and lowercase won't do.
        // Everything, of course, can be improved.
        // As an example:
        // "\[Section\]", "line\s+\d+" and \([\w\.]{2,}\)
        let arr = [
          '\\[\\w+\\]',
          'line\\s+\\d+',
          '\\([\\w\\.,\\s]{2,}\\)',
        ].join('|');
        // Stdout TTY standard output
        // Color cyan
        line = process.stdout.isTTY && colors ? line.replace(new RegExp(`(${arr})`, 'g'), `\x1b[36m$1\x1b[39m`) : line;
        // Processing the beginning of lines
        arr = [
          'Preprocessing',
          'Reading file',
          'Including file',
          'Creating output directory',
          'Parsing',
          'Reading',
          'Preparing',
          'Determining',
          'Verification',
          'Updating',
          'Messages in',
          'Line\\s+\\d+',
          'Compressing',
          'Creating',
          'Successful compile',
        ].join('|');
        // Stdout TTY standard output
        // Color yellow
        line = process.stdout.isTTY && colors ? line.replace(new RegExp(`(${arr})`, 'g'), `\x1b[33m$1\x1b[39m`) : line;
        console.log(line);
      });

      readErr.on('line', line => {
        // Here you can use regular expressions to keep a beautiful log.
        // Everything, of course, can be improved.
        // As an example
        // Output in red
        // Stderr TTY standard output
        // Color red
        stderr += process.stderr.isTTY && colors ? `\x1b[31m${line}\x1b[39m\n` : `${line}\n`;
      });

      child.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(stderr);
        }
      });
    } catch(error) {
      reject(error);
    }
  });
  if (callback) {
    return promise.then(callback).catch(callback);
  }
  return promise;
};

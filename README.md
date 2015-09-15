# Command line analysis of Cleanflight Blackbox files.
bbjs-cli enables larger scale automated analysis of Cleanflight blackbox log files. It wraps the parsing logic from the blackbox viewer into a simple Node.js EventEmitter so that multiple listeners may analyze the log as its replayed.

## Getting Started
1. Install node.js and npm.
2. Run `npm install` to install dependencies.
3. Run `grunt` to transpile ES6 to Node friendly javascript. (Devs run `grunt watch` to autoupdate the output.)
4. Run `node dist/summary.js <filename>`.

## Events
Current events are:
* startLog - Emitted with no args at the start of a log.
* sysConfig - Emitted after header parsing with an arg of the system configuration.
* frame - Emitted after each frame with args: frameValid, frame, frameType, frameOffset, frameSize
* endLog - Emitted with no args at the end of a log.

## Caveats
I'm testing on Node.js v0.10.36 which is a bit old so there may be bugs with newer versions. I'm using that version because its what AWS Lambda is running.

## License
Code by Scott Shawcroft is MIT License. Code modified from cleanflight/blackbox-log-viewer is GPL v3. Headers have been added to every file for clarity.

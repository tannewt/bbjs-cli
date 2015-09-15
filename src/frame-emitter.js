// The MIT License (MIT)
//
// Copyright (c) 2015 Scott Shawcroft
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var axios = require("axios");
var fs = require("fs");
require('es6-promise').polyfill();

import FlightLogParser from "./flightlog_parser";

const EventEmitter = require("events").EventEmitter;

export default class FrameEmitter extends EventEmitter {
  constructor(uri) {
    super();
    this.emitEventsForLogs = this.emitEventsForLogs.bind(this);
    this.emitFrame = this.emitFrame.bind(this);
    this.uri = uri;
  }

  initParser(data) {
    this.parser = new FlightLogParser(data);
    return this.parser;
  }

  getOffsets() {
    var logBeginOffsets = [];

    for (var i = 0; ; i++) {
      let logStart = this.parser.stream.nextOffsetOf(FlightLogParser.prototype.FLIGHT_LOG_START_MARKER);

      if (logStart === -1) {
          //No more logs found in the file
          logBeginOffsets.push(this.parser.stream.end);
          break;
      }

      logBeginOffsets.push(logStart);

      //Restart the search after this header
      this.parser.stream.pos = logStart + FlightLogParser.prototype.FLIGHT_LOG_START_MARKER.length;
    }
    return logBeginOffsets;
  }

  fetchUri(uri) {
    return axios.get(uri)
                .catch(function(response) {
                  if (response.status === 302) {
                    return this.fetchUri(response.headers.location);
                  }
                }.bind(this));
  }

  loadUri() {
    if ((/^http/).test(this.uri)) {
      return this.fetchUri(this.uri)
                 .then(function(response) {
                     return new Uint8Array(response.data);
                   })
                 .catch(function(reason) {
                   console.log("reason", reason);
                 });
    } else {
      return new Promise(function(resolve, reject) {
        fs.readFile(this.uri, function(err, data) {
          if (err) {
            reject(err);
            return;
          }
          resolve(new Uint8Array(data));
        });
      }.bind(this));
    }
  }

  emitFrame(frameValid, frame, frameType, frameOffset, frameSize) {
    this.emit("frame", frameValid, frame, frameType, frameOffset, frameSize);
  }

  emitEventsForLogs(data) {
    let parser = this.initParser(data);
    let offsets = this.getOffsets();
    for (let i = 0; i < offsets.length - 1; i++) {
      let parsedHeader = false;
      try {
        parser.parseHeader(offsets[i], offsets[i + 1]);
        parsedHeader = true;
      } catch (e) {
        console.log("Error parsing header of log #" + (i + 1) + " " + e);
      }
      if (!parsedHeader) {
        continue;
      }
      this.emit("startLog");
      this.emit("sysConfig", this.parser.sysConfig);
      //console.log(this.parser.frameDefs.S);
      this.emit("header", this.parser.frameDefs.I.name);
      this.parser.onFrameReady = this.emitFrame;
      parser.parseLogData(false, offsets[i], offsets[i + 1]);
      this.emit("endLog");
    }
  }

  run() {
    return this.loadUri()
               .then(this.emitEventsForLogs)
               .catch(function(reason) {
                 console.log(reason);
               });
  }
}

"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
 *   utility class that acts as a stopwatch.  It remembers the start time,
 * and can be stopped and started multiple times.  Accumulates elapsed
 * milliseconds.
 *
 * Used in the queue to keep track of wait times and talk times.
 */

module.exports = StopWatch;

function StopWatch() {
    this.reset();
}

// construct one from the result of JSON.stringify(stopwatch).
StopWatch.fromJSON = function (obj) {
    var sw = new StopWatch();
    Object.assign(sw, obj);
    return sw;
}

// reset to all zeros.
StopWatch.prototype.reset = function () {
    // when start() was last called.  Millisecond datestamp.
    this._startTime = null;
    this._firstStartTime = null;
    this._stopTime = null;

    this._totalTime = 0;
}

// start accumulating time.
StopWatch.prototype.start = function () {
    if (this._startTime)
        return; //already running.
    var now = Date.now();
    if (this._firstStartTime === null)
        this._firstStartTime = now;
    this._stopTime = null;
    this._startTime = now;
};

// stop accumulating time.
StopWatch.prototype.stop = function () {
    this._totalTime = this.value();
    this._startTime = null;
    this._stopTime = Date.now();
};

// get the current value.  Doesn't stop.
StopWatch.prototype.value = function () {
    var ret = this._totalTime;
    if (this._startTime) {
        ret += (Date.now() - this._startTime);
    }

    return ret;
};

StopWatch.prototype.setFirstStartTime = function (t) {
    this._firstStartTime = t;
}


StopWatch.prototype.getStartTime = function () { return this._firstStartTime; }
StopWatch.prototype.getStopTime = function () { return this._stopTime; }

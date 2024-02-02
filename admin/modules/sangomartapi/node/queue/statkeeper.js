"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
 *   utility class that maintains min, max, and average given a series of
 * values.
 *
 * Used in the queue to keep of track various stats.
 */

module.exports = StatKeeper;

function StatKeeper(args) {
    if (args) {
        this.count = args.count;
        this.min = args.min;
        this.max = args.max;
        this.total = args.total;
    } else {
        this.count = 0;
        this.min = null;
        this.max = null;
        this.total = 0;
    }
}

StatKeeper.prototype.update = function (val) {
    this.count++;
    this.total += val;
    if (this.min === null) {
        this.min = val;
        this.max = val;
    }
    if (val > this.max)
        this.max = val;
    if (val < this.min)
        this.min = val;
};

StatKeeper.prototype.average = function () {
    return this.count == 0 ? 0 : (this.total / this.count);
};

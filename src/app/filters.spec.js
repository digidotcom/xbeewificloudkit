/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015 Digi International Inc., All Rights Reserved.
 */

'use strict';

describe("Filter: nonHiddenWidgets", function () {
    beforeEach(module("XBeeWiFiApp"));

    var filter;
    beforeEach(inject(function (_nonHiddenWidgetsFilter_) {
        filter = _nonHiddenWidgetsFilter_;
    }));

    it("should filter out all objects marked as hidden", function () {
        var objects = [
            {a: "A", hidden: false},
            {a: "B", hidden: false},
            {a: "C", hidden: true},
            {a: "D", hidden: false},
            {a: "E"},
            {a: "F", hidden: 0},
            {a: "G", hidden: 1}
        ];

        expect(filter(objects)).toEqual(_.reject(objects, "hidden"));
    });
});

describe("Filter: sortByGridPosition", function () {
    beforeEach(module("XBeeWiFiApp"));

    var filter;
    beforeEach(inject(function (_sortByGridPositionFilter_) {
        filter = _sortByGridPositionFilter_;
    }));

    it("should properly sort objects by grid position", function () {
        // "Sorted by grid position" means that:
        //  - no object is listed before an object in a lower row (i.e. objects
        //      in row 3 are always listed after objects in row 2)
        //  - no object is listed before an object in the same row but with a
        //      lower column (e.g. row 2, col 4 is after row 2, col 3)
        // Because this filter is going to be run against a dashboard object
        // (list of widget objects), we shouldn't need to worry about testing
        // the case where row and col are the same.

        var objects = [
            {row: 2, col: 4},
            {row: 3, col: 1},
            {row: 2, col: 2},
            {row: 1, col: 8},
            {row: 1, col: 7},
            {row: 1, col: 9},
            {row: 4, col: 2},
            {row: 3, col: 2},
            {row: 2, col: 3}
        ];

        var filtered = filter(objects);
        var lastRow, lastCol;
        lastRow = lastCol = -Infinity;
        for (var i = 0; i < filtered.length; i++) {
            var obj = filtered[i];
            if (lastRow === obj.row) {
                // same row -> should be higher column number
                expect(lastCol).toBeLessThan(obj.col);
            } else {
                // different row -> should be higher row than before
                expect(lastRow).toBeLessThan(obj.row);
            }
            lastCol = obj.col;
            lastRow = obj.row;
        }
    });

    it("should properly sort widgets objects by grid position", function () {
        // Widgets store the column and row information in their _gridPos
        // object. We need to test this functionality.

        // "Sorted by grid position" means that:
        //  - no object is listed before an object in a lower row (i.e. objects
        //      in row 3 are always listed after objects in row 2)
        //  - no object is listed before an object in the same row but with a
        //      lower column (e.g. row 2, col 4 is after row 2, col 3)
        // Because this filter is going to be run against a dashboard object
        // (list of widget objects), we shouldn't need to worry about testing
        // the case where row and col are the same.

        var objects = [
            {row: 2, col: 4},
            {row: 3, col: 1},
            {row: 2, col: 2},
            {row: 1, col: 8},
            {row: 1, col: 7},
            {row: 1, col: 9},
            {row: 4, col: 2},
            {row: 3, col: 2},
            {row: 2, col: 3}
        ];
        // Take every object listed above, and wrap it in {_gridPos: ...}
        var _objs = [];
        for (var i in objects) {
            _objs.push({_gridPos: objects[i]});
        }
        objects = _objs;

        var filtered = filter(objects);
        var lastRow, lastCol;
        lastRow = lastCol = -Infinity;
        for (i = 0; i < filtered.length; i++) {
            var obj = filtered[i]._gridPos;
            if (lastRow === obj.row) {
                // same row -> should be higher column number
                expect(lastCol).toBeLessThan(obj.col);
            } else {
                // different row -> should be higher row than before
                expect(lastRow).toBeLessThan(obj.row);
            }
            lastCol = obj.col;
            lastRow = obj.row;
        }
    });

    it("should return empty list for empty list input", function () {
        var result = filter([]);
        expect(result).toEqual([]);

        // Code branch coverage completeness.
        result = filter(undefined);
        expect(result).toEqual([]);
    });

    it("should return length-1 list for length-1 input", function () {
        // Shouldn't matter what we put as the object in the list. If the list
        // is length 1, the filter doesn't even need to look at the sole object
        // in the list - the list is already sorted.
        var input = [{key: "aa"}];
        var result = filter(input);
        expect(result).toEqual(input);
    });
});

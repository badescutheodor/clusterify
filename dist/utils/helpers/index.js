'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Function for measuring sizeof objects
 *
 * @param object
 * @returns {*}
 */
var sizeof = exports.sizeof = function sizeof(object) {
    var objects = [];

    function transverse(value) {
        var bytes = 0;

        switch (true) {
            case typeof value === 'boolean':
                {
                    bytes = 4;
                }break;

            case typeof value === 'string':
                {
                    bytes = value.length * 2;
                }break;

            case typeof value === 'number':
                {
                    bytes = 8;
                }break;

            case (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && objects.indexOf(value) === -1:
                {
                    objects[objects.length] = value;

                    for (var i in value) {
                        bytes += 8;
                        bytes += transverse(value[i]);
                    }
                }break;
        }

        return bytes;
    }

    return transverse(object);
};
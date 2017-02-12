"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The actual storage
 * @type {{}}
 */
var storage = {};

var _class = function () {
    function _class() {
        _classCallCheck(this, _class);
    }

    _createClass(_class, [{
        key: "get",
        value: function get(key, callback) {
            if (storage.hasOwnProperty(key)) {
                callback(null, storage[key]);
                return;
            }

            callback(null);
        }
    }, {
        key: "del",
        value: function del(key, callback) {
            if (storage.hasOwnProperty(key)) {
                delete storage[key];
                callback && callback(null, true);
                return;
            }

            callback && callback(null, false);
        }
    }, {
        key: "set",
        value: function set(key, value, callback) {
            if (storage.hasOwnProperty(key)) {
                storage[key] = value;
                callback && callback(null, storage[key]);
                return;
            }

            storage[key] = value;
            callback && callback(null, storage[key]);
        }
    }]);

    return _class;
}();

exports.default = _class;
module.exports = exports["default"];
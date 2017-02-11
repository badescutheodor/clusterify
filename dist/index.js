'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _master = require('./entities/master');

var _master2 = _interopRequireDefault(_master);

var _worker = require('./entities/worker');

var _worker2 = _interopRequireDefault(_worker);

var _bridge = require('./utils/bridge');

var _bridge2 = _interopRequireDefault(_bridge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default options, overwritten in constructor
 * @type {{master: string}}
 */
var defaults = {
    master: {
        handler: "./master.js"
    },
    worker: "./worker.js"
};

/**
 * Export the main class
 */

var _class = function () {
    /**
     * Initialize the main object
     * @param opts
     */
    function _class(opts) {
        _classCallCheck(this, _class);

        this.opts = _extends({}, defaults, opts);
        this.bridge = new _bridge2.default(this.opts.debug || false);
    }

    /**
     * Spawn the workers and handle the
     * multi core process
     */


    _createClass(_class, [{
        key: 'run',
        value: function run() {
            if (_cluster2.default.isMaster) {
                new _master2.default(this.opts, this.bridge);
                return;
            }

            new _worker2.default(this.opts, this.bridge);
        }
    }]);

    return _class;
}();

exports.default = _class;
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _events = require('../../utils/events');

var _events2 = _interopRequireDefault(_events);

var _constants = require('../../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Worker entity configuration
 * @type {{}}
 */
var config = {};

/**
 * Populate the config object
 * @param opts
 */
var handleOpts = function handleOpts(opts) {
    var workersOpts = opts.workers;
    //let masterOpts  = opts.master;

    if (typeof workersOpts === "string") {
        var workerPath = _path2.default.dirname(require.main.filename) + '/' + workersOpts;

        try {
            var src = require(workerPath);
            config.handler = src.hasOwnProperty("default") ? src.default : src;
        } catch (e) {
            console.error(e);
        }
    }

    if (typeof workersOpts === "function") {
        config.handler = workersOpts;
        return;
    }

    if (workersOpts instanceof Array) {
        config.workers = [];

        for (var index in workersOpts) {
            var worker = workersOpts[index];

            if (!worker.hasOwnProperty("handler")) {
                continue;
            }

            if (typeof worker.handler === "function") {
                if (worker.count) {
                    for (var i = 0; i < worker.count; i++) {
                        config.workers.push({
                            handler: worker.handler
                        });
                    }
                } else {
                    config.workers.push({
                        handler: worker.handler
                    });
                }

                continue;
            }

            if (typeof worker.handler === "string") {
                try {
                    var _workerPath = _path2.default.dirname(require.main.filename) + '/' + worker.handler;
                    var _src = require(_workerPath);

                    if (worker.count) {
                        for (var _i = 0; _i < worker.count; _i++) {
                            config.workers.push({
                                handler: _src.hasOwnProperty("default") ? _src.default : _src
                            });
                        }
                    } else {
                        config.workers.push({
                            handler: _src.hasOwnProperty("default") ? _src.default : _src
                        });
                    }
                } catch (e) {
                    console.error(e);
                }

                continue;
            }
        }

        return;
    }

    if ((typeof workersOpts === 'undefined' ? 'undefined' : _typeof(workersOpts)) === "object") {
        assignOptions: for (var opt in workersOpts) {
            if (!workersOpts.hasOwnProperty(opt)) {
                continue;
            }

            switch (true) {
                case opt === "count":
                    {
                        /**
                         * This option is handled by the
                         * master instance inside the
                         *
                         * @function spawn
                         */
                    }break;

                case opt === "handler":
                    {
                        if (typeof workersOpts[opt] === "string") {
                            try {
                                var _workerPath2 = _path2.default.dirname(require.main.filename) + '/' + workersOpts[opt];
                                var _src2 = require(_workerPath2);
                                config.handler = _src2.hasOwnProperty("default") ? _src2.default : _src2;
                            } catch (e) {
                                console.error(e);
                            }

                            continue assignOptions;
                        }

                        if (typeof workersOpts[opt] === "function") {
                            config.handler = workersOpts[opt];
                            continue assignOptions;
                        }
                    }break;

                default:
                    {
                        console.error('Invalid option with name ' + opt + ' or invalid data passed to it.');
                    }break;
            }
        }
    }
};

/**
 * Export the worker instance
 * @param opts
 */

exports.default = function (opts, bridge, storage) {
    handleOpts(opts);
    bridge.bind();

    /**
     * Run the worker handler(s)
     */
    if (typeof config.handler === "function") {
        _events2.default.on(_constants.EVENT_LOADED, function () {
            new config.handler(bridge, storage);
        });

        return;
    }

    if (config.workers instanceof Array) {
        _events2.default.on(_constants.EVENT_LOADED, function () {
            new config.workers[bridge.id - 1].handler(bridge, storage);
        });
    }
};

module.exports = exports['default'];
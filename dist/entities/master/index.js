'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _events = require('../../utils/events');

var _events2 = _interopRequireDefault(_events);

var _constants = require('../../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Master entity configuration
 * @type {{}}
 */
var config = {};

/**
 * The bridge for handling
 * communication between workers
 */
var channel = void 0;

/**
 * Populate the config object
 * @param opts
 */
var handleOpts = function handleOpts(opts) {
    function handleMasterOpts() {
        var masterOpts = opts.master;

        if (typeof masterOpts === "string") {
            var masterPath = _path2.default.dirname(require.main.filename) + '/' + masterOpts;

            try {
                var src = require(masterPath);
                config.handler = src.hasOwnProperty("default") ? src.default : src;
            } catch (e) {
                console.error(e);
            }
        }

        if (typeof masterOpts === "function") {
            config.handler = masterOpts;
            return;
        }

        if ((typeof masterOpts === 'undefined' ? 'undefined' : _typeof(masterOpts)) === "object") {
            assignOptions: for (var opt in masterOpts) {
                if (!masterOpts.hasOwnProperty(opt)) {
                    continue;
                }

                switch (true) {
                    case opt === "before" && typeof masterOpts[opt] === "function":
                        {
                            config.before = masterOpts[opt];
                        }break;

                    case opt === "after" && typeof masterOpts[opt] === "function":
                        {
                            config.after = masterOpts[opt];
                        }break;

                    case opt === "handler":
                        {
                            if (typeof masterOpts[opt] === "string") {
                                try {
                                    var _masterPath = _path2.default.dirname(require.main.filename) + '/' + masterOpts[opt];
                                    var _src = require(_masterPath);
                                    config.handler = _src.hasOwnProperty("default") ? _src.default : _src;
                                } catch (e) {
                                    console.error(e);
                                }

                                continue assignOptions;
                            }

                            if (typeof masterOpts[opt] === "function") {
                                config.handler = masterOpts[opt];
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
    }
    function handleWorkersOpts() {
        var workersOpts = opts.workers;

        if (workersOpts instanceof Array) {
            config.count = 0;

            for (var worker in workersOpts) {
                if (!workersOpts.hasOwnProperty(worker)) {
                    continue;
                }

                config.count += workersOpts[worker].count || 1;
            }

            return;
        }

        if ((typeof workersOpts === 'undefined' ? 'undefined' : _typeof(workersOpts)) === "object") {
            assignOptions: for (var opt in workersOpts) {
                if (!workersOpts.hasOwnProperty(opt)) {
                    continue;
                }

                switch (true) {
                    case opt === "count" && typeof workersOpts[opt] === "number":
                        {
                            config.count = workersOpts[opt];
                        }break;
                }
            }
        }
    }

    handleMasterOpts();
    handleWorkersOpts();
};

/**
 * Spawn the workers
 */
var spawn = function spawn() {
    var workersCount = config.count ? config.count : _os2.default.cpus().length;

    for (var i = 0; i < workersCount; i++) {
        /**
         * Initialize the worker
         */
        var worker = _cluster2.default.fork();

        /**
         * Assign an id
         */
        worker.id = i + 1;

        /**
         * Register the worker inside
         * the bridge for future
         * communication
         */
        channel.register(worker, workersCount);
    }
};

/**
 * Master function handling spawning
 * the worker instances
 * @param opts
 */

exports.default = function (opts, bridge, storage) {
    handleOpts(opts);

    if (config.before && typeof config.before === "function") {
        config.before();
    }

    channel = bridge;
    channel.bind();

    /**
     * Spawns the workers
     */
    spawn();

    /**
     * Run the master handler
     */
    if (typeof config.handler === "function") {
        /**
         * Only run the master function handler
         * once all the workers had finished
         * initializing
         */
        _events2.default.on(_constants.EVENT_LOADED, function () {
            new config.handler(bridge, storage);

            if (config.after && typeof config.after === "function") {
                config.after();
            }
        });
    }
};

module.exports = exports['default'];
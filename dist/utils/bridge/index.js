'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _events = require('../events');

var _events2 = _interopRequireDefault(_events);

var _helpers = require('../helpers');

var _constants = require('../../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Storage for bridge entities
 * @type {{}}
 */
var entities = {};

/**
 * Storage for bridge entities events
 * @type {{}}
 */
var events = {};

/**
 * Storage for pending emmit events
 * @type {{}}
 */
var pending = {};

/**
 * Interface for communicating between
 * workers and master
 */

var _class = function () {
    function _class(debug) {
        _classCallCheck(this, _class);

        this.isMaster = _cluster2.default.isMaster;
        this.id = this.isMaster ? "0" : false;

        this.toEntity = false;
        this.fromEntity = false;

        this.registered = 0;
        this.debug = debug;
    }

    /**
     * Used by the worker process to bind
     * into entities storage
     */


    _createClass(_class, [{
        key: 'bind',
        value: function bind() {
            var _this = this;

            process.on("message", function (data) {
                if (data.hasOwnProperty(_constants.ACTION_PENDING_SET_ID)) {
                    _this.id = data[_constants.ACTION_PENDING_SET_ID];
                    var payload = {};
                    payload[_constants.ACTION_SUCCESS_SET_ID] = 1;
                    _events2.default.emit(_constants.EVENT_SUCCESS_SET_ID);

                    process.send(payload);
                    return;
                }

                if (data.hasOwnProperty(_constants.ACTION_SET_WORKERS_COUNT)) {
                    _this.registered = data[_constants.ACTION_SET_WORKERS_COUNT];
                    return;
                }

                if (data === _constants.EVENT_LOADED) {
                    _events2.default.emit(_constants.EVENT_LOADED);
                    return;
                }

                _this.handle(data);
            });
        }

        /**
         * Registers an entity onto bridge
         *
         * @note This method is only used by
         * the master process
         *
         * @param entity
         */

    }, {
        key: 'register',
        value: function register(worker, total) {
            var _this2 = this;

            /**
             * Add the entity to the storage
             */
            entities[worker.id] = worker;

            /**
             * Bind the messaging events
             */
            worker.on("message", function (data) {
                if (data.hasOwnProperty(_constants.ACTION_SUCCESS_SET_ID)) {
                    if (total && ++_this2.registered === total) {
                        /**
                         * Emit the event to all the
                         * workers to run their handlers
                         */

                        for (var entity in entities) {
                            if (!entities.hasOwnProperty(entity) || entity === "0") {
                                continue;
                            }

                            entities[entity].send(_constants.EVENT_LOADED);
                        }

                        /**
                         * Emit the event to run
                         * the master handler
                         */

                        _events2.default.emit(_constants.EVENT_LOADED);
                        return;
                    }

                    /**
                     * Worker died for some reason so in
                     * here it just respawned, so we send
                     * it the event loaded so it can boot
                     */
                    if (!total) {
                        entities[worker.id].send(_constants.EVENT_LOADED);
                    }

                    return;
                }

                _this2.handle(data);
            });

            /**
             * Respawn the worker if dies
             */
            worker.on("exit", function () {
                _this2.register(worker);
            });

            /**
             * Set worker's id
             */
            var payload = {};
            payload[_constants.ACTION_PENDING_SET_ID] = worker.id;
            worker.send(payload);

            /**
             * Tell the worker how many
             * other workers exist
             */
            payload = {};
            payload[_constants.ACTION_SET_WORKERS_COUNT] = total;
            worker.send(payload);
        }

        /**
         * Handle the incoming data to
         * their respective receivers
         *
         * @param data
         */

    }, {
        key: 'handle',
        value: function handle(data) {
            var _this3 = this;

            var message = data.message;
            var payload = data.payload;
            var from = data.from;
            var transit = data.transit;
            var to = data.to;
            var confirmed = data.confirmed;
            var identifier = data.identifier;

            if (this.debug) {
                var bytes = (0, _helpers.sizeof)(data);
                var kbytes = bytes / 1000;
                var _to = transit ? '0' : this.id;

                if (_to instanceof Array) {
                    _to = _to.filter(function (entity) {
                        return entity !== _this3.id;
                    });
                }

                if (message !== _constants.ACTION_CONFIRM_EMIT) {
                    console.log('(debug)(' + kbytes + ' kbs): [' + message + ']: ' + from + ' -> ' + _to);
                }
            }

            function build() {
                var _this4 = this;

                var res = {
                    getPayload: function getPayload() {
                        return payload;
                    },
                    getSender: function getSender() {
                        return from;
                    },
                    isConfirmed: function isConfirmed() {
                        return !!confirmed;
                    }
                };

                if (confirmed) {
                    res.ack = function (res) {
                        var payload = identifier;

                        if (typeof res !== "undefined") {
                            payload = [identifier, res];
                        }

                        _this4.to(from).emit(_constants.ACTION_CONFIRM_EMIT, payload);
                    };

                    res.getIdentifier = function () {
                        return identifier;
                    };
                }

                return res;
            }
            function make(response) {
                var res = {
                    raw: function raw() {
                        return response;
                    },
                    get: function get(entity) {
                        for (var resp in response) {
                            if (response[resp].hasOwnProperty(entity)) {
                                return response[resp][entity];
                            }
                        }

                        return false;
                    }
                };

                return res;
            }

            /**
             * Worker has routed a message to master
             * and now master will have to send the
             * data to other workers
             *
             * worker -> master -> worker
             *                  -> worker
             *
             * @note Only master instance will access
             * the transit if.
             */
            if (transit) {
                if (to) {
                    this.to(to).emit(message, payload, identifier, from);
                    return;
                }

                this.to('*').emit(message, payload, identifier, from);
                return;
            }

            if (message === _constants.ACTION_CONFIRM_EMIT) {
                var _identifier = payload;
                var response = void 0;

                if (payload instanceof Array) {
                    _identifier = payload[0];
                    response = payload[1];
                }

                if (this.isMaster) {
                    var splitted = _identifier.split('#');
                    var _from = splitted[1];

                    if (_from != this.id) {
                        this.to(_from).emit(_constants.ACTION_CONFIRM_EMIT, _identifier, this.id);
                    }
                }

                if (!pending.hasOwnProperty(_identifier)) {
                    return;
                }

                var res = {};
                res[from] = response;

                pending[_identifier].res.push(res);
                pending[_identifier].done++;

                if (this.debug) {
                    console.log('(debug): identifier -> [' + _identifier + '], total: [' + pending[_identifier].total + '], done: [' + pending[_identifier].done + ']');
                }

                if (pending[_identifier].done === pending[_identifier].total) {
                    pending[_identifier].callback(make(pending[_identifier].res));

                    /**
                     * Remove the handler as the emit
                     * is registered one time only
                     */
                    delete pending[_identifier];
                }

                return;
            }

            if (events.hasOwnProperty(message)) {
                var handlers = events[message];
                var built = build.apply(this, []);

                for (var i = 0, len = handlers.length; i < len; i++) {
                    if (handlers[i].from !== "*" && _typeof(handlers[i].from) === "object" && !handlers[i].from.hasOwnProperty(from)) {
                        continue;
                    }

                    handlers[i].handler(built);
                }
            }
        }

        /**
         * Emit
         *
         * @param message
         * @param data
         * @param callback
         */

    }, {
        key: 'emit',
        value: function emit(message, data, callback, from) {
            /**
             * Creates a unique transport identifier
             * for the emits that require confirmation
             *
             * @param from
             * @param message
             * @returns {string}
             */
            var makeIdentifier = function makeIdentifier(from, message) {
                var seed = Math.floor(Math.random() * new Date());
                var identifier = seed + '#' + from + '#' + message;
                return identifier;
            };

            /**
             * Allow overwrite the from property
             * @type {*}
             */
            var fromEntity = from ? from : this.id;

            /**
             * Used on worker -> master -> worker
             * confirmed transports
             * @type {boolean}
             */
            var hasIdentifier = typeof callback === "string" || callback instanceof Array;

            /**
             * Loop through the entities and emit the
             * messages <3
             */
            if (this.toEntity instanceof Array) {
                /**
                 * master -> workers
                 */
                if (this.isMaster) {
                    var _payload = {
                        from: fromEntity,
                        message: message,
                        payload: data
                    };

                    if (hasIdentifier) {
                        _payload.confirmed = true;
                        _payload.identifier = callback;
                    }

                    if (callback && typeof callback === "function") {
                        _payload.confirmed = true;
                        _payload.identifier = makeIdentifier(fromEntity, message);

                        /**
                         * The sender is master, store the identifier
                         * directly inside the pending container
                         *
                         * @note It's -1 because master is the first entity
                         * of the entities container
                         * @type {{done: number, total: number}}
                         */
                        pending[_payload.identifier] = { done: 0, total: this.toEntity.length, res: [], callback: callback };
                    }

                    for (var i = 0, len = this.toEntity.length; i < len; i++) {
                        if (this.toEntity[i] === "0" || this.toEntity[i] === "*") {
                            continue;
                        }

                        entities[this.toEntity[i]].send(_payload);
                    }

                    return;
                }

                /**
                 * worker -> master -> workers
                 */
                var payload = {
                    from: this.id,
                    message: message,
                    payload: data,
                    transit: true,
                    to: this.toEntity
                };

                if (callback && typeof callback === "function") {
                    payload.confirmed = true;
                    payload.identifier = makeIdentifier(fromEntity, message);

                    /**
                     * The sender is master, store the identifier
                     * directly inside the pending container
                     *
                     * @note It's -1 because master is the first entity
                     * of the entities container
                     * @type {{done: number, total: number}}
                     */
                    pending[payload.identifier] = { done: 0, total: this.toEntity.length, res: [], callback: callback };
                }

                process.send(payload);
                return;
            }

            if (typeof this.toEntity === "string" || typeof this.toEntity === "number") {
                /**
                 * Send to everyone except to self
                 */
                if (this.toEntity.toString() === "*") {
                    /**
                     * master -> all workers
                     */
                    if (this.isMaster) {
                        var _payload4 = {
                            from: fromEntity,
                            message: message,
                            payload: data
                        };

                        if (hasIdentifier) {
                            _payload4.confirmed = true;
                            _payload4.identifier = callback;
                        }

                        if (callback && typeof callback === "function") {
                            _payload4.confirmed = true;
                            _payload4.identifier = makeIdentifier(fromEntity, message);

                            /**
                             * The sender is master, store the identifier
                             * directly inside the pending container
                             *
                             * @note It's -1 because master is the first entity
                             * of the entities container
                             * @type {{done: number, total: number}}
                             */
                            pending[_payload4.identifier] = { done: 0, total: Object.keys(entities).length - 1, res: [], callback: callback };
                        }

                        for (var entity in entities) {
                            if (!entities.hasOwnProperty(entity) || this.id === entity) {
                                continue;
                            }

                            entities[entity].send(_payload4);
                        }

                        return;
                    }

                    /**
                     * worker -> master -> all other workers
                     */
                    var _payload3 = {
                        from: this.id,
                        message: message,
                        payload: data,
                        transit: true,
                        to: this.toEntity
                    };

                    if (callback && typeof callback === "function") {
                        _payload3.confirmed = true;
                        _payload3.identifier = makeIdentifier(fromEntity, message);

                        /**
                         * The sender is master, store the identifier
                         * directly inside the pending container
                         *
                         * @note It's -1 because master is the first entity
                         * of the entities container
                         * @type {{done: number, total: number}}
                         */
                        pending[_payload3.identifier] = { done: 0, total: this.registered - 1, res: [], callback: callback };
                    }

                    process.send(_payload3);
                    return;
                }

                /**
                 * master -> worker
                 */
                if (this.isMaster) {
                    var _payload5 = {
                        from: fromEntity,
                        message: message,
                        payload: data
                    };

                    if (hasIdentifier) {
                        _payload5.confirmed = true;
                        _payload5.identifier = callback;
                    }

                    if (callback && typeof callback === "function") {
                        _payload5.confirmed = true;
                        _payload5.identifier = makeIdentifier(fromEntity, message);

                        /**
                         * The sender is master, store the identifier
                         * directly inside the pending container
                         *
                         * @note It's -1 because master is the first entity
                         * of the entities container
                         * @type {{done: number, total: number}}
                         */
                        pending[_payload5.identifier] = { done: 0, total: 1, res: [], callback: callback };
                    }

                    entities[this.toEntity].send(_payload5);
                    return;
                }

                /**
                 * worker -> master -> worker
                 */

                if (Number(this.toEntity) !== 0) {
                    var _payload6 = {
                        from: this.id,
                        message: message,
                        payload: data,
                        transit: true,
                        to: this.toEntity
                    };

                    if (callback && typeof callback === "function") {
                        _payload6.confirmed = true;
                        _payload6.identifier = makeIdentifier(fromEntity, message);

                        /**
                         * The sender is master, store the identifier
                         * directly inside the pending container
                         *
                         * @note It's -1 because master is the first entity
                         * of the entities container
                         * @type {{done: number, total: number}}
                         */
                        pending[_payload6.identifier] = { done: 0, total: 1, res: [], callback: callback };
                    }

                    process.send(_payload6);
                    return;
                }

                /**
                 * worker -> master
                 */
                var _payload2 = {
                    from: this.id,
                    message: message,
                    payload: data
                };

                if (callback && typeof callback === "function") {
                    _payload2.confirmed = true;
                    _payload2.identifier = makeIdentifier(fromEntity, message);

                    /**
                     * The sender is master, store the identifier
                     * directly inside the pending container
                     *
                     * @note It's -1 because master is the first entity
                     * of the entities container
                     * @type {{done: number, total: number}}
                     */
                    pending[_payload2.identifier] = { done: 0, total: 1, res: [], callback: callback };
                }

                process.send(_payload2);
                return;
            }

            this.toEntity = false;
        }

        /**
         * Register the event onto the entity
         *
         * @param message
         * @param callback
         */

    }, {
        key: 'on',
        value: function on(message, callback) {
            /**
             * Used for checking if an entity has an event
             * onto the current message
             *
             * @param array
             * @returns {{}}
             */
            function toObject(array) {
                var obj = {};

                for (var i = 0, len = array.length; i < len; i++) {
                    obj[array[i]] = 1;
                }

                return obj;
            }

            /**
             * @note Multiple handlers can be added
             * on same message name
             * @type {*}
             */
            if (!events.hasOwnProperty(message)) {
                events[message] = [];
            }

            var from = {};

            if (this.fromEntity instanceof Array) {
                from = toObject(this.fromEntity);
            } else if (this.fromEntity === "*") {
                var all = [];

                for (var i = 1; i < this.registered + 1; i++) {
                    if (this.id === i) {
                        continue;
                    }

                    all.push(i);
                }

                from = toObject(all);
            } else {
                from[this.fromEntity] = 1;
            }

            var event = {
                from: from,
                handler: callback
            };

            if (this.debug) {
                console.log('(debug): event -> [' + message + '], entities: [' + this.fromEntity + ']');
            }

            events[message].push(event);
        }

        /**
         * If id = 0 and the initiator is a worker,
         * the message should be passed only to master
         *
         * If id = * and the initiator is master, the
         * message should be passed to everyone except the sender
         *
         * If id = [1, 2, 3] and the initiator is either master
         * or worker, the message should be passed to respective
         * entities ids
         *
         * If the id is same as the initiator, this would trigger
         * infinite loop so we must skip this case.
         *
         * @param id
         */

    }, {
        key: 'to',
        value: function to(id) {
            this.toEntity = id;
            return this;
        }
    }, {
        key: 'from',
        value: function from(id) {
            this.fromEntity = id;
            return this;
        }
    }]);

    return _class;
}();

exports.default = _class;
module.exports = exports['default'];
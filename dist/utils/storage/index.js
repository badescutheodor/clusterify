'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _memory = require('./drivers/memory');

var _memory2 = _interopRequireDefault(_memory);

var _events = require('../events');

var _events2 = _interopRequireDefault(_events);

var _constants = require('../../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    function _class(driver, bridge) {
        _classCallCheck(this, _class);

        this.bridge = bridge;
        this.setDriver(driver);
    }

    _createClass(_class, [{
        key: 'listen',
        value: function listen() {
            var _this = this;

            _events2.default.on(_constants.EVENT_LOADED, function () {
                _this.bridge.from('*').on(_constants.ACTION_SET_STORAGE, function (data) {
                    var payload = data.getPayload();

                    _this.set(payload.key, payload.value, function (err, value) {
                        data.ack(value);
                    });
                });

                _this.bridge.from('*').on(_constants.ACTION_GET_STORAGE, function (data) {
                    var payload = data.getPayload();

                    _this.get(payload.key, function (err, value) {
                        data.ack(value);
                    });
                });
            });
        }
    }, {
        key: 'setDriver',
        value: function setDriver(driver) {
            var drivers = {
                memory: _memory2.default
            };

            if (!drivers.hasOwnProperty(driver)) {
                console.error('Invalid driver with name ' + driver + ' set.');
                return;
            }

            /**
             * Only on memory driver we
             * are using listen method
             */
            this.bridge.isMaster && driver === "memory" && this.listen();

            this.driver = new drivers[driver](this.bridge);
        }
    }, {
        key: 'get',
        value: function get(key, callback) {
            if (this.bridge.isMaster) {
                this.driver.get(key, callback);
                return;
            }

            this.bridge.to(0).emit(_constants.ACTION_GET_STORAGE, { key: key }, function (reply) {
                callback(null, reply.get(0));
            });
        }
    }, {
        key: 'set',
        value: function set(key, value, callback) {
            if (this.bridge.isMaster) {
                this.driver.set(key, value, callback);
                return;
            }

            this.bridge.to(0).emit(_constants.ACTION_SET_STORAGE, { key: key, value: value }, function (reply) {
                callback(null, reply.get(0));
            });
        }
    }]);

    return _class;
}();

exports.default = _class;
module.exports = exports['default'];
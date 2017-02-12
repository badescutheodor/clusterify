import MemoryDriver from './drivers/memory'
import emitter from '../events'
import {
    EVENT_LOADED,
    ACTION_SET_STORAGE,
    ACTION_GET_STORAGE
} from '../../constants'

export default class {
    constructor(driver, bridge) {
        this.bridge = bridge;
        this.setDriver(driver);
    }

    listen() {
        emitter.on(EVENT_LOADED, () => {
            this.bridge.from('*').on(ACTION_SET_STORAGE, (data) => {
                let payload = data.getPayload();

                this.set(payload.key, payload.value, (err, value) => {
                    data.ack(value);
                });
            });

            this.bridge.from('*').on(ACTION_GET_STORAGE, (data) => {
                let payload = data.getPayload();

                this.get(payload.key, (err, value) => {
                    data.ack(value);
                });
            });
        })
    }

    setDriver(driver) {
        const drivers = {
            memory: MemoryDriver
        };

        if ( !drivers.hasOwnProperty(driver) )
        {
            console.error(`Invalid driver with name ${driver} set.`);
            return;
        }

        /**
         * Only on memory driver we
         * are using listen method
         */
        this.bridge.isMaster && driver === "memory" && this.listen();

        this.driver = new drivers[driver](this.bridge);
    }

    get(key, callback) {
        if ( this.bridge.isMaster )
        {
            this.driver.get(key, callback);
            return;
        }

        this.bridge.to(0).emit(ACTION_GET_STORAGE, { key }, (reply) => {
            callback(null, reply.get(0));
        });
    }

    set(key, value, callback) {
        if ( this.bridge.isMaster )
        {
            this.driver.set(key, value, callback);
            return;
        }

        this.bridge.to(0).emit(ACTION_SET_STORAGE, { key, value }, (reply) => {
            callback(null, reply.get(0));
        });
    }
}
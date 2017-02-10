import cluster from 'cluster'
import emitter from '../events'
import {
    EVENT_LOADED,
    EVENT_SUCCESS_SET_ID,
    ACTION_PENDING_SET_ID,
    ACTION_SUCCESS_SET_ID,
    ACTION_CONFIRM_EMIT
} from '../../constants'

/**
 * Storage for bridge entities
 * @type {{}}
 */
const entities = {};

/**
 * Storage for bridge entities events
 * @type {{}}
 */
const events   = {};

/**
 * Storage for pending emmit events
 * @type {{}}
 */
const pending  = {};

/**
 * Interface for communicating between
 * workers and master
 */
export default class {
    constructor() {
        this.isMaster   = cluster.isMaster;
        this.id         = this.isMaster ? "0" : false;

        this.toEntity   = false;
        this.fromEntity = false;

        this.registered = 0;
    }

    /**
     * Used by the worker process to bind
     * into entities storage
     */
    bind() {
        process.on("message", (data) => {
            if ( data.hasOwnProperty(ACTION_PENDING_SET_ID) )
            {
                this.id                        = data[ACTION_PENDING_SET_ID];
                let payload                    = {};
                payload[ACTION_SUCCESS_SET_ID] = 1;
                emitter.emit(EVENT_SUCCESS_SET_ID);

                process.send(payload);
                return;
            }

            if ( data === EVENT_LOADED )
            {
                emitter.emit(EVENT_LOADED);
                return;
            }

            this.handle(data);
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
    register(worker, total) {
        /**
         * Add the entity to the storage
         */
        entities[worker.id] = worker;

        /**
         * Bind the messaging events
         */
        worker.on("message", (data) => {
            if ( data.hasOwnProperty(ACTION_SUCCESS_SET_ID) )
            {
                if ( total && ( ++this.registered === total ) )
                {
                    /**
                     * Emit the event to all the
                     * workers to run their handlers
                     */

                    for(let entity in entities)
                    {
                        if ( !entities.hasOwnProperty(entity) || entity === "0" )
                        {
                            continue;
                        }

                        entities[entity].send(EVENT_LOADED);
                    }

                    /**
                     * Emit the event to run
                     * the master handler
                     */

                    emitter.emit(EVENT_LOADED);
                    return;
                }

                /**
                 * Worker died for some reason so in
                 * here it just respawned, so we send
                 * it the event loaded so it can boot
                 */
                if ( !total )
                {
                    entities[worker.id].send(EVENT_LOADED);
                }

                return;
            }

            this.handle(data);
        });

        /**
         * Respawn the worker if dies
         */
        worker.on("exit", () => {
            console.log('Worker exited.');
            this.register(worker);
        })

        /**
         * Set worker's id
         */
        let payload                    = {};
        payload[ACTION_PENDING_SET_ID] = worker.id;
        worker.send(payload);
    }

    /**
     * Handle the incoming data to
     * their respective receivers
     *
     * @param data
     */
    handle(data) {
        let message    = data.message;
        let payload    = data.payload;
        let from       = data.from;
        let transit    = data.transit;
        let to         = data.to;
        let confirmed  = data.confirmed;
        let identifier = data.identifier;

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
        if ( transit )
        {
            if ( to )
            {
                this.to(to).emit(message, payload, identifier, from);
                return;
            }

            this.to('*').emit(message, payload, identifier, from);
            return;
        }

        if ( message === ACTION_CONFIRM_EMIT )
        {
            if ( this.isMaster )
            {
                let splitted = data.payload.split('#');
                let from     = splitted[1];

                if ( from != this.id )
                {
                    this.to(from).emit(ACTION_CONFIRM_EMIT, data.payload, this.id);
                }
            }

            if ( !pending.hasOwnProperty(payload) )
            {
                return;
            }

            if ( ++pending[payload].done === pending[payload].total )
            {
                pending[payload].callback();

                /**
                 * Remove the handler as the emit
                 * is registered one time only
                 *
                 * @TODO: If in a for loop, the pending object could fill the memory
                 */
                delete pending[payload];
            }

            return;
        }

        function build() {
            let res = {
                getPayload() {
                    return payload;
                },

                getSender() {
                    return from;
                },

                isConfirmed() {
                    return !!confirmed;
                }
            };

            if ( confirmed )
            {
                res.ack = () => {
                    this.to(from).emit(ACTION_CONFIRM_EMIT, identifier);
                }

                res.getIdentifier = () => {
                    return identifier;
                }
            }

            return res;
        }

        if ( events.hasOwnProperty(message) )
        {
            let handlers = events[message];
            let built    = build.apply(this, []);

            for(let i = 0, len = handlers.length; i < len; i++)
            {
                if ( handlers[i].from !== "*"
                     && ( typeof handlers[i].from === "object"
                          && !handlers[i].from.hasOwnProperty(from) ) )
                {
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
    emit(message, data, callback, from) {
        /**
         * Creates a unique transport identifier
         * for the emits that require confirmation
         *
         * @param from
         * @param message
         * @returns {string}
         */
        function makeIdentifier(from, message) {
            let seed       = Math.floor(Math.random() * new Date());
            let identifier = `${seed}#${from}#${message}`;
            return identifier;
        }

        /**
         * Allow overwrite the from property
         * @type {*}
         */
        let fromEntity = from ? from : this.id;

        /**
         * Used on worker -> master -> worker
         * confirmed transports
         * @type {boolean}
         */
        let hasIdentifier = ( typeof callback === "string" );

        /**
         * Loop through the entities and emit the
         * messages <3
         */
        if ( this.toEntity instanceof Array )
        {
            /**
             * master -> workers
             */
            if ( this.isMaster )
            {
                let payload = {
                    from:    fromEntity,
                    message: message,
                    payload: data
                };

                if ( hasIdentifier )
                {
                    payload.confirmed  = true;
                    payload.identifier = callback;
                }

                if ( callback && typeof callback === "function" )
                {
                    payload.confirmed  = true;
                    payload.identifier = makeIdentifier(fromEntity, message);

                    /**
                     * The sender is master, store the identifier
                     * directly inside the pending container
                     *
                     * @note It's -1 because master is the first entity
                     * of the entities container
                     * @type {{done: number, total: number}}
                     */
                    pending[payload.identifier] = { done: 0, total: this.toEntity.length, callback };
                }

                for ( let i = 0, len = this.toEntity.length; i < len; i++)
                {
                    if ( this.toEntity[i] === "0"
                         || this.toEntity[i] === "*" )
                    {
                        continue;
                    }

                    entities[this.toEntity[i]].send(payload);
                }

                return;
            }

            /**
             * worker -> master -> workers
             */
            let payload = {
                from:    this.id,
                message: message,
                payload: data,
                transit: true,
                to:      this.toEntity
            };

            if ( callback && typeof callback === "function" )
            {
                payload.confirmed  = true;
                payload.identifier = makeIdentifier(fromEntity, message);

                /**
                 * The sender is master, store the identifier
                 * directly inside the pending container
                 *
                 * @note It's -1 because master is the first entity
                 * of the entities container
                 * @type {{done: number, total: number}}
                 */
                pending[payload.identifier] = { done: 0, total: this.toEntity.length, callback };
            }

            process.send(payload);
            return;
        }

        if ( typeof this.toEntity === "string"
             || typeof this.toEntity === "number" )
        {
            /**
             * Send to everyone except to self
             */
            if ( this.toEntity.toString() === "*" )
            {
                /**
                 * master -> all workers
                 */
                if ( this.isMaster )
                {
                    let payload = {
                        from:    fromEntity,
                        message: message,
                        payload: data
                    };

                    // @TODO: check me
                    if ( hasIdentifier )
                    {
                        payload.confirmed  = true;
                        payload.identifier = callback;
                    }

                    if ( callback && typeof callback === "function" )
                    {
                        payload.confirmed  = true;
                        payload.identifier = makeIdentifier(fromEntity, message);

                        /**
                         * The sender is master, store the identifier
                         * directly inside the pending container
                         *
                         * @note It's -1 because master is the first entity
                         * of the entities container
                         * @type {{done: number, total: number}}
                         */
                        pending[payload.identifier] = { done: 0, total: (Object.keys(entities).length - 1), callback };
                    }

                    for ( let entity in entities )
                    {
                        if ( !entities.hasOwnProperty(entity)
                            || this.id === entity )
                        {
                            continue;
                        }

                        entities[entity].send(payload);
                    }

                    return;
                }

                /**
                 * worker -> master -> all other workers
                 */
                let payload = {
                    from:    this.id,
                    message: message,
                    payload: data,
                    transit: true,
                    to:      this.toEntity
                };

                if ( callback && typeof callback === "function" )
                {
                    payload.confirmed  = true;
                    payload.identifier = makeIdentifier(fromEntity, message);

                    /**
                     * The sender is master, store the identifier
                     * directly inside the pending container
                     *
                     * @note It's -1 because master is the first entity
                     * of the entities container
                     * @type {{done: number, total: number}}
                     */
                    pending[payload.identifier] = { done: 0, total: 10, callback };
                }

                process.send(payload);
                return;
            }

            /**
             * master -> worker
             */
            if ( this.isMaster )
            {
                let payload = {
                    from:    fromEntity,
                    message: message,
                    payload: data
                };

                if ( hasIdentifier )
                {
                    payload.confirmed  = true;
                    payload.identifier = callback;
                }

                if ( callback && typeof callback === "function" )
                {
                    payload.confirmed  = true;
                    payload.identifier = makeIdentifier(fromEntity, message);

                    /**
                     * The sender is master, store the identifier
                     * directly inside the pending container
                     *
                     * @note It's -1 because master is the first entity
                     * of the entities container
                     * @type {{done: number, total: number}}
                     */
                    pending[payload.identifier] = { done: 0, total: 1, callback };
                }

                entities[this.toEntity].send(payload);
                return;
            }

            /**
             * worker -> master
             */
            let payload = {
                from:    this.id,
                message: message,
                payload: data
            };

            if ( callback && typeof callback === "function" )
            {
                payload.confirmed  = true;
                payload.identifier = makeIdentifier(fromEntity, message);

                /**
                 * The sender is master, store the identifier
                 * directly inside the pending container
                 *
                 * @note It's -1 because master is the first entity
                 * of the entities container
                 * @type {{done: number, total: number}}
                 */
                pending[payload.identifier] = { done: 0, total: 1, callback };
            }

            process.send(payload);
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
    on(message, callback) {
        /**
         * Used for checking if an entity has an event
         * onto the current message
         *
         * @param array
         * @returns {{}}
         */
        function toObject(array) {
            let obj = {};

            for( let i = 0, len = array.length; i < len; i++)
            {
                obj[array[i]] = 1;
            }

            return obj;
        }

        /**
         * @note Multiple handlers can be added
         * on same message name
         * @type {*}
         */
        if ( !events.hasOwnProperty(message) )
        {
            events[message] = [];
        }

        let event = {
            from:    ( this.fromEntity instanceof Array ) ? toObject(this.fromEntity) : this.fromEntity,
            handler: callback
        };

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
    to(id) {
        this.toEntity = id;
        return this;
    }

    from(id) {
        this.fromEntity = id;
        return this;
    }
}
import path from 'path'
import os from 'os'
import cluster from 'cluster'
import emitter from '../../utils/events'
import { EVENT_LOADED } from '../../constants'

/**
 * Master entity configuration
 * @type {{}}
 */
const config  = {};

/**
 * The bridge for handling
 * communication between workers
 */
let channel;

/**
 * Populate the config object
 * @param opts
 */
const handleOpts = (opts) => {
    function handleMasterOpts() {
        let masterOpts  = opts.master;

        if ( typeof masterOpts === "string" )
        {
            let masterPath = `${path.dirname(require.main.filename)}/${masterOpts}`;

            try
            {
                let src        = require(masterPath);
                config.handler = src.hasOwnProperty("default") ? src.default : src;
            }
            catch(e)
            {
                console.error(e);
            }
        }

        if ( typeof masterOpts === "function" )
        {
            config.handler = masterOpts;
            return;
        }

        if ( typeof masterOpts === "object" )
        {
            assignOptions: for ( let opt in masterOpts )
            {
                if ( !masterOpts.hasOwnProperty(opt) )
                {
                    continue;
                }

                switch ( true )
                {
                    case ( opt === "before"
                    && typeof masterOpts[opt] === "function" ):
                    {
                        config.before = masterOpts[opt];
                    } break;

                    case ( opt === "after"
                    && typeof masterOpts[opt] === "function" ):
                    {
                        config.after = masterOpts[opt];
                    } break;

                    case ( opt === "handler" ):
                    {
                        if ( typeof masterOpts[opt] === "string" )
                        {
                            try
                            {
                                let masterPath = `${path.dirname(require.main.filename)}/${masterOpts[opt]}`;
                                let src        = require(masterPath);
                                config.handler = src.hasOwnProperty("default") ? src.default : src;
                            }
                            catch(e)
                            {
                                console.error(e);
                            }

                            continue assignOptions;
                        }

                        if ( typeof masterOpts[opt] === "function" )
                        {
                            config.handler = masterOpts[opt];
                            continue assignOptions;
                        }
                    } break;

                    default:
                    {
                        console.error(`Invalid option with name ${opt} or invalid data passed to it.`);
                    } break;
                }
            }
        }
    }
    function handleWorkersOpts() {
        let workersOpts = opts.workers;

        if ( workersOpts instanceof Array )
        {
            config.count = 0;

            for( let worker in workersOpts )
            {
                if ( !workersOpts.hasOwnProperty(worker) )
                {
                    continue;
                }

                config.count += ( workersOpts[worker].count || 1 );
            }

            return;
        }

        if ( typeof workersOpts === "object" )
        {
            assignOptions: for ( let opt in workersOpts )
            {
                if ( !workersOpts.hasOwnProperty(opt) )
                {
                    continue;
                }

                switch ( true )
                {
                    case ( opt === "count"
                    && typeof workersOpts[opt] === "number" ):
                    {
                        config.count = workersOpts[opt];
                    } break;
                }
            }
        }
    }

    handleMasterOpts();
    handleWorkersOpts();
}

/**
 * Spawn the workers
 */
const spawn = () => {
    let workersCount = ( config.count ? config.count : os.cpus().length );

    for ( let i = 0; i < workersCount; i++ )
    {
        /**
         * Initialize the worker
         */
        let worker = cluster.fork();

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
export default (opts, bridge, storage) => {
    handleOpts(opts);

    if ( config.before
         && typeof config.before === "function" )
    {
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
    if ( typeof config.handler === "function" )
    {
        /**
         * Only run the master function handler
         * once all the workers had finished
         * initializing
         */
        emitter.on(EVENT_LOADED, () => {
            new (config.handler)(bridge, storage);

            if ( config.after
                && typeof config.after === "function" )
            {
                config.after();
            }
        });
    }
}
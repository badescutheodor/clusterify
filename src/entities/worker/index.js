import path from 'path'
import emitter from '../../utils/events'
import { EVENT_LOADED } from '../../constants'

/**
 * Worker entity configuration
 * @type {{}}
 */
const config  = {};

/**
 * Populate the config object
 * @param opts
 */
const handleOpts = (opts) => {
    let workersOpts = opts.workers;
    //let masterOpts  = opts.master;

    if ( typeof workersOpts === "string" )
    {
        let workerPath = `${path.dirname(require.main.filename)}/${workersOpts}`;

        try
        {
            let src        = require(workerPath);
            config.handler = src.hasOwnProperty("default") ? src.default : src;
        }
        catch(e)
        {
            console.error(e);
        }
    }

    if ( typeof workersOpts === "function" )
    {
        config.handler = workersOpts;
        return;
    }

    if ( workersOpts instanceof Array )
    {
        config.workers = [];

        for ( let index in workersOpts )
        {
            let worker = workersOpts[index];

            if ( !worker.hasOwnProperty("handler") )
            {
                continue;
            }

            if ( typeof worker.handler === "function" )
            {
                if ( worker.count )
                {
                    for(let i = 0; i < worker.count; i++)
                    {
                        config.workers.push({
                            handler: worker.handler,
                            alias: worker.alias
                        });
                    }
                }
                else
                {
                    config.workers.push({
                        handler: worker.handler,
                        alias: worker.alias
                    });
                }

                continue;
            }

            if ( typeof worker.handler === "string" )
            {
                try
                {
                    let workerPath = `${path.dirname(require.main.filename)}/${worker.handler}`;
                    let src        = require(workerPath);

                    if ( worker.count )
                    {
                        for(let i = 0; i < worker.count; i++)
                        {
                            config.workers.push({
                                handler: src.hasOwnProperty("default") ? src.default : src,
                                alias: worker.alias
                            });
                        }
                    }
                    else
                    {
                        config.workers.push({
                            handler: src.hasOwnProperty("default") ? src.default : src,
                            alias: worker.alias
                        });
                    }
                }
                catch(e)
                {
                    console.error(e);
                }

                continue;
            }
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
                case ( opt === "count" ):
                {
                    /**
                     * This option is handled by the
                     * master instance inside the
                     *
                     * @function spawn
                     */
                } break;

                case ( opt === "handler" ):
                {
                    if ( typeof workersOpts[opt] === "string" )
                    {
                        try
                        {
                            let workerPath = `${path.dirname(require.main.filename)}/${workersOpts[opt]}`;
                            let src        = require(workerPath);
                            config.handler = src.hasOwnProperty("default") ? src.default : src;
                        }
                        catch(e)
                        {
                            console.error(e);
                        }

                        continue assignOptions;
                    }

                    if ( typeof workersOpts[opt] === "function" )
                    {
                        config.handler = workersOpts[opt];
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

/**
 * Export the worker instance
 * @param opts
 */
export default (opts, bridge) => {
    handleOpts(opts);
    bridge.bind();

    /**
     * Run the worker handler(s)
     */
    if ( typeof config.handler === "function" )
    {
        emitter.on(EVENT_LOADED, () => {
            new (config.handler)(bridge);
        });

        return;
    }

    if ( config.workers instanceof Array )
    {
        emitter.on(EVENT_LOADED, () => {
            new (config.workers[bridge.id - 1].handler)(bridge);
        });
    }
}
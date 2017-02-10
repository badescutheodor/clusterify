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
        let workerPath = `${path.dirname(require.main.filename)}/${workerOpts}`;

        try
        {
            let src        = require(workerPath);
            config.handler = src.default;
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
                            let masterPath = `${path.dirname(require.main.filename)}/${workersOpts[opt]}`;
                            let src        = require(masterPath);
                            config.handler = src.default;
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
     * Run the worker handler
     */
    if ( typeof config.handler === "function" )
    {
        /**
         * This timeout is being used to wait
         * for the worker to get its id
         */
        emitter.on(EVENT_LOADED, () => {
            new (config.handler)(bridge);
        });
    }
}
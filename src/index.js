import cluster from 'cluster'
import Master from './entities/master'
import Worker from './entities/worker'
import Bridge from './utils/bridge'

/**
 * Default options, overwritten in constructor
 * @type {{master: string}}
 */
const defaults = {
    master: {
        handler: "./master.js"
    },
    worker: "./worker.js"
};

/**
 * Export the main class
 */
export default class {
    /**
     * Initialize the main object
     * @param opts
     */
    constructor(opts) {
        this.opts   = { ...defaults, ...opts };
        this.bridge = new Bridge(this.opts.debug || false);
    }

    /**
     * Spawn the workers and handle the
     * multi core process
     */
    run() {
        if ( cluster.isMaster ) {
            new Master(this.opts, this.bridge);
            return;
        }

        new Worker(this.opts, this.bridge);
    }
}
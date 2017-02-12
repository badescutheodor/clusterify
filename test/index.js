import cruster from '../src'

/**
 * It's very hard to test a parallel
 * environment using old school tools
 * such as mocha, that's why I am handling
 * the tests from within the ./assets/master.js
 * and from within ./assets/worker.js files.
 */

new cruster({
    master: './assets/master.js',
    workers: {
        handler: "./assets/worker.js",
        count: 2
    }
}).run();
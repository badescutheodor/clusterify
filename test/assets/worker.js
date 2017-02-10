import { t } from './utils'

/**
 * Worker entity class declaration
 */

export default class {
    constructor(bridge) {
        this.bridge   = bridge;
        this.isSingle = ( this.bridge.id === 1 );

        this.init();
        this.bind();

        this.testWorkerToMaster();
        this.testWorkerToWorker();
        this.testWorkerToWorkersStress(100);
    }

    /**
     * Test ( worker -> master -> worker ) message
     * passing duration
     */
    testWorkerToWorkersStress(count) {
        let name  = "testWorkerToWorkersStress";

        if ( this.isSingle )
        {
            let descr   = "worker -> workers";
            let timeout = this.timeout(1000, name);

            this.printTest(name, descr);

            t(name);

            let done = 0;
            for(let i = 0; i < count; i++)
            {
                ((i) => {
                    setTimeout(() => {
                        this.bridge.to([2]).emit(name, null, () => {
                            if (++done === count )
                            {
                                clearTimeout(timeout);
                                !timeout._called && this.printResult(name, t(name));
                            }
                        });
                    }, i)
                })(i);
            }

            return;
        }

        this.bridge.from(1).on(name, (data) => {
            data.ack();
        });
    }

    /**
     * Test ( worker -> single ) worker confirmation
     * feature
     */
    testWorkerToWorker() {
        let name  = "testWorkerToWorker";

        /**
         * Don't run this test from
         * all other instances of
         * the worker
         */
        if ( this.isSingle )
        {
            let timeout = this.timeout(1000, name);
            let descr   = "worker -> worker";
            this.printTest(name, descr);

            setTimeout(() => {
                t(name);

                /**
                 * @TODO: Allow one identifier
                 */
                this.bridge.to([2]).emit(name, null, () => {
                    clearTimeout(timeout);
                    !timeout._called && this.printResult(name, t(name));
                });
            }, 200);

            return;
        }

        this.bridge.from(1).on(name, (data) => {
            data.ack();
        });
    }

    /**
     * Test ( single -> master) worker confirmation
     * feature
     */
    testWorkerToMaster() {
        /**
         * Don't run this test from
         * all other instances of
         * the worker
         */
        if ( !this.isSingle )
        {
            return;
        }

        let name    = "testWorkerToMaster";
        let descr   = "worker -> master";
        let timeout = this.timeout(1000, name);

        this.printTest(name, descr);

        t(name);
        this.bridge.to(0).emit(name, null, () => {
            clearTimeout(timeout);
            !timeout._called && this.printResult(name, t(name));
        });
    }

    /**
     * Initializing methods
     */
    init() {
        console.log(`${"(worker:" + this.bridge.id +"):"} I am initializing.`);
    }

    bind() {
        this.bridge.from(0).on("testMasterToWorker", (data) => {
            data.ack();
        });

        this.bridge.from(0).on("testMasterToWorkers", (data) => {
            data.ack();
        });

        this.bridge.from(0).on("testMasterToWorkersStress", (data) => {
            data.ack();
        });
    }

    /**
     * Utils
     */
    printTest(name, description) {
        console.log(`(test): Testing: ${name}: ${description}`);
    }

    printResult(test, duration) {
        console.log(`(result)(${duration})(✓): ${test}`);
    }

    timeout(time, test) {
        return setTimeout(() => {
            console.log(`(result)(${time}.00ms)(x): ${test} has failed due of timeout.`);
        }, time);
    }
}
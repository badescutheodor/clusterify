import { t } from './utils'

/**
 * Master entity class declaration
 */

export default class {
    constructor(bridge) {
        this.bridge = bridge;

        this.init();
        this.bind();

        this.testMasterToWorker();
        this.testMasterToWorkers();
        this.testMasterToWorkersStress(100);
    }

    /**
     * Initializing methods
     */
    init() {
        console.log(`(master): I am initializing.`);
    }

    bind() {
        this.bridge.from(1).on("testWorkerToMaster", (data) => {
            data.ack();
        });
    }

    /**
     * Test ( master -> multiple ) message
     * passing duration
     */
    testMasterToWorkersStress(count) {
        let name    = "testMasterToWorkersStress";
        let descr   = "master -> workers";
        let timeout = this.timeout(1000, name);

        this.printTest(name, descr);

        t(name);

        let done = 0;
        for(let i = 0; i < count; i++)
        {
            ((i) => {
                setTimeout(() => {
                    this.bridge.to('*').emit(name, null, () => {
                        if (++done === count )
                        {
                            clearTimeout(timeout);
                            !timeout._called && this.printResult(name, t(name));
                        }
                    });
                }, i)
            })(i);
        }
    }

    /**
     * Test ( master -> multiple ) worker confirmation
     * feature
     */
    testMasterToWorkers() {
        let name    = "testMasterToWorkers";
        let descr   = "master -> workers";
        let timeout = this.timeout(1000, name);

        this.printTest(name, descr);

        t(name);
        this.bridge.to('*').emit(name, null, () => {
            clearTimeout(timeout);
            !timeout._called && this.printResult(name, t(name));
        });
    }

    /**
     * Test ( master -> single ) worker confirmation
     * feature
     */
    testMasterToWorker() {
        let name    = "testMasterToWorker";
        let descr   = "master -> worker";
        let timeout = this.timeout(1000, name);

        this.printTest(name, descr);

        t(name);
        this.bridge.to(1).emit(name, null, () => {
            clearTimeout(timeout);
            !timeout._called && this.printResult(name, t(name));
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
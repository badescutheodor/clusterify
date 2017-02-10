import clusterify from '../../src'
import http from 'http'

/**
 * Let's see if we can use the module to load balance
 * http web server
 */

const opts = {
    master: (bridge) => {
        let workers = [1, 2, 3, 4, 5, 6, 7, 8];

        http.createServer((req, res) => {
            let worker = workers.shift();
            workers.push(worker);

            bridge.from(worker).on('response', (data) => {
                data.ack();
                res.end(data.getPayload());
            });

            bridge.to(worker).emit("new:request");

        }).listen(3000);
    },

    workers: (bridge) => {
        bridge.from(0).on("new:request", () => {
            bridge.to(0).emit('response', `Worker with id ${bridge.id} says hello :)!`, () => {
                console.log('Everything\'s okay <3, I served the request.', bridge.id);
            });
        });
    }
};

(new clusterify(opts)).run();



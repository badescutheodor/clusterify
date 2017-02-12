import cruster from '../../src'
import http from 'http'
import os from 'os'

/**
 * Let's see if we can use the module to load balance
 * http web server
 */

const opts = {
    master: (bridge) => {
        let workers = [];

        for(let i = 0, len = os.cpus().length; i < len; i++)
        {
            if (i === 0 ) continue;
            workers.push(i);
        }

        http.createServer((req, res) => {
            let worker = workers.shift();
            workers.push(worker);

            bridge.to(worker).emit("new:request", null, (replies) => {
                res.end(replies.get(worker));
            });

        }).listen(3000);
    },

    workers: (bridge) => {
        bridge.from(0).on("new:request", (data) => {
            data.ack(`Everything\'s okay <3, I served the request: ${bridge.id}`);
        });
    }
};

(new cruster(opts)).run();



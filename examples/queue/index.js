import cruster from '../../src'

const opts = {
    master: () => {

    },
    workers: [
        {
            count: 1,
            handler: (bridge) => {
                console.log(`Queue with id ${bridge.id} initialized`);

                let tasks = [];

                for(let i = 0; i < 50000 * 100; i++)
                {
                    tasks.push(i);
                }

                let finished = false;
                console.time('queueComplete');

                setInterval(() => {
                    for(let i = 0; i < Math.floor(Math.random() * 100000); i++)
                    {
                        tasks.push(i);
                    }
                }, 1200);

                bridge.from('*').on('get:tasks', (data) => {
                    let chunk;

                    if ( tasks.length )
                    {
                        chunk = tasks.splice(0, ( 1000 > tasks.length ? tasks.length : 1000 ));
                    }
                    else if ( finished )
                    {

                    }
                    else
                    {
                        finished = true;
                        console.timeEnd('queueComplete');
                    }

                    data.ack(chunk);
                });

                setInterval(() => {
                    console.log(`Queue: ${bridge.id}, items remaining: `, tasks.length);
                }, 1000);
            }
        },

        {
            count: 7,
            handler(bridge) {
                console.log(`Worker with id ${bridge.id} initialized`);

                let doWork = () => {
                    let queue = Math.floor(Math.random() * 1) + 1;
                    bridge.to(queue).emit('get:tasks', null, (data) => {
                        let tasks = data.get(queue) || [];

                        for(var i = 0; i < tasks.length; i++)
                        {
                            //
                        }

                        if ( !tasks.length )
                        {
                            setTimeout(() => doWork(), 1000);
                        }
                        else
                        {
                            doWork();
                        }
                    });
                }

                doWork();
            }
        }
    ]
};

new cruster(opts).run();
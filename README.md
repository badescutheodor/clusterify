# cruster
Node.js wrapper on top of the cluster module used for handling workers intercommunication in an easy manner. Please note that I am the only maintainer but I am willing to help with any issue that may appear. Also, I am open for PRs so if you have any improvement you are welcome to pull request.

Also, before you continue, please note that IPC has its own limitations so please try to make the data sent between workers / master as small as possible and try not to flood it channel too much as the node's process could freeze leaving the application unusable.

## Usage

### Getting Started
The below code snippet is used to create a cluster environment. Note that the code from within the master is only run once while the workers code is run by how many workers are specified. In this case it **defaults to how many cores the machine has**.

```javascript
var cruster = require('cruster');
var opts    = {};

opts.master = function(bridge) {

};

opts.workers = function(bridge) {

};

new cruster(opts).run();
```

### Communication
To communicate between workers and master you may use the bridge object following the below syntax.

#### worker -> master

```javascript
var cruster = require('cruster');
var opts    = {};

opts.master = function(bridge) {
    bridge.from('*').on('test', function(data) {
        // This method will be called times how many
        // cores your cpu has because the workers count
        // defaults to the core number
    });
    
    bridge.from(1).on('test2', function(data) {
        // This event will be called only when the
        // test2 message comes from worker with bridge.id == 1
    });
};

opts.workers = function(bridge) {
    bridge.to(0).emit('test', null);
    bridge.to(0).emit('test2', null);
};

new cruster(opts).run();
```

#### worker -> worker
The worker to worker communication is being handled by the master process. Messages get through the master process and get rerouted to the worker process.

```javascript
var cruster = require('cruster');
var opts    = {};

opts.master = function(bridge) {

};

opts.workers = function(bridge) {
    if ( bridge.id === 1)
    {
        // Send data to worker with id 2
        bridge.to(2).emit('test', null);
    }
    
    if ( bridge.id === 2 )
    {
        bridge.from(1).on('test', function(data) {
            // Worker with id 2 got data from worker with id 1
        });
    }
};

new cruster(opts).run();
```

#### acknowledgement
You may specify a third parameter inside the emit function call that will be called after the worker(s) has/have
acknowledged the request. Note that this will increase the messages sent through IPC greatly.

```javascript
var cruster = require('cruster');
var opts    = {};

opts.master = function(bridge) {

};

opts.workers = function(bridge) {
    if ( bridge.id === 1)
    {
        // Send data to worker with id 2
        bridge.to(2).emit('test', null, function(replies) {
            console.log(replies.get(2)); // Reply from worker with id 2
        });
    }
    
    if ( bridge.id === 2 )
    {
        bridge.from(1).on('test', function(data) {
            // Worker with id 2 got data from worker with id 1
            data.ack('Response');
        });
    }
};

new cruster(opts).run();
```
## Configuration
For handling more complex configurations file paths to workers can be specified.

```javascript
var cruster = require('cruster');
var opts    = {
    master: './master.js',
    workers: './worker.js'
};

new cruster(opts).run();
```

You can also specify the number of workers through the **count** property from inside the workers configuration:

```javascript
var cruster = require('cruster');
var opts    = {
    master: './master.js',
    workers: {
        handler: './worker.js',
        count: 4 // Spawns 4 workers using file with path ./worker.js
    }
};

new cruster(opts).run();
```

Or even separate the workers roles by specifying an workers array:

```javascript
var cruster = require('cruster');
var opts    = {
    master: function(bridge) {
        // You may also pass functions instead of 
        // file paths for both workers and master
    },
    workers: [ // These will be 3 workers
        {
            handler: './worker.js',
            count: 2
        },
        {
            handler: function(bridge) {
            
            }
        }
    ]
};

new cruster(opts).run();
```

You may also specify functions to run before and after the master process has initialized using the
**before** and **after** options:

```javascript
var cruster = require('cruster');
var opts    = {
    master: {
        handler: './master.js',
        before: function() {
            // before initialization
        },
        after: function() {
           // after initialization 
        }
    },
    workers: {
        handler: './worker.js',
        count: 4 // Spawns 4 workers using file with path ./worker.js
    }
};

new cruster(opts).run();
```

#### Debug
It's pretty difficult to debug a multi process application and that's why you can use the ***debug*** for getting a view on what events are being bind or the flow of the messages.

```javascript
var cruster = require('cruster');
var opts    = {
    debug: true,
    master: './master.js',
    workers: './worker.js'
};

new cruster(opts).run();
```
/**
 * The actual storage
 * @type {{}}
 */
const storage = {};


export default class {
    constructor() {

    }

    get(key, callback) {
        if ( storage.hasOwnProperty(key) )
        {
            callback(null, storage[key]);
            return;
        }

        callback(null);
    }

    del(key, callback) {
        if ( storage.hasOwnProperty(key) )
        {
            delete storage[key];
            callback && callback(null, true);
            return;
        }

        callback && callback(null, false);
    }

    set(key, value, callback) {
        if ( storage.hasOwnProperty(key) )
        {
            storage[key] = value;
            callback && callback(null, storage[key]);
            return;
        }

        storage[key] = value;
        callback && callback(null, storage[key]);
    }
}
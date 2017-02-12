/**
 * Utility functions for the tests
 */

// Function for handling string colors
export const c = (() => {
    let colors = {
        cyan:   '\x1b[36m%s\x1b[0m',
        yellow: '\x1b[33m%s\x1b[0m',
        green:  '\x1b[32m%s\x1b[0m',
        red:    '\x1b[31m%s\x1b[0m'
    };

    let colorizers = {};

    for(let color in colors) {
        colorizers[color] = (str) => {
            return colors[color].replace("%s", str);
        }
    }

    return colorizers;
})();

// Function to handle performance measurements
const starts   = {};
export const t = (identifier) => {
    if ( !starts[identifier] )
    {
        starts[identifier] = process.hrtime();
        return;
    }

    let elapsed = process.hrtime(starts[identifier])[1] / 1000000;

    delete starts[identifier];
    return elapsed.toFixed(2) + 'ms';
}
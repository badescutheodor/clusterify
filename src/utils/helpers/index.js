/**
 * Function for measuring sizeof objects
 *
 * @param object
 * @returns {*}
 */
export const sizeof = (object) => {
    let objects = [];

    function transverse(value) {
        var bytes = 0;

        switch ( true )
        {
            case ( typeof value === 'boolean' ):
            {
                bytes = 4;
            } break;

            case ( typeof value === 'string' ):
            {
                bytes = value.length * 2;
            } break;

            case ( typeof value === 'number' ):
            {
                bytes = 8;
            } break;

            case ( typeof value === 'object'
                   && objects.indexOf( value ) === -1 ):
            {
                objects[objects.length] = value;

                for( let i in value )
                {
                    bytes += 8;
                    bytes += transverse(value[i]);
                }
            } break;
        }

        return bytes;
    }

    return transverse(object);
}
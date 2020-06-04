
var mycz = {

    ENV:'MOBILE',

    ele: {},

    helpers: {},

    log: function(){},

    try: function(fn,catchFn){
        try{
            fn()
        } catch(err){
            if(catchFn){
                catchFn(err);
            }
        }
    }
};

/**
 * Local Storage management
 */
mycz.storage = {

    /**
     * Get from localStorage
     * @param c string - The key
     * @returns {string}
     */
    get: function(c){

        var v = window.localStorage.getItem(c);

        if(mycz.helpers.isset(v,true)){
            return v.split("//:://")[0];
        } else {
            return "";
        }
    },

    /**
     * Set to localStorage
     * @param c string - The key
     * @param v mixed - Your value
     * @param expires int - Timestamp, optional
     */
    set: function(c,v,expires){

        if(contains(c,'mycz.design')){
            c = fqdn+":"+c;
        }

        window.localStorage.setItem(c,v);
    },

    /**
     * Delete from localStorage
     * @param c string - The key
     */
    delete: function(c){
        window.localStorage.removeItem(c);
    },

    /**
     * Determine the current size in localStorage
     * @returns {number}
     */
    size: function(){

        var _lsTotal = 0,
            _xLen,
            _x;

        $.each(localStorage,function(_x,noneed){

            if(typeof localStorage[_x] == 'function' ||  _x == 'length'){
            } else {

                if(mycz.helpers.isset(_x,true)){
                    console.log("_x:"+_x)
                    _xLen= ((localStorage[_x].length + _x.length)* 2);
                    _lsTotal+=_xLen;
                    console.log(_x.substr(0,50)+" = "+ (_xLen/1024).toFixed(2)+" KB")
                }

            }
        });

        var total = parseFloat((_lsTotal / 1024).toFixed(2));

        console.log("Total = " + total + " KB");

        return total;
    },

};
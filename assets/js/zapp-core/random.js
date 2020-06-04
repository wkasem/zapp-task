
/**
 * Create some random things
 */
var random = {

    /**
     * Creates a random string with defined length
     * @param {int} length
     * @returns {string}
     */
    string: function(length) {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = 8;
        if(length != undefined && length != '') string_length = length;
        var randomstring = random.konst(1); //DO NOT CHANGE THIS
        for (var i=1; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum,rnum+1);
        }
        return randomstring;
    },

    /**
     * Creates a random number with defined length
     * @param {int} l length
     * @returns {string}
     */
    number: function (l){
        l = l || 1;
        var chars = "0123456789";
        var string_length = l;
        var randomstring = '';
        for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum,rnum+1);
        }
        return randomstring;
    },

    /**
     * Creates a random number within defined range
     * @param {int} min minimum number
     * @param {int} max maximum number
     * @returns {string}
     */
    maxNumber: function(min,max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Creates a random "vokal" (used for pseudo-usernames)
     * @returns {string}
     */
    vokal: function (){
        var chars = "aeiou";
        var r = '';
        for (var i=0; i<1; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            r += chars.substring(rnum,rnum+1);
        }
        return r;
    },

    /**
     * Creates a random "konst" (used for pseudo-usernames)
     * @returns {string}
     */
    konst: function(){
        var chars = "bcdfghklmnpqrstvwxyzBCDFGHKLMNPQRSTVWXYZ";
        var r = '';
        for (var i=0; i<1; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            r += chars.substring(rnum,rnum+1);
        }
        return r;
    },

    /**
     * Creates a readable random username with two numbers
     * @returns {string}
     */
    name: function(){
        var n = random.konst()+random.vokal()+random.konst()+random.vokal()+random.konst()+random.vokal()+random.konst()+random.vokal()+""+random.number(2);
        return n.capitalize();
    },

    /**
     * Creates a readable random username
     */
    previewName: function(){
        var n = random.konst()+random.vokal()+random.konst()+random.vokal()+random.konst()+random.vokal()+random.konst()+random.vokal();
        return n.toLowerCase().capitalize();
    },

    /**
     * Returns a random-animation
     * @param bounce
     * @returns {string}
     */
    animation: function(bounce){
        var $max = 4;
        var $arr = ['fadeIn','fadeInLeft','fadeInDown','fadeInUp','fadeInRight'];
        if(bounce==true){
            $arr = ['bounceIn','bounceInleft','bounceInDown','bounceInUp','bounceInRight'];
        } else {
            if(mycz.helpers.isset(bounce,true)){
                $arr = bounce;
                $max = bounce.length-1;
            }
        }
        return $arr[random.maxNumber(0,$max)];
    },

    /**
     * Random Delay Class
     * @returns {string}
     */
    delay: function(){
        return "random-delay-duration random-delay-"+random.maxNumber(1,5);
    },

    /**
     * Return a product key like XHA11-KJQQW-QQQ8J-HIOK2
     * @returns {string}
     */
    productKey: function(){

        var key1 = random.string(5).toUpperCase(),
            key2 = random.string(5).toUpperCase(),
            key3 = random.string(5).toUpperCase(),
            key4 = random.string(5).toUpperCase();

        return key1+'-'+key2+'-'+key3+'-'+key4;

    }
};

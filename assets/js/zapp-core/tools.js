
/**
 * Some useful tools
 */
var tools = {

    /**
     * Get a random string (equal to random.string)
     * @param _length
     * @returns {string}
     */
    rand_string: function(_length) {
        return random.string(_length);
    },

    /**
     * Get a random number (equal to random.number)
     * @param l
     * @returns {*|string}
     */
    rand_number: function(l) {
        return random.number(l);
    },

    /**
     * Get a number within a range (equal to random.maxNumber)
     * @param start
     * @param end
     * @returns {*|string}
     */
    rand_number_ranged: function(start,end){
        return random.maxNumber(start,end);
    },
    readURL: function(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                $(input).parent().find('.preview').attr('src', e.target.result);
                //personImage = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }
};
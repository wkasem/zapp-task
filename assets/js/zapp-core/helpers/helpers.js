
/**
 * Parse a string or an object with different languages
 * Will get automatically the right text.
 * @param t
 * @param failLabel
 * @returns {*}
 */
mycz.helpers.getText = function (t, failLabel, failLocale) {

    var $lang = window.languages.activeLang;

    if (mycz.helpers.isset(t, true)) {

        if (t == '{}') {
            return '';
        }

        if (contains(t, '{') && contains(t, '}')) {

            var trying = mycz.helpers.json.parse(t);

            if (Object.keys(trying).length > 0) {
                t = trying;
            } else {

                trying = mycz.helpers.json.parse(t, true);

                if (Object.keys(trying).length > 0) {
                    t = trying;
                }

            }
        }

        if (mycz.helpers.isObject(t)) {

            if (t[$lang]) {
                return t[$lang];
            }

            if (t['en']) {
                return t['en'];
            }

            if (t['de']) {
                return t['de'];
            }

            return '';
        }

        if (failLabel == true) {
            return label(t);
        }

        if (failLocale == true) {
            return locale(t);
        }

        return t;
    }
    return '';
};

/**
 * Our own isset function - use always this.
 * Guaranteed that you will know if something is-set or not.
 * @param v
 * @param notNull
 * @param notFalse
 * @returns {boolean}
 */
mycz.helpers.isset = function (v, notNull, notFalse) {
    try {
        if (v !== undefined && v !== '') {
            if (notNull === true && v === null) {
                return false;
            }
            if (v === false && notFalse == true) {
                return false;
            }
            return true;
        }
    } catch (err) {
        return false;
    }
    return false;
};

/**
 * Guarantee that you re not try to access null or undefined value 
 * @param value
 * @param defaultValue
 * @returns {value | defaultValue}
 */
mycz.helpers.default = function (value, defaultValue) {
    return mycz.helpers.isset(value) ? value : defaultValue;
};

/**
 * An easy function to split without beeing afraid to have a
 * "cannot split of undefined" error message ;-)
 * @param v
 * @param needle
 * @param returnArray
 * @returns {*}
 */
mycz.helpers.split = function (v, needle, returnArray) {
    try {
        if (v !== undefined && v !== '' && v !== null) {
            v = v.toString();
            return v.split(needle);
        } else {
            if (returnArray == true) return [];
            return '';
        }
    } catch (err) {
        if (returnArray == true) return [];
        return '';
    }
    if (returnArray == true) return [];
    return '';
};

/**
 * Transforming unknown data to "" - to be sure,
 * it's not null or undefined
 * @param data
 * @returns {*}
 */
mycz.helpers.notNull = function (data) {
    if (data === null || data === undefined) {
        return '';
    } else {
        return data;
    }
};

/**
 * Helpers to parse and stringify json
 * Use them, to ensure to get an object, even if data may not be a json-string
 */
mycz.helpers.json = {

    /**
     * Parsing a JSON-String to an object.
     * Checks first, if current value is already an object (prevent double parsing).
     * @param json
     * @param stripslashes
     * @param returnArrayOnFail boolean use to return an array instead of an object when failing
     * @returns {*}
     */
    parse: function (json, stripslashes, returnArrayOnFail) {
        try {
            if (mycz.helpers.isset(json, true)) {
                if (mycz.helpers.isObject(json) == true || mycz.helpers.isArray(json) == true) {
                    return json;
                }
                if (stripslashes == true) {
                    return JSON.parse(json.replace(/\\/g, ''));
                } else {
                    var r = JSON.parse(json);
                    return mycz.helpers.isObject(r) ? r : {};
                }
            } else {
                throw new Error('Value unset returning {}');
            }
        } catch (err) {
            if (returnArrayOnFail == true) {
                return []
            }
            return {};
        }
        if (returnArrayOnFail == true) {
            return [];
        }
        return {};
    },

    /**
     * Stringify JSON
     * @param obj
     */
    stringify: function (obj) {
        return JSON.stringify(obj);
    }
};

/**
 * Checks if value is an object
 * @param obj
 * @returns {boolean}
 */
mycz.helpers.isObject = function (obj) {
    if (!mycz.helpers.isset(obj, true)) {
        return false;
    }
    if (typeof obj === 'object') {
        return true;
    }
    return false;
};

/**
 * Checks if a value is a string
 * @param obj
 * @returns {boolean}
 */
mycz.helpers.isString = function (obj) {
    if (typeof obj === 'string') {
        return true;
    }
    return false;
};

/**
 * Checks if value is a function
 * @param fn
 * @returns {boolean}
 */
mycz.helpers.isFunction = function (fn) {
    return $.isFunction(fn);
};

/**
 * Checks if value is an array
 * @param arr
 * @returns {boolean}
 */
mycz.helpers.isArray = function (arr) {
    if ($.isArray(arr)) {
        return true;
    }
    return false;
};

/**
 * Checks if value is a number
 * @param n
 * @returns {boolean}
 */
mycz.helpers.isNumber = function (n) {
    if (isNaN(n)) {
        return false;
    }
    return true;
};

/**
 * Checks if value is an even-number
 * @param n
 * @returns {boolean}
 */
mycz.helpers.isEven = function (n) {
    return !(n % 2);
};

/**
 * Checks if value is an odd-number
 * @param n
 * @returns {number}
 */
mycz.helpers.isOdd = function (n) {
    return (n % 2);
};

/**
 * Checks if element is in visible view of a container
 * @param container
 * @param elem
 * @returns {boolean}
 */
mycz.helpers.isVisible = function (container, elem) {
    try {
        return $(elem).offset().top > container.scrollTop() && (container.scrollTop() + container.height() >= $(elem).offset().top);
    } catch (err) { }
    return false;
};

/**
 * Multiple array-helper-functions
 */
mycz.helpers.array = {

    /**
     * Checks if an array contains a value
     * @param array
     * @param value
     * @param like boolean use to check if a similar value is existing
     * @returns {boolean}
     */
    contains: function (array, value, like, isNumeric) {

        if (!mycz.helpers.isArray(array)) {
            return false;
        }

        if (like != true && isNumeric != true) {
            if (array.indexOf(value) !== -1) {
                return true;
            }
            return false;
        }

        var found = false;
        var arr_length = array.length;

        for (var i = 0; i < arr_length; i++) {

            if (like == true) {

                if (contains(array[i], value)) {
                    found = true;
                    break;
                }

            } else {
                if (value == array[i]) {
                    found = true;
                    break;
                }
            }

        }
        return found;
    },

    /**
     * Remove a value from an array
     * @param array
     * @param value
     * @returns {*}
     */
    removeByValue: function (array, value) {
        mycz.try(function () {
            var index = array.indexOf(value);
            if (index != -1) {
                array.splice(index, 1);
            }
        });
        return array;
    },

    /**
     * Remove an entry from an array by the index number
     * @param array array
     * @param index int
     * @returns {*}
     */
    removeByIndex: function (array, index) {
        mycz.try(function () {
            if (index != -1) {
                array.splice(index, 1);
            }
        });
        return array;
    },

    /**
     * Transform an array to an object
     * @param array
     * @returns {{}}
     */
    toObj: function (array) {
        var array_length = array.length;
        var obj = {};
        for (var i = 0; i < array_length; i++) {
            obj[array[i]] = true;
        }
        return obj;
    },

    /**
     * Some sorting functions for arrays
     */
    sort: {

        /**
         * Resort an array reverse
         * @param array
         * @returns {Array.<T>}
         */
        desc: function (array) {
            array = mycz.helpers.isArray(array) ? array : [];
            return array.reverse();
        },
    }
};


/**
 * limiting function calls be time periods  
 * @param func callback , func to be eventually called
 * @param wait Number , how much to wait after last call 
 * @param immediate Boolean , whether to call the function immediately or not 
 * @returns {function}
 */

mycz.helpers.debounce = function (func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}
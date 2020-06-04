
/**
 * Stop the code
 * @param text
 */
function javascript_abort(text) {
    throw new Error(text);
}

/**
 * Get the mobile OS
 * @returns {*}
 */
function getMobileOS() {
    try{
        if(isCordovaApp==true){ return platform; }
        var userAgent = navigator.userAgent||navigator.vendor||window.opera;
        if(/android/i.test(userAgent)){ return "ANDROID"; };
        if(/iPad|iPhone|iPod/.test(userAgent)&& !window.MSStream){ return "IOS"; };
    } catch(err){ return ""; };
}

/**
 * Check if is Mobile + Safari
 * @returns {boolean}
 */
function isMobileSafari() {
    if(navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)){
        return true;
    }
    return false;
}

/**
 * Checkes if is IOS and App
 */
function isMobileAppIOS(){

    if(!window.isCordovaApp){
       return false;
    }

    if(window.isCordovaApp == true){
        if(window.platform == 'IOS'){
            return true;
        }
    }

    return false;

}

/**
 * Check if is IE
 * @returns {boolean}
 */
function isInternetExplorer() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        return true;
    }
    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        return true;
    }
    return false;
}

/**
 * Check if Firefox
 * @returns {boolean}
 */
function isFirefox() {
    if(navigator.userAgent.indexOf("Firefox") > 0) {
        return true;
    }
    return false;
}

/**
 * Check if is Edge
 * @returns {boolean}
 */
function isEdge() {
    if(navigator.userAgent.indexOf("Edge") > 0) {
        return true;
    }
    return false;
}

/**
 * Check if is one of the old IE
 * @returns {boolean}
 */
function isIEold(){
    if(navigator.userAgent.indexOf("MSIE") > 0) {
        return true;
    }
    return false;
}

/**
 * Check if is one of the new IE
 * @returns {boolean}
 */
function isIEnew(){
    if(navigator.userAgent.indexOf("Trident/") > 0) {
        return true;
    }
    return false;
}

/**
 * Check if is desktop size
 * @returns {boolean}
 */
function isDesktop(){
    return $(window).width() > 1024;
};

/**
 * Checks an object if has cycling
 * entries (you cannot stringify such objects)
 * @param obj object
 */
function isCyclic (obj) {
    var seenObjects = [];

    function detect (obj) {
        if (obj && typeof obj === 'object') {
            if (seenObjects.indexOf(obj) !== -1) {
                return true;
            }
            seenObjects.push(obj);
            for (var key in obj) {
                if (obj.hasOwnProperty(key) && detect(obj[key])) {
                    console.log(obj, 'cycle at ' + key);
                    return true;
                }
            }
        }
        return false;
    }

    return detect(obj);
}

/**
 * Capitalize a string
 * @param string
 * @returns {*}
 */
function capitalize(string){
    try {
        return string.charAt(0).toUpperCase() + string.slice(1);
    } catch(err){
        return string;
    }
}

/**
 * Get a URL Parameter
 * @param sParam
 * @returns {boolean}
 */
function getUrlParameter(sParam){

    /**
     * window.$PARAMETERS can "fake" URL Parameters
     * (used in Mobile App)
     */
    if(window.$PARAMETERS){
        if(window.$PARAMETERS[sParam]){
            return window.$PARAMETERS[sParam];
        }
    }

    try {
   //     throw new Error('disabled temporarly');

        var url = new URL(window.location.href);

        var r = url.searchParams.get(sParam);
        return r == null ? undefined : (r == '' ? true : r);

    } catch(err){

        /**
         * IE 11 doesnt support "new URL"
         */

        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;
        for (var i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    }

}

/**
 * Check if a string contains a value
 * @param string string - Your string
 * @param search string - The value to check if is existing in the string
 * @param wordmatch boolean - If enabled, a word inside the string can also match
 * @param not_casesensitive boolean - If enabled, will ignore case-sensitive
 * @returns {boolean}
 */
function contains(string,search,wordmatch,not_casesensitive){

    try {
        if(string===undefined||string===null||string===false) {
            return false;
        }

        if(not_casesensitive == true){
            string = string.toLowerCase();
            search = search.toLowerCase();
        }

        if(wordmatch==true){

            string = string == null || string == undefined ? '' : string;
            return string.split(" ").indexOf(search) != -1;

        } else {

            if(string.indexOf(search) !== -1){
                return true;
            }

        }

    } catch(err){
        return false;
    }

    return false;
}

/**
 * Check if a string contains a number
 * @param myString string - Your string
 * @returns {boolean}
 */
function contains_number(myString) {
    return /\d/.test(myString);
}

/**
 * Check if a string contains an alphabetical letter
 * @param myString string - Your string
 * @returns {boolean}
 */
function contains_alphabetical(myString){

    myString = myString == null ? '' : myString;
    myString = myString == undefined ? '' : myString;

    if (/[a-zA-Z]/.test(myString)) {
        return true;
    }
    return false;
}

/**
 * Check if a value is a number
 * @param n int - Your number
 * @returns {boolean}
 */
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Encode a string (link or whater)
 * @param val string - Your string
 * @param reverse boolean - If enabled, will decode
 * @returns {string}
 */
function enc(val,reverse){
    if(reverse==true){
        return decodeURIComponent(val);
    }
    return encodeURIComponent(val);
}

/**
 * Decode a string (link or whater)
 * @param input string - Your string
 * @returns {*}
 */
function denc(input){
    input = input == null ? '' : input;
    input = input == undefined ? '' : input;
    try{
        var doc = new DOMParser().parseFromString(input,"text/html");
        return doc.documentElement.textContent;
    } catch(err){
        return input;
    }
}

/**
 * Remove <script> tags etc. from a string
 * @param text
 * @returns {*}
 */
function clean(text){
    try {
        return $.trim(text.replace(/(<\?[a-z]*(\s[^>]*)?\?(>|$)|<!\[[a-z]*\[|\]\]>|<!DOCTYPE[^>]*?(>|$)|<!--[\s\S]*?(-->|$)|<[a-z?!\/]([a-z0-9_:.])*(\s[^>]*)?(>|$))/gi, ''));
    } catch(err){
        return $.trim(text);
    }
}

/**
 * Open a link, in mobile app we try
 * to use browserTab
 * @param link string - Your link
 */
function external(link){

    try {
        if(window.isCordovaApp == true){
            if(window.cordova){
                if(cordova.plugins){
                    if(cordova.plugins.browsertab){
                        cordova.plugins.browsertab.isAvailable(function(result) {
                                if (!result) {
                                    window.open(link, '_blank','location=no');
                                } else {
                                    cordova.plugins.browsertab.openUrl(
                                        link,
                                        function(successResp) {},
                                        function(failureResp) {
                                            error.textContent = "failed to launch browser tab";
                                            error.style.display = '';
                                        });
                                }
                            },
                            function(isAvailableError) {
                                error.textContent = "failed to query availability of in-app browser tab";
                                error.style.display = '';
                            });
                    }
                }
            }
        } else {
            window.open(link, '_blank','location=no');
        }
    } catch(err){
        window.open(link, '_blank','location=no');
    }

}
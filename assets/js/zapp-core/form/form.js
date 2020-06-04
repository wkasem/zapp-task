
/**
 * A new consolidated form-function.
 * U must create a new instance: var f = new mycz.form();
 *
 * @param title string - The title of the form
 * @param cols object - A list of entries for the form, incl. form-types
 * @param data object - Current data
 * @param groups object - Group the form
 * @param callback function - Callback after saving and passing validation
 * @param isEdit boolean - Will change the buttons accordingly
 * @param args object - Additional arguments, see documentation
 * @returns {mycz}
 */
mycz.form = function(title,cols,data,groups,callback,isEdit,args){

    var self = this;

    args = mycz.helpers.isset(args,true) ? args : {};
    data = mycz.helpers.isset(data,true) ? data : {};
    isEdit = isEdit == true;

    /**
     * With specific_cols we strip out columns
     * and display only them
     */
    if(args.specific_cols){
        if(mycz.helpers.isset(args.specific_cols,true,true)){
            var new_cols = {};
            $.each(args.specific_cols,function(nn,c){
                new_cols[c] = cols[c];
            });
            cols = new_cols;
            groups = '';
            args.groups_left = false;
        }
    }

    this.title = title;

    var my_id = random.string(20);

    /**
     * Environment specific functions
     * @type {{message: mycz.toast.new}}
     */
    this.env = {
        MOBILE: {
            message: mycz.toast.new,
            'picture.get': window.picture ? picture.get : '',
        },
        ADMIN: {
            message: mycz.toast.new,
            'picture.get': mycz.gallery ? mycz.gallery.api.picture.get : '',
        }
    };

    /**
     * Call an environment-based function
     * @param fn
     * @returns {*}
     */
    this.envFunction = function(fn){
        if(this.env[mycz.ENV][fn]){
            return this.env[mycz.ENV][fn];
        } else {
            console.warn("missing env function : "+fn);
        }
    };

    this.isMobile = $(window).width() < 911;
    this.current = {};

    /**
     * Will create an index for dependencies
     * @type {{dependentFromMe: {}, dependent: {}}}
     */
    this.dependencyIndex = {
        dependentFromMe: {},
        dependent: {}
    };

    /**
     * Overriding values & cols for collection (used in rows-type or json-cols)
     */
    this.override_current_values = null;
    this.override_current_cols = null;

    /**
     * Upload-fields automatically
     * upload on triggering collect
     */
    this.onCollectUploadFiles = true;

    /**
     * Show errors when collecting
     */
    this.onCollectShowErrors = args.no_errors == true ? false : true;

    /**
     * On Create, input fields and textarea triggers a keyUp
     */
    this.onCreateTriggerKeyUp = true;

    /**
     * When we create the form, we dont trigger "onChange" event.
     * This gets enabled after initial setup the form (f.show());
     */
    this.triggerOnChange = false;

    if(args.trigger_on_change == true){
        this.triggerOnChange = true;
    }

    /**
     * Used for rows: When user selects and its adding the sub-form-entries,
     * we switch to "new"
     */
    this.isNew = false;

    /**
     * Error collector
     */
    this.errors = [];
    this.popup = null;

    this.container = mycz.ele.div('block w-100 fleft').css("padding-bottom",(args.container_no_padding == true ? '0px' : "100px"));

    this.$HIDDEN_CONTAINER =   mycz.helpers.isset(groups,true,true) && args.speed_up == true
                            || mycz.helpers.isset(groups,true,true) && args.step_system == true ? mycz.ele.div('block w-100 fleft') : null; //TEST

    this.group_container = null;

    this.getCols = function(){
        return cols;
    };

    /**
     * We can go deep into a json-string
     * finding values and attributes easily
     * See type = json -> jsonData
     * @type {null}
     */
    this.json_deepness = null;

    /**
     * If a form-entry has "required = true",
     * we store here the value when a user is typing.
     * @type {{}}
     */
    this.keyUps = {};

    /**
     * Focusing follows the user, and register the
     * current focused form element - Used for sharing
     */
    this.enable_focusing = function(user_id){
        self.focus_id = user_id;
        self.focusing[user_id] = {};
        self.enable_focusing = setInterval(function(){
            var n = 0;
            $.each(self.focusing,function(i,ele){
                self.container.find("div[data-focus-by='"+n+"']").removeAttr("data-focus-by").removeClass("share-focused");
                self.container.find("div[data-col='"+ele+"']").addClass("share-focused").attr("data-focus-by",n);
                n++;
            })
        },1000);
    };
    this.focus = function(ele){
        if(self.focus_id != null){
            self.focusing[self.focus_id] = ele;
            self.onChange();
        }
    };
    this.focus_id = null;
    this.focusing = {};


    /**
     * Testing sharing forms
     * @param callback
     */
    this.shared = false;
    this.share = function(additional_data,callback){
        /**
         * First we collect all data fresh
         */
        self.onCollectUploadFiles = false;
        self.onCollectShowErrors = false;
        self.collect(function(data){

            var $FB = new mycz.firebase.database();
            var ref = mycz.firebase.getUniqueRefLink();

            var id = random.string(5);

            var obj = {
                data:mycz.helpers.json.stringify(data),
                cols:mycz.helpers.json.stringify(cols),
                title:title,
                focusing:self.focusing,
                args:additional_data,
                id: id
            };
            $FB.expose().create(ref,obj,function(k,obj){
                self.shared = true;
                callback(ref,obj,id);
            })
        });
    };

    this.save_container = this.container;

    /**
     * An api to collect data for custom usage
     * @returns {*|{}}
     */
    this.collect = function(callback){
        self.errors = [];
        self.steps.collect_data((self.popup != null ? self.popup : self.container),1,callback);
    };

    /* Trigger the callback */
    this.callback = function(){
        self.collect(callback);
    };

    /**
     * Everytime a value changes
     */
    this.onChange = function(last_changed_element){};

    /* When canceling, trigger this */
    this.onCancel = function(){};

    /* When deleting, trigger this */
    this.onDelete = function(){};

    this.onDeleteCondition = function(){ return true };

    /* When showing modal, trigger this */
    this.onShow = function(){};

    /* Close Popup */
    this.close = function(){
        mycz.modal.close(self.popup,true);
    };

    /* Hide specific elements based on colnames */
    this.hide = function(arr){
        $.each(arr,function(nn,col){
            self.container.find("div.mycz-form-block[data-col='"+col+"']").addClass("force-hide");
        });
        $.each(groups,function(id,vals){
            var has_at_least_one = false;
            $.each(vals.collection,function(nn,v){
                has_at_least_one = self.container.find("div.mycz-form-block[data-col='"+v+"']:not(.force-hide)").length > 0 ? true : has_at_least_one;
            });
            if(has_at_least_one == false){
                self.container.find("div.form-head a[data-group-id='"+id+"']").remove();
            }
        });
        if(self.container.find("div.form-head a.button-dark[data-group-id]").length==0){
            self.container.find("div.form-head a.button-grey[data-group-id]:first").trigger("click");
        }
    };

    /**
     * Go on with the popup *
     * @param attributes object will be added to the popup
     */
    this.show = function(attributes){

        if(this.isShown == true){
            return;
        }

        /**
         * Click the first tab in the group
         */
        if(self.group_container != null) {
            if(self.$HIDDEN_CONTAINER != null){
                setTimeout(function () {
                    self.group_container.find("a.button-grey:first").trigger("click");
                }, 50);
            } else {
                self.group_container.find("a.button-grey:first").trigger("click");
            }
        }

        this.isShown = true;

        args.top_buttons = self.top_buttons;

        self.popup = mycz.modal.new(title,(self.save_container),(args.cancel === false ? false : true),self.btns,function(){
            self.onCancel();
        },args);

        self.popup.attr("data-form-id",my_id);

        /**
         * Additional attributes can be passed
         * when showing the form
         */
        if(mycz.helpers.isset(attributes,true)){
            $.each(attributes,function(k,v){
                self.popup.attr(k,v);
            });
        }

        /**
         * All elements with "append-me-to-footer"-class will be moved
         */
        self.popup.find(".append-me-to-footer").appendTo(self.popup.find("div.mycz-modal-footer > div:nth-child(2)"));

        /**
         * Triggering onShow function
         */
        self.onShow(self.popup);

        /**
         * When desktop, and is edit mode and has delete-button,
         * we set a margin on the first button. Otherwise it's looking strange.
         */
        if(self.popup.find("div.mycz-modal-footer div.mycz-form-block[data-col='deleted']").length>0){
            if($(window).width()>992){
                self.popup.find("div.mycz-modal-footer a.zapp-btn.createInsert").css("margin-left",'-80px');
            }
        }

        /**
         * Setting to listen on changes
         */
        setTimeout(function(){
            self.triggerOnChange = true;
        },200);

    };

    /**
     * Copy a block of the form
     * @param colname
     */
    this.copyBlock = function(colname){
        return self.container.find("div.mycz-form-block[data-col='"+colname+"']").copy(true,true);
    };

    /* Add a button (before trigger show()) */
    this.addBtn = function(b,clickFn,inSeperateRow){
        if(inSeperateRow == true){
            this.top_buttons.push(b.click(function(){
                clickFn($(this),self.steps.collect_data(self.container,1));
            }));
        } else {
            this.btns.unshift(b.click(function(){
                clickFn($(this),self.steps.collect_data(self.container,1));
            }))
        }

    };

    /**
     * Will redesign the "Create/Save" Button
     * @param btn_color
     * @param btn_icon
     * @param btn_title
     */
    this.recreate_create_btn = function(btn_color,btn_icon,btn_title){
        this.btns[0] = mycz.ele.btn('button '+btn_color,btn_title+' '+mycz.ele.icon(btn_icon),function(){
            self.callback();
        });
    };
    this.recreate_create_button = self.recreate_create_btn;

    /**
     * Form Helpers
     */
    this.helpers = {

        /**
         * Get the default value for a form type.
         * This goes through the data passed, then checks if there is
         * a defaultValue parameter.
         * @param val
         */
        getDefaultValue: function(val){
            switch(true){
                case val == 'NOW':
                    return time.timestamp.UTC();
                break;
                case contains(val,'NOW+'):
                    return time.timestamp.UTC()+parseInt(val.replace('NOW+',''));
                break;
                case val == 'CURRENT_USER':
                    return mycz.ENV == 'MOBILE' ? app.id_station : window.user_id;
                break;
                case contains(val,'eval:'):
                    try {
                        return eval(val.replace("eval:",""));
                    } catch(err){}
                break;
                default:
                    if(self.form_data.hidden[val]){
                        return self.form_data.hidden[val]();
                    }
                    return val;
            }
        },

        /**
         * Get the current value for the current form type
         */
        getVal: function(){

            var $use_data = data;

            /**
             * JSON Cols
             */
            if(self.json_deepness != null){
                $.each(self.json_deepness,function(nn,d){
                    try {
                        $use_data = mycz.helpers.json.parse($use_data[d]);
                    } catch(err){}
                })
            }

            if(self.override_current_values != null){
                $use_data = self.override_current_values;
            }

            if(isEdit != true || !$use_data[self.current.col] && $use_data[self.current.col] !== 0){

                if($use_data[self.current.col]===null && self.helpers.getOption('','type') != 'boolean'){
                    return null;
                }

                if($use_data[self.current.col] === '' || $use_data[self.current.col] === ""){
                    return '';
                }

                if($use_data[self.current.col] || $use_data[self.current.col] === null){
                    return $use_data[self.current.col];
                }

                if($use_data[self.current.col] === '' && isEdit == true || $use_data[self.current.col] === undefined && isEdit == true && self.isNew != true){
                    return $use_data[self.current.col];
                }

                if(self.current.defaultValue){
                    return self.helpers.getDefaultValue(self.current.defaultValue);
                }

            }

            var isSelect = self.helpers.getOption('','type') == 'select';

            try {
                if($use_data[self.current.col]===null){
                    return null;
                }
                if($use_data[self.current.col] || $use_data[self.current.col] === 0){
                    return self.helpers.getOption('','localize') == true ? locale($use_data[self.current.col]) : $use_data[self.current.col];
                } else {
                    if(isSelect == true){
                        return undefined;
                    }
                    return '';
                }
            } catch(err){

                if(isSelect == true){
                    return undefined;
                }

                return '';
            }
        },

        /**
         * Get the value if its existing or return empty
         * @param def
         * @returns {*}
         */
        valOrEmpty: function(def){
            if(self.current[def]){
                return self.current[def];
            }
            return '';
        },

        /**
         * Pass any element, and get the right form-entry-block back
         * @param ele
         * @returns {*}
         */
        getBlock: function(ele){
            if(ele.hasClass("mycz-form-block")){
                return ele;
            } else {
                return ele.parents("div.mycz-form-block:first");
            }
        },

        /**
         * Get the current cols we are using. Normally its from "cols",
         * but there is also json-types or row-types, which have sub-cols
         * @param ele
         * @returns {*}
         */
        getCols: function(ele){

            var $cols = cols;

            if(self.override_current_cols != null){
                return self.override_current_cols;
            }

            /**
             * JSON cols
             */
            if(mycz.helpers.isset(ele.attr("data-json-deepness"),true,true)){

                $.each(mycz.helpers.json.parse(ele.attr("data-json-deepness"),false,true),function(nn,d){

                    if($cols[d]){

                        if(mycz.helpers.isset($cols[d]['jsonData'],true,true)){

                            $cols = $cols[d]['jsonData'];

                        } else if(mycz.helpers.isset($cols[d]['values'],true,true)){

                            $cols = $cols[d]['values'];

                        } else if(mycz.helpers.isset($cols[d]['data'],true,true)){

                            $cols = $cols[d]['data'];

                        } else {
                            $cols = $cols[d];
                        }

                    }
                });
            }

            return $cols;
        },

        /**
         * Get an option of a col (in cols)
         * @param ele jQuery - Any element, so we can find the column name
         * @param name string - The Option Name you need
         * @returns {*}
         */
        getOption: function(ele,name){

            if(name == 'required'){
                if(args.disable_required == true){
                    return false;
                }
            }

            /**
             * Getting the right col-name
             */
            ele = !mycz.helpers.isset(ele,true) ? self.current.block : ele;

            if(ele.hasClass('mycz-form-block')){
            } else {
                if(ele.parents("div.mycz-form-block:first").length==0){
                    ele = self.current.block;
                }
            }

            var col = false,
                type = false;

            if(ele != null){
                ele = self.helpers.getBlock(ele);
                col = ele.attr('data-col');
                type = ele.attr('data-type');
            }

            /**
             * If dependency is applied - value is not required.
             */
            if(ele.hasClass('force-hide-by-dependency') && name=='required'){
                return false;
            }


            var $cols = self.helpers.getCols(ele);

            if(col==false || col == undefined || col == null || col.length==0){
                console.warn('form getOption error for <'+name+'> : col is false');
                return false;
            }

            if(!$cols[col]){
                console.warn('form getOption error for <'+name+'> : couldnt find col ['+col+']');
                return false;
            }

            if(name == 'col'){
                return col;
            }

            if(!mycz.helpers.isset(name,true,true)){
                return $cols[col];
            }

            if($cols[col][name] || $cols[col][name] === false){
                return $cols[col][name];
            }

            /**
             * Nothing found, return default options..
             */
            if(self.default_form_opts[type]){
                if(self.default_form_opts[type][name]){
                    return self.default_form_opts[type][name];
                }
            }

            return false;
        },

        /**
         * For json-form-types we can get the json-deepness number (1, 2 etc.)
         * @param container
         * @returns {*}
         */
        getJsonDeepness: function(container){
            if(container.parents("[data-json-deepness]:first").length>0){
                return mycz.helpers.json.parse(container.parents("[data-json-deepness]:first").attr("data-json-deepness"));
            } else {
                return [];
            }
        },

        /**
         * Everytime a value changes, we trigger this.
         * Here we can store some functions, which gets triggered
         * for every value-change (e.g dependency)
         * @param ele
         */
        changed: function(ele){

            var col = self.helpers.getOption(ele,'col');

            if(self.dependencyIndex.dependentFromMe[col] || self.dependencyIndex.dependent[col]){
                self.helpers.checkDependencies(col)
            }

            if(self.onCreateTriggerKeyUp == false || self.triggerOnChange == false){
                return;
            }

            self.onChange(ele);
        },

        /**
         * A function to collect current value based on colName
         * @param colName
         * @returns {*}
         */
        easyCollect: function(colName){

            var ele = self.container.find("div.mycz-form-block[data-col='"+colName+"']:last");

            if(ele.length==0){

                var getEle = function(){

                    if(self.$HIDDEN_CONTAINER != null){
                        ele = self.$HIDDEN_CONTAINER.find("div.mycz-form-block[data-col='"+colName+"']:last");

                        if(ele.length != 0){
                            return ele;
                        }
                    }

                    /**
                     * The column is in another form (see dependency in mod-forms)
                     */
                    if($("div.mycz-form-block[data-col='"+colName+"']").length>0){
                        return window[$("div.mycz-form-block[data-col='"+colName+"']").parents(".myczModal").attr("data-form-id")].helpers.easyCollect(colName);
                    }
                    return false;

                }();

            }

            if(ele == false){
                return false;
            }

            var type = self.helpers.getOption(ele,'type');

            self.form_collect.current = ele;

            if(self.form_collect.current.hasClass("force-hide-by-dependency")){
                return false;
            }

            self.easyCollectActive = true;

            var r = self.form_collect[type]();

            self.easyCollectActive = false;

            loader.stop();

            return r;
        },

        /**
         * Checking dependencies
         * @param col
         */
        checkDependencies: function(col){

            if(self.dependencyIndex.dependentFromMe[col]){

                /**
                 * Getting my value.
                 */
                var my_value = self.helpers.easyCollect(col);

                var compare = function(e,source,target){

                    var match = false;

                    switch(true){

                        case !mycz.helpers.isset(e,true):
                            match = source == target;
                        break;

                        default:

                            match = mycz.custom_modules.helpers.condition_operators(e,source,target);
                        /*    target = mycz.helpers.isset(target,true) ? target : 0;
                            e = e == '=' ? '==' : e;
                            match = eval(target+" "+e+" "+source);*/
                    }

                    return match;
                };

                /**
                 * Looping through the elements, which are dependent of me:
                 */
                $.each(self.dependencyIndex.dependentFromMe[col],function(nn,c){

                    var deps = {};

                    if(self.container.find("div.mycz-form-block[data-col='"+c+"']").length>0){
                        deps = mycz.helpers.json.parse(self.helpers.getOption(self.container.find("div.mycz-form-block[data-col='"+c+"']"),'dependency'),false,true);
                    } else if(self.$HIDDEN_CONTAINER != null){
                        deps = mycz.helpers.json.parse(self.helpers.getOption(self.$HIDDEN_CONTAINER.find("div.mycz-form-block[data-col='"+c+"']"),'dependency'),false,true);
                    }


                    var at_least_one_matched = false;

                    $.each(deps,function(nn,obj){

                        var this_matched = true;

                        $.each(obj,function(k,v){

                            var value_to_compare = v;

                            var operator = obj.e;

                            var subCompare = function(){

                                if(k != 'e'){
                                    if(k == col){
                                        this_matched = this_matched == false ? false : compare(operator,value_to_compare,my_value);
                                    } else {
                                        this_matched = this_matched == false ? false : compare(operator,value_to_compare,self.helpers.easyCollect(k));
                                    }
                                }

                            };

                            var do_subcompare = true;

                            if(mycz.helpers.isObject(v)){

                                value_to_compare = v.value;

                                if(v.operator){
                                    operator = v.operator;
                                }

                                /**
                                 * v.value / v.comparison can also be an array, containing again a value
                                 * and an operator
                                 */
                                if(mycz.helpers.isArray(v.value)){

                                    do_subcompare = false;

                                    var one_did_not_match = false;

                                    $.each(v.value,function(nn,a){

                                        operator = a.operator;
                                        value_to_compare = a.comparison;

                                        subCompare();

                                        if(this_matched == false){
                                            one_did_not_match = true;
                                        }

                                    });

                                    if(one_did_not_match == true){
                                        this_matched = false;
                                    }

                                }
                            }

                            if(do_subcompare == true){
                                subCompare();
                            }

                        });

                        if(this_matched == true){
                            at_least_one_matched = true;
                        }
                    });

                    /**
                     * Did match, show this form element
                     */
                    if(at_least_one_matched == true){

                        if(self.container.find("div.mycz-form-block[data-col='"+c+"']").length>0){
                            self.container.find("div.mycz-form-block[data-col='"+c+"']").removeClass("force-hide-by-dependency");
                        } else if(self.$HIDDEN_CONTAINER != null){
                            self.$HIDDEN_CONTAINER.find("div.mycz-form-block[data-col='"+c+"']").removeClass("force-hide-by-dependency");
                        }

                    } else {

                        /**
                         * Did not match, hide this form element
                         */
                        if(self.container.find("div.mycz-form-block[data-col='"+c+"']").length>0){
                            self.container.find("div.mycz-form-block[data-col='"+c+"']").addClass("force-hide-by-dependency");
                        } else if(self.$HIDDEN_CONTAINER != null){
                            self.$HIDDEN_CONTAINER.find("div.mycz-form-block[data-col='"+c+"']").addClass("force-hide-by-dependency");
                        }
                    }

                    /// TEST
                    self.helpers.checkDependencies(c);

                });
            }
        },

        skip: '$$zapp_skip$$'
    };

    /**
     * You can set here default options
     * for a form type
     */
    this.default_form_opts = {
        hidden: {
            show_text_size:'50px'
        },
        text: {
            inputWidth: '100%'
        },
        number: {
            inputWidth: '100%'
        },
        numbers: {
            inputWidth: '100%'
        },
        textarea: {
            inputWidth:'100%'
        },
        select: {
            allowEmpty: false,
        },
        date: {
            selected_is_UTC_timestamp: true
        },
        datetime: {
            selected_is_UTC_timestamp: true,
            not_today:true,
        },
        time: {
            selected_is_UTC_timestamp: true,
            selected_is_seconds:false,
            not_today:true,
            when_0_return_24:false
        },
        timestamp: {
            selected_is_UTC_timestamp: true,
            not_today:true,
        },
        backend_search: {},
        join: {
            join_output: '*'
        },
        frontend_search: {
            search_min_length: 3,
            search_scope: 'localCache',
            selectable: 1,
            selection_class:'button-new-green'
        },
        grid: {
            selectable:1,
            grid_width: '100px',
            grid_height: '80px',
            icon_size: '30px',
            font_size: '13px',
            font_color: '#333',
            font_bg_color: '#e8e8e8',
            localCache_img_key:'',
            localCache_img_css:'',
            localCache_scope: 'localCache',
            localCache_out:'name',
            localCache_id:'{key}',
            localCache_create_new:'',
            localCache_allow_edit:'',
            grid_disable_edit: [],
            trigger_onClick_onInit:true,
        },
        localCache: {
            allowEmpty: false,
            localCache_scope: 'localCache',
            localCache_out:'name',
            localCache_id:'{key}',
            localCache_create_new:'',
            localCache_allow_edit:'',
            trigger_onClick_onInit:true,
        },
        upload: {
            required: false,
            upload_folder: 'uploads',
            multiple: false
        },
        croppie: {
            crop_enableResize: false,
            crop_type: 'square',
            crop_width:200,
            crop_height:200,
            upload_folder: 'uploads'
        },
        rows: {
            btn_class:'button-green',
            btn_label: 'new',
            btn_icon: 'ion-ios-plus-empty'
        }
    };

    this.current_form_opts = {};

    /**
     * For some form_types we need special data.
     * E.g: a select can have all countries, specifiy here the function which returns
     * the data. For example, to load it, specifiy in the cols-> type:select,values:'countries'
     */
    this.form_data = {
        select: {

            /**
             * Get a list of all countries
             * @returns {Object}
             */
            countries: function(){
                return getCountryName();
            },

            /**
             * Get a list of all currencies
             * @returns {*}
             */
            currencies: function(){
                return getCurrencyName();
            },

            /**
             * Get Currency Categories
             */
            cz_currency_cats: function(){
                var obj = {};
                obj['default'] = 'default';
                $.each(cz_currency_cats,function(name,vals){
                    obj[name] = name;
                });
                return obj;
            },

            /**
             * Get animations
             */
            animationsIn: function(){
                return mycz.designer.getAnimations();
            }
        },
        grid: {
            icons: function(){
                return mycz.designer.getIcons(true);
            },
            classes: function(){

                var classes = mycz.classes.colors;

                var obj = {};

                $.each(classes,function(k,l){
                    obj[k] =  {
                        name:l,
                        value:k,
                        icon: 'zapp-icon-block zapp-icon '+k
                    };
                });

                return obj;
            }
        },
        hidden: {
            activeArticle: function(){
                return $(".myczModal[data-orm-form='default'],.myczModal[data-orm-form='articles'],.myczModal[data-orm-form='reservation'],.myczModal[data-orm-form='request']").attr("data-orm-id");
            },
            activeLocation: function(){
                return mycz.active.location();
            },
            publicOrContent: function(){
                return mycz.modules.offers.public == true ? 1 : 0;
            },
            parentOffer: function(){
                return mycz.active.offer_parent;
            },
            /**
             * Return active category
             * @returns {number|*}
             */
            activeCategory: function(){
                return mycz.active.category;
            },
            /**
             * Return active offer
             */
            activeOffer: function(){
                return mycz.active.offer;
            },
            /**
             * Return active app_filter
             * @returns {number|*}
             */
            'mycz.active.filterID' : function(){
                return mycz.active.filterID;
            },
            'randomString' : function(){
                return random.string(15);
            },
            'randomString(5)' : function(){
                return random.string(8);
            },
            'randomString(8)' : function(){
                return random.string(8);
            },
            'randomPassword': function(){
                return random.name();
            },
            'randomName': function(){
                return random.name();
            }
        }
    };

    /**
     * All the form types
     */
    this.form_types = {

        /**
         * Not a real type: This function is
         * used in text, textarea
         */
        multilanguage: function(value,languageClickFunction,languageClickedFunction,translateCallback){

            var browserLanguage = window.languages.activeLang;

            /**
             * A seperated list of other multilanguage-
             * form entries, to switch language same time
             */
            var connectWith = self.helpers.getOption('','connectWith');

            /**
             * Value maybe before just a string
             * Because we implemented multilanguage later
             */
            value = contains(value,'{') && contains(value,'}') ? mycz.helpers.json.parse(value) : value;
            window.lastClickedMultilanguage =  window.lastClickedMultilanguage ? window.lastClickedMultilanguage : browserLanguage;

            var btns_div = mycz.ele.div('block w-100 fleft multilanguage-btns').attr("data-translator-id",random.string());

            $.each(mycz.helpers.language.getMyLanguages(),function(nn,l){

                btns_div.append(mycz.ele.btn('button-small button-grey',l.toUpperCase(),function(){

                    if(mycz.helpers.isset(languageClickFunction,true,true)){
                        languageClickFunction(btns_div.find("a.zapp-btn.button-active"),$(this));
                    }

                    if($(this).hasClass("button-active")){
                        return;
                    }

                    btns_div.find("a.zapp-btn.button-active").removeClass("button-active active-down");

                    $(this).addClass("button-active active-down");

                    window.lastClickedMultilanguage = l;

                    if(mycz.helpers.isset(languageClickedFunction,true,true)){

                        var val = mycz.helpers.notNull($(this).attr("data-value"));

                        val = val.split("<br>").join("\n");

                        languageClickedFunction(val)
                    }

                    $(this).parent().find(".auto-translate").remove();

                    if(l != browserLanguage){
                        $(this).after(mycz.ele.div('inline-block button-small m-0 p-0 auto-translate',mycz.ele.icon('fa fa-arrow-right opacity-7 error-blue f-18'))
                            .append(mycz.ele.badge('button-blue',mycz.ele.icon(icon.google),function(){
                                var m = $(this);
                                m.html(mycz.ele.icon(icon.load));
                                mycz.translate.text(btns_div.find("a[data-lang='"+browserLanguage+"']").attr("data-value"),browserLanguage,l,function(t){
                                    m.html(mycz.ele.icon(icon.google));
                                    if(mycz.helpers.isset(translateCallback,true)){
                                        translateCallback(t);
                                    }
                                },function(){
                                    m.html(mycz.ele.icon(icon.google));
                                })
                            },{tt:label("click_here_to_translate")+" "+getLanguage(browserLanguage)[0]+" "+mycz.ele.icon(icon.arrowright)+" "+getLanguage(l)[0]})))
                    }

                    /**
                     * A seperated list of other multilanguage-
                     * form entries, to switch language same time
                     */
                    if(mycz.helpers.isset(connectWith,true,true) && !$(this).hasClass("connectWith")){
                        $.each(mycz.helpers.split(connectWith,',',true),function(i,c){
                            self.container.find("div[data-col='"+c+"'] div.multilanguage-btns a.zapp-btn[data-lang='"+l+"']").addClass("connectWith");
                            self.container.find("div[data-col='"+c+"'] div.multilanguage-btns a.zapp-btn[data-lang='"+l+"']").trigger("click");
                        })
                    } else {
                        $(this).removeClass("connectWith");
                    }
                },{
                    'data-lang': l,
                    'data-value': mycz.helpers.isObject(value) ? (value[l] ? value[l] : '') : (l == 'en' ? value : ''),
                    'tt':getLanguage(l)[0]
                }))
            });

            return btns_div;
        },

        /**
         * Add a hidden value
         * @returns
         */
        hidden: function(){
            self.current.block.addClass("force-hide");
            var val = self.helpers.getVal();
            if(self.form_data.hidden[val]){
                val = self.form_data.hidden[val]();
            }
            if(mycz.helpers.isset(self.helpers.getOption('','show_text'),true,true)){
                self.current.block.append(mycz.ele.div('fleft block w-100 p-10 p-shadow text-center',mycz.helpers.getText(self.helpers.getOption('','show_text'),true))
                    .css("min-width","60px")
                    .css("font-size",self.helpers.getOption('','show_text_size')));
                self.current.block.removeClass("force-hide");
            }
            return mycz.ele.input(self.current.col,'hidden',val);
        },

        /**
         * Simple input type text
         * @param keyUp
         */
        text: function(keyUp){

            var v = self.helpers.getVal();

            v = v == '[]' ? '' : v;

            var keyUp2 = self.helpers.getOption('','keyUp');

            var multilanguage = self.helpers.getOption('','multilanguage');

            var focus = self.helpers.getOption('','focus');

            var div = mycz.ele.div('block w-100 fleft');

            /**
             * Enable multilanguage
             * Will return a json-string {en:'textEN',de:'textDE'}
             */
            if(multilanguage == true){

                div.append(self.form_types.multilanguage(v,'',function(currentValue){
                    div.children("input").val(currentValue).trigger("keyup");
                },function(t){
                    div.children("input").val(t).trigger("keyup");
                }));

                div.attr("data-translator-id",div.find("[data-translator-id]").attr("data-translator-id"));
            }

            div.append(mycz.ele.input(self.current.col,'text',mycz.helpers.isObject(v) ? '' : v,{
                placeholder: mycz.helpers.getText(self.helpers.valOrEmpty('placeholder'),true), //Setting placeholder
                autocomplete: self.helpers.getOption('','autocomplete') == true ? 'nope' : 'on',
                maxlength: self.helpers.getOption('','maxlength') != false ? self.helpers.getOption('','maxlength') : undefined
            },function(val,ele,event){

                if(multilanguage == true){

                    var translator_id = div.attr("data-translator-id");

                    $("div.multilanguage-btns[data-translator-id='"+translator_id+"']").find("a.zapp-btn[data-lang='"+window.lastClickedMultilanguage+"']").attr("data-value",val);

                }

                /**
                 *
                 * This keyUp is passed from other formTypes
                 */
                if(keyUp){
                    keyUp(val,ele,event);
                }

                /**
                 * This keyUp is passed in the column, can be a string (eval)
                 */
                if(mycz.helpers.isset(keyUp2,true,true)){
                    if(!mycz.helpers.isObject(keyUp2) && !mycz.helpers.isFunction(keyUp2)){
                        eval('keyUp2 = '+keyUp2);
                    }
                    keyUp2(val,ele,event);
                }

                /**
                 * Changed
                 */
                self.helpers.changed(ele);

            }).attr("style","width:"+self.helpers.getOption('','inputWidth')+"!important;max-width:none!important;").focus(function(){

                if(focus != false){
                    focus();
                }

            }));

            if(multilanguage == true){
                div.children("div.multilanguage-btns").find("a.zapp-btn[data-lang='"+window.languages.activeLang+"']").trigger("click");
            }

            return div;
        },

        /**
         * Add an input type number
         * @param keyUp
         */
        number: function(keyUp){

            var keyUp2 = self.helpers.getOption('','keyUp');

            return mycz.ele.input(self.current.col,'text',self.helpers.getVal(),{
                placeholder: mycz.helpers.getText(self.helpers.valOrEmpty('placeholder'),true) //Setting placeholder
            },function(val,ele,event){

                try {
                    ele.val((val.replace(/[^\d.-]/g, '')));
                } catch(err){}

                if(keyUp){
                    keyUp(val,ele,event);
                }

                /**
                 * This keyUp is passed in the column, can be a string (eval)
                 */
                if(mycz.helpers.isset(keyUp2,true,true)){
                    if(!mycz.helpers.isObject(keyUp2) && !mycz.helpers.isFunction(keyUp2)){
                        eval('keyUp2 = '+keyUp2);
                    }
                    keyUp2(val,ele,event);
                }

                /**
                 * Changed
                 */
                self.helpers.changed(ele);

            }).attr("style","width:"+self.helpers.getOption('','inputWidth')+"!important;max-width:none!important;")
        },

        /**
         * Same as type number
         * @param keyUp
         * @returns {*}
         */
        numbers: function(keyUp){
            return self.form_types.number(keyUp);
        },

        /**
         * Add a password field
         * @param keyUp
         */
        password: function(keyUp){

            var val = self.helpers.getVal();

            if(self.helpers.getOption('','encrypt') == true && args.keep_passwords != true){
                val = '';
            }

            return mycz.ele.input(self.current.col,'password',val,{placeholder:self.helpers.valOrEmpty('placeholder'),readonly:self.helpers.getOption('','readonly')},function(val,ele,event){
                if(keyUp){
                    keyUp(val,ele,event);
                }

                /**
                 * Changed
                 */
                self.helpers.changed(ele);

            },'w-100').attr("style","width:100%!important;max-width:none!important;")
        },

        /**
         * Add a textarea
         */
        textarea: function(){

            var v = self.helpers.getVal();

            v = v == '[]' ? '' : v;

            var multilanguage = self.helpers.getOption('','multilanguage');

            var keyUp2 = self.helpers.getOption('','keyUp');

            var tiny = self.helpers.getOption('','tiny');

            var focus = self.helpers.getOption('','focus');

            var div = mycz.ele.div('block w-100 fleft');

            /**
             * Enable multilanguage
             * Will return a json-string {en:'textEN',de:'textDE'}
             */
            if(multilanguage == true){

                v = contains(v,'{') && contains(v,'}') ? mycz.helpers.json.parse(v) : v;

                div.append(self.form_types.multilanguage(v,function(prevBtn,newBtn){

                    var t = div.find("textarea");

                    if(tiny == true){
                        var temp_v = tinyMCE.get(t.attr("id")).getContent();
                        temp_v = mycz.helpers.split(temp_v,'&lt;',true).join("<");
                        temp_v = mycz.helpers.split(temp_v,'&gt;',true).join(">");
                        prevBtn.attr("data-value",temp_v);
                    }

                },function(currentValue){

                    div.children("textarea").val(currentValue);
                    var t = div.find("textarea");
                    if(tiny == true){
                        tinyMCE.get(t.attr("id")).setContent(currentValue);
                    }

                },function(text){

                    var t = div.find("textarea");
                    if(tiny == true){
                        tinyMCE.get(t.attr("id")).setContent(text);
                    } else {
                        t.val(text).trigger("keyup");
                    }

                }));

                div.attr("data-translator-id",div.find("[data-translator-id]").attr("data-translator-id"));

            }

            var l = window.languages.activeLang;

            var currentValue = (multilanguage == true ? (mycz.helpers.isObject(v) ? (v[l] ? v[l] : '') : (l == 'en' ? v : '')) : v);

            try {
                currentValue = currentValue.split("<br>").join("\n");
            } catch(err){}

            var text_area = mycz.ele.textarea(self.current.col,currentValue,function(v,ele){

                if(multilanguage == true){
                    var translator_id = div.attr("data-translator-id");
                    $("div.multilanguage-btns[data-translator-id='"+translator_id+"']").find("a.zapp-btn[data-lang='"+window.lastClickedMultilanguage+"']").attr("data-value",v);
                }

                /**
                 * This keyUp is passed in the column, can be a string (eval)
                 */
                if(mycz.helpers.isset(keyUp2,true,true)){
                    if(!mycz.helpers.isObject(keyUp2) && !mycz.helpers.isFunction(keyUp2)){
                        eval('keyUp2 = '+keyUp2);
                    }
                    keyUp2(v,ele,event);
                }

                /**
                 * Changed
                 */
                self.helpers.changed(ele);

            },false,false,self.helpers.getOption('','auto_height')).attr("placeholder",mycz.helpers.getText(self.helpers.valOrEmpty('placeholder'),true)).focus(function(){

                if(focus != false){
                    focus();
                }

            });

            if(self.helpers.getOption('','maxlength') != false){
                text_area.attr("maxlength",self.helpers.getOption('','maxlength'))
            }

            text_area.css("width",self.helpers.getOption('','inputWidth'));

            div.append(text_area);

            if(tiny == true){

                var id = random.string();
                text_area.attr("id",id).addClass("has-tiny").css("height","220px");

                /**
                 * Little hack to not see how tiny is loading.
                 */
                self.current.block.append(mycz.ele.div('prevent tiny',mycz.ele.icon(icon.rotating+" f-30 inline-block")));

                setTimeout(function(){
                    mycz.plugins.tiny.ele('#'+id,{
                        html_button:true,
                        setup: function(editor) {
                            editor.on('keyup', function(e) {

                                /**
                                 * This keyUp is passed in the column, can be a string (eval)
                                 */
                                if(mycz.helpers.isset(keyUp2,true,true)){
                                    if(!mycz.helpers.isObject(keyUp2) && !mycz.helpers.isFunction(keyUp2)){
                                        eval('keyUp2 = '+keyUp2);
                                    }
                                    keyUp2(editor.getContent());
                                }

                                /**
                                 * Trigger changed
                                 */
                                self.helpers.changed(text_area);

                            });
                        }
                    });
                    setTimeout(function(){
                        $("#"+id).parent().parent().children("div.prevent.tiny").remove();

                        if(multilanguage == true){
                            div.children("div.multilanguage-btns").find("a.zapp-btn[data-lang='"+window.languages.activeLang+"']").trigger("click");
                        }
                    },100);

                },50);

            } else {
                if(multilanguage == true){
                    div.children("div.multilanguage-btns").find("a.zapp-btn[data-lang='"+window.languages.activeLang+"']").trigger("click");
                }
            }

            return div;
        },

        /**
         * Add a dropdown (select)
         * @param ele
         * @param returnOptions
         */
        select: function(ele,returnOptions,returnValues){

            var select = mycz.ele.new('select','','block w-100').css("max-width","100%");

            var keyUp = self.helpers.getOption(ele,'keyUp');

            var allowEmpty = self.helpers.getOption(ele,'allowEmpty');

            select.change(function(){

                /**
                 * Changed
                 */
                self.helpers.changed($(this));

                if(keyUp != false){
                    try {
                        keyUp($(this).val());
                    } catch(err){}
                }

            });

            if(self.helpers.getOption(ele,'disabled')){
                select.addClass("disabled").attr("disabled",1);
            }

            if(self.helpers.getOption(ele,'readonly')){
                select.addClass("readonly").attr("readonly",1);
            }

            if(self.helpers.getOption(ele,'allowEmpty') == true && self.helpers.getOption(ele,'type') != 'localCache'){
                select.append(mycz.ele.new('option',''));
            }

            try {
                if(self.form_data.select[self.current.values]){
                    self.current.values = self.form_data.select[self.current.values]();
                }
            } catch(err){ }

            /**
             * Values can also be a function
             */
            if(mycz.helpers.isFunction(self.current.values)){
                self.current.values = self.current.values();
            }

            /**
             * Values can also be a eval-string
             */
            if(contains(self.current.values,'eval: ')){
                self.current.values = eval(self.current.values.replace('eval: ',''));
            }

            $.each(self.current.values,function(k,n){

                /**
                 * Values can also be objects with a key "value"
                 */
                if(mycz.helpers.isObject(n)){
                    if(n.value){
                        k = n.value;
                        n = n.value;
                    }
                }

                select.append(mycz.ele.new('option',mycz.helpers.getText(n,true)).attr("value",k).attr("data-visible",mycz.helpers.getText(n,true)));
            });


            if(self.helpers.getOption('','select_sort') == true){
                select = mycz.helpers.sort(select,'option','data-visible',false,true);
                select.find("option:not([data-visible])").prependTo(select);
            }

            var val = self.helpers.getVal();


            /**
             * Set first value
             */
            if(val === '' || val === ""){

                if(select.find("option[value='']").length>0){
                    select.val(val).change();
                }

            } else if(mycz.helpers.isset(val,true)){

                select.val(val).change();

            } else if(self.helpers.getOption(ele,'defaultValue') != false){

                select.val(self.helpers.getOption(ele,'defaultValue')).change();

            } else if(allowEmpty == true){
                select.val('').change();
            }


            /**
             * Create new allows the user to create new entries in this select
             */
            if(self.helpers.getOption('','create_new') == true){

                select.attr("style","width:calc(100% - 50px)!important;").removeClass("block").addClass("inline-block fleft")
                select = mycz.ele.div('block w-100 fleft').append(select);

                select.append(mycz.ele.btn('button-green fleft no-box-shadow button-rounded',mycz.ele.icon(icon.add),function(){

                    var me = $(this);
                    var content = mycz.ele.div('block w-100 fleft p-20');
                    content.append(mycz.ele.input('text','text'));
                    content.append(mycz.ele.btn('button-small button-green m-10',label("create"),function(){
                        var v = content.find("input").val();
                        if(mycz.helpers.isset(v,true,true)){
                            select.find("select").append(mycz.ele.new('option',v).attr("value",v));
                            mycz.plugins.tooltipster.destroy(me);
                            select.find("select").val(v).change();
                        }

                    }));

                    content.append(mycz.ele.btn('button-small button-dark m-10',label("cancel"),function(){
                        mycz.plugins.tooltipster.destroy(me);
                    }));

                    mycz.plugins.tooltipster.container($(this),'bottom',content);

                }));

                /**
                 * Allow create new + edit mode,
                 * append the option to the select
                 */
                if(mycz.helpers.isset(val,true,true)){
                    if(select.find("option[value='"+val+"']").length==0){
                        select.find("select").append(mycz.ele.new('option',val).attr("value",val)).val(val).change();
                    }
                }
            }

            if(returnOptions == true){
                return select.html();
            }

            if(returnValues == true){
                return self.current.values;
            }


            return select;
        },

        /**
         * Select with data already loaded
         * @param returnValues
         * @returns {*}
         */
        localCache: function(returnValues,startFilters,ele){

            var origin_type = self.helpers.getOption((ele ? ele : ''),'type');

            if(origin_type == 'localCache'){
                startFilters = self.helpers.getOption((ele ? ele : ''),'localCache_filters');
                startFilters = mycz.helpers.isset(startFilters,true,true) ? $.extend(true,{},startFilters) : {};
            }

            var getValues = function(ele,filters){

                var values = {};

                if(self.helpers.getOption(ele,'allowEmpty') == true){
                    values[''] = '';
                }

                /**
                 * Defining localCache
                 * In ADMIN we have to add index 0
                 */
                var l = window[self.helpers.getOption(ele,'localCache_scope')][self.helpers.getOption(ele,'localCache')];

                var isCustomModule = false;

                if(mycz.helpers.isset(l,true,true)){

                    if(mycz.ENV == 'MOBILE'){

                        if(l[0] && l[1]){

                            if(contains(self.helpers.getOption(ele,'localCache'),'_custom_module')){
                                isCustomModule = true;
                            } else {

                                try {
                                    if(l[0] && l[1] && l[2] && l[3]){
                                        if(mycz.helpers.isObject(l[0]) && mycz.helpers.isObject(l[1]) && mycz.helpers.isString(l[2]) && mycz.helpers.isString(l[3])){
                                            isCustomModule = true;
                                        }
                                    }
                                } catch(err){}

                            }
                        }
                    }
                }

                if(mycz.ENV == 'ADMIN' || isCustomModule == true){
                    l = l[0];
                }

                $.each(l,function(i,row){

                    var out = self.helpers.getOption(ele,'localCache_out');

                    switch(out){

                        case '{key}':
                            out = i;
                        break;

                        default:

                            /**
                             * "Out" can also be an object to show multiple outputs
                             * in one option of a select
                             */
                            var collect_out = [];

                            if(mycz.helpers.isObject(out) && !mycz.helpers.isArray(out)){

                                $.each(out,function(k,vals){

                                    var temp = row[k];

                                    if(vals.localize){
                                        temp = locale(temp);
                                    }

                                    if(vals.format){
                                        temp = vals.format(temp);
                                    }

                                    if(vals.price){
                                        temp = format.price(parseFloat(temp));
                                    }

                                    collect_out.push(temp);
                                });

                            /**
                             * "Out" can also be an array
                             */
                            } else if(mycz.helpers.isArray(out)) {

                                $.each(out,function(n,k){
                                    var temp = row[k];
                                    collect_out.push(temp);
                                });

                            } else {
                                collect_out.push(row[out] == 'default' ? label('default') : row[out]);
                            }

                            out = collect_out.join((origin_type == 'localCache' ? ' ' : "<br>"));
                    }

                    var match = true;

                    if(mycz.helpers.isset(filters,true)){

                   /*     if(cols.cms_stores_id){
                            if(!filters['cms_stores_id']){
                                filters['cms_stores_id'] = {
                                    filter_type:'AND',
                                    filter_data:[window.$active_cms_store]
                                }
                            }
                        }*/

                        $.each(filters,function(k,vals){

                            if(mycz.helpers.isObject(vals)){

                                var submatch = vals.filter_type == 'AND' || vals.filter_type == 'CONTAINS' ? true : false;

                                $.each(vals.filter_data,function(nn,d){

                                    d = self.form_data.hidden[d] ? self.form_data.hidden[d]() : d;

                                    var compare = contains(d,'$$') ? data[d.replace('$$','').replace('$$','')] : d;

                                    if(contains(compare,'eval:')){
                                        compare = eval(compare.replace('eval:',''));
                                    }

                                    if(vals.disable_filter_on_null == true && !mycz.helpers.isset(compare,true)){
                                        submatch = vals.filter_type == 'OR' ? true : submatch;
                                    } else {

                                        switch(true){

                                            case vals.filter_type == 'CONTAINS':

                                                if(vals.split == true){
                                                    submatch = mycz.helpers.array.contains(mycz.helpers.split(row[k],',',true),compare);
                                                } else {
                                                    submatch = contains(row[k],compare);
                                                }

                                            break;

                                            default:

                                                if(row[k] != compare){
                                                    submatch = vals.filter_type == 'AND' ? false : submatch;
                                                } else {
                                                    submatch = vals.filter_type == 'OR' ? true : submatch;
                                                }
                                        }

                                    }
                                });

                                if(submatch != true){
                                    match = false;
                                }

                            } else {

                                if(row[k] != vals){
                                    match = false;
                                }

                            }
                        })
                    }

                    if(match == true){

                        var localCache_id = self.helpers.getOption(ele,'localCache_id') == '{key}' ? i : row[self.helpers.getOption(ele,'localCache_id')];

                        if(contains(self.helpers.getOption(ele,'localCache_id'),'eval: ')){

                            var the_id = self.helpers.getOption(ele,'localCache_id');

                            localCache_id = function(){

                                $.each(row,function(k,v){
                                    if(contains(the_id,'$$'+k+'$$')){
                                        the_id = the_id.replace('$$'+k+'$$',row[k]);
                                    }
                                });

                                the_id = eval(the_id.replace('eval: ',''));
                                return the_id;
                            }();

                        }

                        values[localCache_id] = out;
                    }

                });

                return values;
            };

            var vals = getValues(mycz.helpers.isset(ele,true) ? ele : '',startFilters);

            if(returnValues == true){
                return vals;
            }

            self.current.values = vals;
            var select = self.form_types.select();

            if(mycz.helpers.isset(self.helpers.getOption('','onChange'),true)){

                var onChange = self.helpers.getOption('','onChange');

                select.change(function(){

                    var val = $(this).val();

                    $.each(onChange,function(k,v){

                        var target_block = self.popup.find("div.mycz-form-block[data-col='"+k+"']");

                        var current_filter = mycz.helpers.json.parse(target_block.attr("data-filter"));

                        current_filter[v] = val;

                        target_block.attr("data-filter",mycz.helpers.json.stringify(current_filter));

                        mycz.react.react('','',target_block);

                    });

                });
            }

            self.current.block = mycz.react.on(self.current.block,function(e){
                self.current.values = getValues(e,mycz.helpers.json.parse(e.attr("data-filter")));
                e.find("select").html(self.form_types.select(e,true));
            });
            return select;
        },

        /**
         * Add a datepicker
         * @param withTime
         */
        date: function(withTime){

            withTime = withTime == true ? withTime : false;
            var div = mycz.ele.div('');

            var onClick = self.helpers.getOption('','onClick');
            
            var steps = {
                checkable: function(){
                    if(self.current.allow_now == true || self.current.allow_no_date == true){

                        div.append(mycz.ele.div('checkable-holder block w-100 pointer '));

                        div.find("div.checkable-holder").append(mycz.ele.div('checkable fw-400')
                            .append(mycz.ele.icon("fa "+icon.checkbox2)+" ")
                            .append((self.current.allow_now == true ? label('request_for_now') : label("no_date")))
                            .append(mycz.ele.new('span',label('click_to_change_date'),'fw-400 f-13 underline block w-100 p-5')));

                        div.find("div.checkable-holder")
                            .attr("data-allow-now",(self.current.allow_now == true ? 1 : 0))
                            .attr("data-allow-no-date",(self.current.allow_no_date == true ? 1 : 0));

                        div.find("div.checkable").unbind().click(function(){
                            var i = $(this).find("i");
                            if(i.hasClass(icon.checkbox2_checked)){
                                div.find("div.checkable-holder").removeClass("checked");
                                i.removeClass(icon.checkbox2_checked+" error-green").addClass(icon.checkbox2);
                                $(this).addClass("fw-400").removeClass("fw-600");
                                $(this).find("span").addClass("hidden");
                                div.find(".datepicker-holder,.timepicker-holder").removeClass("hidden");
                            } else {
                                div.find("div.checkable-holder").addClass("checked");
                                i.removeClass(icon.checkbox2).addClass(icon.checkbox2_checked+" error-green");
                                $(this).removeClass("fw-400").addClass("fw-600");
                                $(this).find("span").removeClass("hidden");
                                div.find(".datepicker-holder,.timepicker-holder").addClass("hidden");
                            }
                        });
                    }
                }
            };

            steps.checkable();
            div.append(mycz.ele.div('datepicker-holder'));

            if(withTime == true){
                div.append(mycz.ele.div('timepicker-holder'))
            }

            var isUTC = self.helpers.getOption('','selected_is_UTC_timestamp');

            try {
                if(contains(self.helpers.getVal(),'.')){
                    isUTC = false;
                }
            } catch(err){}


            var val = self.helpers.getVal();

            /**
             * Min Days, a number which will add to the current date
             */
            if(mycz.helpers.isset(self.current.min_days,true,true)){
                self.current.min_date = time.timestamp.UTC()+(parseInt(self.current.min_days)*24*60*60);
            }

            /**
             * Min Workdays (skip saturday and sunday)
             */
            if(mycz.helpers.isset(self.current.min_workdays,true,true)){

                self.current.min_date = time.timestamp.addWorkDays('',self.current.min_workdays);

                /**
                 * Check if the min date is harming the disabled-days
                 */
                if(mycz.helpers.isset(self.current.disable_days,true,true)){


                    var check = function(){

                        var weekDay = time.date.convert.fromDate.toWeekday(time.output.date_and_time(self.current.min_date,true,true).split(" ")[0],false);

                        if(mycz.helpers.array.contains(mycz.helpers.split(self.current.disable_days,',',true),weekDay.toString())){
                            self.current.min_date = parseFloat(self.current.min_date) + 86400;
                            check();
                        }

                    };

                    check();

                }
            }



            /**
             * Max Days, a number which will add to the current date
             */
            if(mycz.helpers.isset(self.current.max_days,true,true)){
                self.current.max_date = time.timestamp.UTC()+(parseInt(self.current.max_days)*24*60*60);
            }

            var opts = {
                selected_is_UTC_timestamp: isUTC,
                selected: val,
                min_date: self.current.min_date ? self.current.min_date : 'no_min_date',
                max_date: self.current.max_date ? self.current.max_date : '',
                not_today: self.helpers.getOption('','not_today'),
                onSet: function(){
                    self.helpers.changed(div);
                    if(mycz.helpers.isset(onClick,true,true)){
                        onClick();
                    }
                }
            };

            /**
             * 0 or empty we dont pass -> will cause an error
             */
            if(val == 0 || !mycz.helpers.isset(val,true,true)){
                delete opts.selected;
            }

            /**
             * Min. Time
             */
            if(mycz.helpers.isset(self.current.min_time,true,true)){
                if(!mycz.helpers.isArray(self.current.min_time)){
                    self.current.min_time = self.current.min_time.split(":");
                }
                opts.min_time = self.current.min_time;
            }

            /**
             * Max. Time
             */
            if(mycz.helpers.isset(self.current.max_time,true,true)){
                if(!mycz.helpers.isArray(self.current.max_time)){
                    self.current.max_time = self.current.max_time.split(":");
                }
                opts.max_time = self.current.max_time;
            }

            /**
             * Interval, default is 15
             */
            if(mycz.helpers.isset(self.current.interval,true,true)){
                opts.interval = self.current.interval;
            }

            /**
             * Disable days, an array with numbers (e.g: 6,7)
             */
            if(mycz.helpers.isset(self.current.disable_days,true,true)){
                opts.disable = [];
                $.each(mycz.helpers.split(self.current.disable_days,',',true),function(n,i){
                    opts.disable.push(parseInt(i));
                });
            }

            div = mycz.plugins.datepicker.date(withTime,tools.rand_string(),opts,div);

            /**
             * We can set "Now" or "Never" to be default checked
             */
            if(self.helpers.getVal()===null && self.current.allow_no_date == true
                || !mycz.helpers.isset(self.helpers.getVal()) && self.helpers.getOption('','default_no_date') == true
                || !mycz.helpers.isset(self.helpers.getVal()) && self.helpers.getOption('','default_now') == true ){
                div.find("div.checkable-holder > div.checkable").trigger("click");
            }
            return div;
        },

        /**
         * Add a timepicker
         */
        time: function(){
            var div = mycz.ele.div('');
            div.append(mycz.ele.div('timepicker-holder'))

            var opts = {
                selected_is_UTC_timestamp:self.helpers.getOption('','selected_is_UTC_timestamp'),
                selected_is_seconds:self.helpers.getOption('','selected_is_seconds'),
                selected:self.helpers.getVal(),
                not_today: self.helpers.getOption('','not_today'),
                when_0_return_24: self.helpers.getOption('','when_0_return_24'),
            };

            /**
             * Min Time
             */
            if(mycz.helpers.isset(self.current.min_time,true,true)){
                if(!mycz.helpers.isArray(self.current.min_time)){
                    self.current.min_time = self.current.min_time.split(":");
                }
                opts.min_time = self.current.min_time;
            }

            /**
             * Max Time
             */
            if(mycz.helpers.isset(self.current.max_time,true,true)){
                if(!mycz.helpers.isArray(self.current.max_time)){
                    self.current.max_time = self.current.max_time.split(":");
                }
                opts.max_time = self.current.max_time;
            }

            /**
             * Interval, default is 15
             */
            if(mycz.helpers.isset(self.current.interval,true,true)){
                opts.interval = self.current.interval;
            }

            div = mycz.plugins.datepicker.time(false,tools.rand_string(),opts,div);

            return div;
        },

        /**
         * Add a datepicker + timepicker
         * @returns {*}
         */
        datetime: function(){
            return self.form_types.date(true);
        },

        /**
         * Same as datetime but with optional timepicker
         * @returns {*}
         */
        timestamp: function(){
            return self.form_types.date(self.helpers.getOption('','with_time'));
        },

        /**
         * Will search from backend (under construction)
         * @returns {*}
         */
        backend_search: function(){
            var input = self.form_types.text();
            input.attr("type","search");
            self.current.block.prepend($(mycz.ele.icon(icon.search+" error-grey pos-absolute")).css("left","14px").css("top","41px"))

            return input;
        },

        /**
         * Join joins to other table
         */
        join: function(){

            /**
             * Target table to join and to search in
             */
            var join_to = self.helpers.getOption('','join_to');

            var join_filters = self.helpers.getOption('','join_filters');

            var col_name = self.helpers.getOption('','col');

            var col_struct = self.helpers.getOption('','');

            /**
             * Define which columns to display
             */
            var join_output = self.helpers.getOption('','join_output');

            /**
             * When saved, we need to declare, where to get the join-data
             */
            var join_saved_source = self.helpers.getOption('','join_saved_source');

            if(join_saved_source == false){
                join_saved_source = join_to;
            }

            /**
             * We can save styles for every output
             */
            var join_styles = self.helpers.getOption('','join_styles');

            /**
             * Allow to create a new entry using the joining orm
             */
            var join_create_new = self.helpers.getOption('','join_create_new');

            var join_allow_edit = self.helpers.getOption('','join_allow_edit');

            /**
             * Destination Col to put to the destination orm
             */
            var join_create_new_put = self.helpers.getOption('','join_create_new_put');

            var typing = false;

            var selected = false;

            var searchVal = null;

            var searchResults = mycz.ele.div('mycz-form-join-search-results');

            var helpers = {

                /**
                 * Returns Style
                 * @param joinColumn string - The output column to display
                 * @param styleType string - Either "row" / "key" or "val"
                 */
                getStyle: function(joinColumn,styleType) {
                    try {
                        return join_styles[joinColumn][styleType];
                    } catch (err) {

                        try {
                            return join_styles['*'][styleType];
                        } catch (err) {
                            return '';
                        }
                    }
                },

                /**
                 * Get Value
                 * @param value string/mixed - The current value
                 * @param colName
                 * @param $col_struct
                 * @param id
                 * @param row
                 * @returns {*}
                 */
                getValue: function(value,colName,$col_struct,id,row){

                    try {
                        switch($col_struct.join_structure.cols[colName].type){

                            /**
                             * Join in Joins loop again and show_rows
                             */
                            case 'join':

                                var div = steps.show_row(id,row,false,true,'',$col_struct.join_structure.cols[colName]);
                                div.removeClass('mycz-form-join-search-result-entry onHover');
                                return div;

                            break;

                            /**
                             * Default: Try to get using zable
                             */
                            default:

                                var zable = new mycz.zable.init($("<div />"));
                                zable.head_structure = $col_struct.join_structure.cols;
                                return zable.form_types[$col_struct.join_structure.cols[colName].type](colName,value);
                        }
                    } catch(err){
                        return value;
                    }


                }
            };

            var steps = {

                /**
                 * Search returns no results
                 */
                no_results: function(){
                    searchResults.html(mycz.ele.alert('alert-info',label("no_results")));

                    if(join_create_new == true){
                        searchResults.find("div.alert").append(mycz.ele.btn('error-blue m-10',mycz.ele.icon(icon.add)+" "+label("create"),function(){
                            steps.new();
                        }));
                    }

                },

                /**
                 * Showing search results
                 * @param id
                 * @param row
                 * @param btn
                 * @param returnDIV
                 * @param selected
                 */
                show_row: function(id,row,btn,returnDIV,selected,$col_struct){

                    var joinSourceApplied = false;

                    $col_struct = mycz.helpers.isset($col_struct,true,true) ? $col_struct : col_struct;

                    var $join_output = $col_struct.join_output;

                    var $join_to = $col_struct.join_to;

                    if(!mycz.helpers.isset(row,true,true)){
                        row = localCache[join_saved_source][0][args.edit_id];
                        joinSourceApplied = true;
                    }

                    var div = mycz.ele.div('mycz-form-join-search-result-'+(selected == true ? 'selected' : 'entry onHover'));

                    var added = {};


                    $.each(row,function(k,v){

                        var l = k.replace($join_to+'_','');

                        var original_l = l;

                        var row_entry = mycz.ele.div('block w-100 fleft').attr("style",helpers.getStyle(original_l,'row'));

                        if(!mycz.helpers.array.contains($join_output,l)){
                            return true;
                        }

                        if(added[l]){
                            return true;
                        }
                        added[l] = true;

                        try {
                            if($col_struct.join_structure){
                                l = mycz.helpers.getText($col_struct.join_structure.cols[l].label);
                            } else {
                                l = mycz.helpers.getText(localCache[join_to][1][l].label);
                            }
                        } catch(err){}

                        row_entry.append(mycz.ele.div('col-md-4 fw-600 fellipsis',l).attr("style",helpers.getStyle(original_l,'key')));
                        row_entry.append(mycz.ele.div('col-md-8 fellipsis',helpers.getValue(v,original_l,$col_struct,id,row)).attr("style",helpers.getStyle(original_l,'val')));

                        div.append(row_entry);


                    });

                    if(btn !== false){
                        btn = mycz.helpers.isset(btn,true,true) ? btn : mycz.ele.btn('button-green fright',label("choose"),function(){
                            input.find("input").blur();
                            steps.select(id,joinSourceApplied == true ? '' : row);
                        });

                        if(join_allow_edit == true && mycz.ENV == 'ADMIN'){
                            div.append(mycz.ele.btn('button-f-new-blue button-small fright text-underline',mycz.ele.icon(icon.edit)+" "+mycz.helpers.getText({
                                en: 'Edit',
                                de: 'Bearbeiten'
                            }),function(){

                                steps.edit(id);
                            }))
                        }
                    }


                    div.append(btn);

                    if(returnDIV == true){
                        return div;
                    }
                    searchResults.append(div);
                },

                /**
                 * Resolve / Load the data with only an id
                 * @param id
                 * @param callback
                 */
                resolve: function(id,callback){


                    var successFunction = function(data){

                        if(!localCache[join_to]){
                            localCache[join_to] = {};
                        }

                        localCache[join_to] = data[join_to];

                        if(callback){
                            callback();
                        }

                    };

                    var filters = {
                        filters: {
                            id: id
                        }
                    };

                    if(mycz.ENV == 'ADMIN'){
                        mycz.request('Data/RFT/Get',{A: join_to,F:mycz.helpers.json.stringify(filters)}).success(function(data){
                            successFunction(data);
                        });
                    } else {
                        mycz.request('Data/RFT/Get',{
                            SourceORM: args.orm_name,
                            A: join_to,
                            F: mycz.helpers.json.stringify(filters),
                            GC: JSON.stringify({
                                URI: mycz.custom_modules.helpers.getAllUrlParameters(),
                                playWorkflowResults: {
                                    editId:args.editId
                                }
                            })
                        },'',function(data){
                            successFunction(data);
                        });
                    }

                },

                /**
                 * Select a value
                 * @param id int - Id
                 * @param row object - If passed, will display the object, instead of getting from "join_to"
                 */
                select: function(id,row){

                    selected = true;

                    searchResults.empty();

                    input.find("div.mycz-form-join-search-result-selected").remove();

                    /**
                     * It's possible, that we are using joins outside
                     * of zable or RFT. If we have a selected id passed when creating the form
                     * we need to get the data, to display the block.
                     * To enable this function, pass to the mycz.form() - args -> resolve_joins: true
                     */
                    var resolveFirst = false;

                    if(args.resolve_joins == true && !mycz.helpers.isset(row,true,true)){
                        if(!localCache[join_saved_source]){
                            resolveFirst = true;
                        } else {
                            if(!localCache[join_saved_source][0]){
                                resolveFirst = true;
                            } else {
                                if(!localCache[join_saved_source][0][args.edit_id]){
                                    resolveFirst = true;
                                }
                            }
                        }
                    }

                    if(resolveFirst == true){
                        steps.resolve(id,function(){
                            steps.select(id, localCache[join_to][0][id]);
                        });
                        return;
                    }

                    input.append(steps.show_row(id,row,mycz.ele.btn('button-blue fright',mycz.ele.icon('ion-android-sync')+" "+mycz.helpers.getText({
                        en: 'Change',
                        de: 'Ändern'
                    }),function(){
                        selected = false;
                        input.find("div.mycz-form-join-search-result-selected").remove();
                        steps.show_row(id,row)
                    }),true,true).attr("data-id",id));

                    self.helpers.changed(input);

                },

                /**
                 * Edit existing
                 * @param id
                 */
                edit: function(id){

                    loader.start();

                    mycz.request('Content/Get',{data:[join_to],id:id}).success(function(data){

                        loader.stop();

                        mycz.orm.registerData(join_to,id,data[join_to][0][id]);
                        mycz.orm.new(join_to,true,id,'','','',function(){

                            if(isEdit == true) {
                                $.each(join_output,function(n,k){
                                    localCache[join_saved_source][0][args.edit_id][join_to+'_'+k] = localCache[join_to][0][id][k];
                                });

                                /**
                                 * A little hack to trigger VUE change in zable ;-)
                                 */
                                try {
                                    if(localCache[join_saved_source][0][args.edit_id][col_name]){
                                        var save = localCache[join_saved_source][0][args.edit_id][col_name];
                                        localCache[join_saved_source][0][args.edit_id][col_name] = 'ZAPPTER-ROCKS';
                                        setTimeout(function(){
                                            localCache[join_saved_source][0][args.edit_id][col_name] = save;
                                        },10);
                                    }
                                } catch(err){ }
                            }

                            steps.select(id,localCache[join_to][0][id]);
                        });

                    });

                },

                /**
                 * New Entry
                 */
                new: function(){

                    mycz.orm.new(join_to,'',false,'','',function(f){
                        f.container.find("div.mycz-form-block[data-col='"+join_create_new_put+"'] input").val(input.find("input").val())
                    },function(data){

                        if(isEdit == true) {
                            $.each(join_output,function(n,k){
                                localCache[join_saved_source][0][args.edit_id][join_to+'_'+k] = data.new_row[0][data.id][k];
                            });
                        }

                        steps.select(data.id,(isEdit == true ? '' : data.new_row[0][data.id]));
                    })
                }
            };

            var input = self.form_types.text(function(val,ele){

                /*if($.trim(val) == ''){
                    return;
                }*/

                typing = true;

                setTimeout(function(){
                    typing = typing == 'running' ? 'running' : 'no';
                },1000);

                if(searchVal == ele.val()){
                    return;
                }

                searchResults.addClass("searching");

                setTimeout(function(){

                    if(typing == true || typing == false || selected == true || typing == 'running'){
                        return;
                    }

                    typing = 'running';

                    var successFunction = function(data){

                        searchResults.removeClass("searching");

                        if(!localCache[join_to]){
                            localCache[join_to] = {};
                        }

                        localCache[join_to] = data[join_to];

                        if(typing == 'running'){
                            setTimeout(function(){
                                typing = false;
                            },200);
                        }

                        var resultsFound = false;

                        if(data[join_to]){
                            if(data[join_to][0]){
                                if(Object.keys(data[join_to][0]).length>0){

                                    resultsFound = true;

                                    searchResults.empty();

                                    $.each(data[join_to][0],function(id,row){
                                        steps.show_row(id,row)
                                    })
                                }
                            }
                        }

                        if(resultsFound == false){
                            steps.no_results();
                        }
                    };

                    if(searchVal == ele.val()){
                        searchResults.removeClass("searching");
                        if(typing == 'running'){
                                typing = false;
                        }
                        return;
                    }

                    searchVal = ele.val();

                    var filters = {
                        search: searchVal
                    };

                    /**
                     * Put join_filters
                     */
                    if(mycz.helpers.isset(join_filters,true,true)){
                        $.each(join_filters,function(k,v){
                            if(contains(v,'eval:')){
                                v = eval(v.replace("eval:",""));
                            }
                            if(!filters.filters){
                                filters.filters = {};
                            }

                            filters.filters[k] = v;
                        })
                    }

                    if(mycz.ENV == 'ADMIN'){
                        mycz.request('Data/RFT/Get',{A: join_to,F:mycz.helpers.json.stringify(filters)}).success(function(data){
                            successFunction(data);
                        });
                    } else {
                        mycz.request('Data/RFT/Get',{SourceORM: args.orm_name, A: join_to,F:mycz.helpers.json.stringify(filters), GC: JSON.stringify({
                                URI: mycz.custom_modules.helpers.getAllUrlParameters(),
                                playWorkflowResults: {
                                    editId:args.editId
                                }
                            })},'',function(data){
                            successFunction(data);
                        });
                    }

                },1200);


            });

            if(join_create_new == true){
                input.append(mycz.ele.btn('button-small p-5 button-green pos-absolute fw-600 z-index-1',mycz.ele.icon(icon.add)+" "+label("new"),function(){
                    steps.new();
                }).css("top","-10px").css("right","0px"))
            }

            input.addClass("pos-relative").find("input").attr("type","search").val('');

            input.append(searchResults);

            if(mycz.helpers.isset(self.helpers.getVal(),true,true) && self.helpers.getVal() != 0){
                steps.select(self.helpers.getVal());
            } else {

            }

          /*  setTimeout(function(){
                input.find("input").css("display","none").val('').trigger("keyup");
            },100);*/

            return input;
        },

        /**
         * Search in frontend
         * @returns {*}
         */
        frontend_search: function(){
            var show = function(content){
                clear();
                input.after(mycz.ele.div('mycz-search-results pos-absolute block')
                    .append(mycz.ele.div('block w-100 fleft pos-relative p-20')
                        .append($(mycz.ele.icon(icon.times+" pos-absolute tright pointer f-30")).attr("style","top:-10px;right-10px;").click(function(){
                            input.val('');
                            $(this).parent().parent().remove();
                        }))
                        .append(content)));
            }

            var clear = function(){
                input.parent().find("div.mycz-search-results").remove();
            }

            var no_results = function(){
                show(label("no_results"));
            }

            var show_results = function(result,show_cols,matched,selectable){
                var div = mycz.ele.div('block w-100 fleft');
                $.each(matched,function(id,nn){
                    var row = mycz.ele.div('onHover search-result-row selectable-'+selectable).click(function(){
                        onSelect($(this),selectable)
                    }).attr("data-id",id);
                    for(var i=0;i<show_cols.length;i++){
                        row.append(mycz.ele.div('inline-block fleft ',result[id][show_cols[i]]).css("width",(100/show_cols.length*2)+"%"));
                    }
                    div.append(row);
                })
                show(div);
            }

            var onSelect = function(ele,selectable){
                switch(true){
                    case ele.hasClass("selected"):
                        ele.removeClass("selected");
                        self.helpers.getBlock(ele).find("div.selection span.badge[data-id='"+ele.attr("data-id")+"']").remove();
                    break;
                    case selectable == 1:
                        ele.parent().find("div.search-result-row.selected").removeClass("selected");
                        ele.addClass("selected");
                        self.helpers.getBlock(ele).find("div.selection").html('');
                        addSelection(ele,ele.attr("data-id"));
                        ele.parents('div.mycz-search-results').find("i."+icon.times).trigger("click");
                    break;
                    case selectable == 'unlimited':
                        ele.addClass("selected");
                        addSelection(ele,ele.attr("data-id"));
                    break;
                    default:


                }
            }

            var addSelection = function(ele,id){
                var result = window[self.helpers.getOption(ele,'search_scope')][self.helpers.getOption(ele,'search')];
                var selected_show_columns = self.helpers.getOption(ele,'selected_show_columns');
                if(self.helpers.getBlock(ele).find("div.selection span.badge[data-id='"+id+"']").length==0){
                    var content = mycz.ele.div('block w-100 fleft');
                    var show_labels = self.helpers.getOption(ele,'selected_show_labels');

                    $.each(selected_show_columns,function(nn,i){
                        if(show_labels == true){
                            content.append(mycz.ele.div('inline-block fleft w-50 fw-600',label(i)))
                            content.append(mycz.ele.div('inline-block fleft w-50',result[id][i]))
                        } else {
                            content.append(mycz.ele.div('inline-block fleft w-100',result[id][i]))
                        }
                    });
                    self.helpers.getBlock(ele).find("div.selection").append(mycz.ele.div('f-18 fw-400 p-10 b-radius-5 inline-block fleft onHover pointer m-5 '+self.helpers.getOption(ele,'selection_class'),content)
                        .attr("data-id",id)
                        .css("min-width","50%")
                        .click(function(){
                            $(this).remove();
                        }));
                }
            }

            var input = self.form_types.text(function(val,ele,event){
                var min = self.helpers.getOption(ele,'search_min_length');
                if(val.length<min){
                    show(label("validate_X_chars",'',min));
                    return;
                }
                try {
                    var result = window[self.helpers.getOption(ele,'search_scope')];
                    var search_columns = self.helpers.getOption(ele,'search_columns');

                    if(!result){
                        throw new Error('frontend_search failed - scope not found')
                    }

                    result = result[self.helpers.getOption(ele,'search')];
                    if(!result){
                        throw new Error('frontend_search failed - object in scope not found')
                    }

                    if(!mycz.helpers.isset(search_columns) || search_columns.length==0){
                        throw new Error('frontend_search failed - no columns assigned')
                    }

                    var keys = Object.keys(result);
                    var length = keys.length;
                    var matched = {};
                    for(var i=0;i<length;i++){
                        var row_id = keys[i];
                        var row = result[row_id];
                        for(var j=0;j<search_columns.length;j++){
                            var s = search_columns[j];
                            if(contains(row[s],val,false,true)){
                                matched[row_id] = true;
                            }
                        }
                    }
                    if(Object.keys(matched).length==0){
                        no_results();
                        return;
                    }
                    show_results(result,self.helpers.getOption(ele,'search_show_columns'),matched,self.helpers.getOption(ele,'selectable'));
                } catch(err){
                    console.warn(err);
                }
            });
            input.attr("type","search").val('').attr("placeholder",label("search")+"...").attr("autocomplete","off");
            self.current.block.append(mycz.ele.div('selection block w-100 fleft p-10').css("min-height","40px"))
     //       self.current.block.prepend($(mycz.ele.icon(icon.search+" error-grey pos-absolute")).css("left","14px").css("top","120px"))
            if(mycz.helpers.isset(self.helpers.getVal(),true)){
                $.each(mycz.helpers.split(self.helpers.getVal(),',',true),function(nn,i){
                    addSelection(self.current.block,i);
                })
            }
            return input;
        },

        /**
         * Add a grid
         */
        grid: function(){

            var this_block = self.current.block;

            var div = mycz.ele.div('block w-100 fleft o-scroll').css("max-height","400px");

            var tooltip_div = null;

            /**
             * Add a search input
             */
            var searchable = self.helpers.getOption(div,'searchable');

            if(self.form_data.grid[self.current.values]){

                if(self.current.values == 'icons'){
                    searchable = true;
                }

                self.current.values = self.form_data.grid[self.current.values]();
            }

            var values = mycz.helpers.isObject(self.current.values) ? $.extend(true,{},self.current.values) : self.current.values;

            /**
             * Shows only the selected entries
             * Entries can be selected by pressing the blue button "Select from exisiting"
             */
            var grid_show_only_selected = self.helpers.getOption(div,'grid_show_only_selected');

            /**
             * An array to disable some edits of specific id.
             * For example for the buildings "default" (id 1) which is not editable.
             */
            var grid_disable_edit = self.helpers.getOption(div,'grid_disable_edit');

            /**
             * Allow edit will show a tip to edit the grid-entry.
             */
            var allow_edit = self.helpers.getOption(div,'localCache_allow_edit');

            /**
             * Amount of selectable grid entries
             */
            var selectable = self.helpers.getOption(div,'selectable');

            var no_scroll = self.helpers.getOption(div,'no_scroll');

            if(no_scroll == true){
                div.removeClass("o-scroll").css("max-height","");
            }

            /**
             * The existing values will be clicked after creating the grid,
             * putting this setting to false, will skip the onClick function
             */
            var trigger_onClick_onInit = self.helpers.getOption(div,'trigger_onClick_onInit');

            /**
             * Custom OnClick function if required.
             */
            var onClick = self.helpers.getOption(div,'onClick');

            var add_immediatly = false;

            var initiated = false;

            var helpers = {
                add_button: function(btn,id){
                    if(div.find("div.grid_btns").length==0){
                        div.append(mycz.ele.div('grid_btns pos-absolute tright').css("margin","0px 15px"));
                    }
                    btn.attr("id",id);
                    if(div.find("div.grid_btns").find('#'+id).length==0){
                        div.find("div.grid_btns").append(btn);
                    }
                }
            };

            var select_taphold_value = function(key,tapholdValue){

                try {

                    var row = div.find("div.grid-entry[data-key='"+key+"']");

                    if(!row.hasClass("checked")){
                        row.addClass("checked");
                    }

                    var vals = values[key].taphold[tapholdValue];

                    row.attr("data-original-value",row.attr("data-value"));
                    row.find("span.badge").remove();
                    row.append(mycz.ele.new('span',mycz.helpers.getText(vals.label),vals.class+" badge",{
                        'data-taphold-value':tapholdValue
                    }));

                    if(vals.button_bg){
                        row.find("span.badge").attr("style","background-color:"+vals.button_bg+"!important;color:"+vals.button_color+"!important;");
                    }

                    mycz.plugins.tooltipster.destroy(row);

                } catch(err){}

            };

            var steps = {

                /**
                 * We can access localCache from here
                 * to display a grid
                 */
                islocalCache: function(filterID){

                    if(values == 'localCache'){

                        var filters = self.helpers.getOption(div,'localCache_filters');

                        filters = mycz.helpers.isset(filters,true,true) ? $.extend(true,{},filters) : {};

                        if(mycz.helpers.isset(filterID,true)){
                            filters['id'] = {
                                filter_type:'AND',
                                filter_data:[filterID]
                            }
                        }

                        var temp = self.form_types.localCache(true,mycz.helpers.isset(filters,true) ? filters : '',div);

                        /**
                         * Defining localCache
                         * In ADMIN we have to add index 0
                         */
                        var l = window[self.helpers.getOption(div,'localCache_scope')][self.helpers.getOption(div,'localCache')];

                        if(mycz.ENV == 'ADMIN'){
                            l = l[0];
                        }

                        values = {};

                        $.each(temp,function(i,v){

                            values[i] = {
                                label:v,
                                icon:self.helpers.getOption(div,'defaultIcon')
                            };

                            if(self.helpers.getOption(div,'localCache_icon') != false){

                                values[i].icon = l[i][self.helpers.getOption(div,'localCache_icon')];

                                if(!mycz.helpers.isset(values[i].icon,true,true)){
                                    values[i].icon = self.helpers.getOption(div,'defaultIcon');
                                }

                            } else {
                                values[i].icon = self.helpers.getOption(div,'defaultIcon');
                            }


                            if(self.helpers.getOption(div,'localCache_img_key') != ''){

                                values[i].img = l[i][self.helpers.getOption(div,'localCache_img_key')];

                                if(!mycz.helpers.isset(values[i].img,true)){
                                    delete values[i].img;
                                } else {
                                    if(self.helpers.getOption(div,'localCache_img_key_relative') == true){
                                    } else {
                                        values[i].img = self.envFunction('picture.get')(values[i].img);
                                    }
                                }

                            }

                        });
                    }

                },

                /**
                 * Append a search input
                 */
                isSearchable: function(){
                    if(searchable == true){

                        var searching = false;
                        div.append(mycz.ele.input('search','text','',{placeholder:label("search")},function(v){
                            if(searching == true){
                                return;
                            }

                            searching = true;

                            setTimeout(function(){
                                v = div.find("input[name='search']").val();
                                div.find(".grid-entry").addClass("displayNone");
                                if(!mycz.helpers.isset(v,true)){
                                    searching = false;
                                    div.find(".grid-entry").removeClass("displayNone");
                                    return;
                                }
                                div.find(".grid-entry").each(function(){
                                    if(contains($(this).children("div").text(),v) || contains($(this).attr("data-value"),v)){
                                        $(this).removeClass("displayNone");
                                    }
                                });
                                searching = false;
                            },800)

                        }));
                    }

                },

                /**
                 * Creating Grid
                 */
                create_grid: function(){

                    if(values){

                        $.each(values,function(k,vals){

                            var row = mycz.ele.div('inline-block fleft p-5 pointer grid-entry')
                                .attr("style",self.helpers.getOption(div,'grid_style'))
                                .addClass(self.helpers.getOption(div,'grid_class'))
                                .attr("data-value",(vals.value ? vals.value : k))
                                .attr("data-key",k)
                                .css("width",self.helpers.getOption(div,'grid_width'))
                                .css("height",self.helpers.getOption(div,'grid_height'));

                            var me = row;

                            switch(true){
                                case mycz.helpers.isset(vals.img,true):
                                    row.append(mycz.ele.div('block w-100 fleft text-center grid-entry-image')
                                        .append(mycz.ele.div('inline-block b-radius-50 o-hidden')
                                            .attr("style",self.helpers.getOption(div,'localCache_img_css'))
                                            .css("width","36px")
                                            .css("height","37px")
                                            .css("background-image","url("+vals.img+")")
                                            .css("background-size","100%")));
                                break;
                                case mycz.helpers.isset(vals.icon,true):
                                    row.append($(mycz.ele.icon(vals.icon+' block w-100 fleft text-center grid-entry-icon'))
                                        .attr("style",self.helpers.getOption(div,'icon_css'))
                                        .css("font-size",self.helpers.getOption(div,'icon_size'))
                                        .css("color",(vals.color ? vals.color : '#555')));
                                break;
                                case mycz.helpers.isset(vals.text,true):
                                    row.append($(mycz.ele.div('block grid-text w-100 fleft text-center',vals.text))
                                        .attr("style",self.helpers.getOption(div,'icon_css'))
                                        .css("font-size",self.helpers.getOption(div,'icon_size'))
                                        .css("color",(vals.color ? vals.color : '#555')));
                                break;
                            }

                            var localize = self.helpers.getOption(div,'localCache_localize');

                            localize = self.helpers.getOption(div,'localCache_no_localize') == true ? false : localize;

                            var title = vals.label ? mycz.helpers.getText(vals.label,!localize,localize) : vals.name;

                            row.append(mycz.ele.div('block w-100 fleft b-radius-2 p-5 fellipsis text-center b-radius-10 grid-entry-title',title)
                                .attr("style",self.helpers.getOption(div,'font_style'))
                                .css("font-size",self.helpers.getOption(div,'font_size'))
                                .css("color",self.helpers.getOption(div,'font_color'))
                                .css("background-color",self.helpers.getOption(div,'font_bg_color')));

                            /**
                             * Taphold allows to modify the grid-entry value
                             * Used in ingredients.
                             */
                            var taphold = function(){};

                            /**
                             * We can put taphold
                             * (works only in mobile app)
                             */
                            if(vals.taphold){

                                taphold = function(){

                                    if(row.hasClass("no-taphold")){
                                        return;
                                    }

                                    row.addClass("taphold");

                                    var content = mycz.ele.div('block w-100 fleft p-10 ').css("padding","30px 10px 20px");

                                    $.each(vals.taphold,function(key,vals){

                                        var btn = mycz.ele.btn(vals.class+" w-100 button-bigger m-bottom-10 text-left",mycz.ele.icon(vals.button_icon)+" "+mycz.helpers.getText(vals.label),function(){

                                            select_taphold_value(k,key);
                                            self.helpers.changed(row);

                                        });

                                        content.append(btn);

                                        if(vals.button_bg){
                                            btn.attr("style","background-color:"+vals.button_bg+"!important;color:"+vals.button_color+"!important;");
                                        }
                                    });

                                    mycz.plugins.tooltipster.container(row,'bottom',content,'',180,'',{
                                        no_close_button:true,
                                        auto_destroy:true
                                    });

                                };

                             /*   mycz.plugins.swipe.bind(row,'hold',function(){
                                    taphold($(this));
                                },300); */

                            }

                            row.click(function(){

                                var me = $(this);

                                var hasTaphold = function(){

                                    try {
                                        if(vals.taphold){
                                            if(Object.keys(vals.taphold).length>0){
                                                return true;
                                            }
                                        }
                                    } catch(err){}

                                    return false;

                                }();

                                var noTaphold = false;

                                if(hasTaphold == true && $(this).hasClass("double-tap-delay") && noTaphold == false){
                                    taphold();
                                    return;
                                }

                                if(hasTaphold == true && !$(this).hasClass("double-tap-delay")){

                                    $(this).addClass("double-tap-delay");

                                    var me = $(this);

                                    setTimeout(function(){

                                        me.removeClass("double-tap-delay");

                                    },300);
                                }

                                if(row.attr("data-original-value")){
                                    row.attr("data-value",row.attr("data-original-value"));
                                    row.removeAttr("data-original-value");
                                    row.find("span.badge").remove();
                                }

                                /**
                                 * Destroying all other tooltipster
                                 */
                                this_block.find("div.grid-entry.tooltipstered:not(.taphold)").each(function(){
                                    mycz.plugins.tooltipster.destroy($(this));
                                });

                                /**
                                 * selectable = custom + onClick (completely own function)
                                 */
                                if(selectable == 'custom'){
                                    if(mycz.helpers.isset(onClick,true,true)){
                                        if(!mycz.helpers.isFunction(onClick)){
                                            eval('onClick = '+onClick);
                                        }
                                    }
                                    onClick($(this).attr("data-value"),self);
                                    return;
                                }

                                /**
                                 * Allow Edit
                                 */
                                if(mycz.helpers.isset(allow_edit,true) == true && allow_edit != false && add_immediatly != true && !mycz.helpers.array.contains(grid_disable_edit,parseInt(me.attr("data-value")))){
                                    var content = mycz.ele.div('p-20');
                                    content.append(mycz.ele.btn('button-small button-blue',mycz.ele.icon(icon.edit)+" "+label("edit"),function(){
                                        mycz.plugins.tooltipster.destroy(me);
                                        mycz.orm.new(allow_edit,true,me.attr("data-value"),me.find("div:last").text(),'','',function(data){
                                            me.remove();
                                            values = 'localCache';
                                            run(data.id);
                                        });
                                    }));
                                    mycz.plugins.tooltipster.container(me,'bottom',content,'',200,'',{
                                        auto_destroy:true
                                    });
                                }

                                switch(true){
                                    case selectable == 'none':
                                    break;
                                    case row.hasClass("checked"):
                                        row.removeClass("checked");
                                    break;
                                    case selectable == 'unlimited':
                                        row.addClass("checked");
                                    break;
                                    case selectable == 1:
                                        self.helpers.getBlock(row).find("div.grid-entry.checked").removeClass("checked");
                                        row.addClass("checked");
                                    break;
                                    case selectable > 1:

                                        var current_selected = self.helpers.getBlock(row).find("div.grid-entry.checked").length;

                                        if(current_selected == selectable){
                                            self.helpers.getBlock(row).find("div.grid-entry.checked:last").removeClass("checked");
                                        }
                                        row.addClass("checked");
                                    break;
                                }

                                /**
                                 * Changed
                                 */
                                self.helpers.changed($(this));

                                /**
                                 * Only onClick -> keeps default click behavior + add your own
                                 */
                                if(mycz.helpers.isset(onClick,true,true)){
                                    if(!mycz.helpers.isFunction(onClick)){
                                        eval('onClick = '+onClick);
                                    }
                                    if(initiated == false && trigger_onClick_onInit === false){
                                    } else {
                                        onClick($(this).attr("data-value"),self,row.hasClass("checked"));
                                    }
                                }
                            });

                            div.append(row);

                        });
                    }
                },

                /**
                 * When having grid_show_only_selected,
                 * a search button will appear to select the values.
                 */
                show_only_selected: function(){

                    if(grid_show_only_selected == true){

                        if(initiated == false){
                            tooltip_div = div;
                        }

                        div = this_block.find("div.grid-selectable").length > 0 ? this_block.find("div.grid-selectable") : mycz.ele.div('block w-100 fleft o-scroll grid-selectable').css("max-height","400px").css("min-height","200px");


                        /**
                         * Unbinding default grid-entry-click
                         * and showing a tooltipster instead
                         */
                        (initiated == false ? tooltip_div : div).find("div.grid-entry").unbind().click(function(){

                            var me = $(this);

                            var move = function(){
                                if(me.parents("div.grid-selectable").length>0){
                                    me.appendTo(tooltip_div);
                                } else {
                                    me.appendTo(div);
                                }
                            };

                            if(mycz.helpers.isset(allow_edit,true) == true && allow_edit != false && add_immediatly != true){

                                var content = mycz.ele.div('p-20');
                                content.append(mycz.ele.btn('button-small '+(me.parents("div.grid-selectable").length>0 ? 'button-red' : 'button-green'),(me.parents("div.grid-selectable").length>0 ? label("unselect") : label("choose")),function(){
                                    mycz.plugins.tooltipster.destroy(me);
                                    move();
                                }));
                                content.append(mycz.ele.btn('button-small button-blue',mycz.ele.icon(icon.edit)+" "+label("edit"),function(){
                                    mycz.plugins.tooltipster.destroy(me);
                                    mycz.plugins.tooltipster.destroy(search_btn);
                                    mycz.orm.new(allow_edit,true,me.attr("data-value"),me.find("div:last").text(),'','',function(data){
                                        me.remove();
                                        values = 'localCache';
                                        run(data.id);
                                    });
                                }));
                                mycz.plugins.tooltipster.container(me,'bottom',content,'',200,'',{
                                    auto_destroy:true
                                });
                            } else {
                                move();
                            }

                        });

                        var div_holder = $("<div />");

                        var search_btn = mycz.ele.btn('button-new-blue button-small',mycz.ele.icon(icon.search)+" "+label("choose_options"),function(){
                            var tt = mycz.plugins.tooltipster.container($(this),'right','','',300,'',{
                                closeFn: function(){
                                    tooltip_div.appendTo(div_holder);
                                },
                                auto_destroy:true,
                            });
                            tooltip_div.css("padding","20px").appendTo(tt);
                            var my_block = $(this).parents("div.mycz-form-block:first");
                            var me = $(this);
                            var t = setInterval(function(){
                               if(my_block.hasClass("displayNone")){
                                   mycz.plugins.tooltipster.destroy(me);
                                   clearInterval(t);
                               }
                            },100);
                        });
                        helpers.add_button(search_btn,'search');
                    }
                },

                /**
                 * Add existing values
                 */
                existing_values: function(){
                    var $use_div = grid_show_only_selected == true ? tooltip_div : div;

                    if(isEdit == false){
                        if(self.helpers.getVal() == 'all'){
                            $use_div.find("div.grid-entry").trigger("click");
                            return;
                        }
                    }

                    if(mycz.helpers.isset(self.helpers.getVal(),true)){
                        $.each(mycz.helpers.split(self.helpers.getVal(),",",true),function(nn,i){

                            add_immediatly = true;

                            var defaultGrid = true;

                            if(contains(i,":")){
                                if(i.split(":")[1] == 1){
                                    i = i.split(":")[0];
                                } else {
                                    select_taphold_value(i.split(":")[0],i.split(":")[1]);
                                    defaultGrid = false;
                                }
                            }

                            if(defaultGrid == true){
                                $use_div.find("div.grid-entry[data-value='"+i+"']").addClass("no-taphold").trigger("click");
                                $use_div.find("div.grid-entry[data-value='"+i+"']").removeClass("no-taphold");
                            }

                            add_immediatly = false;
                        })
                    }
                },

                /**
                 * Adds a new button
                 */
                new: function(){
                    if(mycz.helpers.isset(self.helpers.getOption(div,'localCache_create_new'),true) && mycz.ENV != 'MOBILE'){
                        var new_form = self.helpers.getOption(div,'localCache_create_new');
                        if(new_form != false){
                            helpers.add_button(mycz.ele.btn('button-small new-'+new_form+' button-green',mycz.ele.icon(icon.plus)+" "+label("new"),function(){
                                mycz.orm.new(new_form,false,'','','','',function(data){
                                    values = 'localCache';
                                    run(data.id);
                                    setTimeout(function(){
                                        add_immediatly = true;
                                        if(grid_show_only_selected != true){
                                            this_block.find("div.grid-entry[data-value='"+data.id+"']").trigger("click");
                                        }
                                        add_immediatly = false;
                                    },200);
                                });
                            }),'new-entry');
                        }
                    }
                },

                /**
                 * Enable sortable
                 */
                sortable: function(){
                    if(grid_show_only_selected == true){
                        mycz.plugins.sortable.ele(div,'','','',{
                            no_placeholder:true,
                            auto_placeholder_size:true,
                            all_axis:true
                        })
                    }
                }
            };

            var run = function(filterID){
                steps.islocalCache(filterID);
                steps.isSearchable();
                steps.create_grid();
                steps.show_only_selected();
                steps.existing_values();
                steps.new();
                initiated = true;
            };

            run();
            steps.sortable();

            return div;
        },

        /**
         * Add a delete button
         * @returns {JQuery}
         */
        delete: function(){

            self.current.block.addClass("force-display append-me-to-footer");
            self.current.block.find("span").remove();
            self.current.block.addClass("pointer").css("z-index","10");
            self.current.block.attr("style","width:40px;min-width:80px;min-height:40px;height:40px;float:left!important;"+(isEdit != true ? 'display:none!important;' : ''));

            if(self.isMobile == true){
                self.current.block.addClass("pos-absolute bleft");
            }

            return mycz.ele.div('button button-rounded text-center button-red '+(isEdit == false ? 'displayNone' : ''),$(mycz.ele.icon(icon.trash)).css("float","none")).click(function(){

                var m = mycz.modal.new(label("are_you_sure"),'',true,[
                    mycz.ele.btn('button-red',label("delete"),function(){
                        var cond = self.onDeleteCondition();

                        if(cond===true){
                            self.onDelete();
                            mycz.modal.close(m);
                            mycz.modal.closeLast();
                        } else {
                            mycz.modal.closeLast();
                            mycz.modal.new("Ups!",mycz.ele.alert('alert-info',cond),true);
                        }

                    })
                ]);

            });
        },

        /**
         * Add a toggle
         * @returns {JQuery}
         */
        boolean: function(){

            var isOn = self.helpers.getVal() == 1;

            var onIcon = mycz.helpers.isset(self.helpers.getOption('','booleanIcon'),true,true) ? self.helpers.getOption('','booleanIcon')+' boolean-on' : 'ion-toggle-filled error-new-blue boolean-on';
            var offIcon = mycz.helpers.isset(self.helpers.getOption('','booleanIconOff'),true,true) ? self.helpers.getOption('','booleanIconOff')+' boolean-off' : 'ion-toggle color-grey boolean-off';

            var booleanIconSize = mycz.helpers.isset(self.helpers.getOption('','booleanIconSize'),true,true) ? self.helpers.getOption('','booleanIconSize') : '50px';

            var div = mycz.ele.div('block w-100 fleft pointer '+(self.helpers.getOption('','disabled') == true ? 'disabled' : '')).append($(mycz.ele.icon('inline-block '+(isOn == true ? onIcon : offIcon)))
                .css("font-size",booleanIconSize)
                .click(function(){

                    if($(this).parent().hasClass("disabled")){
                        return;
                    }

                    if($(this).hasClass("boolean-on")){
                        $(this).removeClass(onIcon).addClass(offIcon);
                    } else {
                        $(this).addClass(onIcon).removeClass(offIcon);
                    }

                    self.helpers.changed($(this));

            }).css("height","20px").css("margin-left","10px").css("margin-top","-10px"));

            /**
             * Special behaviour for "disabled" columns
             */
            if(self.helpers.getOption('','name') == 'disabled'){

                self.current.block.addClass("force-display append-me-to-footer");

                if(self.isMobile == true){
                    div.addClass("pos-relative").css("top","-14px");
                }

                self.current.block.attr("style","width:100px!important;min-width:100px!important;bottom:50px;left:0px").css("min-height","40px").css("height","40px");
                self.current.block.find("span").css("min-height","0px");

                if(isOn == true){
                    self.current.block.find("span").addClass("badge button-new-blue  b-radius-20");
                } else {
                    self.current.block.find("span").addClass("badge button-grey b-radius-20");
                }

                if(self.isMobile == false){
                    self.current.block.css("left","20px");
                }

            }

            return div;
        },

        /**
         * Add a gallery button
         */
        gallery: function(){
            var value = self.helpers.getVal();

            var gallery = self.helpers.getOption('','gallery');

            var browse_btn = mycz.ele.icon('fa fa-photo')+" "+label("open_gallery");

            var no_btn = mycz.ele.icon(icon.times)+" "+label("no_picture");

            /**
             * The preselected_picture can be a path / url to a picture
             * When setted, and user clicks on open gallery - it will be automatically
             * putted into croppie.
             */
            var preselected_picture = self.helpers.getOption('','preselected_picture');

            if(mycz.helpers.isset(preselected_picture,true,true)){
                if(contains(preselected_picture,'eval: ')){
                    preselected_picture = eval(preselected_picture.replace('eval: ',''))
                }
            }

            switch(gallery){
                case 'docs':
                    browse_btn = mycz.ele.icon('fa fa-folder-open-o')+" "+label("open_documents");
                    no_btn = mycz.ele.icon(icon.times)+" "+label("no_doc");
                break;
                case 'videos':
                    browse_btn = mycz.ele.icon('fa fa-play-circle-o')+" "+label("open_gallery_video");
                    no_btn = mycz.ele.icon(icon.times)+" "+label("no_video");
                break;
            }

            var div = mycz.ele.div();
            div.append(mycz.ele.div('pictureHolder block j-shadow m-10').css("max-width","200px").click(function(){
                div.find("a.zapp-btn.button-zappter").trigger("click");
            }));

            var unselected_photo = function(){
                div.find("div.pictureHolder").html(mycz.ele.div('col-md-12 block text-center pointer',mycz.ele.icon('fa fa-photo f-50')));
                div.find("input[type='hidden']").remove();
            };

            if(mycz.helpers.isset(value,true)){
                div.find("div.pictureHolder").append('<img src="'+self.envFunction('picture.get')(value)+'">');
                div.append(mycz.ele.input('','hidden',value));
            } else {
                div.find("div.pictureHolder").append(unselected_photo());
            }

            var btn_div = mycz.ele.div('block w-100 fleft');

            /**
             * Button to choose picture
             */
            btn_div.append(mycz.ele.btn('button-zappter form-gallery-button',browse_btn,function(){
                mycz.gallerio.show(gallery,function(id){
                    div.find("input").remove();
                    div.append(mycz.ele.input('','hidden',id).attr("value",id));
                    div.find("div.pictureHolder").html('<img src="'+self.envFunction('picture.get')(id)+'">');
                },{
                    preselected_picture: (mycz.helpers.isset(value,true,true) ? '' : preselected_picture)
                });
            }));

            /**
             * Button to unset picture
             */
            btn_div.append(mycz.ele.btn('button-grey',no_btn,function(){
                unselected_photo();
            }));

            div.append(btn_div);

            return div;
        },

        /**
         * Search locally by tags
         * @returns
         */
        searchByTags: function(){
            var searchByTags = self.helpers.getOption('','searchByTags');
            var div = mycz.ele.div('searchBytags');

            var actions = {
                /**
                 * Function when seleting from search result
                 * @param id
                 * @param container
                 */
                add: function(id,container){
                    container = mycz.helpers.isset(container,true) ? container : div;
                    container.find('span.badge[data-value="'+id+'"]').remove();
                    var badge = mycz.ele.badge('button-dark ellipsis pos-relative fleft o-visible m-2',locale(mycz.cache.get(searchByTags.searchIn,searchByTags.searchOutputColumn,'',id)),function(){
                        $(this).remove();
                    },{'data-value':id}).css("width","100px");
                    badge.append($(mycz.ele.icon(icon.times+" z-index-1 fright pos-absolute tright button-red b-radius-50")).attr("style","top:-6px;right:-6px;width:15px;height:15px;padding-top:2px;"));
                    container.append(badge)
                },
                /**
                 * Function when clicking selected values
                 * @param id
                 * @param container
                 */
                remove: function(id,container){
                    container = mycz.helpers.isset(container,true) ? container : div;
                    container.find('span.badge[data-value="'+id+'"]').remove();
                }
            };

            /**
             * When in edit mode, add all current values
             */
            var value = [];
            if(isEdit == true){
                value = mycz.helpers.split(self.helpers.getVal(),',',true);
                $.each(value,function(nn,i){
                    actions.add(i);
                })
            }

            /**
             * Creating searchbox
             */
            var searchBox = {};
            searchBox[searchByTags.searchIn] = {};
            searchBox[searchByTags.searchIn]['c'] = searchByTags.searchInColumns;
            searchBox[searchByTags.searchIn]['result'] = [];
            searchBox[searchByTags.searchIn]['onClick'] = function(data_id){
                actions.add(data_id);
            };
            var insert = mycz.search.box(searchBox,{
                btn:mycz.ele.icon(icon.add)+" "+label("add"),
                output:searchByTags.searchOutputColumn,
                style:'max-height:200px',
                relative:true
            });

            /**
             * Adding an additional button
             * to show all at once
             */
            var btn = mycz.ele.btn('button-small fright m-2 button-blue',mycz.ele.icon(icon.search)+" "+label("make_more_height"),function(){
                var me = $(this);
                if(me.hasClass("button-dark")){
                    me.addClass("button-blue").removeClass("button-dark");
                    stop_tut();
                } else {
                    me.addClass("button-dark").removeClass("button-blue");
                    var pop = mycz.plugins.tooltipster.container(me,'right','','',250,'',{
                        closeFn: function(){
                            me.addClass("button-blue").removeClass("button-dark");
                        }
                    });
                    if(searchByTags.parent == true){
                        var add = function(id,exists,container){
                            var t = locale(mycz.cache.get(searchByTags.searchIn,searchByTags.searchOutputColumn,'',id));
                            var badge = mycz.ele.btn('button-no-bg w-100 ellipsis pos-relative fleft m-2 text-left',mycz.ele.icon('ion-arrow-right-b expander')+" "+mycz.ele.icon('checker '+(exists==true?icon.checkbox_checked:icon.checkbox))+" "+t,function(){

                            },{'data-value':id,title:t,alt:t}).css("width","100px");
                            badge.find("i.checker").click(function(){
                                if($(this).hasClass(icon.checkbox_checked)){
                                    actions.remove(id);
                                } else {
                                    actions.add(id);
                                };
                                $(this).toggleClass(icon.checkbox_checked).toggleClass(icon.checkbox);
                            });
                            badge.find("i.expander").click(function(){
                                if($(this).hasClass("ion-arrow-right-b")){
                                    create_menu($(this).parent(),id);
                                } else {
                                    $(this).find("a.zapp-btn").remove();
                                };
                                $(this).toggleClass("ion-arrow-right-b");
                                $(this).toggleClass("ion-arrow-down-b");
                            });
                            container.append(badge);
                        };
                        var create_menu = function(container,parent_id){
                            $.each(localCache[searchByTags.searchIn][0],function(i,vals){
                                if(vals.parent_id == parent_id){
                                    if(isEdit == true){
                                        if(!mycz.helpers.array.contains(value,i)){
                                            add(i,false,container);
                                        } else {
                                            add(i,true,container)
                                        }
                                    } else {
                                        add(i,false,container);
                                    }
                                }
                            });
                        };
                        create_menu(pop,0);
                    } else {
                        var add = function(id,exists){
                            var t = locale(mycz.cache.get(searchByTags.searchIn,searchByTags.searchOutputColumn,'',id));
                            var badge = mycz.ele.badge('button-'+(exists==true ? 'blue' : 'green')+' ellipsis pos-relative fleft m-2',t,function(){
                                $(this).remove();
                                if(pop.find("span.badge").length==0){
                                    stop_tut();
                                };
                                actions.add(id);
                            },{'data-value':id,title:t,alt:t}).css("width","100px");
                            pop.append(badge);
                        };
                        $.each(localCache[searchByTags.searchIn][0],function(i,vals){
                            if(opt.editMode == 1){
                                if(!mycz.helpers.array.contains(value,i)){
                                    add(i);
                                } else {
                                    add(i,true)
                                };
                            } else {
                                add(i);
                            };
                        });
                    }
                }
            });
            return mycz.ele.div().append(div).append(mycz.ele.div('block w-100 p-10').append(btn)).append(insert);
        },

        /**
         * Easily add deeper columns into one json
         * Can be endless. So you can put json type inside json type.
         */
        json: function(){

            var b = self.current.block;
            var name = self.helpers.getOption('','name');

            if(self.json_deepness == null){
                self.json_deepness = self.helpers.getJsonDeepness(b);
            }
            self.json_deepness.push(name);

            self.steps.cols(self.helpers.getOption('','jsonData'),parseInt(self.current.block.attr("data-depth"))+1,b);
            self.current.block = b;

            self.json_deepness = mycz.helpers.array.removeByValue(self.json_deepness,name);
            if(self.json_deepness.length==0){
                self.json_deepness = null;
            }
        },

        /**
         * Adding an input field, where you can type the
         * city, country or use the button to get the browsers location.
         */
        location: function(){
            return mycz.ele.location(self.current.col,self.helpers.getVal());
        },

        /**
         * Upload field
         */
        upload: function(){
            var opts = { };

            /**
             * File types seperated by comma *.pdf,*.xls
             */
            if(mycz.helpers.isset(self.helpers.getOption('','file_type'),true,true)){
                opts.accept = self.helpers.getOption('','file_type');
                opts.accept = opts.accept.split(";").join(",");
            }

            /**
             * Custom types, seperated list provided (basically same as file_type)
             */
            if(mycz.helpers.isset(self.helpers.getOption('','file_custom_types'),true,true)){

                if(!opts.accept){
                    opts.accept = [];
                } else {
                    opts.accept = opts.accept.split(",");
                }

                $.each(self.helpers.getOption('','file_custom_types').split(","),function(n,v){
                    opts.accept.push(v);
                });

                opts.accept = opts.accept.join(",");
            }

            /**
             * Max Size in MB
             */
            if(mycz.helpers.isset(self.helpers.getOption('','file_max_size'),true,true)){
                opts['data-mycz-max'] = self.helpers.getOption('','file_max_size');
            }

            /**
             * Like application/pdf - will get validated after selecting files
             */
            if(mycz.helpers.isset(self.helpers.getOption('','file_accept'),true,true)){
                opts['data-mycz-accept'] = self.helpers.getOption('','file_accept');
                opts['data-mycz-accept'] = opts['data-mycz-accept'].split(";").join(",");
            }

            /**
             * Custom mime types, seperated list provided (basically same as file_accept)
             */
            if(mycz.helpers.isset(self.helpers.getOption('','file_custom_accept'),true,true)){

                if(!opts['data-mycz-accept']){
                    opts['data-mycz-accept'] = [];
                } else {
                    opts['data-mycz-accept'] = opts['data-mycz-accept'].split(",");
                }

                $.each(self.helpers.getOption('','file_custom_accept').split(","),function(n,v){
                    opts['data-mycz-accept'].push(v);
                });

                opts['data-mycz-accept'] = opts['data-mycz-accept'].join(",");
            }

            /**
             * Folder to upload - default is "uploads"
             */
            if(mycz.helpers.isset(self.helpers.getOption('','upload_folder'),true,true)){
                opts['data-mycz-folder'] = self.helpers.getOption('','upload_folder');
            }   
            
            /**
             * Max Width for Pics
             */
            if(mycz.helpers.isset(self.helpers.getOption('','max_width'),true,true)){
                opts['data-mycz-max-width'] = self.helpers.getOption('','max_width');
            }

            /**
             * Max Height for Pics
             */
            if(mycz.helpers.isset(self.helpers.getOption('','max_height'),true,true)){
                opts['data-mycz-max-height'] = self.helpers.getOption('','max_height');
            }

            /**
             * Min Width for Pics
             */
            if(mycz.helpers.isset(self.helpers.getOption('','min_width'),true,true)){
                opts['data-mycz-min-width'] = self.helpers.getOption('','min_width');
            }

            /**
             * Min Height for Pics
             */
            if(mycz.helpers.isset(self.helpers.getOption('','min_height'),true,true)){
                opts['data-mycz-min-height'] = self.helpers.getOption('','min_height');
            }

            /**
             * No Transparency Flag
             */
            if(mycz.helpers.isset(self.helpers.getOption('','no_transparency'),true,true)){
                opts['data-mycz-no-transparency'] = self.helpers.getOption('','no_transparency');
            }


            /**
             * Required Flag
             */
            opts['required'] = self.helpers.getOption('','required') == true ? 1 : 0;

            /**
             * Multiple files flag
             */
            opts['multiple'] = self.helpers.getOption('','multiple') == true ? 1 : 0;

            /**
             * Preview flag
             */
            opts['preview'] = 1;

            var div = mycz.ele.fileUpload(self.current.col,opts,'','uploadFile');

            div.click(function(){

                self.helpers.changed(div);
            });

            var block = self.current.block;

            if(self.helpers.getOption('','html2canvas') == true){
                var onOpen = self.helpers.getOption('','html2canvas_onOpen');
                var onClose = self.helpers.getOption('','html2canvas_onClose');
                var beforePhoto = self.helpers.getOption('','html2canvas_beforePhoto');
                var afterPhoto = self.helpers.getOption('','html2canvas_afterPhoto');
                var selector = self.helpers.getOption('','html2canvas_selector');
                div.append(mycz.ele.btn('button-new-blue button-bigger button-tab m-10',label("take_photo"),function(){

                    var photoButton = mycz.ele.div('block w-100 fleft text-center pointer pos-fixed bright f-20 quicksand').css("z-index","9999999");

                    var photoTaken = function(canvas){

                        /**
                         * Retry
                         */
                        photoButton.html(mycz.ele.div('col-md-3 text-center p-20 button-red',mycz.ele.icon('ion-ios-refresh-empty')+" "+label("retry")).click(function(){
                            mycz.modal.close($(".photo-taken"));
                            readyToPhoto();
                        }));

                        /**
                         * Use this photo
                         */
                        photoButton.append(mycz.ele.div('col-md-9 text-center p-20 button-green',mycz.ele.icon(icon.check)+" "+label("choose")).click(function(){
                            mycz.modal.close($(".photo-taken"));
                            if(onClose){
                                onClose();
                            }
                            block.prepend($(canvas).css("max-height","200px").css("float","left").click(function(){
                                $(this).remove();
                            }));
                        }))
                    };

                    var readyToPhoto = function(){
                        photoButton.html(mycz.ele.div('block w-100 fleft button-new-blue text-center p-20',mycz.ele.icon('')+" "+label("take_photo")).click(function(){
                            mycz.plugins.html2canvas($(selector),{
                                beforePhoto: beforePhoto,
                                afterPhoto: afterPhoto
                            },function(canvas){
                                photoTaken(canvas);
                            })
                        }));
                    };


                    readyToPhoto();


                    onOpen(photoButton);

                    $("body").append(photoButton);
                }))
            }

            var currentValue = self.helpers.getVal();

            /**
             * Existing Values
             */
            if(mycz.helpers.isset(currentValue,true,true)){
                if(opts.multiple == 1){
                    $.each(mycz.helpers.json.parse(currentValue,false,true),function(nn,v){
                        var file = mycz.firebase.helpers.getFileInformation(v,true);
                        div.append(file);
                    })
                } else {
                    var file = mycz.firebase.helpers.getFileInformation(currentValue,true);
                    div.append(file)
                }
            }

            div.find("input[type='file']").addClass("upload");

            return div;
        },

        /**
         * Same as upload, used for custom_modules
         * with predefined values
         */
        document_upload: function(){
            return self.form_types.upload();
        },

        /**
         * Same as upload, used for custom_modules
         * with predefined values
         */
        photo_upload: function(){
            return self.form_types.upload();
        },

        /**
         * Same as upload, used for custom_modules
         * with predefined values
         */
        video_upload: function(){
            return self.form_types.upload();
        },

        /**
         * Same as upload, used for custom_modules
         * with predefined values
         */
        archive_upload: function(){
            return self.form_types.upload();
        },

        /**
         * A croppie field to resize
         * and cut a picture
         */
        croppie: function(){

            var container_width = self.helpers.getOption('','container_width');
            var container_height = self.helpers.getOption('','container_height');
            var crop_width = self.helpers.getOption('','crop_width');
            var crop_height = self.helpers.getOption('','crop_height');
            var crop_enableResize = self.helpers.getOption('','crop_enableResize');

            if(crop_width == 'global'){
                if(mycz.helpers.isset(window.$crop_width,true)){
                    crop_width = window.$crop_width;
                    crop_height = window.$crop_height;
                    container_width = crop_width+100;
                    container_height = crop_height+100;
                } else {
                    crop_width = 300;
                    crop_height = 300;
                    container_width = 400;
                    container_height = 400;
                }

            }

            /**
             * This keyUp is passed in the column, can be a string (eval)
             */
            var keyUp2 = self.helpers.getOption('','keyUp');
            if(mycz.helpers.isset(keyUp2,true,true)){
                if(!mycz.helpers.isObject(keyUp2)){
                    eval('keyUp2 = '+keyUp2);
                }
            }

            if(!mycz.helpers.isset(container_width,true,true)){
                container_width = crop_width + 100;
            }
            if(!mycz.helpers.isset(container_height,true,true)){
                container_height = crop_height + 100;
            }

            var opts = {};

            /**
             * Folder to upload - default is "uploads"
             */
            if(mycz.helpers.isset(self.helpers.getOption('','upload_folder'),true,true)){
                opts['data-mycz-folder'] = self.helpers.getOption('','upload_folder');
            }

            opts['required'] = self.helpers.getOption('','required') == true ? 1 : 0;

            opts['enableResize'] = crop_enableResize == true;

            var src = self.helpers.getOption('','src');
            src = mycz.helpers.isset(self.helpers.getVal(),true) ? self.helpers.getVal() : src;

            var prevent = isEdit == true && mycz.helpers.isset(src,true,true);

            if(mycz.helpers.isset(self.helpers.getOption('','croppie_upload_original_file'),true,true) && isEdit == true){
                src = data[self.helpers.getOption('','croppie_upload_original_file')];
            }

            var div =  mycz.plugins.croppie.ele(self.helpers.getOption('','crop_type'),container_width+"px",container_height+"px",crop_width,crop_height,src,self.helpers.getOption('','src_list'),opts,function(e){

                if(mycz.helpers.isset(keyUp2,true,true)){
                    keyUp2(e);
                }

                self.helpers.changed(div);

            });

            if(prevent == true){
                div.append(mycz.ele.div('prevent main-preventer',"<br>"+mycz.ele.icon(icon.edit+" f-30")+"<br>"+label("click_to_edit")).click(function(){
                    $(this).remove();
                }));
            }

            return div;
        },

        /**
         * Rows - A new type of data :-)
         * Using rows we can allow the user to add multiple
         * lines / values.
         * @returns {*|JQuery|jQuery|HTMLElement}
         */
        rows: function(){

            var div = mycz.ele.div('block w-100 fleft p-10 rows-block');

            var values = self.current.values;

            var name = self.helpers.getOption('','name');

            var block = self.current.block;

            var current_value = mycz.helpers.json.parse(self.helpers.getVal());

            var helper_width = mycz.helpers.isset(self.helpers.getOption('','helper_width'),true,true) ? self.helpers.getOption('','helper_width') : '100%';

            /**
             * If enabled, only one entry can be selected
             */
            var one_choice_per_rule = self.helpers.getOption('','one_choice_per_rule');

            /**
             * If enabled, only one rule can be added
             */
            var one_rule = self.helpers.getOption('','one_rule');

            var rule_auto_size = self.helpers.getOption('','rule_auto_size');

            /**
             * Background color for every entry
             */
            var bg_color = self.helpers.getOption('','bg-color');

            var custom_rule_class = self.helpers.getOption('','custom_rule_class');

            /**
             * Allow sorting of the entries
             */
            var sortable = self.helpers.getOption('','sortable');

            /**
             * Allow sorting inside of a row-entry
             */
            var inside_sortable = self.helpers.getOption('','inside_sortable');

            /**
             * If enabled, AND and OR will be shown
             */
            var rules = self.helpers.getOption('','rules');

            /**
             * Auto Insert an amount of rows..
             */
            var auto_insert = self.helpers.getOption('','auto_insert');

            var no_button = self.helpers.getOption('','no_button');

            var no_delete = self.helpers.getOption('','no_delete');


            /**
             * We put here all open modals to close them at once
             */
            var modals_to_close = [];

            var steps = {

                /**
                 * Creating a new row-entry
                 */
                new_row: function(){

                    var row_entry = mycz.ele.div((rule_auto_size == true ? 'inline-block w-auto' : 'block w-100')+' fleft rows-entry j-shadow b-radius-20 p-10 m-top-10 w-100').css("background-color",'rgba('+bg_color+',0.26').css("border-color",'rgba('+bg_color+',1');

                    if(mycz.helpers.isset(custom_rule_class,true)){
                        row_entry.addClass(custom_rule_class);
                    }

                    if(inside_sortable == true){
                        mycz.plugins.sortable.ele(row_entry,'','','',{
                            auto_placeholder_size:true,
                            no_placeholder: true,
                            all_axis:true
                        });
                    }

                    if(sortable == true){
                        mycz.plugins.tooltipster.tip(row_entry,'right',label('is_sortable'));
                    }

                    if(rules == true){
                        row_entry.addClass("rules");
                    }

                    div.append(row_entry);

                    row_entry.append(mycz.ele.div('block w-100 fleft',mycz.ele.btn('button-rounded button-zappter rows-entry-add-btn',mycz.ele.icon(icon.plus),function(){

                        var btn = $(this);
                        steps.popup(btn,row_entry,values);

                        return false;
                    })));

                    /**
                     * Trigger change
                     */
                    self.helpers.changed(block);

                    return row_entry;
                },

                /**
                 * Popup with the buttons to select
                 * @param btn
                 * @param row_entry
                 * @param values
                 */
                popup: function(btn,row_entry,values){

                    var pop_div = mycz.ele.div('block w-100 fleft');

                    $.each(values,function(k,vals){

                        var skip = false;

                        /**
                         * Disable if allows us to disable if existing entries has been made
                         */
                        if(mycz.helpers.isset(vals.disableIf,true)){
                            $.each(vals.disableIf,function(nn,d){
                                if(row_entry.find('div[data-col="'+d+'"]').length>0){
                                    skip = true;
                                    return false;
                                }
                            });
                        }

                        /**
                         * Enable if allows us to enable if existing entries has been made
                         */
                        if(mycz.helpers.isset(vals.enableIf,true)){
                            $.each(vals.enableIf,function(nn,d){
                                if(row_entry.find('div[data-col="'+d+'"]').length==0){
                                    skip = true;
                                    return false;
                                }
                            });
                        }

                        /**
                         * cz_app_type filtering
                         */
                        if(mycz.helpers.isset(vals.cz_app_type,true)){
                            if(vals.cz_app_type != $usermeta.cz_app_type){
                                skip = true;
                            }
                        }

                        if(skip == false){

                            var row = mycz.ele.div('block w-100 fleft p-shadow m-top-20 b-radius-20 pointer clickable');

                            var title = label(k);

                            if(vals.btn_label){
                                title = mycz.helpers.getText(vals.btn_label,true);
                            } else if(vals.label){
                                title = mycz.helpers.getText(vals.label,true);
                            }

                            if(vals.no_btn == true){
                            } else {
                                row.append(mycz.ele.btn_squared(4,6,vals.btn_class ? vals.btn_class+' b-radius-20' : 'button-green b-radius-20',vals.btn_icon ? vals.btn_icon : icon.add,title,'','',{
                                    button_text: mycz.helpers.isset(vals.btn_text,true) ? vals.btn_text : undefined
                                }));
                            }

                            row.append(mycz.ele.div('col-md-'+(vals.no_btn == true ? '12 p-20 text-center' : '8')+' col-xs-6',mycz.ele.new('h3',title,'p-10 quicksand fw-600 m-0')).append(mycz.ele.div('p-10',vals.helper ? mycz.helpers.getText(vals.helper,true) : label(k+"_helper"))));

                            if(mycz.helpers.isset(vals.btn_html,true)){
                                row.children("div.col-md-8").append(vals.btn_html)
                            }

                            row.click(function(){

                                if(mycz.helpers.isset(vals.data,true)){

                                    mycz.plugins.tooltipster.tip(row_entry,'left',vals.btn_helper ? mycz.helpers.getText(vals.btn_helper,true) : '');

                                    steps.select(values,k,row_entry);

                                    if(one_choice_per_rule == true && mycz.helpers.isset(btn,true,true)){
                                        btn.parent().remove();
                                    }


                                    mycz.modal.close(modals_to_close,true);

                                    modals_to_close = [];

                                } else {
                                    steps.popup(btn,row_entry,vals.values);
                                }
                            });

                            pop_div.append(row);

                        }
                    });

                    if(pop_div.find('div.clickable').length==1){
                        pop_div.find("div.clickable").trigger("click");
                        return;
                    }
                    var myModalIndex = modals_to_close.length;
                    var m = mycz.modal.new('',pop_div,true,'',function(){
                        mycz.helpers.array.removeByIndex(modals_to_close,myModalIndex);
                    });
                    var t = setInterval(function(){
                        var one_modal_exists = false;
                        $.each(modals_to_close,function(nn,$modal){
                            if($($modal.selector).length>0){
                                one_modal_exists = true;
                            }
                        });
                        if(one_modal_exists == false){
                            clearInterval(t);
                            if(row_entry.find("div.mycz-form-block").length==0){
                                row_entry.remove();
                                if(one_rule == true){
                                    first_btn.removeClass("displayNone");
                                }
                            }
                        }
                    },100);
                    modals_to_close.push(m);
                },

                /**
                 * Final Selection -> adding elements into the row
                 * @param values
                 * @param selected
                 * @param container
                 */
                select: function(values,selected,container){

                    var div = mycz.ele.div((values[selected].auto_size == true ? 'inline-block w-auto' : 'block w-100')+' fleft pos-relative');

                    if(rules == true){
                        div.addClass("rules");
                    }

                    container.append(div);

                    /**
                     * If there is a helper, we add it as a fat title
                     */
                    if(mycz.helpers.isset(values[selected].helper,true) && values[selected].hide_helper != true){

                        var title = label(selected);

                        if(values[selected].btn_label){
                            title = mycz.helpers.getText(values[selected].btn_label,true);
                        } else if(values[selected].label){
                            title = mycz.helpers.getText(values[selected].label,true);
                        }
                        div.append(mycz.plugins.tooltipster.tip(mycz.ele.div('block p-10 o-scroll fleft quicksand b-radius-20 no-scrollbar','<strong>'+title+'</strong><br>'+mycz.helpers.getText(values[selected].helper,true))
                            .css("background-color",'rgba('+bg_color+',0.9')
                            .css("margin-top","9px")
                            .css("width",helper_width)
                            .css("height",(helper_width == '100%' ? '' : "80px")),'bottom',mycz.helpers.getText(values[selected].helper,true)));
                    }

                    self.override_current_cols = values[selected].data;

                    $.each(values[selected].data,function(k,vals){
                        values[selected].data[k].edit = true;
                        values[selected].data[k].new = true;
                    });

                    /**
                     * Adding the columns
                     */
                    self.onCreateTriggerKeyUp = false;
                    self.isNew = true;
                    self.steps.cols(values[selected].data,parseInt(block.attr("data-depth"))+1,div);
                    self.isNew = false;

                    /**
                     * New onClick function
                     * Triggers the selected value depending where we use it.
                     */

                    try {
                        $.each(values[selected].data,function(key,subvals){
                            if(subvals.onClick){
                                eval(subvals.onClick);
                            }
                        })
                    } catch (e) { }


                    /**
                     * Adding button to delete a row
                     */
                    div.append(mycz.ele.btn('button-rounded button-small button-red pos-absolute rule-trasher tright',mycz.ele.icon(icon.trash),function(){

                        div.remove();

                        if(container.find("div.mycz-form-block").length == 0){
                            container.remove();
                            if(one_rule == true){
                                first_btn.removeClass("displayNone");
                            }
                        }

                        /**
                         * Trigger change
                         */
                        self.helpers.changed(block);

                        return false;

                    }).css("top","-5px").css("right","-15px"));

                    self.onCreateTriggerKeyUp = true;
                    self.current.block = block;


                    self.override_current_cols = null;

                }

            };

            var helpers = {

                /**
                 * Required for editMode -> checking if one
                 * of the keys exists and adding it.
                 * @param myKeys
                 * @param data
                 * @returns {boolean}
                 */
                match: function(myKeys,data){
                    var match = false;
                    $.each(Object.keys(data),function(nn,k){
                        if(mycz.helpers.array.contains(myKeys,k)){
                            match = true;
                            return false;
                        }
                    });
                    return match;
                },
                loop: function(values,current_value_data,row_entry){
                    var match = false;
                    $.each(values,function(k,vals){
                        if(mycz.helpers.isset(vals.data,true,true)){
                            match = helpers.match(Object.keys(current_value_data),vals.data);
                            if(match == true && row_entry.find("div[col='"+k+"']").length==0){
                                self.override_current_values = current_value_data;
                                steps.select(values,k,row_entry);
                                self.override_current_values = null;
                                if(one_choice_per_rule == true){
                                    row_entry.find("a.rows-entry-add-btn").parent().remove();
                                }
                            }
                        } else if(mycz.helpers.isset(vals.values,true,true)){
                            helpers.loop(vals.values,current_value_data,row_entry);
                        }
                    });
                }
            };

            /**
             * Creating first button to create new row-entries
             */
            var first_btn = mycz.ele.btn(self.helpers.getOption('','btn_class')+" first-btn",mycz.ele.icon(self.helpers.getOption('','btn_icon'))+" "+mycz.helpers.getText(self.helpers.getOption('','btn_label'),true),function(){

                var row_entry = steps.new_row();

                row_entry.find("a.zapp-btn").trigger("click");

                if(one_rule == true){
                    first_btn.addClass("displayNone");
                }

                return false;

            });

            div.append(mycz.ele.div('block w-100 fleft').append(first_btn));


            /**
             * Enabling sorting
             */
            if(sortable==true){
                mycz.plugins.sortable.ele(div,'','','',{
                    auto_placeholder_size:true,
                    all_axis:true
                });
            }

            /**
             * Edit Mode: Loop through current array
             */
            if(mycz.helpers.isset(current_value,true,true)){

                /**
                 * We made a mistake here: When values have same names, it will be double created.
                 * Hotfix for surcharge_rules..
                 * Example:
                 *
                 */
                if(name == 'surcharge_rules'){
                    $.each(current_value,function(n,data){
                        if(mycz.helpers.isset(data,true)){
                            var row_entry = steps.new_row();
                            var obj = {};
                            obj[data.basket_value_smaller == 1 ? 'basket_value_smaller' : 'basket_value_greater'] = values[data.basket_value_smaller == 1 ? 'basket_value_smaller' : 'basket_value_greater'];
                            helpers.loop(obj,data,row_entry);
                        }
                    });
                } else {
                    $.each(current_value,function(n,data){
                        if(mycz.helpers.isset(data,true)){
                            var row_entry = steps.new_row();
                            helpers.loop(values,data,row_entry);
                        }
                    });
                }
            };

            if(self.helpers.getOption('','untouchable') == true){
                div.find(".rows-entry").each(function(){
                    $(this).find(".rule-trasher").remove();
                    $(this).append(mycz.ele.div('prevent prevent-invisible no-cursor'));
                })
            }

            div.on('set',function(){
                $(this).find("div.rows-entry").remove();
                var current_value = mycz.helpers.json.parse($(this).attr('data-set'));
                $.each(current_value,function(n,data){
                    if(mycz.helpers.isset(data,true)){
                        var row_entry = steps.new_row();
                        helpers.loop(values,data,row_entry);
                    }
                });
            });

            if(mycz.helpers.isset(auto_insert,true,true) && auto_insert != 0){

                var inserted = div.find(".rows-entry").length;

                var toInsert = parseInt(auto_insert)-inserted;

                while(toInsert>0){
                    first_btn.trigger("click");
                    toInsert--
                }


            }

             if(no_button == 1){
                 div.find(".first-btn").remove();
             }

             if(no_delete == 1){
                 div.find(".rows-entry").find(".rule-trasher").remove();
             }

            return div;
        },

        /**
         * Signuature (only on mobile atm)
         */
        signature: function(){

            /**
             * Trigger save of the entire form after signed
             */
            var callback_after_sign = self.helpers.getOption('','callback_after_sign');

            var div = mycz.ele.div('signature-container fleft');

            var sign_div = mycz.ele.div('block w-100 pos-relative');

            var btns_div = mycz.ele.div('block w-100 pos-relative');

            var btn_text = mycz.helpers.getText(self.current.label,true);

            /**
             * Button Bg
             */
            var button_bg = self.helpers.getOption('','signature_button_background');
            button_bg = mycz.helpers.isset(button_bg,true,true) ? button_bg : '#5dcf65';

            /**
             * Button Color
             */
            var button_color = self.helpers.getOption('','signature_button_color');
            button_color = mycz.helpers.isset(button_color,true,true) ? button_color : '#fff';

            btns_div.append(mycz.ele.btn('p-20 fw-600 b-radius-3 block w-100 m-top-10',btn_text,function(){

                var me = $(this);

                mycz.plugins.sign(function(url,signed){

                    div.attr("data-signed",signed == true ? 1 : 0);
                    div.removeAttr("data-url");

                    sign_div.find("img").remove();

                    if(signed==true){

                        sign_div.prepend(mycz.ele.img(url).css("width","250px").css("margin","0 auto"));

                        div.attr("data-url",url);

                        /**
                         * Remove if we are editing and already
                         * have a signature
                         */
                        div.removeAttr('data-uploaded').removeAttr("data-download-urls");

                        me.removeClass("button-green").addClass("button-blue").html(mycz.helpers.getText({
                            en: '<u>Click here</u> to edit the signature',
                            de: '<u>Klicken Sie hier</u> um die Signatur zu bearbeiten'
                        }));

                    } else {
                        me.removeClass("button-blue").addClass("button-green").html(btn_text);
                    }

                    /**
                     * Changed
                     */
                    self.helpers.changed(div);

                    if(callback_after_sign == true){
                        self.popup.find(".mycz-modal-footer a.button-green.zapp-btn").trigger("click");
                    }
                },self.helpers.getOption(div,'signature_tooltip'));

                return false;

            }).css("background",button_bg).css("color",button_color));

            div.append(sign_div);
            div.append(btns_div);

            if(mycz.helpers.isset(self.helpers.getVal(),true,true)){
                if(self.helpers.getVal() != 0 && self.helpers.getVal() != 1){
                    div.attr('data-uploaded',1).attr("data-signed",1).attr("data-download-urls",self.helpers.getVal()).attr("data-url","noneed");
                    sign_div.prepend(mycz.ele.img(self.helpers.getVal()).css("width","250px"));
                }

            }
            return div;
        },

        /**
         * List
         */
        list: function(){
            var nav = mycz.ele.div('block w-100 fleft').css("background","#fff");

            /**
             * Max & Min
             */
            var max = self.helpers.getOption('','max');
            var min = self.helpers.getOption('','min');
            max = mycz.helpers.isset(max,true,true) ? parseInt(max) : 0;
            min = mycz.helpers.isset(min,true,true) ? parseInt(min) : 0;

            var values = self.form_types.select('',false,true);
            $.each(values,function(k,n){

                /**
                 * Values can also be objects with a key "value"
                 */
                if(mycz.helpers.isObject(n)){
                    k = n.value;
                    n = n.value;
                }

                nav.append(mycz.ele.div('zapp-nav')
                    .append(mycz.ele.new('i'))
                    .append(mycz.ele.div('',mycz.helpers.getText(n)))
                    .attr("data-value",k)
                    .click(function(){
                        var current_active = nav.find("div.zapp-nav.active").length;
                        if(max != 0 && !$(this).hasClass("active")){
                            if(max == 1){
                                nav.find(".active").trigger("click");
                            } else {
                                if((current_active+1) > max){
                                    return;
                                }
                            }

                        }
                        if(!$(this).hasClass("active")){
                            $(this).toggleClass("active");
                            $(this).find("i").attr("class",icon.check+" error-green");
                        } else {
                            $(this).toggleClass("active");
                            $(this).find("i").attr("class","");
                        }


                        /**
                         * Changed
                         */
                        self.helpers.changed($(this));
                    }))
            });

            /**
             * Edit
             */
            if(mycz.helpers.isset(self.helpers.getVal(),true)){
                $.each(mycz.helpers.split(self.helpers.getVal(),",",true),function(nn,i){
                    nav.find("div.zapp-nav[data-value='"+i+"']").trigger("click");
                })
            }

            return nav;
        },

        /**
         * Colorpicker
         */
        color: function(){

            var keyUp = self.helpers.getOption('','keyUp');

            var block = self.current.block;

            if(mycz.helpers.isset(keyUp,true,true)){
                if(!mycz.helpers.isFunction(keyUp)){
                    eval("keyUp = "+keyUp);
                }
            }

            var val = self.helpers.getVal();

            if(!mycz.helpers.isset(val,true,true) && isEdit == true){
                block.attr("data-no-color",1);
            }

            return mycz.plugins.colorPicker.pick(val,true,function(a,b,c){

                block.removeAttr("data-no-color");

                if(keyUp){
                    keyUp(a,b,c);
                }

                /**
                 * Changed
                 */
                self.helpers.changed(block);
            },'',false);
        },

        /**
         * With output text we can show text (this is not a form-entry, just a text).
         * The text can also have dependency.
         */
        output_text: function(){

            var html = self.current.value;

            if(contains(html,'eval: ')){
                html = eval(html.replace('eval: ',''));
            }

            return mycz.ele.div('block w-100 fleft p-5',mycz.helpers.getText(html));
        },

        /**
         * With output pic we can show an image inside the form
         */
        output_pic: function(){
            if(self.helpers.getOption('','static_picture') != false){
                return mycz.ele.div('block w-100 fleft',mycz.ele.img(self.helpers.getOption('','static_picture')));
            }
            return mycz.ele.div('block w-100 fleft',mycz.ele.img(self.envFunction('picture.get')(self.current.value)));
        },

        /**
         * With output vid we can show a video inside the form
         */
        output_vid: function(){

            var videoData = function(){
                var row = {};
                if(mycz.ENV == 'ADMIN'){
                    row = localCache['pics'][0][self.current.value]['pic_src'];
                }
                if(mycz.ENV == 'MOBILE'){
                    row = window.videos[self.current.value];
                }
                var obj = {};
                obj.src = row.src ? row.src : row.pic_src;
                obj.videoId = row.videoid ? row.videoid : mycz.helpers.video.getParamsFromSaved(row.params).id;
                obj.videoType = row.videotype ? row.videotype : mycz.helpers.video.getParamsFromSaved(row.params).type;
                return obj;
            }();

            var div = mycz.ele.attr(mycz.ele.div('block w-100 fleft zapp-element-articles'),{
                'designer-group': 'video'
            });

            div.click(function(){
                if($(this).find("iframe").length>0){
                    return;
                }
                $(this).html(mycz.helpers.video.embeddVideo(videoData.videoId,videoData.videoType))
            })

            div.append(mycz.ele.attr(mycz.ele.div(),{
                'style': 'background-image:url('+videoData.src+')',
                'designer': 'pic'
            }));
            div.append(mycz.ele.attr(mycz.ele.div('',mycz.ele.attr(mycz.ele.div('',mycz.ele.attr($(mycz.ele.icon('ion-ios-play-outline')),{
                'designer': 'video_play_icon'
            })),{
                'designer': 'video_play_icon_container'
            })),{
                'designer': 'video_overlay',
            }));

            return div;
        },

        /**
         * With output doc we can show a document inside the form
         */
        output_doc: function(){
            var div = mycz.ele.div('block w-100 fleft');

            var docData = function(){
                var obj = {};
                if(mycz.ENV == 'ADMIN'){
                    obj.pic = localCache['pics'][0][self.current.value]['pic_src'];
                    obj.src = locales[localCache['pics'][0][self.current.value]['locale_id']][languages.activeLang];
                }
                if(mycz.ENV == 'MOBILE'){
                    obj.pic = picture.get(self.current.value);
                    obj.src = picture.getDoc(self.current.value);
                }
                return obj;
            }();

            div.append(mycz.ele.div('col-md-3 col-xs-3',mycz.ele.img(docData.pic)));
            div.append(mycz.ele.div('col-md-9 col-xs-9',mycz.ele.btn('button-no-bg fw-600 p-20 text-underline',label("open"),function(){
                if(docData.src==null || docData.src==''){
                    mycz.modal.new(label("sorry"),label("sorry_download_unav"),true);
                } else {
                    if(window.isCordovaApp == true){
                        if(cordova.plugins.fileOpener2){
                            mycz.platforms.mobile.modules.bottom_bar.user_actions.download('aa',docData.src,'','',{save:false});
                            return;
                        }
                    }
                    window.open("https://docs.google.com/viewer?url="+enc(docData.src), '_blank',"location=no,hardwareback=yes");
                }
            })));

            return div;

        },

        /**
         * Address field with google
         * autocomplete lookup
         */
        address: function(){

            var v = self.helpers.getVal();

            var div = mycz.ele.div('block w-100 fleft');

            /**
             * Loading Google maps script
             */
            div.append(mycz.ele.input(self.current.col,'text',mycz.helpers.isObject(v) ? '' : v,{
                placeholder: mycz.helpers.getText(self.helpers.valOrEmpty('placeholder'),true), //Setting placeholder
                id:'location',

                /**
                 * Calling the api function to load the script in window
                 */
            },function(val,ele){

                /**
                 * Ugly hack to disable auto-complete
                 */
                setTimeout(function(){
                    ele.attr('autocomplete', 'new-qwdqdwqwdqdqd');
                    setTimeout(function(){
                        ele.attr('autocomplete', 'new-qwdqdwqwdqdqd');
                        setTimeout(function(){
                            ele.attr('autocomplete', 'new-qwdqdwqwdqdqd');
                            setTimeout(function(){
                                ele.attr('autocomplete', 'new-qwdqdwqwdqdqd');
                                setTimeout(function(){
                                    ele.attr('autocomplete', 'new-qwdqdwqwdqdqd');
                                },100);
                            },50);
                        },50);
                    },50);
                },50);

                /**
                 * Save the coordinates in another column (e.g a hidden column)
                 */
                var address_put_coordinates = self.helpers.getOption(div,'address_put_coordinates');

                /**
                 * Save the city in another column (e.g a hidden column)
                 */
                var address_put_city = self.helpers.getOption(div,'address_put_city');

                /**
                 * Save the zip code in another column (e.g a hidden column)
                 */
                var address_put_zip_code = self.helpers.getOption(div,'address_put_zip_code');

                /**
                 * Save the maps in another column (e.g a hidden column)
                 */
                var address_put_maps = self.helpers.getOption(div,'address_put_maps');

                /**
                 * Does only return the Street + House-No, instead of the entire string (street, zip, city)
                 */
                var address_get_street_only = self.helpers.getOption(div,'address_get_street_only');

                /**
                 * @param ele -> ele is the input itself
                 * @callback function(lat,long)
                 */

                mycz.api.google.address_lookup.api(function(){
                    mycz.api.google.address_lookup.autoComplete(ele,function(lat,long,city,zip,maps,street_only){

                        if(mycz.helpers.isset(address_put_coordinates,true,true)){
                            self.container.find('div.mycz-form-block[data-col="'+ address_put_coordinates+'"] input').val(lat+','+long);
                        }

                        if(mycz.helpers.isset(address_put_city,true,true)){
                            self.container.find('div.mycz-form-block[data-col="'+ address_put_city+'"] input').val(city);
                        }

                        if(mycz.helpers.isset(address_put_zip_code,true,true)){
                            self.container.find('div.mycz-form-block[data-col="'+ address_put_zip_code+'"] input').val(zip);
                        }

                        if(mycz.helpers.isset(address_put_maps,true,true)){
                            self.container.find('div.mycz-form-block[data-col="'+ address_put_maps+'"] input').val(maps);
                        }

                        if(address_get_street_only == true){
                            ele.val(street_only);
                        }

                    });
                });

                /**
                 * Changed
                 */
                self.helpers.changed(ele);

            }).attr("style","width:"+self.helpers.getOption('','inputWidth')+"!important;max-width:none!important;").focus(function(){
                $(this).attr('autocomplete', 'new-password');

            }));

            mycz.api.google.address_lookup.api();

            return div;
        },

    };

    /**
     * How to collect the right value from the form
     * If you create a new form_type, you need to add it here too.
     */
    this.form_collect = {
        temp: {
            date_to_timestamp: function(date,hasTime){
                if(self.helpers.getOption(self.form_collect.current,'return_UTC_timestamp') == true){
                    return time.date.convert.fromDate.toTimestamp(date);
                }
                return date;
            }
        },
        current: null,
        hidden: function(){
            return self.form_collect.current.children("input[type='hidden']").val();
        },
        text: function(){

            if(self.helpers.getOption(self.form_collect.current,'multilanguage') == true){

                var translator_id = self.form_collect.current.find("[data-translator-id]").attr("data-translator-id");

                var o = {};

                $("div.multilanguage-btns[data-translator-id='"+translator_id+"']").find("a.zapp-btn[data-lang]").each(function(){
                    o[$(this).attr("data-lang")] = $(this).attr("data-value");
                });

                /**
                 * Required languages
                 */
                var mlr = self.helpers.getOption(self.form_collect.current,'multilanguage-required');
                if(mycz.helpers.isset(mlr,true,true)){
                    $.each(mycz.helpers.split(mlr,',',true),function(nn,l){
                        if(!mycz.helpers.isset(o[l],true)){
                            self.errors.push({
                                ele:self.form_collect.current,
                                errors:['label:Missing language:'+getLanguage(l)[0]]
                            });
                        }
                    })
                }

                /**
                 * Delete empty entries
                 */
                $.each(o,function(l,v){
                    if(!mycz.helpers.isset(v,true,true)){
                        delete o[l];
                    }
                });

                return mycz.helpers.json.stringify(o);
            }

            var $val = self.form_collect.current.children("div").children("input[type='text']").val();

            if(self.helpers.getOption(self.form_collect.current,'validate') == 'email'){
                return $.trim($val);
            }

            return $val;

        },
        number: function(){
            return self.form_collect.current.children("input[type='text']").val();
        },
        numbers: function(){
            return self.form_collect.number();
        },
        password: function(){
            return self.form_collect.current.children("input[type='password']").val();
        },
        textarea: function(){

            var t = self.form_collect.current.find("textarea:first");

            if(self.helpers.getOption(self.form_collect.current,'multilanguage') == true){

                var translator_id = self.form_collect.current.find("[data-translator-id]").attr("data-translator-id");

                /**
                 * If tiny enabled, we need to click the language button first
                 * so we save the current value
                 */
                if(self.helpers.getOption(self.form_collect.current,'tiny') == true){
                    $("div.multilanguage-btns[data-translator-id='"+translator_id+"']").find("a.zapp-btn.button-active[data-lang]").trigger("click");
                }

                var o = {};
                
                $("div.multilanguage-btns[data-translator-id='"+translator_id+"']").find("a.zapp-btn[data-lang]").each(function(){
                    o[$(this).attr("data-lang")] = $(this).attr("data-value");
                });

                /**
                 * Required languages
                 */
                var mlr = self.helpers.getOption(self.form_collect.current,'multilanguage-required');

                if(mycz.helpers.isset(mlr,true,true)){
                    $.each(mycz.helpers.split(mlr,',',true),function(nn,l){
                        if(!mycz.helpers.isset(o[l],true)){
                            self.errors.push({
                                ele:self.form_collect.current,
                                errors:['label:Missing language:'+getLanguage(l)[0]]
                            });
                        }
                    })
                }

                /**
                 * Delete empty entries
                 */
                $.each(o,function(l,v){
                    if(!mycz.helpers.isset(v,true,true)){
                        delete o[l];
                    }
                });

                return mycz.helpers.json.stringify(o);
            }

            if(t.hasClass("has-tiny")){
                var temp_v = tinyMCE.get(t.attr("id")).getContent();
                temp_v = mycz.helpers.split(temp_v,'&lt;',true).join("<");
                temp_v = mycz.helpers.split(temp_v,'&gt;',true).join(">");
                return temp_v;
            } else {
                return t.val().replace(/\n/g, "<br>");
            }
        },
        select: function(){
            return self.form_collect.current.find("select").val();
        },
        localCache: function(){
            return self.form_collect.select();
        },
        date: function(withTime){
            var date = self.form_collect.current.find("div.datepicker-holder:first input.datepicker").val();
            if(self.form_collect.current.find("div.checkable-holder:first").length>0){
                var c = self.form_collect.current.find("div.checkable-holder:first");
                if(c.hasClass("checked")){
                    if(c.attr("data-allow-now")==1){
                        date = time.output.date_and_time_today().split(" ")[0];
                    }
                    if(c.attr("data-allow-no-date")==1){
                        return null;
                    }
                }
            }
            date = self.form_collect.temp.date_to_timestamp(date,false);
            return date;
        },
        time: function(){
            var date = self.form_collect.current.find("div.timepicker-holder:first input.timepicker").val();
            if(date == '00:00' && self.helpers.getOption(self.form_collect.current,'when_0_return_24')==true){
                date = '24:00';
            }
            if(self.helpers.getOption(self.form_collect.current,'selected_is_seconds') == true){
                date = time.clock.convert.toSeconds(date);
            }
            return date;
        },
        datetime: function(){
            var date = self.form_collect.current.find("div.datepicker-holder:first input.datepicker").val();
            date = date+" "+self.form_collect.current.find("div.timepicker-holder:first input.timepicker").val();
            if(self.form_collect.current.find("div.checkable-holder:first").length>0){
                var c = self.form_collect.current.find("div.checkable-holder:first");
                if(c.hasClass("checked")){
                    if(c.attr("data-allow-now")==1){
                        date = time.output.date_and_time_today();
                    }
                    if(c.attr("data-allow-no-date")==1){
                        return null;
                    }
                }
            }
            date = self.form_collect.temp.date_to_timestamp(date,true);
            return date;
        },
        frontend_search: function(){
            var arr = [];
            self.form_collect.current.find('div.selection div[data-id]').each(function(){
                arr.push($(this).attr("data-id"));
            });
            return arr.join(',');
        },
        join: function(){
            if(self.form_collect.current.find("div.mycz-form-join-search-result-selected").length>0){
                return self.form_collect.current.find("div.mycz-form-join-search-result-selected").attr("data-id");
            }
            return null;
        },
        grid: function(){

            var with_taphold = self.helpers.getOption(self.form_collect.current,'with_taphold');

            var arr = [];

            if(self.helpers.getOption(self.form_collect.current,'grid_show_only_selected') == true){

                self.form_collect.current.find("div.grid-entry").each(function(){
                    arr.push($(this).attr("data-value"));
                });

            } else {

                self.form_collect.current.find("div.grid-entry.checked").each(function(){

                    if(with_taphold == true){
                        arr.push($(this).attr("data-value")+":"+($(this).find("span.badge").length>0 ? $(this).find("span").attr("data-taphold-value") : 1));
                    } else {
                        arr.push($(this).attr("data-value"));
                    }

                });

            }

            /**
             * 
             */
            var min_selectable = self.helpers.getOption(self.form_collect.current,'min_selectable');

            if(min_selectable != false && min_selectable != 0 && min_selectable != '0'){
                if(mycz.helpers.isset(min_selectable,true,true)){
                    if(arr.length < min_selectable){
                        self.errors.push({
                            ele: self.form_collect.current,
                            errors:['text:'+mycz.helpers.getText({
                                en: 'Please select at least '+min_selectable,
                                de: 'Bitte wähle mindestens '+min_selectable
                            })]
                        });
                    }
                }
            }

            return arr.join(",");
        },
        boolean: function(){
            return self.form_collect.current.find("i.boolean-on").length > 0 ? 1 : 0;
        },
        gallery: function(){
            if(self.form_collect.current.find("input[type='hidden']:first").length>0){
                return self.form_collect.current.find("input[type='hidden']:first").attr("value")
            }
            return '';
        },
        searchByTags: function(){
            var a = [];
            self.form_collect.current.find("div.searchBytags:first").children("span.badge").each(function(){
                a.push($(this).attr("data-value"));
            });
            return a.join();
        },
        json: function(){
            return mycz.helpers.json.stringify(self.steps.collect_data(self.form_collect.current,parseInt(self.form_collect.current.attr("data-depth"))+1));
        },
        location: function(){
            return self.form_collect.current.find("div:first > input[type='text']:first").val();
        },
        upload: function(){

            if(self.easyCollectActive == true){
                return '';
            }

            /**
             * Checking for upload-fields and upload them first,
             * before we collect and continue to callback.
             */
            var first = self.form_collect.current.find("input.upload[type='file']:not([data-uploaded]):first");

            /**
             * In Mobile App we switch croppie to upload field.
             * We must save the original file also, if setted.
             */
            var croppie_upload_original_file = self.helpers.getOption(self.form_collect.current,'croppie_upload_original_file');

            if(first.length>0 && self.onCollectUploadFiles == true){

                if(first.attr("required") == 1){
                    if(first.prop("files").length==0 && self.form_collect.current.find("canvas").length == 0){
                        self.errors.push({
                            ele:self.form_collect.current,
                            errors:['missing_file']
                        });
                    }
                }

                if(first.parent().find("div.alert.alert-danger").length>0){
                    self.errors.push({
                        ele:self.form_collect.current,
                        errors:['text:'+first.parent().find("div.alert span").text()]
                    });
                }

                /**
                 * No errors found -> uploading files first
                 */
                if(self.errors.length==0){

                    /**
                     * Upload Canvas first.. (html2canvas)
                     */
                    if(self.form_collect.current.find("canvas:not([data-uploaded])").length>0){

                        /**
                         * Uploading Canvas (coming from html2canvas)
                         */
                        self.form_collect.current.find("canvas:not([data-uploaded])").each(function(){
                            var canvas = $(this)[0];
                            var folder = 'uploads';
                            var ending = '.png';
                            mycz.firebase.files().upload(canvas.toDataURL(),'data_url',function(download_url){
                                $(canvas).attr("data-download-url",download_url);
                                $(canvas).attr("data-uploaded",1)
                            },folder,ending,'screenshot'+random.string(),'','',true);
                        });

                        var t = setInterval(function(){
                            var finished = false;

                            if(self.form_collect.current.find("canvas:not([data-uploaded])").length == 0){
                                finished = true;
                            }

                            if(finished == true){
                                clearInterval(t);
                                self.steps.collect_data(self.container,1,self.form_collect.current_callback);
                            }
                        },100);

                        throw new Error('Uploading Canvas');
                    }

                    self.form_collect.current.find("input.upload[type='file']:not([data-uploaded])").each(function(){

                        var me = $(this);

                        var skip = false;

                        if(self.helpers.getOption($(this),'multiple') == true && self.helpers.getOption($(this),'preview') == true){

                            if(!me.attr("data-file-input")){ //the last copied element we dont need to upload
                                skip = true;
                                me.attr("data-uploaded",0).attr("data-files-length",0);
                            }

                        }

                        if(skip == false){

                            loader.start();

                            var folder = mycz.helpers.isset(me.attr("data-mycz-folder"),true) ? me.attr("data-mycz-folder") : 'uploads';

                            if(me.prop("files").length>0){

                                var l = me.prop("files").length;
                                l = mycz.helpers.isset(me.attr("data-deleted-files"),true) ? (l-mycz.helpers.json.parse(me.attr("data-deleted-files"),false,true).length) : l;

                                me.attr("data-files-length",l);

                                var upload = function(i){

                                    if(!me.prop("files")[i]){
                                        return;
                                    }

                                    if(mycz.helpers.array.contains(mycz.helpers.json.parse(me.attr("data-deleted-files"),false,true),i)){
                                        upload(i+1);
                                        return;
                                    }

                                    var file = me.prop("files")[i];
                                    var ending = function(){
                                        try { return "."+file.name.split(".")[file.name.split(".").length-1]; } catch(err){ return '.zapp' };
                                    }();

                                    mycz.firebase.files().upload(file,'file',function(download_url){

                                        var download_urls = mycz.helpers.json.parse(me.attr("data-download-urls"),false,true);
                                        download_urls.push(download_url);


                                        me.attr("data-download-urls",mycz.helpers.json.stringify(download_urls));

                                        if(!me.attr("data-uploaded")){
                                            me.attr("data-uploaded",1)
                                        } else {
                                            me.attr("data-uploaded",parseInt(me.attr("data-uploaded"))+1);
                                        }

                                        /**
                                         * Original file will be uploaded and the url putted into another field!
                                         */
                                        if(mycz.helpers.isset(croppie_upload_original_file,true,true)){
                                            if(self.container.find("div[data-col='"+croppie_upload_original_file+"']").length>0){

                                                /**
                                                 * Put into the other field
                                                 */
                                                self.container.find("div[data-col='"+croppie_upload_original_file+"'] input").attr("value",download_url).val(download_url);

                                            }
                                        }


                                    },folder,ending,format.clean_string(file.name),'','',true);
                                    upload(i+1);
                                };

                                upload(0);
                            } else{
                                me.attr("data-uploaded",0).attr("data-files-length",0);
                            }
                        }
                    });

                    var t = setInterval(function(){

                        var finished = true;

                        self.form_collect.current.find("input.upload[type='file']").each(function(){
                            if(parseInt($(this).attr("data-uploaded")) != parseInt($(this).attr("data-files-length"))){
                                finished = false;
                            }
                        });

                        if(finished == true){
                            clearInterval(t);
                            self.steps.collect_data(self.container,1,self.form_collect.current_callback);
                        }

                    },100);

                    throw new Error('Uploading');
                }
            }

            var c = self.form_collect.current.find("input.upload[type='file']:first");

            if(self.helpers.getOption(c,'multiple') != true){
                var r = mycz.helpers.json.parse(self.form_collect.current.find("input.upload[type='file']:first").attr("data-download-urls"))[0];
                if(!r){
                    if(self.form_collect.current.find(".mycz-form-existing-value").length>0){
                        return self.form_collect.current.find(".mycz-form-existing-value").attr("data-link");
                    } else {
                        return '';
                    }
                }
                return r;
            } else {

                var files_collected = [];
                self.form_collect.current.find("input.upload[type='file']").each(function(){
                    $.each(mycz.helpers.json.parse($(this).attr("data-download-urls"),false,true),function(nn,f){
                        files_collected.push(f);
                    });
                });
                self.form_collect.current.find("canvas").each(function(){
                    files_collected.push($(this).attr("data-download-url"));
                });
                self.form_collect.current.find(".mycz-form-existing-value").each(function(){
                    files_collected.push($(this).attr("data-link"));
                });

                var result = mycz.helpers.json.stringify(files_collected);

                if(result == '[]'){
                    return '';
                }

                return result;

            }
        },
        document_upload: function(){
            return self.form_collect.upload();
        },
        photo_upload: function(){
            return self.form_collect.upload();
        },
        video_upload: function(){
            return self.form_collect.upload();
        },
        archive_upload: function(){
            return self.form_collect.upload();
        },
        croppie: function(){

            if(self.easyCollectActive == true){
                return '';
            }

            /**
             * A new option which points to another field!
             * Example a hidden field.
             */
            var croppie_upload_original_file = self.helpers.getOption(self.form_collect.current,'croppie_upload_original_file');

            /**
             * Checking for upload-fields and upload them first,
             * before we collect and continue to callback.
             */
            var me = self.form_collect.current.find("div.croppie-container:not([data-uploaded]):first");
            if(self.helpers.getOption(self.form_collect.current,'required') == true && me.length == 0){
                self.errors.push({
                    ele:self.form_collect.current,
                    errors:['missing_file']
                });
            }

            if(me.length>0 && self.onCollectUploadFiles == true){

                /**
                 * No errors found -> uploading files first
                 */
                if(self.errors.length==0){
                    var folder = mycz.helpers.isset(me.attr("data-folder"),true) ? me.attr("data-folder") : 'uploads';
                    var wasHidden = false;
                    if(me.parents("div.mycz-form-block").hasClass("displayNone")){
                        wasHidden = true;
                        me.parents("div.mycz-form-block").removeClass("displayNone");
                    }
                    loader.start();
                    mycz.plugins.croppie.getResult(me,function(result){
                        mycz.firebase.files().upload(result,'data_url',function(uploaded_file){
                            me.attr('data-uploaded',1).attr("data-download-urls",uploaded_file);
                            if(wasHidden == true){
                                me.parents("div.mycz-form-block").addClass("displayNone");
                            }
                            loader.stop();

                            /**
                             * Original file will be uploaded and the url putted into another field!
                             */
                            if(mycz.helpers.isset(croppie_upload_original_file,true,true)){
                                if(self.container.find("div[data-col='"+croppie_upload_original_file+"']").length>0){
                                    if(self.form_collect.current.find("input").prop("files").length>0){
                                        var file = self.form_collect.current.find("input").prop("files")[0];
                                        var ending = function(){
                                            try { return "."+file.name.split(".")[file.name.split(".").length-1]; } catch(err){ return '.zapp' };
                                        }();
                                        mycz.firebase.files().upload(file,'file',function(download_url){

                                            /**
                                             * Put into the other field
                                             */
                                            self.container.find("div[data-col='"+croppie_upload_original_file+"'] input").attr("value",download_url).val(download_url);

                                            /**
                                             * Continue collecting
                                             */
                                            self.steps.collect_data(self.container,1,self.form_collect.current_callback);
                                        },folder,ending,format.clean_string(file.name));
                                        return;
                                    }
                                }
                            }
                            self.steps.collect_data(self.container,1,self.form_collect.current_callback);
                        },folder,'',label('thumbnail'),'','',true);
                    });
                    throw new Error('Uploading');
                }
            }

            var c = self.form_collect.current.find("div.croppie-container[data-uploaded=1]:first");
            return c.attr("data-download-urls");
        },
        rows: function(){

            var arr = [];

            var depth = parseInt(self.form_collect.current.attr("data-depth"))+1;
            self.form_collect.current.children("div.rows-block").children("div.rows-entry").each(function(){
                arr.push(self.steps.collect_data($(this),depth));
            });

            if(self.form_collect.current.parents("div[data-type='json']").length>0){
                return arr;
            }

            if(arr.length==0){
                return '';
            }

            return mycz.helpers.json.stringify(arr);

        },
        signature: function(){

            /**
             * Checking for upload-fields and upload them first,
             * before we collect and continue to callback.
             */
            var me = self.form_collect.current.find("div.signature-container:not([data-url]):first");
            if(self.helpers.getOption(self.form_collect.current,'required') == true && me.length > 0){
                self.errors.push({
                    ele:self.form_collect.current,
                    errors:['required']
                });
            }

            if(self.form_collect.current.find("div.signature-container[data-url]:not([data-uploaded]):first").length>0 && self.onCollectUploadFiles == true ){
                me = self.form_collect.current.find("div.signature-container[data-url]:not([data-uploaded]):first");
                /**
                 * No errors found -> uploading files first
                 */
                if(self.errors.length==0){
                    var folder = mycz.helpers.isset(me.attr("data-folder"),true) ? me.attr("data-folder") : 'uploads';
                    var wasHidden = false;
                    if(me.parents("div.mycz-form-block").hasClass("displayNone")){
                        wasHidden = true;
                        me.parents("div.mycz-form-block").removeClass("displayNone");
                    }
                    loader.start();
                    var result = me.attr("data-url");
                    mycz.firebase.files().upload(result,'data_url',function(uploaded_file){
                        me.attr('data-uploaded',1).attr("data-download-urls",uploaded_file);
                        if(wasHidden == true){
                            me.parents("div.mycz-form-block").addClass("displayNone");
                        }
                        self.steps.collect_data(self.container,1,self.form_collect.current_callback);
                    },folder,'',label('thumbnail'),'','',true);
                    throw new Error('Uploading');
                }
            }

            /**
             * We are collecting for custom functions
             * return if has been signed
             */
            if(self.onCollectUploadFiles == false){
                if(self.form_collect.current.find("div.signature-container[data-signed='1']:first").length>0){
                    return 1;
                } else {
                    return 0;
                }
            }

            var c = self.form_collect.current.find("div.signature-container[data-uploaded='1']:first");
            return c.attr("data-download-urls");
        },
        list: function(){
            var arr = [];
            self.form_collect.current.find("div.zapp-nav.active").each(function(){
                arr.push($(this).attr("data-value"));
            });
            var min = self.helpers.getOption(self.form_collect.current,'min');
            min = mycz.helpers.isset(min,true,true) ? parseFloat(min) : 0;
            min = min > self.form_collect.current.find("div.zapp-nav").length ? self.form_collect.current.find("div.zapp-nav").length : min;


            var max = self.helpers.getOption(self.form_collect.current,'max');
            max = mycz.helpers.isset(max,true,true) ? parseFloat(max) : 0;

            if(min>arr.length){
                self.errors.push({
                    ele:self.form_collect.current,
                    errors:['label:please_select_min_X '+min]
                });
            }

            if(max > 0 && max<arr.length){
                self.errors.push({
                    ele:self.form_collect.current,
                    errors:['label:please_select_X '+max]
                });
            }
            return arr.join(",");

        },
        color: function(){

            var div = self.form_collect.current;

            if(div.attr('data-no-color') == 1){
                return undefined
            }
            return self.form_collect.current.find("input[name='pick']").spectrum('get').toRgbString();
        },
        output_text: function(){
        },
        output_pic: function(){

        },
        output_vid: function(){

        },
        output_doc: function(){

        },
        address: function(){
            return self.form_collect.current.children("div").children("input[type='text']").val();
        },
    };

    /**
     * Some special types require special way to get data
     * or are connected to other data (eg. gallery)
     */
    this.form_collect_for_firebase = {

        /**
         * For Text elements we must check localize
         * and return the locales
         */
        text: function(value,options){

            if(options.localize == true){
                if(mycz.helpers.isset(value,true,true) && value != 0){
                    if(!isNaN(parseFloat(value))){
                        var obj = {};
                        obj[value] = locales[value];

                        return {
                            value: value,
                            locales: obj
                        };
                    }

                }


            }

            return {
                value:value
            };

        },

        /**
         * For Textarea we must check localize
         * and return locales
         */
        textarea: function(value,options){
            return self.form_collect_for_firebase.text(value,options);
        },

        /**
         * Grid can connect to localCache
         */
        grid: function(value,options){

            var obj = {
                value: value
            };

            if(options.form_collect_for_firebase === false){
                return obj;
            }

            if(options.values == 'localCache'){
                if(mycz.helpers.isset(value,true,true)){
                    obj[options.localCache] = {};
                    $.each(mycz.helpers.split(value,',',true),function(nn,i){
                        obj[options.localCache][i] = {};
                    });
                }

            }

            return obj;
        },

        localCache: function(value,options){

            var obj = {
                value: value
            };

            if(options.form_collect_for_firebase === false){
                return obj;
            }

            if(mycz.helpers.isset(value,true,true)){
                obj[options.localCache] = {};
                obj[options.localCache] = {};
                $.each(mycz.helpers.split(value,',',true),function(nn,i){
                    obj[options.localCache][i] = {};
                });
            }

            return obj;
        },

        /**
         * For Gallery we must return the right gallery
         * and the picture ids
         */
        gallery: function(value,options){
            var obj = {
                value: value
            };
            if(mycz.helpers.isset(value,true,true)){
                if(options.gallery != 'videos' && options.gallery != 'docs'){
                    options.gallery = 'gallery';
                }
                obj[options.gallery] = {};
                obj[options.gallery][value] = {};
            }

            return obj;
        },

        /**
         * For searchByTags we need to collect like
         * localCache (grid etc.)
         */
        searchByTags: function(value,options){
            var obj = {
                value: value
            };

            if(mycz.helpers.isset(value,true,true)){
                obj[options.searchByTags.searchIn] = {};
                $.each(mycz.helpers.split(value,',',true),function(nn,i){
                    obj[options.searchByTags.searchIn][i] = {};
                });
            }

            return obj;
        },

        /**
         * Json can contain any other type of forms
         * we loop through them and check for special data
         */
        json: function(value,options){

            var obj = {
                value: value
            };

            var decodedValue = mycz.helpers.json.parse(value);

            if(options.jsonData){
                $.each(options.jsonData,function(key,columnOptions){
                    if(decodedValue[key]){
                        if(self.form_collect_for_firebase[columnOptions.type]){
                            var res = self.form_collect_for_firebase[columnOptions.type](decodedValue[key],columnOptions);
                            delete res.value;
                            obj = $.extend(true,obj,res);
                        }
                    }
                })
            }
            return obj;
        },

        /**
         * For Rows we need to loop and check for
         * connections to other entities
         */
        rows: function(value,options){

            var obj = {
                value: value
            };

            var steps = {

                values: function(values,value){
                    $.each(values,function(key,subentries){
                        if(subentries.data){
                            $.each(subentries.data,function(key,columnOptions){
                                if(self.form_collect_for_firebase[columnOptions.type]){
                                    var res = self.form_collect_for_firebase[columnOptions.type](value[key],columnOptions);
                                    delete res.value;
                                    obj = $.extend(true,obj,res);
                                }
                            })
                        } else if (subentries.values){
                            steps.values(subentries.values,value);
                        }
                    })
                }
            };

            var decodedValue = mycz.helpers.json.parse(value);

            $.each(decodedValue,function(i,entry){
                if(options.values){
                    steps.values(options.values,entry);
                }
            });

            return obj;
        },

    };

    /**
     * This functions here are optional.
     * We use them to update a value (e.g in sharing-forms)
     * @param col string - colname
     * @param value
     */
    this.form_setValue = function(col,value){

        var types = {
            hidden: function(){
                col.children("input[type='hidden']").val(value).attr("value",value);
            },
            text: function(){
                col.children("input[type='text']").val(value);
            },
            number: function(){
                col.children("input[type='number']").val(value);
            },
            numbers: function(){
                types.number();
            },
            password: function(){
                col.children("input[type='password']").val(value);
            },
            textarea: function(){
                var t = col.children("textarea");
                if(t.hasClass("has-tiny")){
                    tinyMCE.get(t.attr("id")).setContent(value);
                } else {
                    t.val(value);
                }
            },
            select: function(){
                col.children("select").val(value).change();
            },
            localCache: function(){
                types.select();
            },
            boolean: function(){
                if(value == 1 && !col.find("i").hasClass("boolean-on") || value == 0 && col.find("i").hasClass("boolean-on")){
                    col.find("i").trigger("click");
                }
            },
            list: function(){
                col.find(".zapp-nav.active").trigger("click");
                $.each(mycz.helpers.split(value,',',true),function(nn,v){
                    col.find(".zapp-nav[data-value='"+v+"']").trigger("click");
                });
            },
            rows: function(){
                col.children("div.rows-block").attr("data-set",((mycz.helpers.isObject(value) || mycz.helpers.isArray(value)) ? mycz.helpers.json.stringify(value) : value));
                col.children("div.rows-block").trigger("set");
            }
        };

        col = self.container.find("div.mycz-form-block[data-col='"+col+"']");

        if(col.length>0){
            if(types[col.attr("data-type")]){
                types[col.attr("data-type")]();
            }
        }

    };

    /**
     * All the validations
     */
    this.form_validate = {

        /**
         * Validate if field is required
         */
        required: {
            validate: function(opts,val){

                if(args.disable_required == true){
                    return true;
                }

                /**
                 * If dependency is applied - Value is not required.
                 */
                if(self.form_collect.current.hasClass("force-hide-by-dependency")){
                    return true;
                }

                /**
                 * Multilanguage text fields: We loop through all languages.
                 * At least one must be setted.
                 */
                if(opts.multilanguage == true){

                    val = mycz.helpers.json.parse(val);

                    var atleastone_found = false;

                    $.each(val,function(l,v){
                        if(mycz.helpers.isset(v,true,true)){
                            atleastone_found = true;
                        }
                    });

                    return atleastone_found;
                }

                /**
                 * Some types get already validated in their form_collect function
                 */
                switch(opts.type){
                    case 'signature':
                        return true;
                        break;
                    case 'boolean':
                        return val == 1;
                        break;
                    case 'upload':
                        if(opts.multiple == true){
                            var test = mycz.helpers.json.parse(val,false,true);
                            if(test.length>0){
                                return true;
                            }
                            return false;
                        }
                        break;
                }

                return mycz.helpers.isset(val,true);
            },
            text: {
                en: 'Required',
                de: 'Benötigt'
            }
        },

        /**
         * Validate if number is bigger then
         */
        bigger_then: {
            validate: function(args,val){
                var x = self.container.find("div.mycz-form-block[data-col='"+args.validate_bigger_then+"'] input").val();
                if(args.validate_bigger_then_is_hours == true){
                    return time.clock.convert.toDecimal(x) < time.clock.convert.toDecimal(val);
                }
                if(args.validate_bigger_then_is_date == true){
                    return time.date.convert.fromDate.toTimestamp(x) < time.date.convert.fromDate.toTimestamp(val);
                }
                return x < val;
            },
            text: {
                en: 'Number too low',
                de: 'Zahl zu niedrig'
            }
        },

        /**
         * Validate email address
         */
        email: {
            validate: function(args,val){
                var emailAddress = val;
                var sQtext = '[^\\x0d\\x22\\x5c\\x80-\\xff]';
                var sDtext = '[^\\x0d\\x5b-\\x5d\\x80-\\xff]';
                var sAtom = '[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+';
                var sQuotedPair = '\\x5c[\\x00-\\x7f]';
                var sDomainLiteral = '\\x5b(' + sDtext + '|' + sQuotedPair + ')*\\x5d';
                var sQuotedString = '\\x22(' + sQtext + '|' + sQuotedPair + ')*\\x22';
                var sDomain_ref = sAtom;
                var sSubDomain = '(' + sDomain_ref + '|' + sDomainLiteral + ')';
                var sWord = '(' + sAtom + '|' + sQuotedString + ')';
                var sDomain = sSubDomain + '(\\x2e' + sSubDomain + ')*';
                var sLocalPart = sWord + '(\\x2e' + sWord + ')*';
                var sAddrSpec = sLocalPart + '\\x40' + sDomain; // complete RFC822 email address spec
                var sValidEmail = '^' + sAddrSpec + '$'; // as whole string
                var reValidEmail = new RegExp(sValidEmail);
                if (reValidEmail.test(emailAddress)) {

                } else {
                    return false;
                }
                return true;
            },
            text: {
                en: 'Invalid E-Mail Address',
                de: 'Ungültige E-Mail Adresse'
            }
        },

        /**
         * Validate ip-address
         */
        ip_address: {
            validate: function(args,s){
                var match = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
                return match != null &&
                    match[1] <= 255 && match[2] <= 255 &&
                    match[3] <= 255 && match[4] <= 255;
            },
            text: {
                en: 'Invalid IP-Address',
                de: 'Ungültige IP-Adresse'
            }
        },

        /**
         * Validate port
         */
        port: {
            validate: function(args,val){

                try {
                    return parseInt(val) >= 1 && parseInt(val) <= 65535;
                } catch(err){
                    return false;
                }

            },
            text: {
                en: 'Invalid Port',
                de: 'Ungültiger Port'
            }
        },

        /**
         * Validate OTO-ID (A/B/O/WP.XXX.XXX.XXX.X)
         */
        oto_id: {
            validate: function(args,val){


                val = val.toString();

                /**
                 * Validate "." (dots)
                 */

                try {
                    if(val.split(".").length != 5){
                        return false;
                    }
                } catch(err){
                    return false;
                }

                val = val.split(".");

                /**
                 * Validate A/B/O/WP
                 */
                if(val[0] != 'A' && val[0] != 'B' && val[0] != 'O' && val[0] != 'WP'){
                    return false;
                }

                return true;
            },
            text: {
                en: 'Invalid OTO-ID',
                de: 'Ungültige OTO-ID'
            }
        },

        /**
         * Validate at least one char
         */
        one_char: {
            validate: function(args,val){

                val = mycz.helpers.notNull(val);

                val = $.trim(val);

                if(val.length>0){
                    return true;
                }
                return true;
            },
            text: {
                en: 'At least one character',
                de: 'Mindestens ein Zeichen'
            }

        },

        /**
         * Validate at least three chars
         */
        three_chars: {
            validate: function(args,val){

                val = mycz.helpers.notNull(val);

                val = $.trim(val);

                if(val.length>2){
                    return true;
                }
                return true;
            },
            text: {
                en: 'At least three characters',
                de: 'Mindestens drei Zeichen'
            }

        },

        /**
         * New Validate method, forcing user to select address from google autocomplete
         */
        google_maps: {
            validate:function (args,val) {

                /**
                 * Checking if the input value is empty, also checking if user entered address and he removes and clicks next we remove
                 * attr google selected so we force him to selected address from google autocomplete
                 */
                if(val == '' || val == null) {

                    if(self.form_collect.current.children().find('input#location.zapp-click-fixer').attr('data-autocomplete-selected')) {

                        self.form_collect.current.children().find('input#location.zapp-click-fixer').removeAttr('data-autocomplete-selected');

                    }
                    return false;
                }

                /**
                 * Checking if user selected address from autocomplete or he wrote it
                 */
                return self.form_collect.current.children().find('input#location.zapp-click-fixer').attr('data-autocomplete-selected') == 1 ? true : false;

            },
            text: {
                en: 'Click an address from the search',
                de: 'Adresse aus der Suche anklicken'
            }
        }

    };

    this.steps = {

        /**
         * Checking if group_left is enabled.
         * Moving container to some col-md's and creating
         * the left grouped bar.
         */
        group_left: function(){

            /**
             * No Left groups on mobile
             */
            if(self.isMobile == true){
                args.groups_left = false;
            }

            if(args.groups_left == true){

                if(args.no_groups == true){

                    self.container.prepend(mycz.ele.div('col-md-12 p-10'));
                    self.container.prepend(mycz.ele.div('col-md-3 p-10 mycz-form-group-left displayNone'));
                    self.container = self.container.children("div.col-md-12");

                } else {

                    self.container.prepend(mycz.ele.div('col-md-9 main-container p-10'));
                    self.container.prepend(mycz.ele.div('col-md-3 p-10 mycz-form-group-left'));
                    self.container = self.container.children("div.col-md-9");
                    args.width = 850;

                }
            }
        },

        /**
         * Creating the head / groups of the form,
         * if setted.
         */
        head: function(){

            if(mycz.helpers.isset(groups,true,true)){

                self.group_container = mycz.ele.div('block w-100 fleft form-head').css("padding","5px 0px 5px 0px");

                if(args.no_groups == true){
                    self.group_container.addClass("displayNone");
                }

                var noneExists = true;

                $.each(groups,function(t,vals){

                    var title = mycz.helpers.getText(vals.label,true);
                    title = title ? (contains(title,'label:') ? label(title.replace('label:','')) : title) : label(t);

                    var ico = vals.icon ? (contains(vals.icon,'icon.') ? icon[vals.icon.split("icon.")[1]] : vals.icon) : 'ion-android-arrow-dropright';

                    var btn = mycz.ele.btn('button-grey '+(args.groups_left == true ? ' text-left  p-5' : 'button-tab'),mycz.ele.new('span',title,'fellipsis o-hidden block w-100'),function(){

                        self.group_container.find('.button-active').removeClass("button-active fw-600").addClass("button-grey");

                        /**
                         * Step System shows only 3 buttons same time
                         */
                        if(args.step_system == true && self.isMobile == true){
                            self.group_container.find('.zapp-btn').addClass("displayNone");
                            $(this).prev().removeClass("displayNone").css("width","calc(33% - 4px)");
                            $(this).addClass("button-active fw-600").removeClass("button-grey displayNone").css("width","calc(33% - 4px)");
                            $(this).next().removeClass("displayNone").css("width","calc(33% - 4px)");
                            if($(this).prev().length==0){
                                $(this).next().next().removeClass("displayNone").css("width","calc(33% - 4px)");
                            }
                            self.group_container.css("overflow","hidden");
                        } else {
                            $(this).addClass("button-active fw-600").removeClass("button-grey");
                        }


                        if(self.$HIDDEN_CONTAINER != null){
                            self.container.children("div.mycz-form-block").appendTo(self.$HIDDEN_CONTAINER);
                        } else {
                            self.container.find("div.mycz-form-block").addClass("displayNone");
                        }

                        $.each(vals.collection,function(nn,e){

                            var block = '';

                            $.each(mycz.helpers.split(e,':'),function(n,v){

                                if(v == '*'){
                                    block.find("div.mycz-form-block").removeClass("displayNone");
                                } else {

                                    if(self.$HIDDEN_CONTAINER != null){
                                        block = self.$HIDDEN_CONTAINER.children("div.mycz-form-block[data-col='"+v+"']");
                                    } else {
                                        block = self.container.find("div.mycz-form-block[data-col='"+v+"']");
                                    }

                                    if(block.attr("data-type") == 'rows'){
                                        block.find("div.rows-entry div.mycz-form-block").removeClass("displayNone");
                                    }

                                    if(self.$HIDDEN_CONTAINER != null){
                                        block.appendTo(self.container);
                                    } else {
                                        block.removeClass("displayNone");
                                    }
                                }
                            });
                        });

                        $(window).trigger("resize");

                        /**
                         * Step System
                         */
                        if(args.step_system == true && self.popup != null){
                            if(self.group_container.find("a.zapp-btn:last").hasClass("button-active")){
                                self.popup.find("a.cancel").html(label("back"));
                                self.popup.find("a.createInsert").html(btn_title).addClass("button-"+btn_class).removeClass("button-new-blue");
                            } else if(self.group_container.find("a.zapp-btn:first").hasClass("button-active")){
                                self.popup.find("a.cancel").html(label("cancel"));
                            } else {
                                self.popup.find("a.cancel").html(label("back"));
                                self.popup.find("a.createInsert").html(label("next")).addClass("button-new-blue").removeClass("button-"+btn_class);
                            }
                        }
                        
                        return false;

                    }).attr("id",tools.rand_string()).attr("data-group-id",t);

                    btn.prepend(mycz.ele.icon(ico));

                    /**
                     * Checking if at least one is existing,
                     * otherwise remove the button
                     */
                    var exists = false;

                    $.each(vals.collection,function(nn,e){

                        var check = function(){
                            if(mycz.helpers.split(e,':').length>1){
                                if(mycz.helpers.split(e,':')[1] == '*'){
                                    return mycz.helpers.split(e,':')[0];
                                } else {
                                    return mycz.helpers.split(e,':')[1];
                                }
                            } else {
                                return e;
                            }
                        }();

                        if(self.container.find("div.mycz-form-block[data-col='"+check+"']").length>0){
                            exists = true;
                        }
                    });

                    if(exists == true){
                        self.group_container.append(btn);
                        noneExists = false;
                    } else {
                        noneExists = noneExists == false ? false : true;
                    }

                });

                /**
                 * You have passed groups, but none of them have
                 * valid target-columns. Restart creation of form without groups.
                 */
                if(noneExists == true && self.$HIDDEN_CONTAINER != null){
                    self.container.empty();
                    groups = null;
                    self.$HIDDEN_CONTAINER = null;
                    init();
                    return;
                }

                if(args.groups_left == true){
                    self.save_container.children("div.col-md-3").append(self.group_container);
                } else {
                    self.container.prepend(self.group_container);
                }

            } else {
                self.$HIDDEN_CONTAINER = null;
            }

        },

        /**
         * A function which adds the form-entry.
         * Triggered by steps.cols();
         * @param depth int current deepness (required for json-cols)
         * @param container jquery object where to add, by default self.container
         * @param parent string parent column name (required for json-cols)
         */
        add_current: function(depth,container,parent){


            var vals = self.current;

            var block;
            var save_block;

            var steps = {

                /**
                 * Creating block-entry
                 */
                create_block: function(){

                    block = mycz.ele.label();

                    if(vals.hide == true){
                        block.css("display","none");
                    }

                    if(vals.required == 1){
                        block.attr("data-required",1);
                    }

                    block.click(function(){
                        self.focus($(this).attr("data-col"));
                    });

                    if(vals.min_height && vals.type != 'upload'){
                        block.css("min-height",vals.min_height);
                    }
                },

                /**
                 * We can add classes
                 */
                add_classes: function(){
                    if(vals.classes){
                        block.addClass(vals.classes);
                    }
                },

                /**
                 * Percentage or pixels allowed
                 */
                set_formWidth: function(){
                    if(vals.formWidth){
                        block.css("width",vals.formWidth);
                    }
                    if(vals.formHeight){
                        block.css("height",vals.formHeight);
                    }
                },

                /**
                 * With center we can bring the current block
                 * to center automatically using margin
                 */
                center_block: function(){
                    if(vals.center == true){
                        block.addClass("mobile-centered block").css("clear","both").css("display","block");
                    }
                },

                /**
                 * Setting attributes
                 */
                setAttributes: function(){
                    block.attr("data-col",vals.col)
                        .attr("data-depth",(depth ? depth : 1))
                        .attr("data-type",vals.type)
                        .attr("data-json-deepness",self.json_deepness != null ? mycz.helpers.json.stringify(self.json_deepness) : undefined)
                        .attr("data-override-cols",self.override_current_cols != null ? mycz.helpers.json.stringify(self.override_current_cols) : undefined);
                },

                /**
                 * Set to listen on dependencies
                 */
                setDependencies: function(){

                    /**
                     * Disable dependencies
                     */
                    if(args.no_dependencies == true){
                        return;
                    }

                    if(self.current.dependency){

                        var dependency = mycz.helpers.json.parse(self.current.dependency);

                        if(dependency.length>0){

                            $.each(dependency,function(nn,entries){

                                $.each(entries,function(k,v){

                                    if(k != 'e'){ // reserved name equal

                                        if(!self.dependencyIndex.dependentFromMe[k]){
                                            self.dependencyIndex.dependentFromMe[k] = [vals.col];
                                        } else {
                                            if(!mycz.helpers.array.contains(self.dependencyIndex.dependentFromMe[k],vals.col)){
                                                self.dependencyIndex.dependentFromMe[k].push(vals.col);
                                            }
                                        }

                                        if(!self.dependencyIndex.dependent[vals.col]){
                                            self.dependencyIndex.dependent[vals.col] = [k];
                                        } else {
                                            if(!mycz.helpers.array.contains(self.dependencyIndex.dependent[vals.col],k)){
                                                self.dependencyIndex.dependent[vals.col].push(k);
                                            }
                                        }

                                    }

                                });

                            });

                            block.attr("data-has-dependencies",1);
                        }
                    }
                },

                /**
                 * Add the title - with noLabel we can skip this.
                 */
                create_label: function(){

                    if(vals.noLabel != true){

                        var title = '';

                        if(!vals.label && self.override_current_cols != null){
                            if(vals.name){
                                title = mycz.helpers.getText(vals.name,true);
                            }
                        } else {
                            title = mycz.helpers.getText(vals.label,true);
                        }

                        if(contains(title,'eval: ')){
                            title = eval(title.replace('eval: ',''))
                        }

                        block.append(mycz.ele.new('span',title ? (contains(title,'label:') ? label(title.replace('label:','')) : title) : label('insert_'+vals.col),'mycz-form-label'))

                    }
                },

                /**
                 * Add the helper - with show_helper we can show
                 * the helpers text immediatly.
                 */
                add_helper: function(){

                    var helperText = vals.helper;

                    var showHelper = vals.show_helper;

                    /**
                     * Custom Modules internal note hack..
                     */
                    if(mycz.ENV == 'ADMIN'){
                        if(mycz.active){
                            if(mycz.helpers.isFunction(mycz.active.page)){
                                if(mycz.active.page() == 'getCustomModules' && args.no_internal_notes != true){
                                    if(mycz.helpers.isset(vals.internal_note,true,true)){
                                        if(mycz.helpers.isset(helperText,true,true)){
                                            helperText = mycz.helpers.getText(helperText);
                                        }
                                        helperText = helperText+'<span class="badge button-orange block w-100 fleft fw-600 quicksand">Internal Note: '+vals.internal_note+'</span>';
                                        showHelper = true;
                                    }
                                }
                            }
                        }

                    }

                    if(helperText){

                        var h = [];

                        /**
                         * Migrating old helpers: if is an object, auto label, example:
                         * helper => [
                         *      hello => world,
                         * ]
                         */
                        if(mycz.helpers.isObject(helperText)){
                            if(Object.keys(helperText)[0] == 'en' || Object.keys(helperText)[0] == 'de'){
                                h.push(mycz.helpers.getText(helperText,true));
                            } else {
                                $.each(helperText,function(t,v){
                                    h.push(mycz.helpers.getText(v,true)+"<br>");
                                });
                            }

                        } else {
                            h.push(mycz.helpers.getText(helperText,true));
                        }

                        var anyHelperTextExists = false;
                        $.each(h,function(n,hh){
                            if(mycz.helpers.isset(hh,true,true)){
                                anyHelperTextExists = true;
                            }
                        });

                        if(anyHelperTextExists == false || helperText == '{}'){
                            return;
                        }

                        h = h.join("<br>");

                        if(showHelper){
                            block.find("span").after(mycz.ele.new('span',h,'fw-400 block w-100 fleft '+vals.helper_class).css("font-size","13px").attr("style",vals.helper_css).css("padding","0px 5px 10px 5px"));
                        } else {
                            block.find("span:first").append(mycz.plugins.tooltipster.tip($(mycz.ele.new('span',mycz.ele.icon('ion-help'),' helper alert-info badge button-no-bg  b-radius-50 pointer')
                                .attr("tt-theme","alert-info f-20")),'right',mycz.ele.div('p-10',h)));
                        }
                    }
                },

                /**
                 * Will add an info to write in current page lang
                 */
                add_localize_info: function(){
                    if(vals.localize == true){
                        block.find("span:first").append(mycz.plugins.tooltipster.tip($(mycz.ele.new('span',label("write_in")+" "+label(getLanguage(window.languages.activeLang)[0]),' helper fw-600 error-blue badge button-no-bg pointer')
                            .attr("tt-theme","alert-info f-20")),'right',label('type_in_language')));
                    }
                },

                /**
                 * We save the initial block
                 */
                save_block: function(){
                    save_block = block;
                },

                /**
                 * With icon or img we prepend an icon or image to the block
                 */
                has_icon_or_img: function(){
                    if(vals.icon || vals.img){
                        block.append(mycz.ele.div('col-md-3 fleft inline-block p-5 text-center',(vals.icon ? mycz.ele.icon(vals.icon+" f-20") : mycz.ele.img(vals.img))));
                        block.append(mycz.ele.div('col-md-9 fleft inline-block'));
                        block.find("span").addClass("fw-600 p-5").appendTo(block.find("div.col-md-9"));
                        block.addClass("has-icon");
                        block = block.children("div.col-md-9");
                    }
                },

                /**
                 * Setting self.current.block to access
                 * it from all the next functions
                 */
                set_current_block: function(){
                    self.current.block = block;
                },

                /**
                 * With onNull we can allow the user to unset the values
                 * and lock them with an icon. onNull can be setted on each column.
                 *
                 * onNull can also be passed in "args" - Then onNull gets applied to all columns end overrides all onNull's of columns.
                 */
                onNull: function(){

                    if(vals.onNull || args.onNull){

                        if(mycz.helpers.isset(vals.onNull,true,true) || mycz.helpers.isset(args.onNull,true,true)){

                            var use = function(){
                                if(mycz.helpers.isset(args.onNull,true,true)){
                                    return args.onNull;
                                }
                                return vals.onNull;
                            }();

                            var icon_null = mycz.helpers.isset(use.icon_null,true) ? use.icon_null : 'zapp-icon-cogs';
                            var icon_not_null = mycz.helpers.isset(use.icon_not_null,true) ? use.icon_not_null : 'zapp-icon-trash';

                            var realBlock = block.hasClass("mycz-form-block") ? block : block.parent();

                            block.find("span.mycz-form-label").prepend(mycz.plugins.tooltipster.tip($(mycz.ele.icon(icon_not_null+" f-20 unlocked zapp-icon onNull-label-icon error-grey pointer")).css("margin-right","5px").click(function(){

                                var me = $(this);

                                if($(this).hasClass('unlocked')){

                                    $(this).removeClass(icon_not_null).addClass(icon_null).removeClass('unlocked');

                                    realBlock.addClass("onNull-active");

                                    var div = mycz.ele.div('prevent bordered onNull animated fadeIn','',{
                                        'tt-theme': 'quicksand fw-600',
                                        'tt-pos':'right'
                                    }).click(function(){
                                        me.click();
                                    });

                                    div.append(mycz.ele.div('onNull-label',block.find("span:first").html()));
                                    div.append(mycz.ele.div('onNull-icon',mycz.ele.icon('zapp-icon '+icon_null)));
                                    div.append(mycz.ele.div('onNull-text',mycz.helpers.getText(use.label,true)));



                                    div.on('mouseover',function(){

                                        if(!$(this).hasClass("tooltipstered")){

                                            var hoverContent = mycz.helpers.getText(use.label,true);

                                            if(mycz.helpers.isset(use.hover,true,true)) {
                                                if(mycz.helpers.isFunction(use.hover)){
                                                    hoverContent = use.hover();
                                                } else {
                                                    hoverContent = use.hover;
                                                }
                                            }


                                            mycz.plugins.tooltipster.tip($(this),'bottom',hoverContent,'',500);

                                            $(this).tooltipster('show');
                                        }

                                    });



                                    $(this).parents("div.mycz-form-block:first").append(div);

                                } else {

                                    realBlock.removeClass("onNull-active");

                                    $(this).addClass(icon_not_null).removeClass(icon_null).addClass("unlocked");
                                    $(this).parents("div.mycz-form-block:first").children("div.prevent").remove();

                                }

                            }),'bottom',mycz.helpers.getText(use.label,true,false)));

                            var val = self.helpers.getVal();

                            var valueExists = function(){

                                if(val === null || val === undefined || use['0_is_null'] == true && val === 0 || use['0_is_null'] == true && val === "0"){
                                    return false;
                                }

                                if(vals.multilanguage == true){

                                    var atleastonetext_found = false;

                                    $.each(mycz.helpers.json.parse(val),function(l,v){
                                        if(mycz.helpers.isset(v,true,true)){
                                            atleastonetext_found = true;
                                        }
                                    });

                                    return atleastonetext_found;
                                }

                                return true;
                            }();

                            if(valueExists == false || isEdit == false){
                                block.find("span:first").find("i.unlocked").trigger("click");
                            }

                        }

                    }
                },

                /**
                 * Adding the current type if exists,
                 * otherwise will throw a warning
                 */
                add_form_type: function(){
                    block.append(self.form_types[vals.type]());
                },

                /**
                 * Checking for required-entries.
                 * Binding key presses to disable the create-button.
                 */
                isRequired: function(){
                    if(self.helpers.getOption('','required') == true && !self.helpers.getOption('','type') == 'upload'){
                        var me = self.current.name;
                        self.keyUps[me] = self.helpers.getVal();
                        block.children("input").on('keypress change keydown keyup',function(){
                            var ele = $(this);
                            self.keyUps[me] = ele.val();
                            var not_setted = false;
                            $.each(self.keyUps,function(k,v){
                                if(v == ''){
                                    not_setted = true;
                                }
                            });
                            if(not_setted == true){
                                self.popup.find("a.zapp-btn.mycz-modal-footer-btn.button-green").addClass("disabled");
                            } else {
                                self.popup.find("a.zapp-btn.mycz-modal-footer-btn.button-green").removeClass("disabled");
                            }
                            if(self.keyUps[me] == ''){
                                mycz.plugins.tooltipster.tip(ele,'right',label("required"));
                                try {

                                    ele.tooltipster('show');
                                    setTimeout(function(){
                                        mycz.plugins.tooltipster.destroy(ele);
                                    },1500)
                                } catch(err){}
                            } else {
                                mycz.plugins.tooltipster.destroy(ele);
                            }
                        });
                        if(self.onCreateTriggerKeyUp == true){
                            setTimeout(function(){
                                block.children("input").trigger("keypress");
                            },50);
                        }

                    }
                },

                /**
                 * Restore block (icon may switched the block)
                 */
                restore_block: function(){
                    block = save_block;
                }
            };

            steps.create_block();
            steps.add_classes();
            steps.set_formWidth();
            steps.center_block();
            steps.setAttributes();
            steps.setDependencies();
            steps.create_label();
            steps.add_helper();
            steps.add_localize_info();
            steps.save_block();
            steps.has_icon_or_img();
            steps.set_current_block();
            steps.onNull();
            steps.add_form_type();
            steps.isRequired();
            steps.restore_block();


            container.append(block);

            self.current.block = null;
        },

        /**
         * Loop through the cols and adding using
         * steps.add_current the form entries.
         * @param cols object the cols to add, is also used by json-cols
         * @param depth int current deepness (required for json-cols)
         * @param container jquery object where to append, by default self.container
         * @returns {*}
         */
        cols: function(cols,depth,container){

            var helpers = {

                /**
                 * Easy dependency of current editting row
                 * @param editDepends
                 * @returns {boolean}
                 */
                editDepends: function(editDepends){
                    var skip = false;
                    $.each(editDepends,function(key,preg){
                        var val = mycz.cache.get((mycz.ENV == 'ADMIN' ? mycz.orm.getElementType(args.orm_name) : args.orm_name),key,'',args.edit_id);
                        switch(preg[1]){
                            case "activeArticle":
                                preg[1] = mycz.active.article;
                            break;
                        }
                        if(preg[0]=="="){
                            if(val==preg[1]){
                            } else {
                                skip = true;
                            }
                        }
                        if(preg[0]=="!="){
                            if(val != preg[1]){
                            } else {
                                skip = true;
                            }
                        }
                    });
                    return skip;
                }
            };

            var $cols = $.extend(true,{},cols);

            $.each($cols,function(col,vals){

                if(self.form_types[vals.type]){

                    /**
                     * Edit & New Flag checker
                     */
                    if(isEdit == true && vals.edit == true || isEdit != true && vals.new == true){

                        var skip = false;


                        if(vals['editDepends'] && isEdit == true){
                            skip = helpers.editDepends(vals.editDepends);
                        }

                        if(vals['new_hide'] == true && isEdit != true){
                            skip = true;
                        }

                        if(skip == false){
                            self.current = vals;
                            self.current.col = col;
                            self.steps.add_current(depth,container);
                        }
                    }
                } else {
                    console.warn("error found for column "+col+" -> type doesn't exist:"+vals.type)
                }

            });

            /**
             * Google Maps AutoComplete Fix (we may need to move it to somewhere else)
             */
            if(window.google_maps_places_ios_PATCH_not_answering_autocomplete != true){
                window.google_maps_places_ios_PATCH_not_answering_autocomplete = true;
                $(document).on({
                    'DOMNodeInserted': function() {
                        $('.pac-item, .pac-item span', this).addClass('needsclick');
                    }
                }, '.pac-container');
            }

            /**
             * Hotfix Mobile Input Focus issue
             */
            container.find("input:not(.zapp-click-fixer),textarea:not(.zapp-click-fixer)").addClass("zapp-click-fixer").click(function(){
                $(this).focus();
            });
            return container;
        },

        /**
         * Do Actions will be passed as hidden values
         * Can be defined in the orm to do specific things
         * on data change or insert
         */
        do_action:function(){
            if(args.do_action){
                self.container.append(mycz.ele.div('mycz-form-block force-hide',mycz.ele.input('do_action','hidden',args.do_action),{
                    'data-col': 'do_action',
                    'data-depth':1,
                    'data-type': 'hidden'
                }));
            }
        },

        /**
         * Collect data and passing it to the end-callback.
         * @param container jquery object where to append, by default self.container
         * @param depth int current deepness (required for json-cols)
         * @param callback function
         */
        collect_data: function(container,depth,callback,isHiddenContainer){

            loader.start();

            if(callback){
                self.form_collect.current_callback = callback;
            }

            var new_data = {};

            var hasChanged = function(k,new_val){
                return true;
                if(!mycz.helpers.isset(data,true)){
                    return true;
                } else {
                    if(data[k] != new_val){
                        return true;
                    }
                    return false;
                }
            };

            var validate = function(vals,new_val){


                if(args.disable_validations == true){
                    return [];
                }

                vals = mycz.helpers.isset(vals,true) ? vals : {};

                var errors = [];

                /**
                 * Required
                 */
                if(vals.required == true){
                    if(self.form_validate.required.validate(vals,new_val) != true){
                        errors.push('text:'+mycz.helpers.getText(self.form_validate.required.text));
                    }
                }

                if(mycz.helpers.isset(vals.maxlength,true,true)){

                    vals.maxlength = parseInt(vals.maxlength);

                    if(new_val != null){
                        if(vals.maxlength < new_val.toString().length){
                            errors.push('text:'+mycz.helpers.getText({
                                en:'Too long value',
                                de:'Zu grosser Wert'
                            }));
                        }
                    }
                }

                /**
                 * No need to validate (e.g email address) if required
                 * is not true and value is empty
                 */
                if(!mycz.helpers.isset(new_val,true,true) && vals.required != true){
                    return errors;
                }

                /**
                 * Validate
                 */
                if(vals.validate){
                    if(self.form_validate[vals.validate]){
                        if(self.form_validate[vals.validate].validate(vals,new_val) != true){
                            errors.push('text:'+mycz.helpers.getText(self.form_validate[vals.validate].text));
                        }
                    } else {
                        console.warn('missing validation type <<'+vals.validate+'>>');
                    }
                }

                return errors;
            };

            var collect = function(ele){

                self.form_collect.current = ele.hasClass("has-icon") ? ele.children("div.col-md-9:first") : ele;

                if( ele.children("div.prevent").length == 0 && !ele.hasClass("force-hide-by-dependency")
                    && ele.find("div.prevent.main-preventer").length == 0){

                    var col = ele.attr("data-col");
                    var args = self.helpers.getCols(ele)[col];

                    self.override_current_cols = null;

                    if(mycz.helpers.isset(ele.attr("data-override-cols"),true)){
                        args = mycz.helpers.json.parse(ele.attr("data-override-cols"));
                        self.override_current_cols = args;
                    }

                    var type = ele.attr("data-type");

                    switch(type){
                        case 'delete':
                        break;
                        default:

                            if(!self.form_collect[type]){
                                throw new Error('Missing form collection type <<'+type+'>>');
                            }

                            var new_val = self.form_collect[type]();

                            var skip = false;

                            /**
                             * Some form-types may have "readonly" or "disabled" set.
                             * When the user tries to manipulate this form type, he is able to
                             * override that value. We check if the form-type has enabled "readonly" or "disabled",
                             * and if yes, we return $$zapp_skip$$ instead of the manipulated value.
                             *
                             * WE CANNOT USE THIS: Dependencies do not work....
                             */
                           /* if(new_val == '$$zapp_skip$$'){
                                skip = true;
                            }

                            if(skip == false){
                                if(self.helpers.getOption(self.form_collect.current,'hide') == 1){
                                    skip = true;
                                }
                            }*/


                            if(skip == false){

                                var errors = validate(self.override_current_cols != null ? args[col] : args,new_val);

                                if(errors.length != 0){
                                    self.errors.push({
                                        ele: ele,
                                        errors: errors
                                    });
                                }

                                if(hasChanged(col,new_val)){
                                    new_data[col] = new_val;
                                }
                            }

                    }

                    self.override_current_cols = null;

                } else if(ele.children("div.prevent").length>0){
                    if(ele.children("div.prevent.onNull").length>0){

                        var col = ele.attr("data-col");

                        new_data[col] = null;

                    }
                }
            };

            /**
             * Looping blocks
             */
            container.find("div.mycz-form-block[data-depth='"+depth+"']").each(function(){
                collect($(this));
            });


            /**
             * Have errors, loop through them and show a toast
             */
            if(self.errors.length>0 && self.onCollectShowErrors == true){

                var text = '';
                $.each(self.errors,function(nn,obj){

                    text += '<b>'+obj.ele.find("span:first").text()+'</b><br>';
                    $.each(obj.errors,function(nn,err){

                        var errormsg = '';
                        if(contains(err,'label:')){
                            errormsg = label(err.replace("label:","").split(" ")[0])+(err.replace("label:","").split(" ").length>1 ? " "+err.replace("label:","").split(" ")[1] : '');
                        } else if(contains(err,'text:')){
                            errormsg = err.replace("text:","");
                        } else {
                            errormsg = label("validate_"+err);
                        }
                        text += '&nbsp;&nbsp;&nbsp;'+errormsg+'<br>';
                    });

                    obj.ele.addClass("validation-failed");
                    setTimeout(function(){
                        obj.ele.removeClass("validation-failed");
                    },8000);

                });


                self.envFunction('message')(text,'ion-android-close','danger','',3000);

                self.errors = [];

                loader.stop();

                throw new Error('Validation failed');

                return;
            }


            if(mycz.helpers.isset(callback,true)){

                if(self.$HIDDEN_CONTAINER != null && isHiddenContainer != true){
                    self.steps.collect_data(self.$HIDDEN_CONTAINER,1,function(hidden_data){
                        new_data = $.extend(true,new_data,hidden_data);
                        loader.stop();
                        callback(new_data);
                    },true);
                } else {
                    loader.stop();
                    callback(new_data);
                }

                return;
            }

            return new_data;
        }
    };

    /**
     * NEW: withReset argument to put a button
     * which resets the form to its initial state
     */
    if(args.withReset == true){

        this.container.append(mycz.ele.div('block w-100 fleft mycz-form-reset p-10',mycz.ele.btn('button-grey button-tab button-bigger disabled',mycz.ele.icon('ion-android-sync')+" "+label("reset"),function(){
            self.container = self.save_container;
            self.container.children("*:not(.mycz-form-reset)").remove();
            self.container.find("div.mycz-form-reset a.zapp-btn").addClass("button-grey disabled").removeClass("button-new-blue");
            self.triggerOnChange = false;
            init();
            self.triggerOnChange = true;
        })));

        this.onChange = function(e){
            self.save_container.find("div.mycz-form-reset a.zapp-btn").removeClass("button-grey disabled").addClass("button-new-blue");
        }
    }

    var init = function(){
        self.steps.group_left();
        self.steps.cols(cols,1,self.container);
        self.steps.do_action();
        self.steps.head();
    };

    init();

    /**
     * Triggering first dependency
     */
    $.each(self.dependencyIndex.dependentFromMe,function(col,noneed){
        if(self.container.find("div.mycz-form-block[data-col='"+col+"']").length>0){
            self.helpers.changed(self.container.find("div.mycz-form-block[data-col='"+col+"']"));
        }
    });

    /**
     * With html_before we can add a logo or image or something
     */
    if(mycz.helpers.isset(args.html_before,true)){
        self.container.prepend(args.html_before);
    }

    /**
     * With html_after we can add a logo or image or something
     */
    if(mycz.helpers.isset(args.html_after,true)){
        self.container.append(args.html_after);
    }

    var btn_class = (isEdit != true ? 'green' : 'blue');
    var btn_title = (isEdit != true ? label("create")+' '+mycz.ele.icon(icon.plus_circle) : label("save")+' '+mycz.ele.icon('ion-edit'));

    var first_button = function(){

        var btn = mycz.ele.btn('createInsert button-'+(args.step_system == true ? 'new-blue' : btn_class),(args.step_system == true ? label("next") : btn_title),function(){

            /**
             * Step System -> Go to next group if available
             * Otherwise trigger callback
             */
            if(args.step_system == true){
                if(!self.save_container.find("div.form-head a.zapp-btn:last").hasClass("button-active")){
                    self.save_container.find("div.form-head a.zapp-btn.button-active").next().trigger("click");

                    /**
                     * Try to scroll to top
                     */
                    try {
                        self.popup.find(".myczModal-wrap").scrollTop('0px');
                    } catch(err){}
                    
                    return;
                }
            }

            self.callback();
            return false;
        });

        return btn;
    }();

    this.btns = [first_button];

    this.top_buttons = [];

    window[my_id] = this;

    return this;
};

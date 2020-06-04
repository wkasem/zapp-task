
/**
 * Creating a new element
 * @param tag
 * @param html
 * @param classes
 * @param attributes
 * @returns {*|JQuery|jQuery|HTMLElement}
 */
mycz.ele.new = function(tag,html,classes,attributes){
    var t = $('<'+tag+'></'+tag+'>');
    if(tag == 'a'){
        t.attr("href","#");
    }
    if(mycz.helpers.isset(html,true)){
        t.append(html);
    }
    if(mycz.helpers.isset(classes,true)){
        t.addClass(classes);
    }
    if(mycz.helpers.isset(attributes,true)){
        $.each(attributes,function(key,val){
            t.attr(key,val);
        })
    }
    return t;
};

/**
 * Creating a new div
 * @param classes
 * @param html
 * @param attributes
 * @returns {*|JQuery|jQuery|HTMLElement}
 */
mycz.ele.div = function(classes,html,attributes){

    var div = $("<div />");

    if(mycz.helpers.isset(classes)){
        div.attr("class",classes);
    }

    if(mycz.helpers.isset(html)){
        div.append(html);
    }

    var tip = false;

    if(mycz.helpers.isset(attributes,true)){
        $.each(attributes,function(key,val){

            div.attr(key,val);

            /**
             * Using attribute 'tt' we can automatically
             * enable tooltipster. With 'tt-theme' and 'tt-pos' you can design it.
             */
            if(key=='tt'){
                div.attr("title",val).attr("alt",val);
                tip = true;
            }

        });
    }

    try {
        if(tip == true){
            div = mycz.plugins.tooltipster.tip(div);

            /**
             * Using 'tt_show' we can trigger to
             * show the tooltipster in the beginning
             */
            if(attributes['tt-show']){
                setTimeout(function(){
                    try {
                        div.tooltipster('show');
                    } catch(err){}
                },100);
            }
        }
    } catch(err){}

    return div;
};

/**
 * Returning a floated-left container with a title
 * @param width
 * @param title
 * @param css
 * @param classes
 * @param attributes
 */
mycz.ele.label = function(width,title,css,classes,attributes){
    var div = mycz.ele.div("mycz-form-block "+(mycz.helpers.isset(classes,true) ? classes : ''),'',attributes).attr("style",(mycz.helpers.isset(width,true) ? 'width:'+width+';min-width:'+width+';' : '')+" "+(css ? css : ''));
    if(mycz.helpers.isset(title)){
        div.append(mycz.ele.new('span',title));
    }
    return div;
};

/**
 * Button
 * @param classes
 * @param title
 * @param clickFunc
 * @param attributes
 * @returns {*|JQuery|jQuery|HTMLElement}
 */
mycz.ele.btn = function(classes,title,clickFunc,attributes){
    var btn = $('<a class="zapp-btn '+classes+' " href="#" />');
    clickFunc = mycz.helpers.isset(clickFunc,true) ? clickFunc : function(){};
    btn.append(title).unbind().click(function(e){
        e.preventDefault();
        return false;
    }).click(clickFunc);

    var tip = false;

    if(mycz.helpers.isset(attributes)){

        $.each(attributes,function(key,val){
            btn.attr(key,val);

            /**
             * Using attribute 'tt' we can automatically
             * enable tooltipster. With 'tt-theme' and 'tt-pos' you can design it.
             */
            if(key=='tt'){
                btn.attr("title",val).attr("alt",val);
                tip = true;
            }
            if(key == 'new' && val == true){
                btn.append(mycz.ele.new('span',mycz.helpers.getText({
                    en:'NEW',
                    de:'NEU'
                }),'zapp-btn-badge-new'));
            }
        });

        try {
            if(tip == true){
                btn = mycz.plugins.tooltipster.tip(btn);

                /**
                 * Using 'tt_show' we can trigger to
                 * show the tooltipster in the beginning
                 */
                if(attributes['tt-show']){
                    setTimeout(function(){
                        try {
                            btn.tooltipster('show');
                        } catch(err){}
                    },100);
                }
            }
        } catch(err){}

    }

    return btn;
};

/**
 * Creating a new icon
 * Can be used inline
 * @param classes
 * @param attributes
 * @param title_alt
 * @returns {*}
 */
mycz.ele.icon = function(classes,attributes,title_alt){
    var i = $("<i class='"+classes+"' />");
    if(mycz.helpers.isset(attributes)){
        $.each(attributes,function(key,val){
            i.attr(key,val);
        })
    }
    if(mycz.helpers.isset(title_alt,true)){
        i.attr("title",title_alt).attr("alt",title_alt);
    }
    return i[0]['outerHTML'];
};

/**
 * Create an input
 * @param name string - The name of the input
 * @param type string - E.g: text, number
 * @param val string - Current value
 * @param attributes object - Addition attributes
 * @param keyUp function - Will trigger on keypress -> value, element, event
 * @param classes string - Classes additionally
 * @returns {jQuery|HTMLElement}
 */
mycz.ele.input = function(name,type,val,attributes,keyUp,classes){

    var input = $("<input type='"+(mycz.helpers.isset(type,true) ? type : 'text')+"' name='"+name+"' />");

    if(mycz.helpers.isset(val)){
        input.val(val);
        input.attr("value",val);
    }

    if(mycz.helpers.isset(type)){
        input.attr("type",type);
    }

    if(mycz.helpers.isset(classes)){
        input.attr("class",classes);
    }

    if(mycz.helpers.isset(attributes)){
        $.each(attributes,function(key,v){
            input.attr(key,v);
        })
    }

    if(mycz.helpers.isset(keyUp,true)){
        input.on("keyup change",function(event){
            if(mycz.helpers.isset(keyUp,true)){
                keyUp($(this).val(),$(this),event);
            }
        });
    }

    input.addClass("zapp-click-fixer").click(function(){
        $(this).focus();
    });

    return input;
};

/**
 * Create a textarea
 * @param name string - Name of the textarea
 * @param val string - Starting value
 * @param keyUp function - A function on keyup
 * @param tiny boolean - Morph to Tiny MCE (only admin)
 * @param triggerKeyUp boolean - Trigger first keyup event
 * @param autoHeight boolean - When pressing enter, will automatically make the height bigger
 * @returns {jQuery|HTMLElement}
 */
mycz.ele.textarea = function(name,val,keyUp,tiny,triggerKeyUp,autoHeight){

    var textarea = $("<textarea name='"+name+"' />");

    /**
     * Has initial value?
     */
    if(mycz.helpers.isset(val)){
        textarea.text(val)
    }

    /**
     * Key Up Function
     */
    if(mycz.helpers.isset(keyUp)){

        textarea.addClass("no-scrollbar");

        textarea.on("keyup keydown",function(event){

            var value = $(this).val().replace(/\n/g, "<br>");

            keyUp(value,$(this),event);

            var ele = $(this);

            if(autoHeight == true){

                try {

                    $(ele).attr("style","height:"+$(ele)[0].scrollHeight+"px!important;min-height:"+$(ele)[0].scrollHeight+"px!important;");

                } catch(err){}
            }

        })
    }

    /**
     * Tiny only for admin
     */
    if(tiny==true && mycz.ENV == 'ADMIN'){

        var rand = random.string(10);
        textarea.addClass(rand);
        textarea.attr("id",rand);

        setTimeout(function(){
            mycz.plugins.tiny.ele('textarea.'+rand);
        },200);

    }

    /**
     * Trigger keyup
     */
    if(triggerKeyUp==true){
        setTimeout(function(){
            textarea.trigger("keyup");
        },200)
    }

    return textarea;
};

mycz.ele.textarea2 = function(name,val,keyUp,triggerKeyUp){
    var textarea = $("<textarea name='"+name+"' />");
    if(mycz.helpers.isset(val)){
        textarea.text(val)
    }
    if(mycz.helpers.isset(keyUp)){
        textarea.on("keyup keydown",function(event){
            keyUp($(this).val(),$(this),event);
        })
    }
    textarea = mycz.helpers.android.textarea_focus_fix(textarea);
    if(triggerKeyUp==true){
        setTimeout(function(){
            textarea.trigger("keyup")
        },200)
    }
    return textarea;
}

/**
 * Create a dropdown
 */
mycz.ele.select = function(name,values,title,width,args_override,changeFunc,filters,attributes,css){

    var div = mycz.ele.label(width);

    var select = $("<select name='"+name+"' />");

    if(mycz.helpers.isset(attributes)){
        $.each(attributes,function(key,val){
            select.attr(key,val);
        })
    }

    if(mycz.helpers.isset(css)){
        select.attr("style",css);
    }

    var args = {
        data: false,
        localize: false,
        option_name: false,
        show_disabled: false,
        default_label: 'default',
        selected: false,
        select_empty: false
    };

    if(mycz.helpers.isset(args_override)){
        $.each(args_override,function(i,v){
            args[i] = v;
        })
    }

    if(args.select_empty==true){
        select.append("<option value='' />");
    }

    if(mycz.helpers.isset(values)){

        switch(values){
            case "offers":
                args.empty = true;
                args.data = 'offers';
                args.option_name = 'offer_name';
                args.localize = true;
                break;
            case "cats":
                args.empty = false;
                args.data = 'cats';
                args.option_name = 'name';
                args.localize = true;
                break;
            case "locations":
                args.data = 'locs';
                args.option_name = 'group_name';
                args.default_label = 'all_offers';
                if(!args_override.selected){
                    args.selected = mycz.active.location();
                }
                break;
            case "ratinggroups":
                args.data = 'rating_groups';
                args.option_name = 'rating_group_name';
                args.default_label = 'default';
                break;
            case "designs":
                args.data = 'designs';
                args.option_name = 'design_name';
                args.empty = false;
                args.selected = mycz.designer.getActiveDesign();
                /* We override args only here again */
                if(mycz.helpers.isset(args_override)){
                    $.each(args_override,function(i,v){
                        args[i] = v;
                    })
                }
                break;
            case "currencies":
            case "countries":
            default:
                if(values=='languages'){
                    values = {};

                    /* Adding on top of the select the added languages in the system */
                    if(args.show_my_langs_first == true){
                        $.each(langs,function(nn,k){
                            values[k] = getLanguage(k)[0];
                        });
                    }
                    values['']  = '-';
                    $.each(getLanguage(), function(ISO,vals){
                        values[ISO] = vals.name;
                    });
                }
                if(values=='currencies'){
                    values = {};
                    var found = false;
                    if($usermeta['cz_hotelgroup_currencies']){
                        if(mycz.helpers.isset($usermeta['cz_hotelgroup_currencies'],true)){
                            found = true;
                            $.each($usermeta['cz_hotelgroup_currencies'].split(","),function(nn,c){
                                values[c] = c+" - "+getCurrencyName(c);
                            });
                        };
                    };
                    if(found == false){
                        $.each(getCurrencyName(), function(ISO,NAME){
                            values[ISO] = ISO+" - "+NAME;
                        });
                    }
                }
                if(values=='countries'){
                    values = {};
                    $.each(getCountryName(), function(ISO,NAME){
                        values[ISO] = ISO+" - "+NAME;
                    });
                }
                if(values == 'pages'){
                    values = {0:label("startPage")};
                    $.each(mycz.get.raw('cats',{disabled:0,deleted:0}),function(id,vals){
                        values[id] = locale(vals.name);
                    });
                };
                $.each(values,function(i,v){
                    if(args.localize==true) v = label(v);
                    var selected = '';
                    if(args.selected != false && args.selected == i){
                        selected = 'selected';
                    }
                    select.append("<option "+selected+" value='"+i+"'>"+v+"</option>");
                })
        }

        if(args.data!=false){
            if(args.empty){
                if(args.empty==true){
                    select.append("<option value=''></option>");
                }
            }
            $.each(mycz.get.raw(args.data,filters),function(i,vals){
                var skip = false;
                if(vals['deleted']){
                    if(vals['deleted']==1){
                        skip = true;
                    }
                }
                if(vals['disabled']){
                    if(vals['disabled']==1 && args.show_disabled==false){
                        skip = true;
                    }
                }
                if(station != false && args.data == 'offers' && vals['station-edit'] != true){
                    skip = true;
                }
                if(skip==false){
                    var output = vals[args.option_name];
                    if(args.localize==true){
                        output = locale(output);
                    } else {
                        if(output=='default'){
                            output = label(args.default_label);
                        }
                    }
                    var selected = '';
                    if(args.selected != false && args.selected == i){
                        selected = 'selected';
                    }
                    select.append($("<option "+selected+" value='"+i+"'>"+output+"</option>"));
                }
            });
        }
    }

    if(mycz.helpers.isset(changeFunc)){
        select.change(changeFunc);
    }

    if(mycz.helpers.isset(title)){
        div.append('<span style="text-align:left">'+title+'</span>');
        div.append(select);
        return div;
    }

    return select;
};
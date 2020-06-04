mycz.modal = {

    /**
     * Closing a modal
     * @param ele jQuery - the target modal
     * @param success boolean - trigger success function, which can be attached in mycz.modal.new
     */
    close: function(ele,success){

        if(mycz.helpers.isArray(ele)){
            $.each(ele,function(nn,e){
                mycz.modal.close(e,success);
            });
            return;
        }

        var isMobile = $(window).width() < 480;

        var remove = function(){

            mycz.modal.fixOverflow();

            try {

                ele.attr("data-success",(success == true ? 1 : 0)).trigger("close");

                var nextModal = function(){

                    $(".myczModal-overlay").remove();

                    if($(".myczModal[aria-hidden='true']:not(.mycz-animate-is-closing)").length>0){

                        var next = $(".myczModal[aria-hidden='true']:not(.mycz-animate-is-closing):last");
                        next.myczModal('open');
                        next.addClass("mycz-animate-in-left").removeClass("mycz-animate-out-left");
                    }
                };

                if(isMobile){

                    if($(".myczModal:not(.mycz-animate-is-closing)").length==1){
                        ele.removeClass("animated slideInUp").addClass("animated slideOutDown").one(animation_end,function(){
                            ele.remove();
                        });
                        nextModal();
                    } else {
                        ele.removeClass("mycz-animate-in-left animated slideInUp").addClass("mycz-animate-is-closing");
                        setTimeout(function(){
                            ele.remove();
                        },500);

                        nextModal();
                    }

                } else {
                    ele.remove();
                    nextModal();
                }



            } catch(err){}

        };

        remove();
    },

    /**
     * Closing all modals
     */
    closeAll: function(){
        $(".myczModal-overlay,.myczModal").remove();
        $(".plainmodal-overlay,.popup-classic").remove();
        mycz.modal.fixOverflow();
    },

    /**
     * Closing last modal
     */
    closeLast: function(){
        mycz.modal.close($(".myczModal:not(.mutliple_processes):last"));
    },

    /**
     * Create a modal
     * @param title string - title of the modal
     * @param content jQuery - the content of the modal
     * @param cancel boolean - allow to cancel or not
     * @param btns array - an array of buttons using mycz.ele.btn
     * @param onCancel function - a callback when canceling
     * @param args object - additional arguments, see documentation
     * @returns {*}
     */
    new: function(title,content,cancel,btns,onCancel,args){

        var rand = tools.rand_string();
        var isMobile = $(window).width() < 480;
        var top_buttons = mycz.ele.div('');
        var buttons = mycz.ele.div('');

        btns = mycz.helpers.isset(btns,true) ? btns : [];
        cancel = mycz.helpers.isset(cancel,true) ? cancel : false;
        args = mycz.helpers.isset(args,true) ? args : {};

        if(args.onCancel){
            onCancel = args.onCancel;
        }

        /**
         * Fullscreen when not mobile
         */
        if(args.fullscreen_desktop == true){
            if(!isMobile){
                args.force_fullscreen = true;
            }
        }

        /**
         * With args.corporate_design, we try
         * to append first the logo and the color of the app
         */
        if(args.corporate_design == true){
            args.move_title_to_content = true;
            try {
                title = getContent.logo().css("max-height","100px")[0]['outerHTML'];
            } catch(err){}
        }

        var steps = {

            /**
             * The Close Function
             * @param success boolean
             * @param close4real boolean - Will skip the step_system
             */
            close: function(success,close4real){

                /**
                 * Step System: Clicking cancel > go back one tab until
                 * reach last, then cancel really
                 */
                if(args.step_system == true && close4real != true){
                    if(!$("#modal-"+rand).find("div.form-head a.zapp-btn:first").hasClass("button-active")){
                        $("#modal-"+rand).find("div.form-head a.zapp-btn.button-active").prev().trigger("click");

                        /**
                         * Try to scroll to top
                         */
                        try {
                            $("#modal-"+rand).find(".myczModal-wrap").scrollTop('0px');
                        } catch(err){}

                        return;
                    }
                }

                if(args.social_bar == true){
                    $("div.social-header").removeAttr("style");
                }
                mycz.modal.close($("#modal-"+rand),success);
            },

            /**
             * Animate for mobile apps to make like native
             */
            animate: function(){
                if($(".myczModal").length>0 && isMobile == true){
                    $(".myczModal:last").removeClass("animated slideInUp mycz-animate-in-left").addClass('mycz-animate-out-left');
                }
            },

            /**
             * Creating buttons
             */
            buttons: function(){

                if(cancel == true && args.no_cancel_button != true){
                    if(isMobile == true || args.cancel_left == true || args.step_system == true){
                        btns.unshift(mycz.ele.btn('button-dark cancel',(args.cancel_btn_text ? args.cancel_btn_text : label("cancel")),function(){
                            steps.close();
                            return false;
                        }));
                    } else {
                        btns.push(mycz.ele.btn('button-dark cancel',(args.cancel_btn_text ? args.cancel_btn_text : label("cancel")),function(){
                            steps.close();
                            return false;
                        }));
                    }

                }

                if(mycz.helpers.isset(btns,true)){
                    $.each(btns,function(nn,b){
                        b.click(function(){
                            return false;
                        });
                        b.addClass("mycz-modal-footer-btn");
                        buttons.append(b);
                    });
                }
            },

            /**
             * Top Buttons come before the normal buttons and
             * can be attached in args.top_buttons
             */
            top_buttons: function(){
                if(args.top_buttons){
                    $.each(args.top_buttons,function(nn,b){
                        if(btns.length == 1){
                            b.addClass('zapp-btn-100');
                        }
                        b.removeClass("btn-sx").addClass("mycz-modal-footer-btn");
                        top_buttons.append(b);
                    });
                }
                if(args.footer_html){
                    top_buttons.prepend(args.footer_html);
                }
            },

            /**
             * Create the modal
             */
            create_modal: function(){

                if(args.move_title_to_content == true){
                    content.prepend(mycz.ele.new('h2',title).css("margin-top","-20px").css("text-align","center"));
                }

                $("body").append(mycz.ele.div('').attr("id","modal-"+rand)
                    .append(mycz.ele.div('mycz-modal-container fleft w-100 p-10')
                        .append(mycz.ele.div('',content)))
                    .append(mycz.ele.div('mycz-modal-footer fleft w-100')
                        .append(top_buttons)
                        .append(buttons)
                        .css("background",args.background ? 'transparent' : '')));
            }
        };

        steps.animate();
        steps.buttons();
        steps.top_buttons();
        steps.create_modal();

        var fulloptions = {
            title: args.move_title_to_content  == true ? '&nbsp;' : title,
            subtitle: '',
            headerColor: null,
            background: args.background ? args.background : null,
            theme: isMobile ? ($(".myczModal:not(.mycz-animate-is-closing):not(.slideOutDown)").length>0 ? '' : 'firstModal') : '',
            rtl: false,
            width: args.width ? args.width : 600,
            padding: 0,
            radius: 3,
            zindex: 999,
            focusInput: false,
            group: '',
            loop: false,
            arrowKeys: true,
            navigateCaption: true,
            navigateArrows: true, // Boolean, 'closeToModal', 'closeScreenEdge'
            history: false,
            restoreDefaultContent: false,
            autoOpen: 0, // Boolean, Number
            bodyOverflow: false,
            fullscreen: args.force_fullscreen ? true : (args.no_fullscreen == true ? false : !isMobile),
            openFullscreen: args.force_fullscreen ? true : (args.no_fullscreen == true ? false : (isMobile == true ? isMobile : false)),
            closeOnEscape: false,
            closeButton: false,
            appendTo: 'body', // or false
            appendToOverlay: 'body', // or false
            overlay: true,
            overlayClose: cancel == true && args.overlay_cancel !== false,
            overlayColor: args.overlayColor ? args.overlayColor : 'rgba(82,95,127,.25)',
            timeout: false,
            timeoutProgressbar: false,
            pauseOnHover: false,
            timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
            transitionIn: args.animation ? args.animation : (isMobile ? ($(".myczModal").length>0 ? '' : '') : (args.force_fullscreen ? 'animated fadeIn' : 'comingIn')),
            transitionOut: isMobile ? '' : 'fadeOutDown',
            transitionInOverlay: 'fadeIn',
            transitionOutOverlay: 'fadeOut',
            onFullscreen: function(){},
            onResize: function(){},
            onOpening: function(){
                setTimeout(function(){
                    if(cancel == true && args.overlay_cancel !== false){
                        $(".myczModal-overlay").unbind().click(function(){
                            steps.close();
                        });
                    }
                },200)

            },
            onOpened: function(){

            },
            onClosing: function(){
                if(args.onCancelReal){
                    args.onCancelReal();
                }
            },
            onClosed: function(){

            },
            afterRender: function(){}
        };

        if(mycz.helpers.isset(args,true)){
            $.each(args,function(k,v){
                fulloptions[k] = v;
            })
        }

        $("#modal-"+rand).myczModal(fulloptions);
        $("#modal-"+rand).myczModal('open');

        var the_modal = $("#modal-"+rand);

        /**
         * IE + Edge fix, sticky doesnt work properly
         */
        if(isEdge() == true || isIEnew() == true || isIEold() == true){
            the_modal.find(".mycz-modal-footer").appendTo(the_modal);
            the_modal.attr("data-browser","edge");
        }

        if(args.color){
            $("#modal-"+rand).css("color",args.color);
            $("#modal-"+rand).find(".myczModal-header-title").css("color",args.color);
        }

        /**
         * Unbind close icon
         */
        $("#modal-"+rand).find(".myczModal-button-close").unbind().click(function(){
            steps.close(false,true);
        });

        /**
         * Animation Fix for Mobile
         */
        if($(".myczModal:not(.mycz-animate-is-closing):not(.slideOutDown)").length>1 && isMobile == true){
            $("#modal-"+rand).addClass('mycz-animate-in-left');
        } else if($(".myczModal:not(.mycz-animate-is-closing):not(.slideOutDown)").length==1 && isMobile == true){
            $("#modal-"+rand).addClass('animated slideInUp');
        }

        /**
         * Unbind default overlay click behavior
         */
        if(cancel == true && args.overlay_cancel !== false){
            $(".myczModal-overlay").unbind().click(function(){
                steps.close();
            })
        }

        /**
         * Manually adding close button
         */
        if(cancel == true){
            $("#modal-"+rand).find("div.myczModal-header-buttons").append(mycz.ele.new('a','','myczModal-button myczModal-button-close').attr("href","#").click(function(){
                steps.close(false,true);
                return false;
            }))
        }

        /**
         * Add an onClose-Listener for mycz.modal.close and
         * keeping onClose callbacks working!
         */
        $("#modal-"+rand).on('close',function(){
            if($(this).attr("data-success") != 1){
                if(mycz.helpers.isset(onCancel,true)){
                    onCancel();
                }
            }
        });

        /**
         * Mobile footer buttons fix
         */
        if(isMobile==true){
            $("#modal-"+rand).addClass("mobile");
            $("#modal-"+rand).find("div.mycz-modal-footer").appendTo($("#modal-"+rand));
            if(!mycz.helpers.isset(title,true)){
                $("#modal-"+rand).addClass("no-title");
            }
        }

        if(top_buttons.html() != ''){
            $("#modal-"+rand).addClass("shadow-h1");
        }

        /**
         * With move title to content, we can move the title to content ;-)
         * We hide the shadow..
         */
        if(args.move_title_to_content == true || title == ' ' || args.title_no_shadow == true){
            $("#modal-"+rand).find("div.myczModal-header").addClass("myczModal-noTitle");
        }

        /**
         * Modify the size of the popup to let the social bar be visible
         * Works only in mobile
         */
        if(args.social_bar == true){
            $("#modal-"+rand).addClass("show-social-header");
            if(isMobile==true){
                $(".myczModal-overlay").addClass("show-social-header");
            }
        }

        if(args.show_social_bar == true){
            var t  = setInterval(function(){


               if($("#modal-"+rand).length == 0){
                   $("div.social-header").removeAttr("style");
                   clearInterval(t);
                   return;
               }

               if($("#modal-"+rand).hasClass("mycz-animate-out-left")){
                   $("div.social-header").removeAttr("style");
               } else {
                   if(mycz.platforms.mobile.modules.bottom_bar.isReady('profile')){
                       $("div.social-header").css("z-index","22222");
                   }
               }
           },200);

        }

        /**
         * With corporate_design we can automatically color the popup
         * and add the logo as a title
         */
        if(args.corporate_design == true){
            mycz.modal.corporate_design($("#modal-"+rand));
        }

        var f = $.extend($("#modal-"+rand), {
            setContent: function(content) {
                $("#modal-"+rand).find("div.mycz-modal-container>div").html(content);
            },
            appendContent: function(content) {
                $("#modal-"+rand).find("div.mycz-modal-container>div").append(content);
            },
            close: function() {
                mycz.modal.close($("#modal-"+rand));
            }
        });
        return f;
    },

    /**
     * Some predefined templates
     */
    templates: {

        /**
         * Poping up an error message
         * @param errorMsg string the error message, optional, there is a default message
         * @param icon string an icon
         * @param noLabelize boolean if set to true, the errorMsg will not parsed to function label()
         */
        unknown_error: function(errorMsg,icon,noLabelize){

            loader.stop();

            /**
             * Only onetime show the error
             */
            if($(".myczModal.unknown_error").length>0){
                return;
            }

            var title = mycz.helpers.getText({
                en: 'Unknown error',
                de: 'Unbekannter Fehler'
            });

            var text = mycz.helpers.getText({
                en: 'An unknown error has occurred. Either you do not have the required authorization or there is a issue with your account. For any assistance please contact our support.',
                de: 'Ein unbekannter Fehler ist aufgetreten. Entweder fehlen dir die benötigten Berechtigungen oder der Fehler liegt bei uns. Für Untestützung bitte kontaktiere unseren Support.'
            });

            if(mycz.helpers.isset(errorMsg,true)){
                title = noLabelize == true ? label("error") : label("title_"+errorMsg);
                text = noLabelize == true ? errorMsg : label(errorMsg);
            }

            var m = mycz.modal.new(title,mycz.ele.alert('alert-danger b-radius-0 w-100 m-0 f-18 quicksand fw-600 no-box-shadow',text,icon),true);
            m.addClass("unknown_error");
        },

        /**
         * A popup which indicates a connection loss
         */
        lost_connection: function(){
            return mycz.modal.new(mycz.helpers.getText({
                en:'No connection',
                de:'Keine Verbindung'
            }),mycz.helpers.getText({
                en:'Unfortunately the connection to your application failed. Please try again later! If the problem still occurs after 5 minutes, please contact us and we will gladly help you.',
                de:'Leider konnte keine Verbindung zu deiner Applikation hergestellt werden. Versuche es später nochmal! Falls das Problem in 5 Minuten immer noch auftaucht, kontaktiere uns und wir helfen dir weiter.'
            }),true);
        },

        /**
         * Upload failed
         * @param maxSize
         */
        upload_error: function(maxSize){
            loader.stop();
            if(!mycz.helpers.isset(maxSize,true)) {
                mycz.modal.new(mycz.helpers.getText({
                    en:'Upload failed',
                    de:'Upload fehlgeschlagen'
                }),mycz.helpers.getText({
                    en: 'No files were uploaded. The maximum size is 20MB per file. It might be a server error. Please try to upload the files again.',
                    de: 'Keine Datei konnte hochgeladen werden. Die maximale Grösse ist 20MB pro Datei. Es könnte aber auch ein Serverfehler sein, bitte Upload nocheinmal probieren.'
                }),true);
            } else {
                mycz.modal.new(mycz.helpers.getText({
                    en:'Upload failed',
                    de:'Upload fehlgeschlagen'
                }),mycz.helpers.getText({
                    en: 'No files were uploaded. It might be a server error. Please try to upload the files again. The maximum size is '+maxSize+"MB.",
                    de: 'Keine Datei konnte hochgeladen werden.Es könnte aber auch ein Serverfehler sein, bitte Upload nocheinmal probieren. Die maximale Grösse ist '+maxSize+"MB."
                }),true);
            }
        },

        /**
         * Displays a popup with a rotating icon
         * @param title
         * @returns {*}
         */
        please_wait: function(title,content,modalArgs){

            title = mycz.helpers.isset(title,true) ? title : mycz.helpers.getText({
                en:'Please wait',
                de:'Bitte warten'
            });

            var div = mycz.ele.div('block w-100 fleft');

            if(mycz.helpers.isset(content,true,true)){
                div.append(content);
            }

            div.append(mycz.ele.new('h4',title,'text-center fw-600 quicksand gradient-text f-30'));

            var args = {
                zindex:9999
            };

            if(mycz.helpers.isset(modalArgs,true,true)){
                args = $.extend(true,args,modalArgs);
            }

            var m = mycz.modal.new(mycz.ele.icon('ion-load-c rotating animated infinite'),div,false,'','',args);

            m.attr("mycz-modal-please-wait-loader",1);

            return m;
        },

        /**
         * Creating a process title (will have multiple progress bars inside)
         * @param title
         * @returns {*}
         */
        multiple_processes: function(title){
            if($(".myczModal.mutliple_processes").length>0){
                return $(".myczModal.mutliple_processes");
            } else {
                var pop = mycz.modal.templates.please_wait(title);
                pop.addClass("mutliple_processes").find("div.progress").remove();
                return pop;
            }
        },

        /**
         * Usage: Call it once - call it again with a new process_value
         * will animate the progress bar - call again with process_value == 'DONE' will finish it.
         *
         * @param process_title string title of the process
         * @param process_value
         * @param pop
         * @param pop_title
         * @returns {*}
         */
        new_process: function(process_title,process_value,pop,pop_title){
            if(!mycz.helpers.isset(pop,true)){
                pop = mycz.modal.templates.multiple_processes(pop_title);
            }
            if(mycz.helpers.isset(process_value,true)){
                process_value = process_value.toString();
            } else {
                process_value = 0;
            }
            process_title = process_title || 'Loading';
            if(pop.find("div.progress-bar."+process_title.split(" ")[0]).length==0){
                pop.find("div.mycz-modal-container>div").append(mycz.ele.label('50%',process_title).append(getContent.progress_bar(0,'button-green '+process_title.split(" ")[0])))
            } else {
                if(process_value=='ABORT' || process_value=='DONE'){
                    pop.find("div.progress-bar."+process_title.split(" ")[0]).addClass(process_value).addClass((process_value == 'DONE' ? 'button-rainbow' : '')).css("width","100%");
                }
                pop.find("div.progress-bar."+process_title.split(" ")[0]).css("width",(contains(process_value,'%') ? process_value : process_value+"%"));
            }
            return pop;
        },

        /**
         * Checking processes and closing if finished
         * @param modal
         * @param callback
         */
        check_processes: function(modal,callback){
            var check = function(){
                try {
                    if(modal.find("div.progress-bar:not(.ABORT,.DONE)").length>0){
                        return;
                    }
                    clearInterval(intervals.check_processes);
                    intervals.check_processes = null;
                    callback();
                } catch(err){}
            };
            if(!mycz.helpers.isset(intervals.check_processes,true)){
                intervals.check_processes = setInterval(function(){
                    check();
                },100);
            } else {
                check();
            }
        },

        /**
         * Will create an undestroyable popup with a text (indicate to wait for example).
         * Uses mycz.modal.templates.please_wait.
         *
         * @param text
         * @param cl string classses for the popup
         */
        block: function(text,cl){
            if($(".myczModal.loader_with_text").length>0){
                $(".myczModal.loader_with_text div.mycz-modal-container>div").html(mycz.ele.new('h2',text,'text-center fw-600 montserrat'));
                return;
            }
            var pop = mycz.modal.templates.please_wait(text);
            pop.addClass("loader_with_text").addClass(cl).find("div.progress").remove();
        },

        /**
         * Indicate a long request
         * @returns {*}
         */
        long_request: function(){
            return mycz.modal.templates.please_wait("<h4>"+mycz.helpers.getText({
                de: 'Dieser Vorgang kann einige Minuten dauern.<br><br><strong>Bitte warten...</strong>',
                en: 'This request can take several minutes.<br><br><strong>Please wait...</strong>'
            })+"</h4>");
        },

        /**
         * Ask: Are you sure? With callback
         * @param callback
         * @returns {*}
         */
        are_you_sure: function(callback,onCancel){

            return mycz.modal.new(mycz.helpers.getText({
                en: 'Are you sure?',
                de: 'Bist du sicher?'
            }),'',true,[
                mycz.ele.btn('button-red',label("yes"),function(){
                    callback();
                })
            ],function(){

                if(onCancel){
                    onCancel();
                }

            });
        },

        /**
         * A Magic Popup, try it out ;-)
         * @param text
         * @param closeCallback
         */
        magic: function(text,closeCallback){

            var content = mycz.ele.div('block w-100 fleft o-hidden');

            content.append(mycz.ele.alert('alert-zapp-2  w-100 m-0 fleft block')
                .append(mycz.ele.div('p-20',mycz.ele.new('span',text,'quicksand f-20')).append("<br><br>")
                    .append((closeCallback === null ? '' : mycz.ele.btn('button-white button-tab button-bigger',label("close"),function(){

                        $("body").css("overflow","unset");

                        if(closeCallback){
                            closeCallback(m);
                        }

                        mycz.modal.close(m);
                        return false;

                    })))));

            var m = mycz.modal.new('',content,false);
            m.css("background","transparent").addClass("no-box-shadow");
            m.find("div.mycz-modal-footer").remove();

            return m;
        },

        /**
         * Popup with icon on the left side
         * @param title string - Your title
         * @param text string - Your text
         * @param icon string - Your icon
         */
        with_icon: function(title,text,icon){

            var content = mycz.ele.div('block w-100 fleft');
            content.append(mycz.ele.div('col-md-3 text-center',mycz.ele.icon(icon+" f-80")));
            content.append(mycz.ele.div('col-md-9',text));
            var m = mycz.modal.new(title,content,true,[
                mycz.ele.btn('button-dark',label("close"),function(){
                    mycz.modal.close(m);
                })
            ],'',{
                no_cancel_button:true
            });

        },

        /**
         * Popup with an alert-class box in the content
         * @param alertClass string - The alert class (e.g: alert-danger)
         * @param title object/string - Your title
         * @param text object/string - Your text
         * @param btns array - Modal Buttons
         */
        alert: function(alertClass,title,text,btns){

            mycz.modal.new(mycz.helpers.getText(title,true),mycz.ele.alert(alertClass,mycz.helpers.getText(text,true)),true,btns);

        },

        /**
         * Create a modal from buttons
         * @param title string - The modal title
         * @param buttons object - The buttons for the content
         * @param cancel boolean - Allow cancel or not
         * @param footerButtons object - Footer buttons
         */
        buttons: function(title,buttons,cancel,footerButtons){

            title = mycz.helpers.isset(title,true,true) ? title : label("please_choose");

            var content = mycz.ele.div('block w-100 fleft');

            var called = false;

            $.each(buttons,function(k,vals){

                if(vals.condition){
                    if(vals.condition() != true){
                        return true;
                    }
                }

                content.append(mycz.ele.btn_squared(vals.size ? vals.size : 6,12,vals.class,vals.icon,mycz.helpers.getText(vals.title),mycz.helpers.getText(vals.text),function(){
                    vals.click(m);
                }));

                if(vals.call == true){
                    vals.click();
                    called = true;
                }
            });

            if(called == true){
                return;
            }

            var m = mycz.modal.new(title,content,cancel,footerButtons);

            return m;

        }
    },

    /**
     * Sometimes iziModal keeps overflow:hidden on the body.
     * We call this function in mycz.modal.close & mycz.modal.closeAll
     */
    fixOverflow: function(){

        $("body").css("overflow","unset");
        $("html").css("overflow","unset");

        setTimeout(function(){
            $("body").css("overflow","unset");
            $("html").css("overflow","unset");

            setTimeout(function(){
                $("body").css("overflow","unset");
                $("html").css("overflow","unset");
            },200);
        },200);

    },

};

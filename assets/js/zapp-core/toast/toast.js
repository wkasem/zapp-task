
/**
 * Create a toast message
 */
mycz.toast = {

    /**
     * Create a new toast message
     * @param title string - Content / Title
     * @param icon string - Left icon
     * @param theme string - Theme of the toast (e.g: alert-danger)
     * @param pos string - Position
     * @param duration int - Duration to show the toast
     * @param closeIcon boolean - Add a close icon
     * @param closeFn function - Function gets triggered when closing the toast
     * @param closeOthers boolean - Close other toasts
     * @returns {*}
     */
    new: function(title,icon,theme,pos,duration,closeIcon,closeFn,closeOthers){
        pos = mycz.helpers.isset(pos,true) ? pos : 'bottomRight';
        theme = mycz.helpers.isset(theme,true) ? theme : 'success';
        icon = mycz.helpers.isset(icon,true) ? icon : 'ion-ios-checkmark-outline';
        closeIcon = mycz.helpers.isset(closeIcon,true) ? closeIcon : false;
        duration = mycz.helpers.isset(duration,true) ? duration : 2000;
        var r = random.string();

        if(closeOthers == true){
            mycz.toast.closeAll();
        }

        iziToast.show({
            id: null,
            class: 'alert-'+theme+' '+r,
            title: ' ',
            titleColor: '',
            titleSize: '',
            titleLineHeight: '',
            message: '',
            messageColor: '',
            messageSize: '',
            messageLineHeight: '',
            backgroundColor: '',
            theme: 'light', // dark
            color: '', // blue, red, green, yellow
            icon: icon,
            iconText: '',
            iconColor: '',
            iconUrl: null,
            image: '',
            imageWidth: 50,
            maxWidth: null,
            zindex: null,
            layout: 1,
            balloon: false,
            close: closeIcon,
            closeOnEscape: false,
            closeOnClick: false,
            displayMode: 0, // once, replace
            position: pos, // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter, center
            target: '',
            targetFirst: true,
            timeout: duration,
            rtl: false,
            animateInside: true,
            drag: true,
            pauseOnHover: true,
            resetOnHover: false,
            progressBar: true,
            progressBarColor: '',
            progressBarEasing: 'linear',
            overlay: false,
            overlayClose: false,
            overlayColor: 'rgba(0, 0, 0, 0.6)',
            transitionIn: 'fadeInUp',
            transitionOut: 'fadeOut',
            transitionInMobile: 'fadeInUp',
            transitionOutMobile: 'fadeOutDown',
            buttons: {},
            inputs: {},
            onOpening: function () {},
            onOpened: function () {},
            onClosing: function () {},
            onClosed: function () {
                if(mycz.helpers.isset(closeFn,true)){
                    closeFn();
                }
            }
        });
        $(".iziToast."+r).find(".iziToast-title").html(title);
        var f = $.extend($(".iziToast."+r), {
            close: function() {
                mycz.toast.close($(".iziToast."+r));
            }
        });
        return f;
    },

    /**
     * Close a toast
     * @param toast
     */
    close: function(toast){
        try {
            if(toast.find(".iziToast-close").length>0){
                toast.find(".iziToast-close").trigger("click");
                return;
            }
            if(toast.hasClass('iziToast-wrapper')){
                toast.remove();
                return;
            }
            toast.parents('div.iziToast-capsule').remove();
        } catch(err){}
    },

    /**
     * Close all toasts
     */
    closeAll: function(){
        $(".iziToast-wrapper").remove();
    },


    save_function:null,

    /**
     * Disable the mycz.toast.new function
     */
    disable: function(){

        if(mycz.toast.save_function == null){
            mycz.toast.save_function = mycz.toast.new;
            mycz.toast.new = function(){};
        }

    },

    /**
     * Enable the mycz.toast.new function
     */
    enable: function(){

        if(mycz.toast.save_function != null){
            mycz.toast.new = mycz.toast.save_function;
            mycz.toast.save_function = null;
        }

    },

    /**
     * Some templates
     */
    templates: {

        /**
         * Template "Saved" with a check
         */
        saved: function(){
            mycz.toast.new(label("saved"),'ion-checkmark-circled color-white','zapp-2');
        },

        /**
         * Template "Saving.." with rotating icon
         */
        start_saving: function(){
            return mycz.toast.new(mycz.helpers.getText({
                en:'Saving changes',
                de:'Wird gespeichert'
            }),'ion-ios-more-outline','info saving','',6000);
        },

        /**
         * Template "Saved" after "Saving.."
         */
        stop_saving: function(){
            if($(".iziToast.saving").length>0){
                $(".iziToast.saving").removeClass("alert-info").addClass("alert-success bounceIn animated")
                $(".iziToast.saving .iziToast-title").html(label("saved"));
                $(".iziToast.saving .iziToast-icon").removeClass('ion-ios-more-outline').addClass('ion-checkmark-circled');
                setTimeout(function(){
                   mycz.toast.close($(".iziToast.saving"))
                },3000);
            } else {
                mycz.toast.templates.saved();
            }
        }
    }
};

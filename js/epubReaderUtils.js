// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {


    fluid.registerNamespace('fluid.epubReader.utils');
    // custom made notification method
    fluid.epubReader.utils.showNotification = function (msg, type) {
        var temp = $('<div/>');
        temp.text(msg);
        temp.appendTo(document.body);
        temp.dialog({
            autoOpen: true,
            modal: false,
            minHeight: 50,
            position: 'center',
            open: function (event, ui) {
                var dialogElem = $(this).parent();
                dialogElem.find('.ui-dialog-titlebar').hide();
                dialogElem.addClass('fl-epubReader-' + type + 'Notification');
                dialogElem.addClass('fl-epubReader-notification');
                dialogElem.css('opacity', 0);
                dialogElem.animate({opacity: 1 }, 500);
                setTimeout(function () {
                    dialogElem.css('opacity', 1);
                    dialogElem.animate({opacity: 0 }, 500, function () {
                        temp.dialog('close');
                    });
                }, 3000);
            },
            close: function () {
                temp.remove();
            }
        });
    };
    
    fluid.epubReader.utils.setTitleToolTip = function (elm, content) {
        elm.qtip({
            content: content,
            show: 'focus',
            hide: 'blur',
            style: {
                tip: true
            },
            position: {
                corner: {
                    target: 'rightMiddle',
                    tooltip: 'leftMiddle'
                }
            }
        });
    };

})(jQuery, fluid_1_4);
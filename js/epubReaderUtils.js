// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {


    fluid.registerNamespace('fluid.epubReader.utils');
    // custom made notification method
    fluid.epubReader.utils.showNotification = function (msg, type, showTime) {
        if (showTime === undefined) {
            showTime = 3000;
        }
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
                }, showTime);
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

    fluid.epubReader.utils.getUniqueId = function () {
        // RFC 4122 compliant - http://www.ietf.org/rfc/rfc4122.txt
        var createUUID = function () {
            var s = [],
                hexDigits = '0123456789abcdef',
                i;
            for (i = 0; i < 36; i = i + 1) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[14] = '4';  // bits 12-15 of the time_hi_and_version field to 0010
            s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
            s[8] = s[13] = s[18] = s[23] = '-';
            return s.join('');
        };
        return new Date().getTime() + '-' + createUUID();
    };

    fluid.epubReader.utils.hasAttribute = function (elm, attributeName) {
        var attr = elm.attr(attributeName);
        return (attr !== undefined && attr !== false);
    };

    fluid.epubReader.utils.removeToolTip = function (elm) {
        if (typeof elm.data('qtip') === 'object') {
            elm.qtip('destroy');
            elm.removeData('qtip');
        }
    };

    fluid.epubReader.utils.attachToolTip = function (elm, content) {
        elm.qtip({
            content: content,
            position: {
                corner: {
                    target: 'bottomMiddle', // Position the tooltip above the link
                    tooltip: 'topMiddle'
                },
                adjust: {
                    screen: true // Keep the tooltip on-screen at all times
                }
            },
            show: {
                when: 'focus',
                solo: true // Only show one tooltip at a time
            },
            hide: 'blur',
            style: {
                tip: true, // Apply a speech bubble tip to the tooltip at the designated tooltip corner
                border: {
                    width: 0,
                    radius: 5
                },
                name: 'light',
                width: {
                    min: 50,
                    max: 500
                }
            }
        });

    };

})(jQuery, fluid_1_4);
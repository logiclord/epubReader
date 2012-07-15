// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    fluid.defaults('fluid.epubReader.bookHandler.navigator.toc', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        selectors: {
            tocSelector: '{epubReader}.options.selectors.tocSelector'
        },
        model: {
            table: {
                names: ['Waiting..'],
                values: ['wait']
            },
            currentSelection: "wait"
        },
        events: {
            onContentLoad: null
        },
        listeners: {
            onContentLoad: '{epubReader}.loadContent'
        },
        produceTree: "fluid.epubReader.bookHandler.navigator.toc.produceTree",
        finalInitFunction: "fluid.epubReader.bookHandler.navigator.toc.finalInit",
        renderOnInit: true
    });

    fluid.epubReader.bookHandler.navigator.toc.produceTree = function (that) {
        return {
            tocSelector: {
                optionnames: "${table.names}",
                optionlist: "${table.values}",
                selection: "${currentSelection}"
            }
        };
    };

    fluid.epubReader.bookHandler.navigator.toc.finalInit = function (that) {
        that.applier.modelChanged.addListener("currentSelection", function () {
            that.refreshView();
            that.reloadCurrent();
        });
        that.applier.modelChanged.addListener("table", function () {
            that.refreshView();
        });
        that.reloadCurrent = function () {
            that.events.onContentLoad.fire(that.model.currentSelection);
        };
        that.isFirst = function () {
            return that.model.table.values[0] === that.model.currentSelection;
        };
        that.isLast = function () {
            return that.model.table.values[that.model.table.values.length - 1] === that.model.currentSelection;
        };
        that.currentSelectPosition = function () {
            return that.model.table.values.indexOf(that.model.currentSelection);
        };
        that.setCurrentSelection = function (newSelectionIndex) {
            that.applier.requestChange('currentSelection', that.model.table.values[newSelectionIndex]);
        };
    };

    fluid.defaults('fluid.epubReader.bookHandler.navigator', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        components: {
            toc: {
                type: 'fluid.epubReader.bookHandler.navigator.toc',
                container: '{epubReader}.options.selectors.tocContainer'
            }
        },
        constraints: {
            maxImageHeight: '{epubReader}.options.constraints.maxImageHeight',
            maxImageWidth: '{epubReader}.options.constraints.maxImageWidth'
        },
        pageMode: 'split',
        selectors: {
            remaining: '.flc-epubReader-progressIndicator-completed',
            chapterStyle: '.flc-epubReader-chapter-styles',
            chapterContent: '.flc-epubReader-chapter-content',
            bookContainer: '.fl-epubReader-bookContainer',
            remainingWrapper: '.fl-epubReader-progressIndicator'
        },
        scrollSpeed: 50,
        events: {
            onUIOptionsUpdate: '{bookHandler}.events.onUIOptionsUpdate'
        },
        listeners: {
            onUIOptionsUpdate: '{navigator}.requestContentLoad'
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.finalInit',
        preInitFunction: 'fluid.epubReader.bookHandler.navigator.preInit'
    });

    fluid.epubReader.bookHandler.navigator.preInit = function (that) {

        // to adjust navigator according to page mode
        that.setTOCModel = function (temp) {
            that.toc.applier.requestChange('table', temp.table);
            that.toc.applier.requestChange('currentSelection', temp.currentSelection);
        };

        that.requestContentLoad = function (selection) {
            var newMode = selection.pageMode;
            if (that.options.pageMode === 'scroll' && newMode === 'scroll') {
                return;
            } else if (that.options.pageMode === 'split' && newMode === 'split') {
                that.toc.reloadCurrent();
            } else {
                that.options.pageMode = newMode;
                if (that.options.pageMode === 'split') {
                    that.locate('remainingWrapper').show();
                    that.locate('chapterContent').css('overflow', 'hidden');
                    that.locate('bookContainer').css('overflow-y', 'hidden');
                } else if (that.options.pageMode === 'scroll') {
                    that.locate('remainingWrapper').hide();
                    that.locate('chapterContent').css('overflow', 'visible');
                    that.locate('bookContainer').css('overflow-y', 'auto');
                }
                that.toc.reloadCurrent();
            }
        };
    };

    fluid.epubReader.bookHandler.navigator.finalInit = function (that) {
        var current_selection_height = 500,
            current_chapter = {},
            current_selection = {},//= {from : 0, to : current_selection_height};
            pagination = []; // to keep track about forward and backward pagination ranges
        // global variable

       // that.options.pageMode = 'split'; // scroll is also possible

        that.manageImageSize = function (elm) {
            var maxWidth = that.options.constraints.maxImageWidth,
                maxHeight = that.options.constraints.maxImageHeight;
            if (elm.width() > maxWidth) {
                elm.height((maxWidth * elm.height()) / elm.width());
                elm.width(maxWidth);
            }
            if (elm.height() > maxHeight) {
                elm.width((elm.width() * maxHeight) / elm.height());
                elm.height(maxHeight);
            }
        };

        that.selectionWrapper = function () {

            // removing tabindex for hidden elements
            that.locate('chapterContent').filter('*').removeAttr('tabindex');

            if (that.options.pageMode === 'split') {
                that.locate('chapterContent').find(':hidden').show();
                var toHide = [],
                    ret = that.createSelection(that.locate('chapterContent'), toHide),
                    i = 0;
                for (i = 0; i < toHide.length; i = i + 1) {
                    toHide[i].hide();
                }
                that.updateProgressbar();
                // now user needs to press enter to activate
                // that.locate('bookContainer').fluid('activate');
                that.locate('bookContainer').focus();
                return ret;
            } else if (that.options.pageMode === 'scroll') {
                // that.locate('bookContainer').fluid('activate');
                that.locate('bookContainer').focus();
                return true;
            }
        };

        that.updateProgressbar = function () {
            var progress = 500 * ((current_selection.to > current_chapter.height) ? 1 : (current_selection.to / current_chapter.height));
            that.locate('remaining').css('width', progress + 'px');
        };

        that.createSelection = function (node, toHide) {
            if (!node) {
                return null;
            }
            var top = node.offset().top,
                bottom = top + node.height(),
                ret = false,
                kid = node.children();
            if (current_selection.to <= top || current_selection.from >= bottom) {
                return false;
            } else if (current_selection.from <= top && current_selection.to >= bottom) {
                return true;
            } else {
                kid.each(function () {
                    var temp = that.createSelection($(this), toHide);
                    if (temp === true) {
                        ret = true;
                    } else {
                        toHide.push($(this));
                    }
                });
                // overflow test expression ( (node.is('img') || !node.text() ) && current_selection.to >= top && current_selection.to <= bottom )
                if ((node.is('img') || (kid.length === 0 && node.text() !== '')) && current_selection.from >= top && current_selection.from <= bottom) {
                    current_selection.from = top;
                    current_selection.to = current_selection.from + current_selection_height;
                    return true;
                } else {
                    return ret;
                }
            }
        };

        that.resetSelection = function () {
            current_selection.from = that.locate('chapterContent').offset().top;
            current_selection.to = current_selection.from + current_selection_height;
        };

        that.load_content = function (chapter_content) {
            current_chapter = chapter_content;
            pagination = [];
            that.resetSelection();

            that.locate('chapterContent').html(current_chapter.content);
            that.locate('chapterStyle').html(current_chapter.styles);
            that.locate('chapterContent').find('img').css({
                'max-width': '400px',
                'max-height': '300px',
                'height': 'auto',
                'width': 'auto'
            });

            //TODO Improve on load listener for already cached images if possible
            // undefined case for firefox
            if (that.locate('chapterContent').find('img:first').height() === 0 || that.locate('chapterContent').find('img:first').attr('height') === undefined) {
                that.locate('chapterContent').find('img:last').load(function () {
                    that.locate('chapterContent').find('img').each(function () {
                        that.manageImageSize($(this));
                    });
                    current_chapter.height = that.locate('chapterContent').height();
                    that.selectionWrapper();
                });
            } else { //non-caching case
                that.locate('chapterContent').find('img').each(function () {
                    that.manageImageSize($(this));
                });
                current_chapter.height = that.locate('chapterContent').height();
                that.selectionWrapper();
            }

            if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(0);
            }
            return false;
        };

        that.next = function () {
            if (that.options.pageMode === 'split') {
                pagination.push({from: current_selection.from, to: current_selection.to});
                current_selection.from = current_selection.to + 1;
                current_selection.to = current_selection.from + current_selection_height;

                if (current_selection.from < current_chapter.height) {
                    if (that.selectionWrapper() === false) {
                        that.next();
                    }
                } else {
                    that.next_chapter();
                }
            } else if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(that.locate('bookContainer').scrollTop() + that.options.scrollSpeed);
                // continuous scroll till the end of book
                if ((that.locate('bookContainer')[0].offsetHeight + that.locate('bookContainer').scrollTop()) >= that.locate('bookContainer')[0].scrollHeight) {
                    that.next_chapter();
                }
            }
        };

        that.previous = function () {
            if (that.options.pageMode === 'split') {
                current_selection = pagination.pop();
                if (current_selection !== undefined && current_selection.to > that.locate('chapterContent').offset().top) {
                    if (that.selectionWrapper() === false) {
                        that.previous();
                    }
                } else {
                    current_selection = {};
                    that.previous_chapter();
                }
            } else if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(that.locate('bookContainer').scrollTop() - that.options.scrollSpeed);
                // continous scroll till the beginning  of book
                if (that.locate('bookContainer').scrollTop() <= 0) {
                    current_selection = {};
                    that.previous_chapter();
                    that.locate('bookContainer').scrollTop(that.locate('bookContainer')[0].scrollHeight - that.locate('bookContainer')[0].offsetHeight);
                }
            }
        };

        that.next_chapter = function () {
            if (that.toc.isLast()) {
                return;
            }
            that.toc.setCurrentSelection(that.toc.currentSelectPosition() + 1);
        };

        that.previous_chapter = function () {
            if (that.toc.isFirst()) {
                return;
            }
            that.toc.setCurrentSelection(that.toc.currentSelectPosition() - 1);
        };
    };

})(jQuery, fluid_1_4);
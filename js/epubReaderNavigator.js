// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    /*
    Direct navigation require chapter id and offset from top of element
    scroll - get page and scrolltop
    split - get page and call next till we are in range
    ------
    bookmark identifier
    chapter name
    chapter value
    scrolltop
    */

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
        that.getCurrentChapter = function () {
            return { value: that.model.currentSelection, name: that.model.table.names[that.currentSelectPosition()] };
        };
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

    /* Bookmarks */

    fluid.defaults('fluid.epubReader.bookHandler.navigator.Bookmarks', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        selectors: {
            bookmarkRow: '{epubReader}.options.selectors.bookmarkRow',
            bookmarkId : '{epubReader}.options.selectors.bookmarkId',
            bookmarkChapter: '{epubReader}.options.selectors.bookmarkChapter',
            bookmarkEdit: '{epubReader}.options.selectors.bookmarkEdit',
            bookmarkDelete: '{epubReader}.options.selectors.bookmarkDelete'
        },
        repeatingSelectors: ["bookmarkRow"],
        model: {
            repeatingData: [/*
                {
                    bookmarkId: "Row 1 string",
                    bookmarkChapter: {
                        name : "http://domain1.com/page1.html",
                        value : "Link 1 Label"
                    },
                    bookmarkedItemHTML: 'gibberish',
                    bookmarkedItemOffset: 400
                }*/
            ]
        },
        produceTree: "fluid.epubReader.bookHandler.navigator.Bookmarks.produceTree",
        finalInitFunction: "fluid.epubReader.bookHandler.navigator.Bookmarks.finalInit"
    });

    fluid.epubReader.bookHandler.navigator.Bookmarks.produceTree = function (that) {
        var tree = {
            expander: {
                type: "fluid.renderer.repeat",
                repeatID: "bookmarkRow",
                controlledBy: "repeatingData",
                pathAs: "data",
                tree: {
                    bookmarkId : "${{data}.bookmarkId}",
                    bookmarkChapter:  "${{data}.bookmarkChapter.name}",
                    bookmarkEdit:  {
                        target: "${{data}.bookmarkId}",
                        linktext: "Edit"
                    },
                    bookmarkDelete:  {
                        target: "${{data}.bookmarkId}",
                        linktext: "Delete"
                    }
                }
            }
        };
        return tree;
    };

    fluid.epubReader.bookHandler.navigator.Bookmarks.finalInit = function (that) {
        that.applier.modelChanged.addListener("repeatingData", function () {
            that.refreshView();
            that.resetUIHandlers();
        });

        // Delete Button Handler
        that.addDeleteHandler = function () {
            that.locate('bookmarkDelete').click(function (evt) {
                evt.preventDefault();
                var bId = $(this).attr('href'),
                    delPosition = that.findBookmarkPosition(bId);
                that.model.repeatingData.splice(delPosition, 1);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            });
        };

        // ToolTip effect
        // replace following event handler with jQuery UI 1.9 which will have toolTip widget
        that.addToolTipHandler = function () {
            that.locate('bookmarkId').each(function () {
                var bId = $(this).text(),
                    contentHtml =  that.model.repeatingData[that.findBookmarkPosition(bId)].bookmarkedItemHTML;
                $(this).qtip({
                    content: contentHtml,
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
            });
        };

        that.resetUIHandlers = function () {
            that.locate('bookmarkId').fluid('tabbable');
            that.addDeleteHandler();
            that.addToolTipHandler();
        };

        that.addBookmark = function (newBookmark) {
            if (that.findBookmarkPosition(newBookmark) === -1) {
                that.model.repeatingData.push(newBookmark);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
                return true;
            } else {
                return false;
            }
        };

        that.findBookmarkPosition = function (bId) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].bookmarkId === bId) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };
    };

    /* Navigator */

    fluid.defaults('fluid.epubReader.bookHandler.navigator', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        components: {
            toc: {
                type: 'fluid.epubReader.bookHandler.navigator.toc',
                container: '{epubReader}.options.selectors.tocContainer'
            },
            bookmarks: {
                type: 'fluid.epubReader.bookHandler.navigator.Bookmarks',
                container: '{epubReader}.options.selectors.bookmarkContainer'
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
                that.locate('bookContainer').focus();
                return ret;
            } else if (that.options.pageMode === 'scroll') {
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
                kid;
            if (current_selection.to <= top || current_selection.from >= bottom) {
                return false;
            } else if (current_selection.from <= top && current_selection.to >= bottom) {
                return true;
            } else {
                kid = node.children();
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

        that.addBookmark = function (bookmarkId, bookmarkSelectable) {
            var bookmarkedItemOffset;
            if (that.options.pageMode === 'scroll') {
                bookmarkedItemOffset = bookmarkSelectable[0].offsetHeight + bookmarkSelectable.scrollTop();
            } else if (that.options.pageMode === 'split') {
                bookmarkedItemOffset = current_selection.from + bookmarkSelectable.offset().top - 2 * that.locate('chapterContent').offset().top;
            }
            return that.bookmarks.addBookmark({
                bookmarkId: bookmarkId,
                bookmarkChapter: that.toc.getCurrentChapter(),
                bookmarkedItemHTML: $('<div/>').append(bookmarkSelectable.filter('*').removeAttr('tabindex').clone()).html(),
                bookmarkedItemOffset: bookmarkedItemOffset
            });
        };
    };

})(jQuery, fluid_1_4);
// Declare dependencies
/*global fluid_1_4:true, jQuery,showNoty*/

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
            currentSelection: 'wait'
        },
        events: {
            onContentLoad: null
        },
        listeners: {
            onContentLoad: '{epubReader}.loadContent'
        },
        produceTree: 'fluid.epubReader.bookHandler.navigator.toc.produceTree',
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.toc.finalInit',
        renderOnInit: true
    });

    fluid.epubReader.bookHandler.navigator.toc.produceTree = function (that) {
        return {
            tocSelector: {
                optionnames: '${table.names}',
                optionlist: '${table.values}',
                selection: '${currentSelection}'
            }
        };
    };

    fluid.epubReader.bookHandler.navigator.toc.finalInit = function (that) {

        that.applier.modelChanged.addListener('currentSelection', function () {
            that.refreshView();
            that.reloadCurrent();
        });
        that.applier.modelChanged.addListener('table', function () {
            that.refreshView();
        });
        that.setCurrentChapterToValue = function (value) {
            that.applier.requestChange('currentSelection', value);
        };
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
        that.setCurrentSelectionToIndex = function (newSelectionIndex) {
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
        repeatingSelectors: ['bookmarkRow'],
        events: {
            onBookmarkNavigate: '{navigator}.events.onBookmarkNavigate'
        },
        model: {
            repeatingData: [/*
                {
                    bookmarkId: 'Row 1 string',
                    bookmarkChapter: {
                        name : 'http://domain1.com/page1.html',
                        value : 'Link 1 Label'
                    },
                    bookmarkedItemHTML: 'gibberish',
                    bookmarkedItemOffset: 400
                }*/
            ]
        },
        produceTree: 'fluid.epubReader.bookHandler.navigator.Bookmarks.produceTree',
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.Bookmarks.finalInit'
    });

    fluid.epubReader.bookHandler.navigator.Bookmarks.produceTree = function (that) {
        var tree = {
            expander: {
                type: 'fluid.renderer.repeat',
                repeatID: 'bookmarkRow',
                controlledBy: 'repeatingData',
                pathAs: 'data',
                tree: {
                    bookmarkId : '${{data}.bookmarkId}',
                    bookmarkChapter:  '${{data}.bookmarkChapter.name}',
                    bookmarkEdit:  {
                        target: '${{data}.bookmarkId}',
                        linktext: 'Edit'
                    },
                    bookmarkDelete:  {
                        target: '${{data}.bookmarkId}',
                        linktext: 'Delete'
                    }
                }
            }
        };
        return tree;
    };

    fluid.epubReader.bookHandler.navigator.Bookmarks.finalInit = function (that) {
        that.applier.modelChanged.addListener('repeatingData', function () {
            that.refreshView();
            that.resetUIHandlers();
        });

        that.addNavigationHanlder = function () {
            var internalNavigationHandler = function (elm) {
                var bId = elm.text(),
                    navPosition = that.findBookmarkPosition(bId),
                    current = that.model.repeatingData[navPosition];
                that.events.onBookmarkNavigate.fire(current.bookmarkChapter.value, current.bookmarkedItemOffset);
            };
            that.locate('bookmarkId').dblclick(function () {
                internalNavigationHandler($(this));
            });
            that.locate('bookmarkId').keypress(function (e) {
                var code = e.keyCode || e.which;
                if (code === 13) {
                    internalNavigationHandler($(this));
                }
            });
        };

        // Edit Button Handler
        that.addEditHandler = function () {
            that.locate('bookmarkEdit').click(function (evt) {
                evt.preventDefault();
                var bId = $(this).attr('href'),
                    editPosition = that.findBookmarkPosition(bId),
                    tempForm = $('<div/>'),
                    inputBox = $('<input/>');
                tempForm.attr('title', 'Edit Bookmark Identifier');
                inputBox.attr('type', 'text');
                tempForm.append(inputBox);
                that.container.append(tempForm);

                tempForm.dialog({
                    autoOpen: true,
                    modal: false,
                    height: 90,
                    width: 240,
                    draggable: false,
                    resizable: false,
                    position: [$(this).offset().left, $(this).offset().top + $(this).height()],
                    show: 'slide',
                    hide: 'slide',
                    buttons: {
                        'Create': function () {
                            var bookmarkId = $.trim($(this).find('input').val()),
                                temp;
                            if (bookmarkId.length === 0) {
                                showNoty('Please enter an identifier', 'error');
                            } else {
                                temp = that.findBookmarkPosition(bookmarkId);
                                if (temp === -1 || temp === editPosition) {
                                    that.model.repeatingData[editPosition].bookmarkId = bookmarkId;
                                    that.applier.requestChange('repeatingData', that.model.repeatingData);
                                    $(this).dialog('close');
                                    showNoty('Bookmark Added', 'success');
                                } else {
                                    showNoty('This Bookmark identifier already exist', 'error');
                                }
                            }
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    },
                    open: function (event, ui) {
                        $(this).parent().children().children('.ui-dialog-titlebar-close').hide();
                    },
                    close: function () {
                        tempForm.remove();
                    }
                });
            });
        };

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
                    contentHtml =  that.model.repeatingData[that.findBookmarkPosition(bId)].bookmarkedItemHTML,
                    cur = $(this);
                cur.qtip({
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
            that.addEditHandler();
            that.addNavigationHanlder();
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
            onUIOptionsUpdate: '{bookHandler}.events.onUIOptionsUpdate',
            onBookmarkNavigate: null
        },
        listeners: {
            onUIOptionsUpdate: '{navigator}.requestContentLoad',
            onBookmarkNavigate: '{navigator}.naivagteTo'
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

        that.naivagteTo = function (chapterValue, itemOffset) {
            that.toc.setCurrentChapterToValue(chapterValue);
            if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(itemOffset);
            } else if (that.options.pageMode === 'split') {
                that.splitModeScrollTop(itemOffset);
            }
        };

        // To handler UI options setting change
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

        that.splitModeScrollTop =  function (itemOffset) {
            while (!(current_selection.from <= itemOffset && itemOffset <= current_selection.to)) {
                that.next();
            }
            if (!that.isSelected()) {
                that.next();
            }
        };

        that.isSelected = function (itemOffset) {
            var reqOffset = that.locate('chapterContent').offset() + itemOffset,
                ret = false;
            that.locate('chapterContent').find(':visible').each(function () {
                var elm = $(this);
                if (elm.offset().top === reqOffset) {
                    ret = true;
                    return false;
                }
            });
            return ret;
        };

        that.selectionWrapper = function () {
            // removing tabindex for hidden elements
            that.locate('chapterContent').filter('*').removeAttr('tabindex');

            if (that.options.pageMode === 'split') {
                that.locate('chapterContent').find(':hidden').show();
                var toHide = [],
                    ret = that.createSelection(that.locate('chapterContent').children().first(), toHide, that.locate('chapterContent').offset().top),
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

        that.createSelection = function (node, toHide, offsetCorrection) {
            if (!node) {
                return null;
            }
            var top = node.offset().top - offsetCorrection,
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
                    var temp = that.createSelection($(this), toHide, offsetCorrection);
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
            current_selection.from = 0;
            current_selection.to = current_selection.from + current_selection_height;
        };

        that.load_content = function (chapter_content) {
            current_chapter = chapter_content;
            pagination = [];
            var chapterElem = that.locate('chapterContent');

            that.resetSelection();
            chapterElem.html(current_chapter.content);
            that.locate('chapterStyle').html(current_chapter.styles);

            chapterElem.find('img').css({
                'max-width': that.options.constraints.maxImageWidth + 'px',
                'max-height': that.options.constraints.maxImageHeight + 'px',
                'height': 'auto',
                'width': 'auto'
            });

            /*
             waitForImages jQuery Plugin is a being used because of a bug in .load method of jquery
             .load method is not accurate and fails for cached images case.
             We need to calculate height of chapter (including height of images)
             in order to navigate inside the chapter
             */
            chapterElem.waitForImages(function () {
                current_chapter.height = that.locate('chapterContent').height();
                that.selectionWrapper();
                if (that.options.pageMode === 'scroll') {
                    that.locate('bookContainer').scrollTop(0);
                }
                faltu = current_chapter.height;
            });

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
                if (current_selection !== undefined && current_selection.to > 0) {
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
            that.toc.setCurrentSelectionToIndex(that.toc.currentSelectPosition() + 1);
        };

        that.previous_chapter = function () {
            if (that.toc.isFirst()) {
                return;
            }
            that.toc.setCurrentSelectionToIndex(that.toc.currentSelectPosition() - 1);
        };

        that.addBookmark = function (bookmarkId, bookmarkSelectable) {
            var bookmarkedItemOffset;
            if (that.options.pageMode === 'scroll') {
                bookmarkedItemOffset = bookmarkSelectable.offset().top - that.locate('chapterContent').offset().top;
            } else if (that.options.pageMode === 'split') {
                // show everything to get acccurate offset
                // show everything
                that.locate('chapterContent').find(':hidden').show();
                // get proper Offset
                bookmarkedItemOffset = bookmarkSelectable.offset().top - that.locate('chapterContent').offset().top;
                // restore all hidden elements
                that.selectionWrapper();
            }
            titu = bookmarkedItemOffset;
            galti = bookmarkSelectable;
            return that.bookmarks.addBookmark({
                bookmarkId: bookmarkId,
                bookmarkChapter: that.toc.getCurrentChapter(),
                bookmarkedItemHTML: $('<div/>').append(bookmarkSelectable.filter('*').removeAttr('tabindex').clone()).html(),
                bookmarkedItemOffset: bookmarkedItemOffset
            });
        };
    };

})(jQuery, fluid_1_4);
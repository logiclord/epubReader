// Declare dependencies
/*global fluid_1_4:true, jQuery,showNoty*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    /* Table of Content */
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

})(jQuery, fluid_1_4);
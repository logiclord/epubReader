/*
 Copyright 2012 OCAD University
 Copyright 2012 OCAD Gaurav Aggarwal

 Licensed under the Educational Community License (ECL), Version 2.0 or the New
 BSD license. You may not use this file except in compliance with one these
 Licenses.

 You may obtain a copy of the ECL 2.0 License and BSD License at
 https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
 */
// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    /* Search */
    fluid.defaults('fluid.epubReader.bookHandler.navigator.search', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            searchResult:  '{epubReader}.options.selectors.searchResult',
            currentSearchResult:  '{epubReader}.options.selectors.currentSearchResult'
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.search.finalInit'
    });

    fluid.epubReader.bookHandler.navigator.search.finalInit = function (that) {
        var lastSearchQuery,
            lastResult;

        that.removeHighlight = function () {
            that.locate('searchResult').each(function () {
                $(this).replaceWith($(this).text());
            });
            that.locate('currentSearchResult').each(function () {
                $(this).replaceWith($(this).text());
            });
        };

        that.addHighlight = function (query) {
            var sRegExInput = new RegExp(query, 'ig');
            that.container.find(':visible').each(function () {
                if ($(this).children().length === 0 && !$(this).hasClass(that.options.selectors.searchResult.slice(1))) {
                    var oldHTML = $(this).text();
                    $(this).html(oldHTML.replace(sRegExInput, '<span  class="' + that.options.selectors.searchResult.slice(1) + '" >$&</span>'));
                }
            });
        };

        that.getCurrentResult = function () {
            return lastResult;
        };

        that.searchNext = function (query) {
            if (lastResult !== undefined) {
                lastResult.removeClass(that.options.selectors.currentSearchResult.slice(1));
            }
            var results, loc;
            if (query !== lastSearchQuery) {
                that.removeHighlight();
                that.addHighlight(query);
                lastSearchQuery = query;
                results = that.locate('searchResult');
                if (results.length === 0) {
                    lastResult = undefined;
                    return true;
                } else {
                    lastResult = results.first();
                    lastResult.addClass(that.options.selectors.currentSearchResult.slice(1));
                    return false;
                }
            } else {
                if (lastResult !== undefined && lastResult.is(':visible')) {
                    results = that.locate('searchResult').filter(':visible');
                    loc = $.inArray(lastResult[0], results);
                    if (loc === results.length - 1) {
                        lastResult = undefined;
                        return true;
                    } else {
                        lastResult = $(results[loc + 1]);
                        lastResult.addClass(that.options.selectors.currentSearchResult.slice(1));
                        return false;
                    }
                } else {
                    that.addHighlight(query);
                    results = that.locate('searchResult').filter(':visible');
                    if (results.length === 0) {
                        lastResult = undefined;
                        return true;
                    } else {
                        lastResult = results.first();
                        lastResult.addClass(that.options.selectors.currentSearchResult.slice(1));
                        return false;
                    }
                }
            }
        };
    };

    /* Table of Content */
    fluid.defaults('fluid.epubReader.bookHandler.navigator.toc', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        selectors: {
            tocSelector: '{epubReader}.options.selectors.tocSelector'
        },
        model: { /*
            // sample structure of model
            table: {
                names: ['chapter1', 'chapter2'],
                values: ['chapter1Path', 'chapter2Path']
            },
            currentSelection: 'chapter2Path'
            */
        },
        events: {
            onContentLoad: null
        },
        listeners: {
            onContentLoad: '{epubReader}.loadContent'
        },
        produceTree: 'fluid.epubReader.bookHandler.navigator.toc.produceTree',
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.toc.finalInit'
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
        var previousSelection;
        that.applier.modelChanged.addListener('currentSelection', function () {
            that.refreshView();
            that.reloadCurrent();
        });
        that.applier.guards.addListener('currentSelection', function () {
            previousSelection = that.model.currentSelection;
        });
        that.getPreviousSelection = function () {
            return previousSelection;
        };
        that.setModel = function (temp) {
            that.applier.requestChange('table', temp.table);
            that.setCurrentChapterToValue(temp.currentSelection);
        };
        that.applier.modelChanged.addListener('table', function () {
            that.refreshView();
        });
        that.getChapterPaths = function () {
            return that.model.table;
        };
        that.setCurrentChapterToValue = function (value) {
            that.applier.requestChange('currentSelection', value);
        };
        that.getCurrentChapter = function () {
            return { value: that.model.currentSelection, name: that.model.table.names[that.currentSelectPosition()] };
        };
        that.getCurrentChapterPath = function () {
            return that.model.currentSelection;
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
            that.setCurrentChapterToValue(that.model.table.values[newSelectionIndex]);
        };
    };

    /* Bookmarks */

    fluid.defaults('fluid.epubReader.bookHandler.navigator.Bookmarks', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        selectors: {
            bookmarkRow: '{epubReader}.options.selectors.bookmarkRow',
            bookmarkTitle : '{epubReader}.options.selectors.bookmarkTitle',
            bookmarkChapter: '{epubReader}.options.selectors.bookmarkChapter',
            bookmarkEdit: '{epubReader}.options.selectors.bookmarkEdit',
            bookmarkDelete: '{epubReader}.options.selectors.bookmarkDelete',
            bookmarkGoTO: '{epubReader}.options.selectors.bookmarkGoTO'
        },
        repeatingSelectors: ['bookmarkRow'],
        events: {
            onBookmarkNavigate: null,
            onBookmarkDelete: null
        },
        model: {
            // sample structure of model
            repeatingData: [/*
                 {
                     "bookmarkTitle": "mytitle",
                     "bookmarkChapter": {
                         "value": "OPS/s001-BookTitlePage-01.xhtml",
                         "name": "The Hound of the Baskervilles"
                     },
                     "bookmarkedItemHTML": "<span>Sir Arthur Conan Doyle's</span>",
                     "bookmarkedItemKey": "1345474804758-8eb6e0a4-754e-4e76-8adc-2ce677314901"
                 }
             */
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
                    bookmarkTitle : '${{data}.bookmarkTitle}',
                    bookmarkChapter:  '${{data}.bookmarkChapter.name}',
                    bookmarkEdit:  {
                        target: '${{data}.bookmarkedItemKey}',
                        linktext: 'Edit'
                    },
                    bookmarkDelete:  {
                        target: '${{data}.bookmarkedItemKey}',
                        linktext: 'Delete'
                    },
                    bookmarkGoTO: {
                        target: '${{data}.bookmarkedItemKey}',
                        linktext: 'GO'
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

        that.setModel = function (bookmarksArray) {
            var loadedBookmarks = $.parseJSON(bookmarksArray);
            if (loadedBookmarks !== null) {
                that.model.repeatingData = loadedBookmarks;
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            }
        };

        that.getAllBookmarks = function () {
            return that.model.repeatingData;
        };

        that.addNavigationHanlder = function () {
            var internalNavigationHandler = function (elm) {
                var key = elm.attr('href'),
                    navPosition = that.findBookmarkPositionByKey(key),
                    current = that.model.repeatingData[navPosition];
                that.events.onBookmarkNavigate.fire(current.bookmarkChapter.value, current.bookmarkedItemKey);
            };
            that.locate('bookmarkGoTO').click(function (evt) {
                evt.preventDefault();
                internalNavigationHandler($(this));
            });
        };

        // Edit Button Handler
        that.addEditHandler = function () {
            that.locate('bookmarkEdit').click(function (evt) {
                evt.preventDefault();
                var elm = $(this),
                    key = elm.attr('href'),
                    editPosition = that.findBookmarkPositionByKey(key),
                    tempForm = fluid.epubReader.utils.createBookmarkForm(that.model.repeatingData[editPosition].bookmarkTitle);
                that.container.append(tempForm);

                fluid.epubReader.utils.attachForm(tempForm, {
                    height: 90,
                    width: 240,
                    position: [elm.offset().left, elm.offset().top + elm.height()],
                    buttons: {
                        'Edit': function () {
                            var bookmarkTitle = $.trim($(this).find('input').val()),
                                temp;
                            if (bookmarkTitle.length === 0) {
                                fluid.epubReader.utils.showNotification('Please enter an identifier', 'error');
                            } else {
                                that.model.repeatingData[editPosition].bookmarkTitle = bookmarkTitle;
                                that.applier.requestChange('repeatingData', that.model.repeatingData);
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Bookmark Edits Saved', 'success');
                            }
                        }
                    },
                    close: function () {
                        tempForm.remove();
                        elm.focus();
                    }
                });
            });
        };

        // Delete Button Handler
        that.addDeleteHandler = function () {
            that.locate('bookmarkDelete').click(function (evt) {
                evt.preventDefault();
                var key = $(this).attr('href'),
                    delPosition = that.findBookmarkPositionByKey(key),
                    current = that.model.repeatingData[delPosition];
                that.events.onBookmarkDelete.fire(current.bookmarkChapter.value, current.bookmarkedItemKey);
                that.model.repeatingData.splice(delPosition, 1);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            });
        };

        // ToolTip effect
        // replace following event handler with jQuery UI 1.9 which will have toolTip widget
        that.addToolTipHandler = function () {
            that.locate('bookmarkTitle').each(function () {
                var key = $(this).parent().find('a').attr('href'),
                    contentHtml =  that.model.repeatingData[that.findBookmarkPositionByKey(key)].bookmarkedItemHTML;

                fluid.epubReader.utils.attachToolTip($(this), contentHtml);
            });
        };

        that.resetUIHandlers = function () {
            that.locate('bookmarkTitle').fluid('tabbable');
            that.addDeleteHandler();
            that.addToolTipHandler();
            that.addEditHandler();
            that.addNavigationHanlder();
        };

        that.addBookmark = function (newBookmark) {
            // bookmarks with identical Titles allowed
            that.model.repeatingData.push(newBookmark);
            that.applier.requestChange('repeatingData', that.model.repeatingData);
            return true;
        };

        that.findBookmarkPosition = function (bId) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].bookmarkTitle === bId) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };

        that.findBookmarkPositionByKey = function (key) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].bookmarkedItemKey === key) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };
    };

    /* Notes */
    fluid.defaults('fluid.epubReader.bookHandler.navigator.Notes', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        selectors: {
            noteRow: '{epubReader}.options.selectors.noteRow',
            noteId : '{epubReader}.options.selectors.noteId',
            noteChapter: '{epubReader}.options.selectors.noteChapter',
            noteEdit: '{epubReader}.options.selectors.noteEdit',
            noteDelete: '{epubReader}.options.selectors.noteDelete'
        },
        repeatingSelectors: ['noteRow'],
        model: {
            // sample structure of model
            repeatingData: [ /*
                 {
                     "noteId": "my notes",
                     "noteChapter": {
                         "value": "OPS/s003-Introduction-01.xhtml",
                         "name": "Introduction"
                     },
                     "notedText": "my important notes text",
                     "notedItemKey": "1345475088549-544cea88-8068-4f14-8e41-8b05bf2eaa70"
                 }
             */
            ]
        },
        events: {
            onNoteDelete: null
        },
        produceTree: 'fluid.epubReader.bookHandler.navigator.Notes.produceTree',
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.Notes.finalInit'
    });

    fluid.epubReader.bookHandler.navigator.Notes.produceTree = function (that) {
        var tree = {
            expander: {
                type: 'fluid.renderer.repeat',
                repeatID: 'noteRow',
                controlledBy: 'repeatingData',
                pathAs: 'data',
                tree: {
                    noteId : '${{data}.noteId}',
                    noteChapter:  '${{data}.noteChapter.name}',
                    noteEdit:  {
                        target: '${{data}.notedItemKey}',
                        linktext: 'Edit'
                    },
                    noteDelete:  {
                        target: '${{data}.notedItemKey}',
                        linktext: 'Delete'
                    }
                }
            }
        };
        return tree;
    };

    fluid.epubReader.bookHandler.navigator.Notes.finalInit = function (that) {
        // not being used
        var getHashTableForChapter = function (currentChapter) {
            var i = 0, n = that.model.repeatingData.length, keyHash = [];
            while (i < n) {
                if (currentChapter === that.model.repeatingData[i].noteChapter.value) {
                    // unable to insert such big id as index
                    keyHash[that.model.repeatingData[i].notedItemKey] = that.model.repeatingData[i].notedText;
                }
                i = i + 1;
            }
            return keyHash;
        };

        that.setModel = function (notesArray) {
            var loadedNotes = $.parseJSON(notesArray);
            if (loadedNotes !== null) {
                that.model.repeatingData = loadedNotes;
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            }
        };

        that.getAllNotes = function () {
            return that.model.repeatingData;
        };

        that.applier.modelChanged.addListener('repeatingData', function () {
            that.refreshView();
            that.resetUIHandlers();
        });
        that.resetUIHandlers = function () {
            that.locate('noteId').fluid('tabbable');
            that.addDeleteHandler();
            that.addToolTipHandler();
            that.addEditHandler();
        };
        // Delete Button Handler
        that.addDeleteHandler = function () {
            that.locate('noteDelete').click(function (evt) {
                evt.preventDefault();
                var key = $(this).attr('href'),
                    delPosition = that.findNotePositionByKey(key),
                    current = that.model.repeatingData[delPosition];
                that.events.onNoteDelete.fire(current.noteChapter.value, current.notedItemKey);
                that.model.repeatingData.splice(delPosition, 1);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            });
        };
        // Edit Button Hanlder
        that.addEditHandler = function () {
            that.locate('noteEdit').click(function (evt) {
                evt.preventDefault();
                var elm = $(this),
                    key = elm.attr('href'),
                    editPosition = that.findNotePositionByKey(key),
                    tempForm = fluid.epubReader.utils.createNoteForm(that.model.repeatingData[editPosition].noteId, that.model.repeatingData[editPosition].notedText);

                that.container.append(tempForm);

                fluid.epubReader.utils.attachForm(tempForm, {
                    resizable: true,
                    position: [elm.offset().left, elm.offset().top + elm.height()],
                    buttons: {
                        'Edit': function () {
                            var noteIdVal = $.trim(tempForm.find('input').val()),
                                noteTextVal = $.trim(tempForm.find('textarea').val());
                            if (noteIdVal.length === 0 || noteTextVal.length === 0) {
                                fluid.epubReader.utils.showNotification('Incomplete Form', 'error');
                            } else {
                                that.model.repeatingData[editPosition].noteId = noteIdVal;
                                that.model.repeatingData[editPosition].notedText = noteTextVal;
                                that.applier.requestChange('repeatingData', that.model.repeatingData);
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Note Edits Saved', 'success');
                            }
                        }
                    },
                    close: function () {
                        tempForm.remove();
                        elm.focus();
                    }
                });
            });
        };
        // ToolTip effect
        // replace following event handler with jQuery UI 1.9 which will have toolTip widget
        that.addToolTipHandler = function () {
            that.locate('noteId').each(function () {
                var key = $(this).parent().find('a').attr('href'),
                    contentHtml =  that.model.repeatingData[that.findNotePositionByKey(key)].notedText;

                fluid.epubReader.utils.attachToolTip($(this), contentHtml);
            });
        };
        that.addNote = function (newNote, noteAnchor) {
            that.model.repeatingData.push(newNote);
            that.applier.requestChange('repeatingData', that.model.repeatingData);
            fluid.epubReader.utils.attachToolTip(noteAnchor, newNote.notedText);
            return true;
        };
        that.findNotePosition = function (nId) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].noteId === nId) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };
        that.findNotePositionByKey = function (key) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].notedItemKey === key) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };
        that.isEmpty = function () {
            return that.model.repeatingData.length === 0;
        };
        // used at page on load in order to attach all notes
        that.attachNotes = function (elms, chapter) {
            // get all notes of current chapter
            var i = 0,
                n = elms.length,
                elm,
                currentKey,
                pos;

            if (that.isEmpty()) {
                return;
            }

            while (i < n) {
                elm = $(elms[i]);
                currentKey = elm.attr('notekey');
                pos = that.findNotePositionByKey(currentKey);
                if (pos !== -1) {
                    fluid.epubReader.utils.attachToolTip(elm, that.model.repeatingData[pos].notedText);
                }
                i = i + 1;
            }
        };

    };

})(jQuery, fluid_1_4);
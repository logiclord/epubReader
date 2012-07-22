// Declare dependencies
/*global fluid_1_4:true, jQuery*/

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
        that.setModel = function (temp) {
            that.applier.requestChange('table', temp.table);
            that.applier.requestChange('currentSelection', temp.currentSelection);
        };
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
            onBookmarkNavigate: null
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
                var elm = $(this),
                    bId = elm.attr('href'),
                    editPosition = that.findBookmarkPosition(bId),
                    tempForm = $('<div/>'),
                    inputBox = $('<input/>');
                tempForm.attr('title', 'Edit Bookmark Identifier');
                inputBox.attr('type', 'text');
                inputBox.val(that.model.repeatingData[editPosition].bookmarkId);
                tempForm.append(inputBox);
                that.container.append(tempForm);

                tempForm.dialog({
                    autoOpen: true,
                    modal: false,
                    height: 90,
                    width: 240,
                    draggable: false,
                    resizable: false,
                    position: [elm.offset().left, elm.offset().top + elm.height()],
                    show: 'slide',
                    hide: 'slide',
                    buttons: {
                        'Edit': function () {
                            var bookmarkId = $.trim($(this).find('input').val()),
                                temp;
                            if (bookmarkId.length === 0) {
                                fluid.epubReader.utils.showNotification('Please enter an identifier', 'error');
                            } else {
                                temp = that.findBookmarkPosition(bookmarkId);
                                if (temp === -1 || temp === editPosition) {
                                    that.model.repeatingData[editPosition].bookmarkId = bookmarkId;
                                    that.applier.requestChange('repeatingData', that.model.repeatingData);
                                    $(this).dialog('close');
                                    fluid.epubReader.utils.showNotification('Bookmark Edits Saved', 'success');
                                } else {
                                    fluid.epubReader.utils.showNotification('This Bookmark identifier already exist', 'error');
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
                        elm.focus();
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
            repeatingData: [ /*
                {
                    noteId: 'Row 1 string',
                    noteChapter: {
                        name : 'http://domain1.com/page1.html',
                        value : 'Link 1 Label'
                    },
                    notedText: 'gibberish',
                    notedItemOffset: 400
                }*/
            ]
        },
        events: {
            afterNotesChange : null
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
                        target: '${{data}.noteId}',
                        linktext: 'Edit'
                    },
                    noteDelete:  {
                        target: '${{data}.noteId}',
                        linktext: 'Delete'
                    }
                }
            }
        };
        return tree;
    };

    fluid.epubReader.bookHandler.navigator.Notes.finalInit = function (that) {
        that.applier.modelChanged.addListener('repeatingData', function () {
            that.refreshView();
            that.resetUIHandlers();
            that.events.afterNotesChange.fire();
        });
        // Delete Button Handler
        that.addDeleteHandler = function () {
            that.locate('noteDelete').click(function (evt) {
                evt.preventDefault();
                var nId = $(this).attr('href'),
                    delPosition = that.findNotePosition(nId);
                that.model.repeatingData.splice(delPosition, 1);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
            });
        };
        // Edit Button Hanlder
        that.addEditHandler = function () {
            that.locate('noteEdit').click(function (evt) {
                evt.preventDefault();
                var elm = $(this),
                    nId = elm.attr('href'),
                    editPosition = that.findNotePosition(nId),
                    tempForm = $('<div/>'),
                    noteId = $('<input/>').attr('type', 'text'),
                    noteText = $('<textarea/>');

                tempForm.attr('title', 'Enter Note Details');
                tempForm.append(noteId);
                tempForm.append('<br><br>');
                fluid.epubReader.utils.setTitleToolTip(noteId, 'Note Title');
                fluid.epubReader.utils.setTitleToolTip(noteText, 'Note Text');
                tempForm.append(noteText);
                that.container.append(tempForm);
                noteId.val(that.model.repeatingData[editPosition].noteId);
                noteText.val(that.model.repeatingData[editPosition].notedText);

                tempForm.dialog({
                    autoOpen: true,
                    modal: false,
                    draggable: false,
                    width: 'auto',
                    maxHeight: 400,
                    maxWidth: 500,
                    resizable: true,
                    position: [elm.offset().left, elm.offset().top + elm.height()],
                    show: 'slide',
                    hide: 'slide',
                    buttons: {
                        'Edit': function () {
                            var noteIdVal = $.trim(noteId.val()),
                                noteTextVal = $.trim(noteText.val()),
                                temp;
                            if (noteIdVal.length === 0 || noteTextVal.length === 0) {
                                fluid.epubReader.utils.showNotification('Incomplete Form', 'error');
                            } else {
                                temp = that.findNotePosition(noteIdVal);
                                if (temp === -1 || temp === editPosition) {
                                    that.model.repeatingData[editPosition].noteId = noteIdVal;
                                    that.model.repeatingData[editPosition].notedText = noteTextVal;
                                    that.applier.requestChange('repeatingData', that.model.repeatingData);
                                    $(this).dialog('close');
                                    fluid.epubReader.utils.showNotification('Note Edits Saved', 'success');
                                } else {
                                    fluid.epubReader.utils.showNotification('This Note identifier already exist', 'error');
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
                        elm.focus();
                    }
                });
            });
        };
        // ToolTip effect
        // replace following event handler with jQuery UI 1.9 which will have toolTip widget
        that.addToolTipHandler = function () {
            that.locate('noteId').each(function () {
                var nId = $(this).text(),
                    contentHtml =  that.model.repeatingData[that.findNotePosition(nId)].notedText,
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
        that.addNote = function (newNote) {
            if (that.findNotePosition(newNote) === -1 &&  that.findPositionByLocation(newNote.notedItemOffset, newNote.noteChapter.value) === -1) {
                that.model.repeatingData.push(newNote);
                that.applier.requestChange('repeatingData', that.model.repeatingData);
                return true;
            } else {
                return false;
            }
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
        that.resetUIHandlers = function () {
            that.locate('noteId').fluid('tabbable');
            that.addDeleteHandler();
            that.addToolTipHandler();
            that.addEditHandler();
        };
        that.findPositionByLocation = function (offset, chapterValue) {
            var i = 0,
                n = that.model.repeatingData.length;
            while (i < n) {
                if (that.model.repeatingData[i].notedItemOffset === offset && that.model.repeatingData[i].noteChapter.value === chapterValue) {
                    return i;
                }
                i = i + 1;
            }
            return -1;
        };
        that.attachNote = function (chapter, elms, offsets) {
            var modelHash = that.getHashTableForChapter(chapter),
                i = 0,
                n = elms.length,
                elm,
                currentOffset;
            if (modelHash.length === 0) {
                return;
            }
            while (i < n) {
                elm = $(elms[i]);
                currentOffset = offsets[i];
                if (modelHash.hasOwnProperty(currentOffset)) {
                    elm.qtip({
                        content: modelHash[currentOffset],
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
                }
                i = i + 1;
            }
        };
        that.getHashTableForChapter = function (chapter) {
            var i = 0,
                n = that.model.repeatingData.length,
                hashTable = [];
            while (i < n) {
                if (that.model.repeatingData[i].noteChapter.value === chapter) {
                    hashTable[that.model.repeatingData[i].notedItemOffset] = that.model.repeatingData[i].notedText;
                }
                i = i + 1;
            }
            return hashTable;
        };
    };

})(jQuery, fluid_1_4);
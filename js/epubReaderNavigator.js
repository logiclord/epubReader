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

    /* Navigator */

    fluid.defaults('fluid.epubReader.bookHandler.navigator', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        components: {
            toc: {
                type: 'fluid.epubReader.bookHandler.navigator.toc',
                container: '{epubReader}.options.selectors.tocContainer'
            },
            search: {
                type: 'fluid.epubReader.bookHandler.navigator.search',
                container: '{bookHandler}.options.selectors.chapterContent'
            },
            bookmarks: {
                type: 'fluid.epubReader.bookHandler.navigator.Bookmarks',
                container: '{epubReader}.options.selectors.bookmarkContainer',
                options: {
                    listeners: {
                        onBookmarkNavigate: '{navigator}.naivagteToBookmark',
                        onBookmarkDelete: '{navigator}.deleteBookmark'
                    }
                }
            },
            notes: {
                type: 'fluid.epubReader.bookHandler.navigator.Notes',
                container: '{epubReader}.options.selectors.notesContainer',
                options: {
                    listeners: {
                        onNoteDelete: '{navigator}.deleteNote'
                    }
                }
            }
        },
        constraints: {
            maxImageHeight: '{epubReader}.options.constraints.maxImageHeight',
            maxImageWidth: '{epubReader}.options.constraints.maxImageWidth'
        },
        pageMode: 'split',
        scrollSpeed: 50,
        autoActivate: false,
        maxSplitModePageHeight: 500,
        selectors: {
            remaining: '{bookHandler}.options.selectors.remaining',
            chapterStyle: '{bookHandler}.options.selectors.chapterStyle',
            chapterContent: '{bookHandler}.options.selectors.chapterContent',
            bookContainer: '{bookHandler}.options.selectors.bookContainer',
            remainingWrapper: '{epubReader}.options.selectors.remainingWrapper'
        },
        events: {
            onUIOptionsUpdate: '{bookHandler}.events.onUIOptionsUpdate',
            onPageModeRestore: '{bookHandler}.events.onPageModeRestore',
            onSaveReady: null,
            onAttributeDeleteInFile: null,
            onFileSave: null
        },
        listeners: {
            onUIOptionsUpdate: '{navigator}.requestContentLoad',
            onPageModeRestore: '{navigator}.setPageMode',
            onSaveReady: '{filefacilitator}.saveChapter',
            onAttributeDeleteInFile: '{filefacilitator}.deleteAttributeDeleteInFile',
            onFileSave: '{filefacilitator}.saveFile'
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.finalInit',
        preInitFunction: 'fluid.epubReader.bookHandler.navigator.preInit'
    });

    fluid.epubReader.bookHandler.navigator.preInit = function (that) {
        // To handler UI options setting change
        that.requestContentLoad = function (selection) {
            var newMode = selection.pageMode;
            if (that.options.pageMode === 'scroll' && newMode === 'scroll') {
                return;
            } else if (that.options.pageMode === 'split' && newMode === 'split') {
                that.toc.reloadCurrent();
            } else {
                that.setPageMode(newMode);
                that.toc.reloadCurrent();
            }
        };

        // restoring page mode retrieve using UI Options component
        that.setPageMode = function (newPageMode) {
            that.options.pageMode = newPageMode;
            if (that.options.pageMode === 'split') {
                that.locate('remainingWrapper').show();
                that.locate('chapterContent').css('overflow', 'hidden');
                that.locate('bookContainer').css('overflow-y', 'hidden');
            } else if (that.options.pageMode === 'scroll') {
                that.locate('remainingWrapper').hide();
                that.locate('chapterContent').css('overflow', 'visible');
                that.locate('bookContainer').css('overflow-y', 'auto');
            }
        };

        // for bookmark
        that.naivagteToBookmark = function (chapterValue, bookmarkKey) {
            that.naivagteTo(chapterValue, 'bookmarkkey', bookmarkKey);
        };

        that.deleteBookmark = function (chapterValue, bookmarkKey) {
            that.deleteAttribute(chapterValue, 'bookmarkkey', bookmarkKey);
        };

        that.deleteNote = function (chapterValue, noteKey) {
            // removing tooltip
            fluid.epubReader.utils.removeToolTip(that.locate('chapterContent').find('[notekey="' + noteKey + '"]'));
            that.deleteAttribute(chapterValue, 'notekey', noteKey);
        };
    };

    fluid.epubReader.bookHandler.navigator.finalInit = function (that) {
        var currentChapterHeight,
            savedState = {},
            savedQuery = '',
            isSavedState = false,
            currentSelection = {},                 //= {from : 0, to : that.options.maxSplitModePageHeight};
            pagination = [],                        // to keep track about forward and backward pagination ranges
            deactivateSelection = function () {
                // removing tabindex for all elements
                that.locate('bookContainer').find('*').removeAttr('tabindex');
            },
            activateSelection = function () {
                that.locate('bookContainer').fluid('activate');
            },
            getCurrentPageHeight = function () {
                var lastChild = that.locate('chapterContent').children().last();
                // calculating height of content
                return lastChild.offset().top + lastChild.height() - that.locate('chapterContent').offset().top;
            },
            resetNavigation = function () {
                pagination = [];
                currentSelection.from = 0;
                currentSelection.to = currentSelection.from + that.options.maxSplitModePageHeight;
            },
            updateProgressbar = function () {
                var progress = 500 * ((currentSelection.to > currentChapterHeight) ? 1 : (currentSelection.to / currentChapterHeight));
                that.locate('remaining').css('width', progress + 'px');
            },
            createSelection = function (node, toHide, offsetCorrection) {
                if (!node) {
                    return null;
                }
                var top = node.offset().top - offsetCorrection,
                    bottom = top + node.height(),
                    ret = false,
                    kid;
                if (currentSelection.to <= top || currentSelection.from >= bottom) {
                    return false;
                } else if (currentSelection.from <= top && currentSelection.to >= bottom) {
                    return true;
                } else {
                    kid = node.children();
                    kid.each(function () {
                        var temp = createSelection($(this), toHide, offsetCorrection);
                        if (temp === true) {
                            ret = true;
                        } else {
                            toHide.push($(this));
                        }
                    });
                    // overflow test expression ( (node.is('img') || !node.text() ) && currentSelection.to >= top && currentSelection.to <= bottom )
                    if ((node.is('img') || (kid.length === 0 && node.text() !== '')) && currentSelection.from >= top && currentSelection.from <= bottom) {
                        currentSelection.from = top;
                        currentSelection.to = currentSelection.from + that.options.maxSplitModePageHeight;
                        return true;
                    } else {
                        return ret;
                    }
                }
            },
            isCurrentState = function (state) {
                if (that.toc.getCurrentChapterPath() === state.chapterPath) {
                    if (that.options.pageMode === 'scroll') {
                        return true;
                    } else if (that.options.pageMode === 'split' && state.to === currentSelection.to && state.from === currentSelection.from) {
                        return true;
                    }
                }
                return false;
            }, // Created to take care of race condition between search and loadChapter
            continueSearch = function (query, startState) {
                // issue is next -> next_chapter -> loadChapter  which returns but selection wrapper waits for images which
                // causes asyncronous execution of search.Next and selectionWrapper
                while (that.search.searchNext(query)) {
                    if (that.next() === false) {
                        // Go round the end to reach first chapter
                        that.toc.setCurrentSelectionToIndex(0);
                    }
                    if (isCurrentState(startState)) {
                        fluid.epubReader.utils.showNotification('No results found', 'error');
                        break;
                    }
                    if (isSavedState) {
                        savedState = startState;
                        break;
                    }
                }
                // if search is terminated and not paused
                if (isSavedState === false) {
                    savedQuery = '';
                    var currentResult = that.search.getCurrentResult();
                    if (currentResult !== undefined || currentResult !== null) {
                        //currentResult.focus();
                        that.locate('bookContainer').scrollTop(currentResult.offset().top - that.locate('chapterContent').offset().top);
                    }
                }
            },
            removeAllNotes = function () {
                that.locate('chapterContent').find('[notekey]').each(function () {
                    fluid.epubReader.utils.removeToolTip($(this));
                });
            };

        that.deleteAttribute = function (chapterValue, attributeName, attributeValue) {
            if (that.toc.getCurrentChapter().value !== chapterValue) {
                that.events.onAttributeDeleteInFile.fire(chapterValue, attributeName, attributeValue);
            } else {
                that.locate('chapterContent').find('[' + attributeName + '="' + attributeValue + '"]').removeAttr(attributeName);
            }
        };

        that.naivagteTo = function (chapterValue, attributeName, attributeValue) {

            if (that.toc.getCurrentChapter().value !== chapterValue) {
                that.toc.setCurrentChapterToValue(chapterValue);
            } else if (that.options.pageMode === 'split') {
                // We are in same chapter just navigate to starting (no effect in scroll mode)
                resetNavigation();
                that.selectionWrapper();
            }
            var elm = that.locate('chapterContent').find('[' + attributeName + '="' + attributeValue + '"]');
            if (elm.length !== 0) {
                if (that.options.pageMode === 'scroll') {
                    that.locate('bookContainer').scrollTop(elm.offset().top - that.locate('chapterContent').offset().top);
                } else if (that.options.pageMode === 'split') {
                    // forward until our element is visible
                    while (!elm.is(':visible')) {
                        that.next();
                    }
                }
            } else {
                fluid.epubReader.utils.showNotification('Unable to find element', 'error');
            }
            elm.focus();
        };

        that.selectionWrapper = function () {
            deactivateSelection();
            if (that.options.pageMode === 'split') {
                that.locate('chapterContent').find(':hidden').show();
                var toHide = [],
                    ret = createSelection(that.locate('chapterContent').children().first(), toHide, that.locate('chapterContent').offset().top),
                    i = 0;
                for (i = 0; i < toHide.length; i = i + 1) {
                    toHide[i].hide();
                    toHide[i].find('*').hide();
                }
                updateProgressbar();
                if (that.options.autoActivate) {
                    activateSelection();
                }
                that.locate('bookContainer').focus();
                return ret;
            } else if (that.options.pageMode === 'scroll') {
                if (that.options.autoActivate) {
                    activateSelection();
                }
                that.locate('bookContainer').focus();
                return true;
            }
        };

        that.saveChapter = function (chapterPath) {
            if (chapterPath !== undefined) {
                deactivateSelection();
                removeAllNotes();
                that.search.removeHighlight();
                that.locate('chapterContent').find(':hidden').show();
                that.events.onSaveReady.fire(chapterPath, that.locate('chapterContent').html());
            }
        };

        that.savePreviousChapter = function () {
            that.saveChapter(that.toc.getPreviousSelection());
        };

        that.saveCurrentChapter = function () {
            that.saveChapter(that.toc.getCurrentChapter().value);
            // restore hidden element if any
            if (that.options.pageMode === 'split') {
                that.selectionWrapper();
            }
        };

        that.saveAll = function () {
            that.saveCurrentChapter();
            that.events.onFileSave.fire('bookmark.json', JSON.stringify(that.bookmarks.getAllBookmarks()));
            that.events.onFileSave.fire('notes.json', JSON.stringify(that.notes.getAllNotes()));
        };

        that.loadChapter = function (chapter) {
            that.savePreviousChapter();
            var chapterElem = that.locate('chapterContent');
            resetNavigation();
            chapterElem.html(chapter.content);
            that.locate('chapterStyle').html(chapter.styles);

            chapterElem.find('img').css({
                'max-width': that.options.constraints.maxImageWidth + 'px',
                'max-height': that.options.constraints.maxImageHeight + 'px',
                'height': 'auto',
                'width': 'auto'
            });

            // Wrapping non-element text in <div>
            chapterElem.find('*').each(function () {
                if ($(this).children().length !== 0) {
                    $(this).contents().filter(function () {
                        if (this.nodeType === 3 && $.trim(this.nodeValue) !== '') {
                            return true;
                        }
                        return false;
                    }).wrap('<div/>');
                }
            });

            /*
             waitForImages jQuery Plugin is a being used because of a bug in .load method of jquery
             .load method is not accurate and fails for cached images case.
             We need to calculate height of chapter (including height of images)
             in order to navigate inside the chapter
             */
            chapterElem.waitForImages(function () {
                currentChapterHeight = getCurrentPageHeight();
                that.attachAllNotes();
                that.selectionWrapper();
                if (that.options.pageMode === 'scroll') {
                    that.locate('bookContainer').scrollTop(0);
                }
                // To resume pending search if any
                if (isSavedState === true) {
                    isSavedState = false;
                    // TODO - this created a selectable bug
                    continueSearch(savedQuery, savedState);
                }
            });
            return false;
        };

        that.next = function () {
            var ret = true;
            if (that.options.pageMode === 'split') {
                // Book keeping for previous page stills
                pagination.push({from: currentSelection.from, to: currentSelection.to});
                currentSelection.from = currentSelection.to + 1;
                currentSelection.to = currentSelection.from + that.options.maxSplitModePageHeight;
                if (currentSelection.from < currentChapterHeight) {
                    if (that.selectionWrapper() === false) {
                        ret = that.next();
                    }
                } else {
                    ret = that.next_chapter();
                }
            } else if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(that.locate('bookContainer').scrollTop() + that.options.scrollSpeed);
                // continuous scroll till the end of book
                if ((that.locate('bookContainer')[0].offsetHeight + that.locate('bookContainer').scrollTop()) >= that.locate('bookContainer')[0].scrollHeight) {
                    ret = that.next_chapter();
                }
            }
            return ret;
        };

        that.previous = function () {
            var ret = true;
            if (that.options.pageMode === 'split') {
                currentSelection = pagination.pop();
                if (currentSelection !== undefined && currentSelection.to > 0) {
                    if (that.selectionWrapper() === false) {
                        ret = that.previous();
                    }
                } else {
                    currentSelection = {};
                    ret = that.previous_chapter();
                }
            } else if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').scrollTop(that.locate('bookContainer').scrollTop() - that.options.scrollSpeed);
                // continuous scroll till the beginning  of book
                if (that.locate('bookContainer').scrollTop() <= 0) {
                    currentSelection = {};
                    ret = that.previous_chapter();
                    that.locate('bookContainer').scrollTop(that.locate('bookContainer')[0].scrollHeight - that.locate('bookContainer')[0].offsetHeight);
                }
            }
            return ret;
        };

        that.next_chapter = function () {
            if (that.toc.isLast()) {
                return false;
            }
            if (savedQuery !== '') {
                isSavedState = true;
            }
            that.toc.setCurrentSelectionToIndex(that.toc.currentSelectPosition() + 1);
            return true;
        };

        that.previous_chapter = function () {
            if (that.toc.isFirst()) {
                return false;
            }
            that.toc.setCurrentSelectionToIndex(that.toc.currentSelectPosition() - 1);
            return true;
        };

        that.addBookmark = function (bookmarkTitle, bookmarkSelectable) {
            var cloneElm = bookmarkSelectable.filter('*').removeAttr('tabindex').clone(),
                uId;

            if (fluid.epubReader.utils.hasAttribute(bookmarkSelectable, 'bookmarkkey') && that.bookmarks.findBookmarkPositionByKey(bookmarkSelectable.attr('bookmarkkey')) !== -1) {
                // Has a valid bookmark attached
                return false;
            }
            uId = fluid.epubReader.utils.getUniqueId();
            bookmarkSelectable.attr('bookmarkkey', uId);
            return that.bookmarks.addBookmark({
                bookmarkTitle: bookmarkTitle,
                bookmarkChapter: that.toc.getCurrentChapter(),
                bookmarkedItemHTML: $('<div/>').append(cloneElm).html(),
                bookmarkedItemKey: uId
            });
        };

        that.addNote = function (noteId, noteText, noteAnchor) {
            var uId;
            if (fluid.epubReader.utils.hasAttribute(noteAnchor, 'notekey') && that.notes.findBookmarkPositionByKey(noteAnchor.attr('notekey')) !== -1) {
                // Has a valid bookmark attached
                return false;
            }
            uId  = fluid.epubReader.utils.getUniqueId();
            noteAnchor.attr('notekey', uId);
            return that.notes.addNote({
                noteId: noteId,
                noteChapter: that.toc.getCurrentChapter(),
                notedText: noteText,
                notedItemKey: uId
            }, noteAnchor);
        };

        that.attachAllNotes = function () {
            that.notes.attachNotes(that.locate('chapterContent').find('[notekey]'), that.toc.getCurrentChapter().value);
        };
        // supports valid regex search in forward direction
        that.searchNext = function (query) {
            var startState = {};
            startState.chapterPath =  that.toc.getCurrentChapterPath();
            startState.to = currentSelection.to;
            startState.from = currentSelection.from;
            savedQuery = query;
            continueSearch(query, startState);
        };
    };

})(jQuery, fluid_1_4);
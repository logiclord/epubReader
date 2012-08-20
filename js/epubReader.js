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

    /* Add fluid logging */
    //fluid.setLogging(true);

    /* TinyMCE Editor Component using Rich Text Inline Edit API */
    fluid.defaults('fluid.epubReader.bookHandler.editor', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            editActivationButton : '{epubReader}.options.selectors.editActivationButton',
            chapterContent : '{epubReader}.options.selectors.chapterContent',
            editorSaveButton: '{epubReader}.options.selectors.editorSaveButton',
            editorCancelButton: '{epubReader}.options.selectors.editorCancelButton',
            chapterStyle: '{epubReader}.options.selectors.chapterStyle',
            chapterStyleElement: '{epubReader}.options.selectors.chapterStyleElement'
        },
        width: '100%',
        height: 525,
        finalInitFunction: 'fluid.epubReader.bookHandler.editor.finalInit'
    });

    fluid.epubReader.bookHandler.editor.finalInit = function (that) {

        var makeButtons = function (editor) {
                $(that.options.selectors.editorSaveButton, editor.container).click(function () {
                    editor.finish();
                    return false;
                });

                $(that.options.selectors.editorCancelButton, editor.container).click(function () {
                    editor.cancel();
                    return false;
                });
            },
            // Create a TinyMCE-based Rich Inline Edit component.
            tinyEditor = fluid.inlineEdit.tinyMCE(that.container, {
                tinyMCE: {
                    width: that.options.width,
                    height: that.options.height,
                    theme: 'advanced',
                    theme_advanced_toolbar_location : 'top'
                },
                strings: {
                    // To hide edit button placed just above the editing region
                    textEditButton: ''
                },
                defaultViewText: '',
                listeners: {
                    onBeginEdit: function () {
                        // disable edit button
                        that.locate('editActivationButton').attr('disabled', 'disabled');
                        /*
                         A workaround for TinyMCE issue
                         Details - TinyMCE select all visible elements and make them available for editing
                         irrespective of the fact that some ancestor of element might be hidden.

                        that.locate('chapterContent').find(':hidden').each(function () {
                            $(this).find('*').hide();
                        });
                         */
                        // Initialize TinyMCE editor with updated chapter content
                        tinyEditor.updateModelValue(that.locate('chapterContent').html(), null);
                    },
                    afterInitEdit: function (editor) {
                        // Apply current chapter styles to TinyMCE editor
                        editor.dom.addClass(editor.dom.select('body'), that.options.selectors.chapterStyleElement.slice(1));
                        editor.dom.add(editor.dom.select('head'), 'style', {type: 'text/css'}, that.locate('chapterStyle').find('style').text());
                    },
                    afterFinishEdit: function (newValue, oldValue, editNode, viewNode) {
                        // enable edit button
                        that.locate('editActivationButton').removeAttr('disabled');
                    }
                },
                useTooltip: false
            });
        makeButtons(tinyEditor);

        that.attachEditor = function () {
            tinyEditor.edit();
        };
        /* Attach click handler for custom edit button */
        that.locate('editActivationButton').click(function () {
            that.attachEditor();
        });
    };

    fluid.defaults('fluid.epubReader.bookHandler.parser', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            contentTitle: '{bookHandler}.options.selectors.contentTitle',
            tocSelector: '{bookHandler}.options.selectors.tocSelector'
        },
        epubVersion: 2,
        finalInitFunction: 'fluid.epubReader.bookHandler.parser.finalInit'
    });

    fluid.epubReader.bookHandler.parser.finalInit = function (that) {

        var oebps_dir = '',
            opf_file = '',
            ncx_file = '';

        /* Open the container file to find the resources */
        that.getContainerFile = function (f) {

            opf_file = $(f).find('rootfile').attr('full-path');
            // Get the OEpBS dir, if there is one
            if (opf_file.indexOf('/') !== -1) {
                oebps_dir = opf_file.substr(0, opf_file.lastIndexOf('/'));
            }
            return opf_file;
        };

        /* Open the TOC, get the first item and open it */
        that.getTOC = function (f) {
            var table = {
                names: [],
                values: []
            }, nav_tag, content_tag, text_tag;

            // ePub 2 compatibility to parse toc.ncx file
            if (that.options.epubVersion === 2) {

                // Some ebooks use navPoint while others use ns:navPoint tags
                nav_tag = 'ns\\:navPoint';
                content_tag = 'ns\\:content';
                text_tag = 'ns\\:text';

                if ($(f).find('ns\\:navPoint').length === 0) {
                    nav_tag = 'navPoint';
                    content_tag = 'content';
                    text_tag = 'text';
                }

                $(f).find(nav_tag).each(
                    function () {
                        var s = $(this).find(text_tag + ':first').text(),
                            a = oebps_dir + '/' + $(this).find(content_tag).attr('src');

                        // If 's' has a parent navPoint, indent it
                        if ($(this).parent()[0].tagName.toLowerCase() === nav_tag) {
                            s = '&nbsp;&nbsp;' + s;
                        }
                        table.names.push(s);
                        table.values.push(a);
                    }
                );
            }

            // ePub 3 compatibility to parse toc.xhtml file
            if (that.options.epubVersion === 3) {
                $(f).filter('nav[epub:type=\'toc\']').find('li').each(
                    function () {
                        var s = $(this).find('a:first').text(),
                            a = oebps_dir + '/' + $(this).find('a:first').attr('href');

                        // If 's' has a parent navPoint, indent it
                        if ($(this).parent().parent()[0].tagName.toLowerCase() === 'li') {
                            s = '&nbsp;&nbsp;' + s;
                        }
                        table.names.push(s);
                        table.values.push(a);
                    }
                );
            }

            return {table : table, currentSelection : table.values[0]};
        };

        /* Open the OPF file and read some useful metadata from it */
        that.opf = function (f) {

            // Get the document title
            var title = $(f).find('title').text(), // Safari
                author = $(f).find('creator').text(),
                // Get the NCX
                opf_item_tag = 'opf\\:item',
                epub_version_tag = 'opf\\:package';

            that.locate('contentTitle').html(title + ' by ' + author);

            // Firefox
            if (title === null || title === '') {
                that.locate('contentTitle').html($(f).find('dc\\:title').text() + ' by ' + $(f).find('dc\\:creator').text());
            }


            if ($(f).find('opf\\:item').length === 0) {
                opf_item_tag = 'item';
                epub_version_tag = 'package';
            }

            that.options.epubVersion = parseInt($('<div/>').append($(f)).find(epub_version_tag).attr('version'), 10);

            $(f).find(opf_item_tag).each(function () {
                // Cheat and find the first file ending in NCX
                // modified to include ePub 3 support
                if ($(this).attr('href').indexOf('.ncx') !== -1 || $(this).attr('id').toLowerCase() === 'toc') {
                    ncx_file = oebps_dir + '/' + $(this).attr('href');
                }
            });
            return ncx_file;
        };
    };

    fluid.defaults('fluid.epubReader.bookHandler', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        components: {
            parser: {
                type: 'fluid.epubReader.bookHandler.parser',
                container: '{bookHandler}.container'
            },
            navigator: {
                type: 'fluid.epubReader.bookHandler.navigator',
                container: '{bookHandler}.container'
            },
            editor: {
                type: 'fluid.epubReader.bookHandler.editor',
                container: '{bookHandler}.container'
            }
        },
        selectors: {
            contentTitle: '{epubReader}.options.selectors.contentTitle',
            remaining: '{epubReader}.options.selectors.remaining',
            chapterStyle: '{epubReader}.options.selectors.chapterStyle',
            chapterContent: '{epubReader}.options.selectors.chapterContent',
            tocSelector: '{epubReader}.options.selectors.tocSelector',
            bookContainer: '{epubReader}.options.selectors.bookContainer',
            addBookmarkButton: '{epubReader}.options.selectors.addBookmarkButton',
            addNoteButton: '{epubReader}.options.selectors.addNoteButton',
            nextButton: '{epubReader}.options.selectors.nextButton',
            previousButton: '{epubReader}.options.selectors.previousButton',
            nextChapterButton: '{epubReader}.options.selectors.nextChapterButton',
            previousChapterButton: '{epubReader}.options.selectors.previousChapterButton',
            downloadButton: '{epubReader}.options.selectors.downloadButton',
            searchField: '{epubReader}.options.selectors.searchField',
            searchForm: '{epubReader}.options.selectors.searchForm',
            searchButton: '{epubReader}.options.selectors.searchButton'
        },
        events: {
            onUIOptionsUpdate: null,
            onPageModeRestore: null,
            onDownloadRequest: null
        },
		keyboardShortcut: {
			bookmarkKey: '{epubReader}.options.keyboardShortcut.bookmarkKey',
			noteKey: '{epubReader}.options.keyboardShortcut.noteKey',
			nextNavigationKey: '{epubReader}.options.keyboardShortcut.nextNavigationKey',
			previousNavigationKey: '{epubReader}.options.keyboardShortcut.previousNavigationKey',
			nextChapterNavigationKey: '{epubReader}.options.keyboardShortcut.nextChapterNavigationKey',
			previousChapterNavigationKey: '{epubReader}.options.keyboardShortcut.previousChapterNavigationKey',
			editKey: '{epubReader}.options.keyboardShortcut.editKey'
		},
        listeners: {
            onDownloadRequest: '{filefacilitator}.downloadEpubFile'
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.finalInit'
    });

    fluid.epubReader.bookHandler.finalInit = function (that) {

        var bookmarkKeyboardHandler =  function (e) {
            var code = e.keyCode || e.which;
            if (code  === that.options.keyboardShortcut.bookmarkKey && e.shiftKey) {
                // prevent input texbox to be filled with B
                e.preventDefault();
                that.addBookmarkHandler();
            }
        },
            notesKeyboardHandler =  function (e) {
                var code = e.keyCode || e.which;
                if (code  ===  that.options.keyboardShortcut.noteKey  && e.shiftKey) {
                    // prevent input texbox to be filled with N
                    e.preventDefault();
                    that.addNoteHandler();
                }
            };

        // keyboard accessibility for reading region
        that.locate('bookContainer').fluid('tabbable');
        // autofocus on book container
        /*
        that.locate('bookContainer').focus(function () {
            $('html, body').animate({ scrollTop: $(this).offset().top }, 500);
        });
        */
        //  add bookmark button click event
        that.locate('addBookmarkButton').click(function (evt) {
            that.addBookmarkHandler();
        });
        // notes add button
        that.locate('addNoteButton').click(function (evt) {
            that.addNoteHandler();
        });
        // next button event for navigation
        that.locate('nextButton').click(function (evt) {
            that.navigator.next();
        });
        // previous button event for navigation
        that.locate('previousButton').click(function (evt) {
            that.navigator.previous();
        });
        // next chapter button event for navigation
        that.locate('nextChapterButton').click(function (evt) {
            that.navigator.next_chapter();
        });
        //previous chapter button event for navigation
        that.locate('previousChapterButton').click(function (evt) {
            that.navigator.previous_chapter();
        });
        that.locate('searchForm').submit(function (evt) {
            evt.preventDefault();
            that.searchHandler();
        });
        that.locate('searchButton').click(function (evt) {
            evt.preventDefault();
            that.searchHandler();
        });
        //download book click handler
        that.locate('downloadButton').click(function (evt) {
            // save any pending changes in current chapter
            fluid.epubReader.utils.showNotification('Please Wait', 'info', 1000);
            $(this).attr('disabled', 'disabled');
            that.navigator.saveAll();
            that.events.onDownloadRequest.fire();
            $(this).removeAttr('disabled');
            fluid.epubReader.utils.showNotification('Download Available', 'info');
        });
        // shift + keys for navigation and edit
        that.locate('bookContainer').bind('keydown', function (e) {
            var code = e.keyCode || e.which;
            if (code  === that.options.keyboardShortcut.nextNavigationKey  && e.shiftKey) {
                that.navigator.next();
            }
            if (code  === that.options.keyboardShortcut.previousNavigationKey  && e.shiftKey) {
                that.navigator.previous();
            }
            if (code  === that.options.keyboardShortcut.nextChapterNavigationKey  && e.shiftKey) {
                that.navigator.next_chapter();
            }
            if (code  === that.options.keyboardShortcut.previousChapterNavigationKey  && e.shiftKey) {
                that.navigator.previous_chapter();
            }
            if (code  === that.options.keyboardShortcut.editKey  && e.shiftKey) {
                that.editor.attachEditor();
            }
        });

        // to activate individual elements
        that.locate('bookContainer').fluid('activatable',  function (evt) {
            that.locate('bookContainer').fluid('selectable', {
                selectableSelector: that.options.selectors.chapterContent + ' :visible',
                onSelect: function (evt) {
                    that.locate('bookContainer').find(evt).bind('keydown', bookmarkKeyboardHandler);
                    that.locate('bookContainer').find(evt).bind('keydown', notesKeyboardHandler);
                },
                onUnselect: function (evt) {
                    that.locate('bookContainer').find(evt).unbind('keydown', bookmarkKeyboardHandler);
                    that.locate('bookContainer').find(evt).unbind('keydown', notesKeyboardHandler);
                }
            });

        });

        that.searchHandler = function () {
            that.navigator.searchNext(that.locate('searchField').val());
        };

        that.addNoteHandler = function () {
            var tempForm,
                currentSelectable,
                dialogOffset;
            try {
                currentSelectable = that.locate('bookContainer').fluid('selectable.currentSelection');
            } catch (e) {
                console.log('Caught an exception for invalid note addition');
            }
            if (!currentSelectable) {
                fluid.epubReader.utils.showNotification('Please make a selection for note', 'error');
                return;
            }
            dialogOffset = currentSelectable.offset();
            tempForm =  fluid.epubReader.utils.createNoteForm();
            that.container.append(tempForm);

            fluid.epubReader.utils.attachForm(tempForm, {
                resizable: true,
                position: [dialogOffset.left, dialogOffset.top + currentSelectable.height()],
                buttons: {
                    'Create': function () {
                        var noteIdVal = $.trim(tempForm.find('input').val()),
                            noteTextVal = $.trim(tempForm.find('textarea').val());
                        console.log(noteIdVal +  " " + noteTextVal);
                        if (noteIdVal.length === 0 || noteTextVal.length === 0) {
                            fluid.epubReader.utils.showNotification('Incomplete Form', 'error');
                        } else {
                            if (that.navigator.addNote(noteIdVal, noteTextVal, currentSelectable)) {
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Note Added', 'success');
                            } else {
                                fluid.epubReader.utils.showNotification('Note already exist', 'error');
                            }
                        }
                    }
                },
                close: function () {
                    //restore focus back to selection
                    currentSelectable.focus();
                    tempForm.remove();
                }
            });
        };

        that.addBookmarkHandler = function () {
            var tempForm,
                currentSelectable,
                dialogOffset;
            try {
                currentSelectable = that.locate('bookContainer').fluid('selectable.currentSelection');
            } catch (e) {
                console.log('Caught an exception for invalid bookmark addition');
            }
            if (!currentSelectable) {
                fluid.epubReader.utils.showNotification('Please make a selection for bookmark', 'error');
                return;
            }
            dialogOffset = currentSelectable.offset();
            tempForm = fluid.epubReader.utils.createBookmarkForm();
            that.container.append(tempForm);

            fluid.epubReader.utils.attachForm(tempForm, {
                height: 90,
                width: 240,
                position: [dialogOffset.left, dialogOffset.top + currentSelectable.height()],
                buttons: {
                    'Create': function () {
                        var bookmarkTitle = $.trim($(this).find('input').val());
                        if (bookmarkTitle.length === 0) {
                            fluid.epubReader.utils.showNotification('Please enter an identifier', 'error');
                        } else {
                            if (that.navigator.addBookmark(bookmarkTitle, currentSelectable)) {
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Bookmark Added', 'success');
                            } else {
                                fluid.epubReader.utils.showNotification('This Bookmark already exist', 'error');
                            }
                        }
                    }
                },
                close: function () {
                    //restore focus back to selection
                    currentSelectable.focus();
                    tempForm.remove();
                }
            });
        };
    };

    fluid.defaults('fluid.epubReader', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        components: {
            filefacilitator: {
                type: 'fluid.epubReader.fileFacilitator',
                options: {
                    listeners: {
                        afterEpubReady: '{epubReader}.parseEpub'
                    }
                }
            },
            bookhandle: {
                type: 'fluid.epubReader.bookHandler',
                container: '{epubReader}.container'
            },
            uiController: {
                type: 'fluid.epubReader.uiController'
            }
        },
        selectors: {
            contentTitle: '.flc-epubReader-chapter-title',
            remaining: '.flc-epubReader-progressIndicator-completed',
            remainingWrapper: '.fl-epubReader-progressIndicator',
            chapterStyle: '.flc-epubReader-chapter-styles',
            chapterStyleElement: '.flc-epubReader-chapter-StyleElement',
            chapterContent: '.flc-epubReader-chapter-content',
            tocSelector: '.flc-epubReader-toc',
            tocContainer: '.fl-epubReader-tocContainer',
            bookmarkContainer: '.fl-epubReader-bookmarkContainer',
            bookmarkRow: '.flc-epubReader-bookmark-tableRow',
            bookmarkTitle : '.flc-epubReader-bookmark-title',
            bookmarkChapter: '.flc-epubReader-bookmark-chapter',
            bookmarkEdit: '.flc-epubReader-bookmark-edit',
            bookmarkDelete: '.flc-epubReader-bookmark-delete',
            bookmarkGoTO: '.flc-epubReader-bookmark-goTo',
            addBookmarkButton: '.flc-epubReader-addBookmark',
            notesContainer: '.fl-epubReader-notesContainer',
            noteRow: '.flc-epubReader-note-tableRow',
            noteId : '.flc-epubReader-note-id',
            noteChapter: '.flc-epubReader-note-chapter',
            noteEdit: '.flc-epubReader-note-edit',
            noteDelete: '.flc-epubReader-note-delete',
            addNoteButton: '.flc-epubReader-addNote',
            bookContainer: '.fl-epubReader-bookContainer',
            uiOptionsContainer: '.flc-epubReader-uiOptions-container',
            uiOptionsButton: '.fl-epubReader-uiOptions-button',
            navigationContainer: '.fl-epubReader-navigationContaniner',
            navigationButton: '.fl-epubReader-navigation-button',
            epubControls: '.flc-uiOptions-epub-controls',
            slidingTabsSelector: '.fl-epubReader-tabsPanel',
            nextButton: '.flc-epubReader-nextButton',
            previousButton: '.flc-epubReader-previousButton',
            nextChapterButton: '.flc-epubReader-nextChapterButton',
            previousChapterButton: '.flc-epubReader-previousChapterButton',
            editorSaveButton: '.flc-inlineEdit-saveButton',
            editorCancelButton: '.flc-inlineEdit-cancelButton',
            editActivationButton: '.flc-epubReader-editor-activateButton',
            downloadButton: '.flc-epubReader-downloadButton',
            searchForm: '.fl-epubReader-search-form',
            searchField: '.flc-epubReader-search-field',
            searchButton: '.flc-epubReader-search-button',
            searchResult: '.flc-epubReader-highlighted',
            currentSearchResult: '.flc-epubReader-highlighted-current'
        },
        uiOptionsTemplatePath: '../html/uiOptions/',
        events: {
            onReaderReady: null
        },
		keyboardShortcut: {
			bookmarkKey: 66,
			noteKey: 78,
			nextNavigationKey: 40,
			previousNavigationKey: 38,
			nextChapterNavigationKey: 39,
			previousChapterNavigationKey: 37,
			editKey: 69
		},
        strings: {
            uiOptionShowText: '+ Personalize',
            uiOptionHideText: '- Personalize',
            navigationShowText: '+ Manage',
            navigationHideText: '- Manage'
        },
        book: {
            epubPath: '../epubs/potter-tale-of-peter-rabbit-illustrations.epub',
            isBase64: false
        },
        constraints: {
            maxImageHeight: 400,
            maxImageWidth: 400
        },
        preInitFunction: 'fluid.epubReader.preInitFunction',
        finalInitFunction: 'fluid.epubReader.finalInit'
    });

    fluid.epubReader.preInitFunction = function (that) {
        that.parseEpub = function () {
            var opf_file = that.bookhandle.parser.getContainerFile(that.filefacilitator.getDataFromEpub('META-INF/container.xml')),
                ncx_file = that.bookhandle.parser.opf(that.filefacilitator.getDataFromEpub(opf_file));
            that.bookhandle.navigator.toc.setModel(that.bookhandle.parser.getTOC(that.filefacilitator.getDataFromEpub(ncx_file)));
            that.bookhandle.navigator.bookmarks.setModel(that.filefacilitator.getDataFromEpub('bookmark.json'));
            that.bookhandle.navigator.notes.setModel(that.filefacilitator.getDataFromEpub('notes.json'));
            that.events.onReaderReady.fire();
        };

        that.loadContent = function (page) {
            that.bookhandle.navigator.loadChapter(that.filefacilitator.preProcessChapter(that.filefacilitator.getDataFromEpub(page), that.filefacilitator.getFolder(page)));
        };
    };

    fluid.epubReader.finalInit = function (that) {
        // Parsing ebook onload
        // This is the trigger to get everything started in epubReader
        that.filefacilitator.getEpubFile(that.options.book.epubPath);
    };

})(jQuery, fluid_1_4);
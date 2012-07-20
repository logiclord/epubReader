// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    /* Add fluid logging */
    //fluid.setLogging(true);

    fluid.defaults('fluid.epubReader.bookHandler.parser', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            contentTitle: '.flc-epubReader-chapter-title'
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
                container: '{bookHandler}.container',
                options: {
                    selectors: {
                        contentTitle: '{bookHandler}.options.selectors.contentTitle',
                        tocSelector: '{bookHandler}.options.selectors.tocSelector'
                    }
                }
            },
            navigator: {
                type: 'fluid.epubReader.bookHandler.navigator',
                container: '{bookHandler}.container',
                options: {
                    selectors: {
                        remaining: '{bookHandler}.options.selectors.remaining',
                        chapterStyle: '{bookHandler}.options.selectors.chapterStyle',
                        chapterContent: '{bookHandler}.options.selectors.chapterContent',
                        bookContainer: '{bookHandler}.options.selectors.bookContainer',
                        remainingWrapper: '{epubReader}.options.selectors.remainingWrapper'
                    }
                }
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
            addNoteButton: '{epubReader}.options.selectors.addNoteButton'
        },
        events: {
            onUIOptionsUpdate: null
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.finalInit'
    });

    fluid.epubReader.bookHandler.finalInit = function (that) {

        var bookmarkKeyboardHandler =  function (e) {
            var code = e.keyCode || e.which;
            if (code  === 66 && e.shiftKey) {
                // prevent input texbox to be filled with B
                e.preventDefault();
                that.addBookmarkHandler();
            }
        },
            notesKeyboardHandler =  function (e) {
                var code = e.keyCode || e.which;
                if (code  === 78 && e.shiftKey) {
                    // prevent input texbox to be filled with N
                    e.preventDefault();
                    that.addNoteHandler();
                }
            };
        // keyboard accessibility for reading region
        that.locate('bookContainer').fluid('tabbable');
        //  add bookmark button click event
        that.locate('addBookmarkButton').click(function (evt) {
            that.addBookmarkHandler();
        });
        // notes add button
        that.locate('addNoteButton').click(function (evt) {
            that.addNoteHandler();
        });
        // autofocus on book container
        that.locate('bookContainer').focus(function () {
            $('html, body').animate({ scrollTop: $(this).offset().top }, 500);
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

        // shift + arrow keys for navigation
        that.locate('bookContainer').bind('keydown', function (e) {
            var code = e.keyCode || e.which;
            if (code  === 40 && e.shiftKey) {
                that.navigator.next();
            }
            if (code  === 38 && e.shiftKey) {
                that.navigator.previous();
            }
            if (code  === 39 && e.shiftKey) {
                that.navigator.next_chapter();
            }
            if (code  === 37 && e.shiftKey) {
                that.navigator.previous_chapter();
            }
        });

        that.addNoteHandler = function () {
            var tempForm = $('<div/>'),
                noteId = $('<input/>').attr('type', 'text'),
                noteText = $('<textarea/>'),
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
            tempForm.attr('title', 'Enter Note Details');
            tempForm.append(noteId);
            tempForm.append('<br><br>');
            fluid.epubReader.utils.setTitleToolTip(noteId, 'Note Title');
            fluid.epubReader.utils.setTitleToolTip(noteText, 'Note Text');
            tempForm.append(noteText);
            that.container.append(tempForm);

            tempForm.dialog({
                autoOpen: true,
                modal: false,
                draggable: false,
                width: 'auto',
                maxHeight: 400,
                maxWidth: 500,
                resizable: true,
                position: [dialogOffset.left, dialogOffset.top + currentSelectable.height()],
                show: 'slide',
                hide: 'slide',
                buttons: {
                    'Create': function () {
                        var noteIdVal = $.trim(noteId.val()),
                            noteTextVal = $.trim(noteText.val());
                        if (noteIdVal.length === 0 || noteTextVal.length === 0) {
                            fluid.epubReader.utils.showNotification('Incomplete Form', 'error');
                        } else {
                            if (that.navigator.addNote(noteIdVal, noteTextVal, currentSelectable)) {
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Note Added', 'success');
                            } else {
                                fluid.epubReader.utils.showNotification('Note identifier already exist', 'error');
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
                    //restore focus back to selection
                    currentSelectable.focus();
                    tempForm.remove();
                }
            });
        };

        that.addBookmarkHandler = function () {
            var tempForm = $('<div/>'),
                inputBox = $('<input/>'),
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
            tempForm.attr('title', 'Enter Bookmark Identifier');
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
                position: [dialogOffset.left, dialogOffset.top + currentSelectable.height()],
                show: 'slide',
                hide: 'slide',
                buttons: {
                    'Create': function () {
                        var bookmarkId = $.trim($(this).find('input').val());
                        if (bookmarkId.length === 0) {
                            fluid.epubReader.utils.showNotification('Please enter an identifier', 'error');
                        } else {
                            if (that.navigator.addBookmark(bookmarkId, currentSelectable)) {
                                $(this).dialog('close');
                                fluid.epubReader.utils.showNotification('Bookmark Added', 'success');
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
            chapterContent: '.flc-epubReader-chapter-content',
            tocSelector: '.flc-epubReader-toc',
            tocContainer: '.fl-epubReader-tocContainer',
            bookmarkContainer: '.fl-epubReader-bookmarkContainer',
            bookmarkRow: '.flc-epubReader-bookmark-tableRow',
            bookmarkId : '.flc-epubReader-bookmark-id',
            bookmarkChapter: '.flc-epubReader-bookmark-chapter',
            bookmarkEdit: '.flc-epubReader-bookmark-edit',
            bookmarkDelete: '.flc-epubReader-bookmark-delete',
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
            slidingTabsSelector: '.fl-epubReader-tabsPanel'
        },
        strings: {
            uiOptionShowText: '+ UI Options',
            uiOptionHideText: '- UI Options',
            navigationShowText: '+ Navigation',
            navigationHideText: '- Navigation'
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
            that.bookhandle.navigator.setTOCModel(that.bookhandle.parser.getTOC(that.filefacilitator.getDataFromEpub(ncx_file)));
        };

        that.loadContent = function (page) {
            that.bookhandle.navigator.load_content(that.filefacilitator.preProcessChapter(that.filefacilitator.getDataFromEpub(page), that.filefacilitator.getFolder(page)));
        };
    };

    fluid.epubReader.finalInit = function (that) {
        // Parsing ebook onload
        that.filefacilitator.getEpubFile(that.options.book.epubPath);
    };

})(jQuery, fluid_1_4);
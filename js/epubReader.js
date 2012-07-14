// Declare dependencies
/*global fluid_1_4:true, jQuery, JSZip, JSZipBase64*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    //fluid.setLogging(true);

    fluid.defaults('fluid.epubReader.bookHandler.parser', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            toc: '#toc',
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
        that.toc = function (f) {

            // ePub 2 compatibility to parse toc.ncx file
            if (that.options.epubVersion === 2) {

                // Some ebooks use navPoint while others use ns:navPoint tags
                var nav_tag = 'ns\\:navPoint',
                    content_tag = 'ns\\:content',
                    text_tag = 'ns\\:text';

                if ($(f).find('ns\\:navPoint').length === 0) {
                    nav_tag = 'navPoint';
                    content_tag = 'content';
                    text_tag = 'text';
                }

                $(f).find(nav_tag).each(
                    function () {
                        var s = $('<span/>').text($(this).find(text_tag + ':first').text()),
                            a = $('<a/>').attr('href', oebps_dir + '/' + $(this).find(content_tag).attr('src'));

                        // If 's' has a parent navPoint, indent it
                        if ($(this).parent()[0].tagName.toLowerCase() === nav_tag) {
                            s.addClass('indent');
                        }
                        s.appendTo(a);
                        a.appendTo($('<li/>').appendTo(that.locate('toc')));
                    }
                );
            }

            // ePub 3 compatibility to parse toc.xhtml file
            if (that.options.epubVersion === 3) {
                $(f).filter('nav[epub:type=\'toc\']').find('li').each(
                    function () {
                        var s = $('<span/>').text($(this).find('a:first').text()),
                            a = $('<a/>').attr('href', oebps_dir + '/' + $(this).find('a:first').attr('href'));

                        // If 's' has a parent navPoint, indent it
                        if ($(this).parent().parent()[0].tagName.toLowerCase() === 'li') {
                            s.addClass('indent');
                        }
                        s.appendTo(a);
                        a.appendTo($('<li/>').appendTo(that.locate('toc')));
                    }
                );
            }

            // Click on the desired first item link
            that.locate('toc').find('a:eq(0)').click();
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

    fluid.defaults('fluid.epubReader.bookHandler.navigator', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        constraints: {
            maxImageHeight: '{epubReader}.options.constraints.maxImageHeight',
            maxImageWidth: '{epubReader}.options.constraints.maxImageWidth'
        },
        pageMode: 'split',
        selectors: {
            remaining: '.flc-epubReader-progressIndicator-completed',
            chapterStyle: '.flc-epubReader-chapter-styles',
            chapterContent: '.flc-epubReader-chapter-content',
            toc: '#toc',
            bookContainer: '.fl-epubReader-bookContainer',
            remainingWrapper: '.fl-epubReader-progressIndicator'
        },
        events: {
            onContentLoad: null,
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

        that.requestContentLoad = function (selection) {
            console.log('inside new selection');
            console.log(selection);
            var newMode = selection.pageMode;
            if (that.options.pageMode === 'scroll' && newMode === 'scroll') {
                return;
            } else if (that.options.pageMode === 'split' && newMode === 'split') {
                // readjust current chapter pages and bounce to first page
                that.locate('toc').find('.selected').click();
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
                that.locate('toc').find('.selected').click();
            }
        };
    };

    fluid.epubReader.bookHandler.navigator.finalInit = function (that) {
        var abs_container_bottom = 600, // height of TOC widget
            current_selection_height = 500,
            current_chapter = {},
            current_selection = {},//= {from : 0, to : current_selection_height};
            pagination = []; // to keep track about forward and backward pagination ranges

        // global variable
        that.options.pageMode = 'split'; // scroll is also possible

        that.locate('toc').find('a').live('click', function (event) {
            event.preventDefault();
            var page = $(this).attr('href');
            that.locate('toc').find('.selected').attr('class', 'unselected');
            $(this).attr('class', 'selected');
            that.events.onContentLoad.fire(page);
        });

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
                that.locate('bookContainer').fluid("activate");
                return ret;
            } else if (that.options.pageMode === 'scroll') {
                that.locate('bookContainer').fluid("activate");
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
            that.locate('chapterContent').find('img').css({'max-width': '400px', 'max-height': '300px', 'height': 'auto', 'width': 'auto'});

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
            } else if (that.options.pageMode === 'scroll' && (that.locate('bookContainer')[0].offsetHeight + that.locate('bookContainer').scrollTop())  >= that.locate('bookContainer')[0].scrollHeight) {
                // continuous scroll till the end of book
                that.next_chapter();
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
            } else if (that.options.pageMode === 'scroll' && that.locate('bookContainer').scrollTop() === 0) {
                // continous scroll till the beginning  of book
                current_selection = {};
                that.previous_chapter();
                that.locate('bookContainer').scrollTop(that.locate('bookContainer')[0].scrollHeight - that.locate('bookContainer')[0].offsetHeight);
            }
        };

        that.next_chapter = function () {

            if (that.locate('toc').find('a.selected').parent().next('li').length === 0) {
                return;
            }

            // Simulate a click event on the next chapter after the selected one
            that.locate('toc').find('a.selected').parent().next('li').find('a').click();

            // How far is the selected chapter now from the bottom border?
            var selected_position = that.locate('toc').find('a.selected').position().top,
                height_of_toc = that.locate('toc').find('a.selected').height();

            if (selected_position - (height_of_toc * 2) > abs_container_bottom / 2) {
                // Hide the first visible chapter item
                that.locate('toc').find('a:visible:eq(0)').hide();
            }
        };

        that.previous_chapter = function () {
            if (that.locate('toc').find('a.selected').parent().prev('li').length === 0) {
                return;
            }

            // Simulate a click event on the next chapter after the selected one
            that.locate('toc').find('a.selected').parent().prev('li').find('a').click();

            // Have we hidden any chapters that we now want to show?
            that.locate('toc').find('a:visible:eq(0)').parent().prev('li').find('a').show();
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
                        toc: '{bookHandler}.options.selectors.toc'
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
                        toc: '{bookHandler}.options.selectors.toc',
                        bookContainer: '{bookHandler}.options.selectors.bookContainer',
                        remainingWrapper: '{epubReader}.options.selectors.remainingWrapper'
                    },
                    listeners: {
                        onContentLoad: '{epubReader}.loadContent'
                    }
                }
            }
        },
        selectors: {
            contentTitle: '{epubReader}.options.selectors.contentTitle',
            remaining: '{epubReader}.options.selectors.remaining',
            chapterStyle: '{epubReader}.options.selectors.chapterStyle',
            chapterContent: '{epubReader}.options.selectors.chapterContent',
            toc: '{epubReader}.options.selectors.toc',
            bookContainer: '{epubReader}.options.selectors.bookContainer'
        },
        events: {
            onUIOptionsUpdate: null
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.finalInit'
    });

    fluid.epubReader.bookHandler.finalInit = function (that) {

        // keyboard accessibility experiment
        that.locate('bookContainer').fluid('tabbable');

        // autofocus on book container
        that.locate('bookContainer').focus(function () {
            $('html, body').animate({ scrollTop: $(this).offset().top }, 500);
        });

        // to activate individual elements
        that.locate('bookContainer').fluid("activatable",  function (evt) {
            that.locate('bookContainer').fluid("selectable", {
                selectableSelector: that.options.selectors.chapterContent + ' :visible'
            });
        });

        that.locate('bookContainer').bind('keydown', function (e) {
            var code = e.keyCode || e.which;
            if (code  === 40 && e.shiftKey) {
                that.navigator.next();
            }
            if (code  === 38 && e.shiftKey) {
                console.log('previous');
                that.navigator.previous();
            }
            if (code  === 39 && e.shiftKey) {
                that.navigator.next_chapter();
            }
            if (code  === 37 && e.shiftKey) {
                that.navigator.previous_chapter();
            }
        });

    };

    fluid.defaults('fluid.epubReader', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
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
            toc: '#toc',
            bookContainer: '.fl-epubReader-bookContainer',
            uiOptionsContainer: '.flc-epubReader-uiOptions-container',
            uiOptionsButton: '.fl-epubReader-uiOptions-button'
        },
        strings: {
            uiOptionShowText: '+ UI Options',
            uiOptionHideText: '- UI Options'
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
            that.bookhandle.parser.toc(that.filefacilitator.getDataFromEpub(ncx_file));
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
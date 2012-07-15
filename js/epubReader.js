// Declare dependencies
/*global fluid_1_4:true, jQuery*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

   // fluid.setLogging(true);

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
            };

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
            bookContainer: '{epubReader}.options.selectors.bookContainer'
        },
        events: {
            onUIOptionsUpdate: null
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.finalInit'
    });

    fluid.epubReader.bookHandler.finalInit = function (that) {

        // keyboard accessibility for reading region
        that.locate('bookContainer').fluid('tabbable');

        // autofocus on book container
        that.locate('bookContainer').focus(function () {
            $('html, body').animate({ scrollTop: $(this).offset().top }, 500);
        });

        // to activate individual elements
        that.locate('bookContainer').fluid('activatable',  function (evt) {
            that.locate('bookContainer').fluid('selectable', {
                selectableSelector: that.options.selectors.chapterContent + ' :visible'
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
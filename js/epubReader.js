// Declare dependencies
/*global fluid_1_5:true, jQuery, JSZip, JSZipBase64*/

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

   // fluid.setLogging(true);
    function useMSXHR() {
        return typeof ActiveXObject === 'function';
    }
    var epubReaderErrors = {
        XHRException: function (message) {
            var errors = {};
            errors.message = message;
            errors.name = 'XHRException';
            fluid.log(message, errors);
            alert(message);
        },
        InvalidParamException: function (message) {
            var errors = {};
            errors.message = message;
            errors.name = 'InvalidParamException';
            fluid.log(message, errors);
            alert(message);
        }
    };

    /*
     To facilitate file availability
     Detect and parse ePub 2 and 3
     Populate TOC (current in UI but it will be changed in next milestone)
     Parse CSS, Image and HTML content
     */

    fluid.defaults('fluid.JSZipWrapper', {
        gradeNames: ['fluid.littleComponent', 'autoInit'],
        isBase64: false,
        finalInitFunction: 'fluid.JSZipWrapper.finalInit'
    });

    fluid.JSZipWrapper.finalInit = function (that) {
        var unzip = new JSZip();

        that.epubLoad = function (data) {
            unzip.load(data, {base64: that.options.isBase64});
            //getDataFromEpub('META-INF/container.xml', container);
        };

        that.getZipText = function (filename) {
            return unzip.file(filename).asText();
        };

        that.getZipRawData = function (imgpath) {
            return unzip.file(imgpath).data;
        };

        that.encodeBase64 = function (data) {
            return JSZipBase64.encode(data);
        };
    };


    fluid.defaults('fluid.epubReader.fileFacilitator', {
        gradeNames: ['fluid.eventedComponent', 'autoInit'],
        components: {
            JSZipWrapper: {
                type: 'fluid.JSZipWrapper',
                options: {
                    isBase64: '{epubReader}.options.book.isBase64'
                }
            }
        },
        events: {
            afterEpubReady: null
        },
        finalInitFunction: 'fluid.epubReader.fileFacilitator.finalInit'
    });

    fluid.epubReader.fileFacilitator.finalInit = function (that) {

        that.getDataFromEpub = function (filename, callback) {
            if (!filename) {
                epubReaderErrors.InvalidParamException('Invalid filename : ' + filename + ' passed to getDataFromEpub');
                return null;
            }
            var answer;
            if (that.isImage(filename)) {
                answer = that.getImageFromEpub(filename);
            } else if (that.isCSS(filename)) {
                answer = that.getCSSFromEpub(filename);
            } else {
                answer = that.JSZipWrapper.getZipText(filename);
            }
            if (callback !== undefined) {
                callback(answer);
            }
            return answer; // to load page
        };

        that.getImageFromEpub = function (imgpath) {
            if (!imgpath) {
                epubReaderErrors.InvalidParamException('Invalid image path : ' + imgpath + ' passed to getImageFromEpub');
                return null;
            }
            return 'data:image/' + that.getExtension(imgpath) + ';base64,' + (that.JSZipWrapper.encodeBase64(that.JSZipWrapper.getZipRawData(imgpath)));
        };

        that.getFolder = function (filepath) {
            if (!filepath) {
                epubReaderErrors.InvalidParamException('Invalid filepath : ' + filepath + ' passed to getFolder');
                return null;
            }
            filepath = $.trim(filepath);
            var temp = filepath.split('/'),
                retpath = '',
                i = 0;
            for (i = 0; i < temp.length - 1; i = i + 1) {
                retpath = retpath + temp[i] + '/';
            }
            return retpath;
        };

        that.getCSSFromEpub = function (csspath) {
            if (!csspath) {
                epubReaderErrors.InvalidParamException('Invalid csspath  : ' + csspath + ' passed to getCSSFromEpub');
                return null;
            }
            var result = that.JSZipWrapper.getZipText(csspath),
                csslocation = that.getFolder(csspath);
            if (!result) {
                return '';
            }
            result = that.processCSS(result, csslocation);
            return result;
        };

        that.processCSS = function (result, csslocation) {
            if (!result) {
                return '';
            }
            result = result.replace(/url\((.*?)\)/gi, function (str, url) {
                if (/^data/i.test(url)) {
                    // Don't replace data strings as it is already in data URI form
                    return str;
                } else {
                    var dataUri = that.getImageFromEpub(csslocation + url);
                    return 'url(' + dataUri + ')';
                }
            });
            return result;
        };

        that.getExtension = function (filename) {
            if (!filename) {
                epubReaderErrors.InvalidParamException('Invalid filename  : ' + filename + ' passed to getExtension');
                return null;
            }
            return filename.split('.').pop();
        };

        that.isImage = function (src) {
            if (!src) {
                return false;
            }
            src = that.getExtension(src).toLowerCase();
            return src === 'jpg' || src === 'png' || src === 'jpeg' || src === 'gif';
        };

        that.isCSS = function (src) {
            if (!src) {
                return false;
            }
            return that.getExtension(src).toLowerCase() === 'css';
        };

        that.preProcessChapter = function (htmlCode, htmlFileLocation) {
            if (htmlCode === '') {
                return '';
            }

            var domCode = $(htmlCode),
                styleCode = $('<div/>');

            //  for each img tag in html code create an attribute original_src and set it to original source
            //  and modify src to dataURI using jszip

            domCode.find('img').each(function () {
                var src = $(this).attr('src');
                if (src !== false) {
                    $(this).attr('original_src', src);
                    $(this).attr('src', that.getImageFromEpub(htmlFileLocation + src));
                }
            });

            domCode = $('<div/>').append(domCode);

            // applying stylesheets of current chapter to our ebook
            // everything is going to be added to #content which will be overwritten for eah chapter
            // Hence no need to track stylesheets
            domCode.find('link').each(
                function () {
                    if ($(this).attr('type') === 'text/css') {
                        var inlineStyle = $('<style></style>');
                        inlineStyle.attr('type', 'text/css');
                        inlineStyle.attr('original_href', $(this).attr('href'));
                        inlineStyle.append(that.getCSSFromEpub(htmlFileLocation + $(this).attr('href')));
                        styleCode.append(inlineStyle);
                    }
                }
            );

            // remove head tags manually
            domCode.find('title').remove();
            domCode.find('link').remove();
            domCode.find('meta').remove();

            return { content: domCode.html(), styles: styleCode.html() };
        };

        that.getEpubFile = function (url) {
            var request = useMSXHR() ? new ActiveXObject('Msxml2.XmlHttp.6.0') : new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState === 1) {
                    if (request.overrideMimeType) {
                        request.overrideMimeType('text/plain; charset=x-user-defined');
                    }
                    request.send();
                }

                if (request.readyState === 4) {
                    if (request.status === 200) {
                        var data, j;
                        if (useMSXHR()) {
                            data = new VBArray(request.responseBody).toArray();
                            for (j = 0; j < data.length; j = j + 1) {
                                data[j] = String.fromCharCode(data[j]);
                            }
                            that.JSZipWrapper.epubLoad(data.join(''));
                            that.events.afterEpubReady.fire();
                            request.abort();
                        } else {
                            that.JSZipWrapper.epubLoad(request.responseText);
                            that.events.afterEpubReady.fire();
                        }
                    } else {
                        epubReaderErrors.XHRException('Failed to get file ' + url);
                        return null;
                    }
                }
            };
            request.open('GET', url, true);
        };
    };

    fluid.defaults('fluid.epubReader.bookHandler.parser', {
        gradeNames: ['fluid.viewComponent', 'autoInit'],
        selectors: {
            toc: '#toc',
            contentTitle: '#content-title'
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
        selectors: {
            remaining: '#remaining',
            chapterStyle: '#chapter_style',
            chapterContent: '#content',
            toc: '#toc'
        },
        events: {
            onContentLoad: null
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.navigator.finalInit'

    });

    fluid.epubReader.bookHandler.navigator.finalInit = function (that) {
        var abs_container_bottom = 600, // height of TOC widget
            current_selection_height = 500,
            current_chapter = {},
            current_selection = {},//= {from : 0, to : current_selection_height};
            pagination = []; // to keep track about forward and backward pagination ranges


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
            that.locate('chapterContent').find(':hidden').show();
            var toHide = [],
                ret = that.createSelection(that.locate('chapterContent'), toHide),
                i = 0;
            for (i = 0; i < toHide.length; i = i + 1) {
                toHide[i].hide();
            }
            that.updateProgressbar();
            return ret;
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

            //TODO Improve on load listener for already cached images
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
            return false;
        };

        that.next = function () {
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
        };

        that.previous = function () {
            current_selection = pagination.pop();
            if (current_selection !== undefined && current_selection.to > that.locate('chapterContent').offset().top) {
                if (that.selectionWrapper() === false) {
                    that.previous();
                }
            } else {
                current_selection = {};
                that.previous_chapter();
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
                        toc: '{bookHandler}.options.selectors.toc'
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
            toc: '{epubReader}.options.selectors.toc'
        },
        finalInitFunction: 'fluid.epubReader.bookHandler.finalInit'
    });

    fluid.epubReader.bookHandler.finalInit = function (that) {
        $(document).bind('keydown', function (e) {
            var code = e.keyCode || e.which;
            if (code === 39) { //  right
                that.navigator.next();
            }
            if (code === 37) { // left
                that.navigator.previous();
            }
            if (code === 40) { // down
                that.navigator.next_chapter();
            }
            if (code === 38) { // up
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
            }
        },
        selectors: {
            contentTitle: '#content-title',
            remaining: '#remaining',
            chapterStyle: '#chapter_style',
            chapterContent: '#content',
            toc: '#toc'
        },
        book: {
            epubPath: '../epubs/potter-tale-of-peter-rabbit-illustrations.epub',
            isBase64: false
        },
        constraints: {
            maxImageHeight: 300,
            maxImageWidth: 400
        },
        preInitFunction: 'fluid.epubReader.preInitFunction',
        finalInitFunction: "fluid.epubReader.finalInit"
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
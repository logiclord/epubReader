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
/*global fluid_1_4:true, jQuery, JSZip, JSZipBase64, XMLSerializer*/

/*
 To facilitate file availability
 Detect and parse ePub 2 and 3
 Parse CSS, Image and HTML content
 */

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

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
            var file = unzip.file(filename);
            if (file === undefined || file === null) {
                return '';
            }
            return file.asText();
        };

        that.getZipRawData = function (imgpath) {
            return unzip.file(imgpath).data;
        };

        that.encodeBase64 = function (data) {
            return JSZipBase64.encode(data);
        };
        that.saveFile = function (path, content) {
            unzip.file(path, content, {
                binary: false
            });
        };
        that.getZipContent = function () {
            return unzip.generate({
                compression: 'DEFLATE'
            });
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
        chapterStyleElement: '{epubReader}.options.selectors.chapterStyleElement',
        finalInitFunction: 'fluid.epubReader.fileFacilitator.finalInit',
        preInitFunction: 'fluid.epubReader.fileFacilitator.preInit'
    });

    fluid.epubReader.fileFacilitator.preInit = function (that) {
        that.downloadEpubFile = function () {
            // TODO - change extension to .epub instead of .zip and JSzip has a filename bug for Firefox
            // One solution is to use https://github.com/dcneiner/downloadify
            location.href = "data:application/zip;base64," + that.JSZipWrapper.getZipContent();
        };
        // For deleting Bookmarks and Notes in saved chapters
        that.deleteAttributeDeleteInFile = function (filePath, attributeName, attributeValue) {
            var rawChapter = $.parseXML(that.getDataFromEpub(filePath));
            $(rawChapter).find('[' + attributeName + '="' + attributeValue + '"]').removeAttr(attributeName);
            that.JSZipWrapper.saveFile(filePath, that.xmlToString(rawChapter));
        };

        that.saveFile = function (filePath, fileContent) {
            that.JSZipWrapper.saveFile(filePath, fileContent);
        };

        that.saveChapter = function (filepath, chapterContent) {
            var rawChapter = $.parseXML(that.getDataFromEpub(filepath));
            $(rawChapter).find('body').html(that.postProcessChapter(chapterContent));
            that.JSZipWrapper.saveFile(filepath, that.xmlToString(rawChapter));
        };
    };

    fluid.epubReader.fileFacilitator.finalInit = function (that) {
        that.xmlToString  = function (input) {
            var xmlString;
            if (window.ActiveXObject) {
                xmlString = input.xml;
            } else {
                xmlString = (new XMLSerializer()).serializeToString(input);
            }
            return xmlString;
        };

        // return a jQuery object of recovered html
        that.postProcessChapter = function (htmlContent) {
            htmlContent = $(htmlContent);
            htmlContent.wrap('div');
            // restoring image src attributes
            htmlContent.find('img').each(function () {
                $(this).attr('src', $(this).attr('original_src'));
                $(this).removeAttr('original_src');
            });
            return htmlContent;
        };

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
                i;
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
            result = result.replace(/^.*\{/gm, function (str) {
                return that.options.chapterStyleElement + '  ' + str;
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

            // Parsing xml file
            var domCode = $($.parseXML(htmlCode)),
                bodyElm = domCode.find('body'),
                headElm = domCode.find('head'),
                styleCode = $('<div/>');

            //  for each img tag in body code create an attribute original_src and set it to original source
            //  and modify src to dataURI using jszip
            bodyElm.find('img').each(function () {
                var src = $(this).attr('src');
                if (src !== false) {
                    $(this).attr('original_src', src);
                    $(this).attr('src', that.getImageFromEpub(htmlFileLocation + src));
                }
            });

            // applying stylesheets of current chapter to our ebook
            // everything is going to be added to .flc-epubReader-chapter-content which will be overwritten for eah chapter
            // Hence no need to track stylesheets
            headElm.find('link').each(
                function () {
                    if ($(this).attr('type') === 'text/css') {
                        var inlineStyle = $('<style></style>');
                        inlineStyle.attr('type', 'text/css');
                        //inlineStyle.attr('original_href', $(this).attr('href'));
                        inlineStyle.append(that.getCSSFromEpub(htmlFileLocation + $(this).attr('href')));
                        styleCode.append(inlineStyle);
                    }
                }
            );

            return { content: bodyElm.html(), styles: styleCode.html() };
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



})(jQuery, fluid_1_4);
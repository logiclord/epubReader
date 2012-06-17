"use strict";
// TODO JSHINT-JSLINT, jquery ui remove, test, create errors
// TODO to infusion

var unzip;
var zipFileName = 'epubs/carroll-alice-in-wonderland-illustrations.epub';

function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

function getDataFromEpub(filename, callback) {
    var answer;
    if (isImage(filename)) {
        answer = getImageFromEpub(filename);
    } else if (isCSS(filename)) {
        answer = getCSSFromEpub(filename);
    } else {
        answer = unzip.file(filename).asText();
    }

    if (callback !== undefined) {
        callback(answer);
    }

    return answer; // to load page
}

function getImageFromEpub(imgpath) {
    if (!imgpath) {
        return null;
    }
    return 'data:image/' + getExtension(imgpath) + ';base64,' + (JSZipBase64.encode(unzip.file(imgpath).data));
}

function getFolder(filepath) {
    filepath = trim(filepath);
    if (filepath === '') {
        return '';
    }
    var temp = filepath.split('/');
    var retpath = '';
    for (var i = 0; i < temp.length - 1; i++) {
        retpath = retpath + temp[i] + '/';
    }
    return retpath;
}

function getCSSFromEpub(csspath) {
    if (!csspath) {
        return  null;
    }
    var result = unzip.file(csspath);
    var csslocation = getFolder(csspath);
    if (!result) {
        return null;
    }
    result = processCSS(result.asText(), csslocation);
    return result;
}

function processCSS(result, csslocation) {
    if (!result) {
        return '';
    }
    result = result.replace(/url\((.*?)\)/gi, function (str, url) {
        if (/^data/i.test(url)) {
            // Don't replace data strings as it is already in data URI form
            return str;
        } else {
            var dataUri = getImageFromEpub(csslocation + url);
            return "url(" + dataUri + ")";
        }
    });

    return result;
}

function getExtension(filename) {
    if (!filename) {
        return '';

    }
    return filename.split('.').pop();
}

function isImage(src) {
    if (!src) {
        return false;
    }
    src = getExtension(src).toLowerCase();
    return src === 'jpg' || src === 'png' || src === 'jpeg' || src === 'gif';
}

function isCSS(src) {
    if (!src) {
        return false;
    }
    return getExtension(src).toLowerCase() === 'css';
}

function preProcessChapter(htmlCode, htmlFileLocation) {
    if (htmlCode === '') {
        return null;
    }
    //console.log(htmlCode);

    var domCode = $(htmlCode);
    var styleCode = $('<div/>');

    //  for each img tag in html code create an attribute original_src and set it to original source
    //  and modify src to dataURI using jszip

    domCode.find('img').each(function () {
        var src = $(this).attr('src');
        if (src !== false) {
            $(this).attr('original_src', src);
            $(this).attr('src', getImageFromEpub(htmlFileLocation + src));
        }
    });

    domCode = $('<div/>').append(domCode);

    // applying stylesheets of current chapter to our ebook
    // everything is going to be added to #content which will be overwritten for eah chapter
    // Hence no need to track stylesheets
    domCode.find('link').each(
        function () {
            if ($(this).attr('type') === "text/css") {
                var inlineStyle = $('<style></style>');
                inlineStyle.attr("type", "text/css");
                inlineStyle.attr("original_href", $(this).attr("href"));
                inlineStyle.append(getCSSFromEpub(htmlFileLocation + $(this).attr("href")));
                styleCode.append(inlineStyle);
            }
        });

    // remove head tags manually
    domCode.find('title').remove();
    domCode.find('link').remove();
    domCode.find('meta').remove();
    //htmlCode = domCode.html();

    return { content:domCode.html(), styles:styleCode.html() };
}

function onZipReceived(data) {
    unzip = new JSZip();
    unzip.load(data, {
        base64:false
    });
    getDataFromEpub('META-INF/container.xml',container);
}

function useMSXHR() {
    return typeof ActiveXObject === "function";
}

function getBinaryFile(url, callback) {
    var request = useMSXHR() ? new ActiveXObject("Msxml2.XmlHttp.6.0"): new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 1) {
            if (request.overrideMimeType) {
                request
                    .overrideMimeType('text/plain; charset=x-user-defined');
            }
            request.send();
        }

        if (request.readyState === 4) {
            if (request.status === 200) {
                var data;
                if (useMSXHR()) {
                    data = new VBArray(request.responseBody).toArray();
                    for (var j = 0; j < data.length; ++j) {
                        data[j] = String.fromCharCode(data[j]);
                    }
                    callback(data.join(''));
                    request.abort();
                } else {
                    callback(request.responseText);
                }
            } else {
                throw {
                    name: 'XHRError',
                    message: 'Failed to get file ' + url
                };
            }
        }
    };
    request.open("GET", url, true);
}

function runTest() {
    getBinaryFile(zipFileName, onZipReceived);
}
var page_stack = new Array();
var oebps_dir = '';
var opf_file = '';
var ncx_file = '';
var abs_container_bottom = 600; // height of TOC widget
var epub_version = 2;
var current_chapter = {};
var current_selection_height = 600;
var current_selection = {};//= {from : 0, to : current_selection_height};
var pagination = []; // to keep track about forward and backword pagination ranges

function manageImageSize() {
    var obj = $(this);
    var maxWidth = 400;
    var maxHeight = 300;
    if (obj.width() > maxWidth) {
        obj.height((maxWidth * obj.attr("height")) / obj.attr("width"));
        obj.width(maxWidth);
    }
    if (obj.height() > maxHeight) {
        obj.width((obj.attr("width") * maxHeight) / obj.attr("height"));
        obj.height(maxHeight);
    }
}

function selectionWrapper() {
    $('#content :hidden').show();
    var toHide = [];
    createSelection($('#content'), toHide);
    for (var i = 0; i < toHide.length; i++) {
        toHide[i].hide();
    }
    console.log(current_selection.to + " hh " + current_chapter.height);
    var progress = 500 * ((current_selection.to > current_chapter.height) ? 1 : (current_selection.to / current_chapter.height));
    $('#remaining').css('width', progress + 'px');
}

function createSelection(node, toHide) {

    if (!node) {
        return null;
    }
    var top = node.offset().top;
    var bottom = top + node.height();

    if (current_selection.to <= top || current_selection.from >= bottom) {
        return false;
    } else if (current_selection.from <= top && current_selection.to >= bottom) {
        return true;
    } else {
        var ret = false;
        var kid = node.children();
        kid.each(function () {
            var temp = createSelection($(this), toHide);
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
}

function resetSelection() {
    console.log(current_selection);
    current_selection.from = $('#content').offset().top;
    current_selection.to = current_selection.from + current_selection_height;
}

function load_content() {
    page = $(this).attr('href');
    resetSelection();
    pagination = [];

    // Unselect other sections
    $('.selected').attr('class', 'unselected');
    $(this).attr('class', 'selected');

    current_chapter = imageToDataURI(getDataFromEpub(page), getFolder(page));
    $('#content').html(current_chapter.content);
    $('#chapter_style').html(current_chapter.styles);

    //TODO Improve on load listener for already cached images

    if ($('#content img:last').height() !== 0) {
        $('#content img').each(manageImageSize);
        current_chapter.height = $('#content').height();
        selectionWrapper()
    }
    else {
        $('#content img:last').load(function () {
            // manage size of images
            $('#content img').each(manageImageSize);
            current_chapter.height = $('#content').height();
            selectionWrapper()
        });
    }

    return false;
}

function next() {
    pagination.push({from:current_selection.from, to:current_selection.to});
    current_selection.from = current_selection.to + 1;
    current_selection.to = current_selection.from + current_selection_height;

    if (current_selection.from < current_chapter.height) {
        selectionWrapper();
    } else {
        next_chapter();
    }

}
function previous() {
    current_selection = pagination.pop();
    if (current_selection !== undefined && current_selection.to > $('#content').offset().top) {
        selectionWrapper();
    } else {
        current_selection = {};
        previous_chapter();
    }
}

function next_chapter() {

    if ($('a.selected').parent().next('li').length === 0) {
        return;
    }

    // Simulate a click event on the next chapter after the selected one
    $('a.selected').parent().next('li').find('a').click();

    // How far is the selected chapter now from the bottom border?
    var selected_position = $('a.selected').position().top;
    var height_of_toc = $('a.selected').height();

    if (selected_position - (height_of_toc * 2) > abs_container_bottom / 2) {
        // Hide the first visible chapter item
        $('#toc a:visible:eq(0)').hide();
    }
}

function previous_chapter() {
    if ($('a.selected').parent().prev('li').length === 0) {
        return;
    }

    // Simulate a click event on the next chapter after the selected one
    $('a.selected').parent().prev('li').find('a').click();

    // Have we hidden any chapters that we now want to show?
    $('#toc a:visible:eq(0)').parent().prev('li').find('a').show();
}

/* Open the container file to find the resources */
function container(f) {

    opf_file = $(f).find('rootfile').attr('full-path');
    // Get the OEPBS dir, if there is one
    if (opf_file.indexOf('/') != -1) {
        oebps_dir = opf_file.substr(0, opf_file.lastIndexOf('/'));
    }

    // opf_file = epub_dir + '/' + opf_file;
    // jQuery.get(opf_file, {}, opf);
    getDataFromEpub(opf_file, function (response) {
        opf(response);
    });
}

/* Open the TOC, get the first item and open it */
function toc(f) {

    // ePub 2 compatibility to parse toc.ncx file
    if (epub_version === 2) {

        // Some ebooks use navPoint while others use ns:navPoint tags
        var nav_tag = 'ns\\:navPoint';
        var content_tag = 'ns\\:content';
        var text_tag = 'ns\\:text';

        if ($(f).find('ns\\:navPoint').length == 0) {
            nav_tag = 'navPoint';
            content_tag = 'content';
            text_tag = 'text';
        }

        $(f).find(nav_tag).each(
            function () {

                var s = $('<span/>').text(
                    $(this).find(text_tag + ':first').text());
                var a = $('<a/>').attr(
                    'href',
                    oebps_dir
                        + '/'
                        + $(this).find(content_tag).attr(
                        'src'));
                // If 's' has a parent navPoint, indent it
                if ($(this).parent()[0].tagName.toLowerCase() == nav_tag) {
                    s.addClass('indent');
                }
                s.appendTo(a);
                a.appendTo($('<li/>').appendTo('#toc'));
            });
    }

    // ePub 3 compatibility to parse toc.xhtml file
    if (epub_version === 3) {
        $(f).filter('nav[epub:type="toc"]').find('li').each(
            function () {
                var s = $('<span/>').text($(this).find('a:first').text());
                var a = $('<a/>').attr('href', oebps_dir + '/' + $(this).find('a:first').attr('href'));

                // If 's' has a parent navPoint, indent it
                if ($(this).parent().parent()[0].tagName.toLowerCase() === 'li') {
                    s.addClass('indent');
                }
                s.appendTo(a);
                a.appendTo($('<li/>').appendTo('#toc'));
            });
    }

    // Click on the desired first item link
    $('#toc a:eq(0)').click();

}
/* Open the OPF file and read some useful metadata from it */
function opf(f) {

    // Get the document title
    // Depending on the browser, namespaces may or may not be handled here
    var title = $(f).find('title').text(); // Safari
    var author = $(f).find('creator').text();

    $('#content-title').html(title + ' by ' + author);
    // Firefox
    if (title == null || title == '') {
        $('#content-title').html(
            $(f).find('dc\\:title').text() + ' by '
                + $(f).find('dc\\:creator').text());
    }
    // Get the NCX
    var opf_item_tag = 'opf\\:item';
    var epub_version_tag = 'opf\\:package';

    if ($(f).find('opf\\:item').length == 0) {
        opf_item_tag = 'item';
        epub_version_tag = 'package';
    }

    epub_version = parseInt($('<div/>').append($(f)).find(epub_version_tag).attr('version'), 10);

    $(f).find(opf_item_tag).each(
        function () {
            // Cheat and find the first file ending in NCX
            // modified to include ePub 3 support
            if ($(this).attr('href').indexOf('.ncx') != -1
                || $(this).attr('id').toLowerCase() === 'toc') {
                ncx_file = oebps_dir + '/' + $(this).attr('href');
                // jQuery.get(ncx_file, {}, toc);
                // console.log(ncx_file);
                getDataFromEpub(ncx_file, function (response) {
                    toc(response);
                });
            }
        });

}
jQuery(document).ready(function () {

    runTest();

    $('#toc a').live('click', load_content);

    $(document).bind('keydown', function (e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if (code == 39) { // 'n'
            next();
        }
        if (code == 37) { // 'p'
            previous();
        }
        if (code == 40) { // 'j'
            next_chapter();
        }
        if (code == 38) { // 'k'
            previous_chapter();
        }
    });
});

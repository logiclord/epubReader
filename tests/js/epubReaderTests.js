// Declare dependencies
/*global fluid:true, jQuery, jqUnit, start*/
(function ($) {
    $(document).ready(function () {

        var epubReaderTests = new jqUnit.TestCase('epubReader Component Tests'),
            epubReader;


        // extended to include my custom UI option i.e. pageMode
        fluid.staticEnvironment.uiEnhancer = fluid.uiEnhancer('.fl-epubReader-bookContainer', {
            components: {
                pageMode: {
                    type: 'fluid.uiEnhancer.classSwapper',
                    container: '{uiEnhancer}.container',
                    options: {
                        classes: '{uiEnhancer}.options.classnameMap.pageMode'
                    }
                },
                settingsStore: {
                    options: {
                        defaultSiteSettings: {
                            pageMode: 'split'
                        }
                    }
                }
            },
            classnameMap: {
                'pageMode': {
                    'split': 'fl-font-uio-times',
                    'scroll': 'fl-font-uio-times'
                }
            }
        });

        var epubReaderTester = function (callback) {
            epubReader = fluid.epubReader('.fl-epubReader-container', {
                book: {
                    epubPath : '../epubs/the_hound_of_the_baskervilles_igp_epub3_sir_arthur.epub'
                },
                listeners: {
                    onReaderReady: function () {
                        start();
                        callback();
                    }
                },
                uiOptionsTemplatePath: '../../html/uiOptions/'
            });
        };


        epubReaderTests.asyncTest('Initialization', function () {
            epubReaderTester(function () {
                jqUnit.assertNotUndefined('epubReader  is not undefined', epubReader);
                jqUnit.assertNotUndefined('bookhandler  is not undefined', epubReader.bookhandle);
                jqUnit.assertNotUndefined('navigator  is not undefined', epubReader.bookhandle.navigator);
                jqUnit.assertTrue('Table of content is set', $('.flc-epubReader-toc').html());
                jqUnit.assertEquals('Book title is set', 'The Hound of the Baskervilles - IGP EPUB3 by Sir Arthur Conan Doyle\'s', $('.flc-epubReader-chapter-title').html());
                if ($('.fl-epubReader-progressIndicator').is(':visible')) {
                    jqUnit.assertEquals('Remaining Indicator is working', $('.fl-epubReader-progressIndicator').width(), $('.flc-epubReader-progressIndicator-completed').width());
                }
                jqUnit.assertTrue('Chapter content is set', $('.flc-epubReader-chapter-content').html());
            });
        });

        epubReaderTests.asyncTest('Navigation', function () {
            epubReaderTester(function () {
                var progress = 0;
                epubReader.bookhandle.navigator.next_chapter();
                epubReader.bookhandle.navigator.next_chapter();
                jqUnit.assertEquals('Next Chapter works', 2, epubReader.bookhandle.navigator.toc.currentSelectPosition());
                epubReader.bookhandle.navigator.previous_chapter();
                jqUnit.assertEquals('Previous Chapter works', 1, epubReader.bookhandle.navigator.toc.currentSelectPosition());

                epubReader.bookhandle.navigator.next();
                epubReader.bookhandle.navigator.next();
                // next which in itself calls next chapter
                jqUnit.assertEquals('Next which in itself calls next chapter works', 3, epubReader.bookhandle.navigator.toc.currentSelectPosition());

                if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                    progress = $('.flc-epubReader-progressIndicator-completed').width();
                }
                epubReader.bookhandle.navigator.next();
                jqUnit.assertEquals('Normal next works without calling next chapter', 3, epubReader.bookhandle.navigator.toc.currentSelectPosition());

                if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                    jqUnit.assertTrue('Normal Next works properly', $('.flc-epubReader-progressIndicator-completed').width() > progress);
                } else if (epubReader.bookhandle.navigator.options.pageMode === 'scroll') {
                    jqUnit.assertTrue('Normal Next works properly',  $('.fl-epubReader-bookContainer').scrollTop() > 0);
                }

                if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                    progress = $('.flc-epubReader-progressIndicator-completed').width();
                }
                epubReader.bookhandle.navigator.previous();
                jqUnit.assertEquals('Normal previous works without calling previous chapter', 3, epubReader.bookhandle.navigator.toc.currentSelectPosition());
                if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                    jqUnit.assertTrue('Normal previous works properly', $('.flc-epubReader-progressIndicator-completed').width() < progress);
                } else if (epubReader.bookhandle.navigator.options.pageMode === 'scroll') {
                    jqUnit.assertTrue('Normal previous works properly',  $('.fl-epubReader-bookContainer').scrollTop() === 0);
                }

                epubReader.bookhandle.navigator.previous();
                jqUnit.assertEquals('Normal previous works without calling previous chapter', 2, epubReader.bookhandle.navigator.toc.currentSelectPosition());
            });
        });

        epubReaderTests.asyncTest('Bookmarks', function () {
            epubReaderTester(function () {
                jqUnit.assertTrue('Bookmark Added', function () {
                    epubReader.locate('bookContainer').fluid('activate');
                    var press = jQuery.Event("keydown");
                    press.ctrlKey = false;
                    press.which = 40;
                    epubReader.locate('bookContainer').trigger(press);
                    $('.flc-epubReader-addBookmark').click();
                    $('.ui-dialog-content input').val('tempTitle');
                    $('.ui-dialog-buttonset :first').click();
                    return epubReader.bookhandle.navigator.bookmarks.model.repeatingData.length > 0;
                }() );
            });
        });

        epubReaderTests.asyncTest('Search', function () {
            epubReaderTester(function () {
                jqUnit.assertEquals('Search in same page working', 'rw-h1_63367-541539549', function () {
                    epubReader.bookhandle.navigator.toc.setCurrentSelectionToIndex(0);
                    $('.flc-epubReader-search-field').val('Hound');
                    $('.flc-epubReader-search-button').click();
                    return $('.flc-epubReader-highlighted-current').parent().attr('id');
                }());
                jqUnit.assertEquals('Search across chapters working', 'rw-h2_46661-00002', function () {
                    $('.flc-epubReader-search-field').val('Author');
                    $('.flc-epubReader-search-button').click();
                    return $('.flc-epubReader-highlighted-current').parent().attr('id');
                }());
            });
        });


        epubReaderTests.asyncTest('Personalize', function () {
            epubReaderTester(function () {
                jqUnit.assertTrue('Bookmark Added', function () {
                    $('#min-text-size').val(1.2);
                    $('.flc-uiOptions-text-font').val("times");
                    $('#line-spacing').val(1.2);
                    $('.flc-uiOptions-theme').val("bw");
                    $('.flc-uiOptions-page-mode').val("scroll");
                    $('.flc-uiOptions-save').click();
                    return true;
                }());
            });
        });


        epubReaderTests.asyncTest('Notes', function () {
            epubReaderTester(function () {
                jqUnit.assertTrue('Note Added', function () {
                    epubReader.locate('bookContainer').fluid('activate');
                    var press = jQuery.Event("keydown");
                    press.ctrlKey = false;
                    press.which = 40;
                    epubReader.locate('bookContainer').trigger(press);
                    $('.flc-epubReader-addNote').click();
                    $('.ui-dialog-content input').val('tempTitle');
                    $('.ui-dialog-content textarea').val('tempNote');
                    $('.ui-dialog-buttonset :first').click();
                    return epubReader.bookhandle.navigator.notes.model.repeatingData.length > 0;
                }());
            });
        });
    });

})(jQuery);
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
/*global fluid:true, jQuery, jqUnit, start*/

(function ($) {
    $(document).ready(function () {

        var epubReaderTests = new jqUnit.TestCase('epubReader Component Tests'),
            epubReader,
            epubReaderTester;


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

        epubReaderTester = function (callback, extraOptions) {
            var totalOptions = {
                book: {
                    epubPath : '../epubs/the_hound_of_the_baskervilles_igp_epub3_sir_arthur.epub'
                },
                listeners: {
                    onReaderReady: function () {
                        callback();
                        start();
                    }
                },
                uiOptionsTemplatePath: '../../html/uiOptions/'
            };
            if (extraOptions !== undefined) {
                totalOptions = $.extend(true, totalOptions, extraOptions);
            }
            epubReader = fluid.epubReader('.fl-epubReader-container', totalOptions);
        };

        epubReaderTests.asyncTest('Personalize', function () {
            epubReaderTester(function () {
                $('#min-text-size').val(1.3).change();
                $('.flc-uiOptions-text-font').val("times").change();
                $('#line-spacing').val(1.2).change();
                $('.flc-uiOptions-theme').val("yb").change();
                $('.flc-uiOptions-page-mode').val("scroll").change();
                $('.flc-uiOptions-save').click();
            },
                {
                    components: {
                        bookhandle: {
                            options : {
                                listeners: {
                                    onUIOptionsUpdate: {
                                        listener : function (selection) {
                                            console.log(selection);
                                            jqUnit.assertEquals("Text size saved", 1.3, selection.textSize);
                                            jqUnit.assertEquals("Line spacing saved", 1.2, selection.lineSpacing);
                                            jqUnit.assertEquals("Page mode saved", "scroll", selection.pageMode);
                                            jqUnit.assertEquals("Theme saved", "yb", selection.theme);
                                            jqUnit.assertEquals("Font saved", "times", selection.textFont);
                                        },
                                        priority: 'last'
                                    }
                                }
                            }
                        }
                    }
                });
        });

        epubReaderTests.asyncTest('Initialization', function () {
            epubReaderTester(function () {
                jqUnit.assertNotUndefined('epubReader is not undefined', epubReader);
                jqUnit.assertNotUndefined('bookhandler is not undefined', epubReader.bookhandle);
                jqUnit.assertNotUndefined('navigator is not undefined', epubReader.bookhandle.navigator);
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

                jqUnit.assertEquals('Next Chapter works', 2, function () {
                    epubReader.bookhandle.navigator.next_chapter();
                    epubReader.bookhandle.navigator.next_chapter();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());

                jqUnit.assertEquals('Previous Chapter works', 1, function () {
                    epubReader.bookhandle.navigator.previous_chapter();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());

                // next which in itself calls next chapter
                jqUnit.assertEquals('Next which in itself calls next chapter works', 3, function () {
                    epubReader.bookhandle.navigator.next();
                    epubReader.bookhandle.navigator.next();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());


                jqUnit.assertEquals('Normal next works without calling next chapter', 3, function () {
                    if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                        progress = $('.flc-epubReader-progressIndicator-completed').width();
                    }
                    epubReader.bookhandle.navigator.next();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());

                jqUnit.assertTrue('Normal Next works properly', function () {
                    if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                        return $('.flc-epubReader-progressIndicator-completed').width() > progress;
                    } else if (epubReader.bookhandle.navigator.options.pageMode === 'scroll') {
                        return $('.fl-epubReader-bookContainer').scrollTop() > 0;
                    }
                }());

                jqUnit.assertEquals('Normal previous works without calling previous chapter', 3, function() {
                    if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                        progress = $('.flc-epubReader-progressIndicator-completed').width();
                    }
                    epubReader.bookhandle.navigator.previous();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());

                jqUnit.assertTrue('Normal previous works properly', function () {
                    if (epubReader.bookhandle.navigator.options.pageMode === 'split') {
                        return $('.flc-epubReader-progressIndicator-completed').width() < progress;
                    } else if (epubReader.bookhandle.navigator.options.pageMode === 'scroll') {
                        return $('.fl-epubReader-bookContainer').scrollTop() === 0;
                    }
                }());

                jqUnit.assertEquals('Normal previous works without calling previous chapter', 2, function () {
                    epubReader.bookhandle.navigator.previous();
                    return epubReader.bookhandle.navigator.toc.currentSelectPosition();
                }());

            });
        });

        epubReaderTests.asyncTest('Bookmarks', function () {
            epubReaderTester(function () {
                var targetChapter = '';
                jqUnit.assertTrue('Bookmark Added', function () {
                    epubReader.locate('bookContainer').fluid('activate');
                    var press = jQuery.Event("keydown");
                    press.ctrlKey = false;
                    press.which = 40;
                    epubReader.locate('bookContainer').trigger(press);
                    $('.flc-epubReader-addBookmark').click();
                    $('.ui-dialog-content input').val('tempTitle');
                    $('.ui-dialog-buttonset :last').click();
                    targetChapter = epubReader.bookhandle.navigator.toc.getCurrentChapterPath();
                    return epubReader.bookhandle.navigator.bookmarks.model.repeatingData.length > 0;
                }());

                jqUnit.assertTrue('Bookmark Navigation Working', function () {
                    var newVal = Math.floor(Math.random() * epubReader.bookhandle.navigator.toc.model.table.values.length -1);
                    epubReader.bookhandle.navigator.toc.setCurrentSelectionToIndex(newVal);
                    $('.flc-epubReader-bookmark-goTo').click();
                    return epubReader.bookhandle.navigator.toc.getCurrentChapterPath() === targetChapter;
                }());
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
                    $('.ui-dialog-buttonset :last').click();
                    return epubReader.bookhandle.navigator.notes.model.repeatingData.length > 0;
                }());
            });
        });
    });

})(jQuery);
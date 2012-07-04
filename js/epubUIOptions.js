var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    fluid.defaults('fluid.uiOptions.templatePath', {
        gradeNames: ['fluid.littleComponent', 'autoInit'],
        value: '../html/uiOptions/'
    });

    fluid.defaults('fluid.uiOptions.epubReaderOptions', {
        gradeNames: ['fluid.uiOptions.inline'],
        container: '{epubReader}.container',
        events: {
            onUIOptionsUpdate: '{bookHandler}.events.onUIOptionsUpdate'
        },
        derivedDefaults: {
            templateLoader: {
                options: {
                    templates: {
                        uiOptions: '%prefix/epubUIOptionsTemplate.html'
                    }
                }
            },
            uiOptions: {
                options: {
                    components: {
                        preview: {
                            type: 'fluid.emptySubcomponent'
                        },
                        layoutControls: {
                            type: 'fluid.emptySubcomponent'
                        },
                        linksControls: {
                            type: 'fluid.emptySubcomponent'
                        }
                    },
                    listeners: {
                        onReset: function (uiOptions) {
                            $('.flc-uiOptions-page-mode').val('split');
                            uiOptions.save();
                        },
                        onSave: '{fluid.uiOptions.epubReaderOptions}.onSaveHandler'
                    }
                }
            }
        },
        preInitFunction: 'fluid.uiOptions.epubReaderOptions.preInit'
    });

    fluid.uiOptions.inline.makeCreator('fluid.uiOptions.epubReaderOptions', fluid.identity);

    fluid.uiOptions.epubReaderOptions.preInit = function (that) {
        var pageMode = 'split';
        that.onSaveHandler = function (selection) {
            fluid.log('Updating settings:', selection);
            pageMode = $('.flc-uiOptions-page-mode').val();
            that.events.onUIOptionsUpdate.fire(pageMode);
        };
    };

    fluid.defaults('fluid.epubReader.uiController', {
        gradeNames: ['fluid.littleComponent', 'autoInit'],
        components: {
            uioptions: {
                type: 'fluid.uiOptions.epubReaderOptions',
                container: '{epubReader}.options.selectors.uiOptionsContainer'
            },
            uioptionslider: {
                type: 'fluid.slidingPanel',
                container: '{epubReader}.container',
                options: {
                    selectors: {
                        panel: '{epubReader}.options.selectors.uiOptionsContainer',
                        toggleButton: '{epubReader}.options.selectors.uiOptionsButton'
                    },
                    hideByDefault: true,
                    strings: {
                        showText: '{epubReader}.options.strings.uiOptionShowText',
                        hideText: '{epubReader}.options.strings.uiOptionHideText'
                    }
                }
            }
        }
    });

})(jQuery, fluid_1_4);
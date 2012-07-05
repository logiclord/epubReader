var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    fluid.demands("fluid.uiOptions.epubControls", ["fluid.uiOptions"], {
        options: {
            classnameMap: "{uiEnhancer}.options.classnameMap"
        }
    });

    fluid.defaults("fluid.uiOptions.epubControls", {
        gradeNames: ["fluid.rendererComponent", "autoInit"],
        strings: {
            pageMode: ["Split Pages", "Scroll Pages"]
        },
        controlValues: {
            pageMode: ["split", "scroll"]
        },
        selectors: {
            pageMode: ".flc-uiOptions-page-mode"
        },
        events: {
            onUIOptionsRefresh: null
        },
        listeners: {
            onUIOptionsRefresh: "{epubControls}.refreshView"
        },
        preInitFunction: "fluid.uiOptions.lateRefreshViewBinder",
        finalInitFunction: "fluid.uiOptions.controlsFinalInit",
        produceTree: "fluid.uiOptions.epubControls.produceTree",
        resources: {
            template: "{templateLoader}.resources.epubControls"
        }
    });

    fluid.uiOptions.epubControls.produceTree = function (that) {
        var tree = {};
        for (var item in that.model.selections) {
            if (item === "pageMode") {
                tree[item] = {
                    optionnames: "${labelMap." + item + ".names}",
                    optionlist: "${labelMap." + item + ".values}",
                    selection: "${selections." + item + "}",
                    decorators: {
                        type: "fluid",
                        func: "fluid.uiOptions.selectDecorator",
                        options: {
                            styles: that.options.classnameMap[item]
                        }
                    }
                };
            }
        }
        return tree;
    };

    fluid.defaults('fluid.uiOptions.epubReaderOptions', {
        gradeNames: ['fluid.uiOptions.inline'],
        container: '{epubReader}.container',
        events: {
            onUIOptionsUpdate: '{bookHandler}.events.onUIOptionsUpdate'
        },
        derivedDefaults: {
            templateLoader: {
                options: {
                    components: {
                        templatePath: {
                            options:{
                                value: '../html/uiOptions/'
                            }
                        }
                    },
                    templates: {
                        uiOptions: '%prefix/epubUIOptionsTemplate.html',
                        epubControls: '%prefix/UIOptionsTemplate-epub.html'
                    }
                }
            },
            uiOptions: {
                options: {
                    selectors: {
                        epubControls: '.flc-uiOptions-epub-controls'
                    },
                    components: {
                        preview: {
                            type: 'fluid.emptySubcomponent'
                        },
                        layoutControls: {
                            type: 'fluid.emptySubcomponent'
                        },
                        linksControls: {
                            type: 'fluid.emptySubcomponent'
                        },
                        epubControls: {
                            type: "fluid.uiOptions.epubControls",
                            container: "{uiOptions}.dom.epubControls",
                            createOnEvent: "onUIOptionsComponentReady",
                            options: {
                                model: "{uiOptions}.model",
                                applier: "{uiOptions}.applier",
                                events: {
                                    onUIOptionsRefresh: "{uiOptions}.events.onUIOptionsRefresh"
                                }
                            }
                        }
                    },
                    listeners: {
                        onReset: function (uiOptions) {
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
           that.onSaveHandler = function (selection) {
               console.log("inside selection");
               console.log(selection);
               that.events.onUIOptionsUpdate.fire(selection.pageMode);
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
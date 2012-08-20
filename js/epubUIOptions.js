/*
 Copyright 2012 OCAD University
 Copyright 2012 OCAD Gaurav Aggarwal

 Licensed under the Educational Community License (ECL), Version 2.0 or the New
 BSD license. You may not use this file except in compliance with one these
 Licenses.

 You may obtain a copy of the ECL 2.0 License and BSD License at
 https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
 */
/*global fluid_1_4:true, jQuery */

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    fluid.demands('fluid.uiOptions.epubControls', ['fluid.uiOptions'], {
        options: {
            classnameMap: '{uiEnhancer}.options.classnameMap'
        }
    });

    fluid.defaults('fluid.uiOptions.epubControls', {
        gradeNames: ['fluid.rendererComponent', 'autoInit'],
        strings: {
            pageMode: ['Split Pages', 'Scroll Pages']
        },
        controlValues: {
            pageMode: ['split', 'scroll']
        },
        selectors: {
            pageMode: '.flc-uiOptions-page-mode'
        },
        events: {
            onUIOptionsRefresh: null
        },
        listeners: {
            onUIOptionsRefresh: '{epubControls}.refreshView'
        },
        preInitFunction: 'fluid.uiOptions.lateRefreshViewBinder',
        finalInitFunction: 'fluid.uiOptions.controlsFinalInit',
        produceTree: 'fluid.uiOptions.epubControls.produceTree',
        resources: {
            template: '{templateLoader}.resources.epubControls'
        }
    });

    fluid.uiOptions.epubControls.produceTree = function (that) {
        var tree = {},
            item;
        for (item in that.model.selections) {
            if (that.model.selections.hasOwnProperty(item) && item === 'pageMode') {
                tree[item] = {
                    optionnames: '${labelMap.' + item + '.names}',
                    optionlist: '${labelMap.' + item + '.values}',
                    selection: '${selections.' + item + '}',
                    decorators: {
                        type: 'fluid',
                        func: 'fluid.uiOptions.selectDecorator',
                        options: {
                            styles: that.options.classnameMap[item]
                        }
                    }
                };
            }
        }
        return tree;
    };

    fluid.demands('fluid.navigationOptions.slidingPanel', ['fluid.epubReader.uiController'], {
        funcName: 'fluid.slidingPanel'
    });

    fluid.demands('fluid.navigationOptions.tabs', ['fluid.epubReader.uiController'], {
        funcName: 'fluid.tabs'
    });

    fluid.demands('fluid.epubReaderOptions.slidingPanel', ['fluid.epubReader.uiController'], {
        funcName: 'fluid.slidingPanel'
    });

    fluid.defaults('fluid.uiOptions.epubReaderOptions', {
        gradeNames: ['fluid.uiOptions.inline'],
        container: '{epubReader}.container',
        derivedDefaults: {
            templateLoader: {
                options: {
                    components: {
                        templatePath: {
                            options: {
                                value: '{epubReader}.options.uiOptionsTemplatePath'
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
                        epubControls: '{epubReader}.options.selectors.epubControls',
                        slidingTabsSelector: '{epubReader}.options.selectors.slidingTabsSelector'
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
                            type: 'fluid.uiOptions.epubControls',
                            container: '{uiOptions}.dom.epubControls',
                            createOnEvent: 'onUIOptionsComponentReady',
                            options: {
                                model: '{uiOptions}.model',
                                applier: '{uiOptions}.applier',
                                events: {
                                    onUIOptionsRefresh: '{uiOptions}.events.onUIOptionsRefresh'
                                }
                            }
                        }
                    },
                    events: {
                        onSave  : '{bookHandler}.events.onUIOptionsUpdate',
                        onPageModeRestore: '{bookHandler}.events.onPageModeRestore'
                    },
                    listeners: {
                        onReset: function (uiOptions) {
                            uiOptions.save();
                        },
                        onUIOptionsComponentReady: {
                            listener: function (that) {
                                // activating tabs
                                fluid.tabs(that.container.selector + ' ' + that.options.selectors.slidingTabsSelector, {
                                    tabOptions: {
                                        fx: { height: 'toggle' }
                                    }
                                });
                                // restoring pageMode
                                that.events.onPageModeRestore.fire(that.model.selections.pageMode);
                            },
                            priority: 'last'
                        }
                    }
                }
            }
        }
    });

    fluid.uiOptions.inline.makeCreator('fluid.uiOptions.epubReaderOptions', fluid.identity);

    fluid.defaults('fluid.epubReader.uiController.navigationOptions', {
        gradeNames: ['fluid.littleComponent', 'autoInit'],
        components: {
            navigationslider: {
                type: 'fluid.navigationOptions.slidingPanel',
                container: '{epubReader}.container',
                options: {
                    selectors: {
                        panel: '{epubReader}.options.selectors.navigationContainer',
                        toggleButton: '{epubReader}.options.selectors.navigationButton'
                    },
                    hideByDefault: true,
                    strings: {
                        showText: '{epubReader}.options.strings.navigationShowText',
                        hideText: '{epubReader}.options.strings.navigationHideText'
                    }
                }
            },
            navigationtabs: {
                type: 'fluid.navigationOptions.tabs',
                container: '{epubReader}.options.selectors.navigationContainer',
                options: {
                    tabOptions: {
                        fx: {
                            height: 'toggle'
                        }
                    }
                }
            }
        }
    });

    fluid.defaults('fluid.epubReader.uiController', {
        gradeNames: ['fluid.littleComponent', 'autoInit'],
        components: {
            uioptions: {
                type: 'fluid.uiOptions.epubReaderOptions',
                container: '{epubReader}.options.selectors.uiOptionsContainer'
            },
            uioptionslider: {
                type: 'fluid.epubReaderOptions.slidingPanel',
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
            },
            navigationoptions: {
                type: 'fluid.epubReader.uiController.navigationOptions'
            }
        }
    });

})(jQuery, fluid_1_4);
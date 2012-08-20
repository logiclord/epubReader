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
/*global fluid:true, jQuery*/
jQuery(document).ready(function () {
    // extended to include my custom UI option i.e. pageMode
    fluid.staticEnvironment.uiEnhancer = fluid.uiEnhancer(".fl-epubReader-bookContainer", {
        components: {
            pageMode: {
                type: "fluid.uiEnhancer.classSwapper",
                container: "{uiEnhancer}.container",
                options: {
                    classes: "{uiEnhancer}.options.classnameMap.pageMode"
                }
            },
            settingsStore: {
                options: {
                    defaultSiteSettings: {
                        pageMode: "split"
                    }
                }
            }
        },
        classnameMap: {
            "pageMode": {
                "split": "fl-font-uio-times",
                "scroll": "fl-font-uio-times"
            }
        }
    });

    var epubReader = fluid.epubReader(".fl-epubReader-container", {
        book: {
            epubPath : "../tests/epubs/the_hound_of_the_baskervilles_igp_epub3_sir_arthur.epub"
        }
    });
});
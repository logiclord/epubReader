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

    fluid.epubReader(".fl-epubReader-container", {
        book: {
            epubPath : "../tests/epubs/the_hound_of_the_baskervilles_igp_epub3_sir_arthur.epub"
        }
    });
});
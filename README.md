epubReader
==========
epubReader is a standalone fluid infusion component. This project is about implementing a 
web based ePub reader component based on open web technologies for infusion framework. Final ePub
reader developed will be screen reader accessible utilizing tools for customizing user experience.
Having a highly customizable reading experience on the web will contribute to a growing number
of new learning tools in the educational domain. It is finalized version of Google Summer of Code
2012 Project for Inclusive Design Institute.
Development logs can be found at http://webbasedepubreader.blogspot.in

### Quick Demo
You can see the current epubReader in action by deploying it using a local server. Just get the component
from here and place it in a server and visit epubReader/html/epubReaderDemo.html in browser.


APIs
====
To instantiate a new Image Editor on your page:
```
var epubReader = fluid.epubReader(container, options);

Returns: A epubReader component object.
```

### Parameters

####container
The container is a CSS-based selector, single-element jQuery object, or DOM element that identifies the
root DOM node of the epubReader markup.

####options
The options object is an optional data structure that configures the epubReader, as described in the Options section below.
```
### Options
####uiOptionsTemplatePath - Relative path to UI options html template directory.
####KeyboardShortcut    - Customizable shortcut keys for reader to be used with shift + key.
#####bookmarkKey        - To add bookmark. Defaults to B (66).
#####noteKey            - To add Note. Defaults to N (78).
#####nextNavigationKey  - To navigate next. Defaults to Down Arrow (40).
#####previousNavigationKey  - To navigate previous. Defaults to Up Arrow (38).
#####nextChapterNavigationKey   - To navigate to next chapter. Defaults to Right Arrow (39).
#####previousChapterNavigationKey   - To navigate to previous chapter. Defaults to Left Arrow (37).
#####editKey            - To activate WYSIWYG editor. Defaults to E (69).
####strings
#####uiOptionShowText:  - Button string for Personalize tab when closed. Defaults to '+ Personalize'
#####uiOptionHideText:  - Button string for Personalize tab when closed. Defaults to '- Personalize'
#####navigationShowText - Button string for manage tab when open. Defaults to '+ Manage'
#####navigationHideText - Button string for manage tab when closed. Defaults to '- Manage'
####book
#####epubPath           - Path to epub file.
#####isBase64           - True if epub file is Base64 encrypted else False. Defaults to False.
####constraints
#####maxImageHeight     - Maximum allowed height of images contained in the book. Defaults to 400.
#####maxImageWidth      - Maximum allowed width of images contained in the book. Defaults to 400.
```
### Events
####onReaderReady - Event fired at the end after initializing epubReader component and parsing ePub file.

### Selectors
####
            contentTitle: '.flc-epubReader-chapter-title',
            remaining: '.flc-epubReader-progressIndicator-completed',
            remainingWrapper: '.fl-epubReader-progressIndicator',
            chapterStyle: '.flc-epubReader-chapter-styles',
            chapterStyleElement: '.flc-epubReader-chapter-StyleElement',
            chapterContent: '.flc-epubReader-chapter-content',
            tocSelector: '.flc-epubReader-toc',
            tocContainer: '.fl-epubReader-tocContainer',
            bookmarkContainer: '.fl-epubReader-bookmarkContainer',
            bookmarkRow: '.flc-epubReader-bookmark-tableRow',
            bookmarkTitle : '.flc-epubReader-bookmark-title',
            bookmarkChapter: '.flc-epubReader-bookmark-chapter',
            bookmarkEdit: '.flc-epubReader-bookmark-edit',
            bookmarkDelete: '.flc-epubReader-bookmark-delete',
            bookmarkGoTO: '.flc-epubReader-bookmark-goTo',
            addBookmarkButton: '.flc-epubReader-addBookmark',
            notesContainer: '.fl-epubReader-notesContainer',
            noteRow: '.flc-epubReader-note-tableRow',
            noteId : '.flc-epubReader-note-id',
            noteChapter: '.flc-epubReader-note-chapter',
            noteEdit: '.flc-epubReader-note-edit',
            noteDelete: '.flc-epubReader-note-delete',
            addNoteButton: '.flc-epubReader-addNote',
            bookContainer: '.fl-epubReader-bookContainer',
            uiOptionsContainer: '.flc-epubReader-uiOptions-container',
            uiOptionsButton: '.fl-epubReader-uiOptions-button',
            navigationContainer: '.fl-epubReader-navigationContaniner',
            navigationButton: '.fl-epubReader-navigation-button',
            epubControls: '.flc-uiOptions-epub-controls',
            slidingTabsSelector: '.fl-epubReader-tabsPanel',
            nextButton: '.flc-epubReader-nextButton',
            previousButton: '.flc-epubReader-previousButton',
            nextChapterButton: '.flc-epubReader-nextChapterButton',
            previousChapterButton: '.flc-epubReader-previousChapterButton',
            editorSaveButton: '.flc-inlineEdit-saveButton',
            editorCancelButton: '.flc-inlineEdit-cancelButton',
            editActivationButton: '.flc-epubReader-editor-activateButton',
            downloadButton: '.flc-epubReader-downloadButton',
            searchForm: '.fl-epubReader-search-form',
            searchField: '.flc-epubReader-search-field',
            searchButton: '.flc-epubReader-search-button',
            searchResult: '.flc-epubReader-highlighted',
            currentSearchResult: '.flc-epubReader-highlighted-current'

Deployment
==========

There are four basic steps to adding the Image Editor to your application:
    Setup: Download epubReader standalone component
    Step 1: Prepare your markup
    Step 2: Write the script
    Step 3: Add the script to your HTML
    Step 1 - Prepare your HTML markup similar to epubReaderDemo.html and apply styles.

```
<div class='fl-epubReader-container fl-container-auto' align="center">
    <div class="flc-uiOptions-optionPanel fl-uiOptions-optionPanel">

        <div class="flc-epubReader-uiOptions-container flc-slidingPanel-panel"></div>


        <div class="fl-epubReader-navigationContaniner  fl-epubReader-tabsPanel">
            <ul class="fl-tabs fl-tabs-left fl-clearfix fl-inverted-color">
                <li><a href="#tabg" class="fl-tab-general">General</a></li>
                <li><a href="#tabb" class="fl-tab-bookmarks">Bookmarks</a></li>
                <li><a href="#tabn" class="fl-tab-notes" >Notes</a></li>
                <li><a href="#tabe" class="fl-tab-edit" >Edit</a></li>
            </ul>
            <div id="tabg" class="fl-clearfix" >
                <ul class="fl-clearfix">
                    <li class="fl-epubReader-tocContainer">
                        <label for="toc">Table of Content</label>
                        <select class="flc-epubReader-toc" id="toc">
                        </select>
                    </li>
                    <li>
                        <button type="button" class="flc-epubReader-previousChapterButton fl-rounded-corners" >Previous<br/> Chapter</button>
                    </li>
                    <li>
                        <button type="button" class="flc-epubReader-previousButton fl-rounded-corners" >Previous</button>
                    </li>
                    <li>
                        <button type="button" class="flc-epubReader-nextButton fl-rounded-corners" >Next</button>
                    </li>
                    <li>
                        <button type="button" class="flc-epubReader-nextChapterButton fl-rounded-corners" >Next<br/> Chapter</button>
                    </li>

                    <li>
                        <form class="fl-epubReader-search-form">
                            <input class="flc-epubReader-search-field" type="text" value="Search..." onfocus="if (this.value == 'Search...') {this.value = '';}" onblur="if (this.value == '') {this.value = 'Search...';}" />
                            <input class="flc-epubReader-search-button" type="button" value="Go" />
                        </form>
                    </li>
                </ul>
            </div>
            <div id="tabb" class="fl-clearfix">

                <button type="button" class="flc-epubReader-addBookmark fl-rounded-corners" >Add<br/> Bookmark</button>

                <table class="fl-epubReader-bookmarkContainer" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <th>Bookmark Identifier</th>
                        <th>Chapter</th>
                        <th colspan="3">Manage</th>
                    </tr>
                    <tr class="flc-epubReader-bookmark-tableRow">
                        <td class="flc-epubReader-bookmark-title"></td>
                        <td class="flc-epubReader-bookmark-chapter">
                        </td>
                        <td>
                            <a  class="flc-epubReader-bookmark-edit"></a>
                        </td>
                        <td>
                            <a  class="flc-epubReader-bookmark-delete"></a>
                        </td>
                        <td>
                            <a  class="flc-epubReader-bookmark-goTo"></a>
                        </td>
                    </tr>
                </table>
            </div>
            <div id="tabn" class="fl-clearfix" >
                <button type="button" class="flc-epubReader-addNote fl-rounded-corners" >Add<br/> Note</button>

                <table class="fl-epubReader-notesContainer" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <th>Note Identifier</th>
                        <th>Chapter</th>
                        <th colspan="2">Manage</th>
                    </tr>
                    <tr class="flc-epubReader-note-tableRow">
                        <td class="flc-epubReader-note-id"></td>
                        <td class="flc-epubReader-note-chapter">
                        </td>
                        <td>
                            <a  class="flc-epubReader-note-edit"></a>
                        </td>
                        <td>
                            <a  class="flc-epubReader-note-delete"></a>
                        </td>
                    </tr>
                </table></div>
            <div id="tabe" class="fl-clearfix" >
                <ul class="fl-clearfix">
                    <li>
                        <button type="button" class="flc-epubReader-editor-activateButton fl-rounded-corners">Edit
                            Page
                        </button>
                    </li>
                    <li>
                        <button type="button" class="flc-epubReader-downloadButton fl-rounded-corners">
                            Download Book
                        </button>
                    </li>
                </ul>
            </div>
        </div>

        <div class="fl-panelBar">
            <button class="fl-epubReader-uiOptions-button flc-slidingPanel-toggleButton fl-toggleButton"></button>
            <button class="fl-epubReader-navigation-button flc-slidingPanel-toggleButton fl-toggleButton" ></button>
        </div>
    </div>



    <div class="fl-epubReader-bookContainer fl-container-800 fl-rounded-corners">
        <h1 class="flc-epubReader-chapter-title"></h1>
        <div class="fl-epubReader-progressIndicator" align="left">
            <div class="flc-epubReader-progressIndicator-completed"></div>
        </div>
        <div class="flc-epubReader-chapter-styles"></div>
        <div class="flc-epubReader-chapter-content flc-inlineEdit-text flc-epubReader-chapter-StyleElement" ></div>
        <div class="flc-inlineEdit-editContainer">
            <button class="flc-inlineEdit-saveButton">Save</button> <button class="flc-inlineEdit-cancelButton">Cancel</button>
            <textarea></textarea>
        </div>
    </div>
</div>
```

    Step 2 - Write script to add custom UI options parameters and instantiate epubReader component
```
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
```

    Step 3 - Include all dependencies and script created in step 2 in HTML markup.


### Dependencies

* UI Options Component stylesheets
* TinyMCE
* Infusion
* Wait For Images - jQuery Plugin
* QTip - jQuery Plugin
* JSZip
* ePubReader Component - JS Files
* ePubReader Component - stylesheets

```
    <link rel="stylesheet" type="text/css" href="../lib/infusion/framework/fss/css/fss-reset-global.css"/>
    <link rel="stylesheet" type="text/css" href="../lib/infusion/framework/fss/css/fss-base-global.css"/>
    <link rel="stylesheet" type="text/css" href="../lib/infusion/framework/fss/css/fss-text.css"/>
    <link rel="stylesheet" type="text/css" href="../lib/infusion/framework/fss/css/fss-layout.css"/>
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/fss/fss-theme-bw-uio.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/fss/fss-theme-wb-uio.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/fss/fss-theme-by-uio.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/fss/fss-theme-yb-uio.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/fss/fss-text-uio.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/UIOptions.css" />
    <link rel="stylesheet" type="text/css" href="../lib/infusion/components/uiOptions/css/FullUIOptions.css" />
    <link rel="stylesheet" href="../css/epubReaderUIOptions.css"/>
    <link rel="stylesheet" href="../css/epubReader.css"/>

    <script type="text/javascript" src="../lib/tinymce/jscripts/tiny_mce/tiny_mce.js"></script>
    <script type="text/javascript" src="../lib/infusion/InfusionAll.js"></script>
    <script type="text/javascript" src="../lib/jquery.waitforimages.js"></script>
    <script type="text/javascript" src="../lib/jquery.qtip-1.0.0-rc3.custom/jquery.qtip-1.0.0-rc3.min.js"></script>
    <script type="text/javascript" src="../lib/JSZip/jszip.js"></script>
    <script type="text/javascript" src="../lib/JSZip/jszip-load.js"></script>
    <script type="text/javascript" src="../lib/JSZip/jszip-deflate.js"></script>
    <script type="text/javascript" src="../lib/JSZip/jszip-inflate.js"></script>
    <script type="text/javascript" src="../js/epubReaderUtils.js"></script>
    <script type="text/javascript" src="../js/epubUIOptions.js"></script>
    <script type="text/javascript" src="../js/epubReaderFileFacilitator.js"></script>
    <script type="text/javascript" src="../js/epubReaderNavigatorChilds.js"></script>
    <script type="text/javascript" src="../js/epubReaderNavigator.js"></script>
    <script type="text/javascript" src="../js/epubReader.js"></script>
    <script type="text/javascript" src="../js/epubReaderDemo.js"></script>
```
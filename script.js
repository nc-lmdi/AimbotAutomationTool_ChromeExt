chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log(msg)
    if (msg.action == 'run_record_command') {
        recordAction()
    }
});

// Global variables
contextTagConstants = ["BUTTON", "A", "IMG", "INPUT", "MD-CHECKBOX"]
contextRoleConstants = ["button", "listbox", "menuitem"]
let currentWindow;
let inFrame = false;
let frame1Name;
let inFrameinFrame = false;
let frame2name;

// Check if parent has values fit for selecting
function shouldSelectParent(c) {
    contextParent = c.parentElement;
    if (contextTagConstants.includes(contextParent.tagName) || contextRoleConstants.includes(contextParent.getAttribute("role"))) {
        return true;
    }
    else {
        return false;
    }
}


// Check if the grandparent has values fit for selecting
function shouldSelectGrandParent(c) {
    contextParent = c.parentElement.parentElement;
    if (contextTagConstants.includes(contextParent.tagName) || contextRoleConstants.includes(contextParent.getAttribute("role"))) {
        return true;
    }
    else {
        return false;
    }
}

function decideSelector(context) {
    var selectorDecision;
    var textLength = context.length;
    if (contextTagConstants.includes(context.tagName) || contextRoleConstants.includes(context.getAttribute("role") || textLength > 0)) {
        selectorDecision = context;
    }
    else if (shouldSelectParent(context)) {
        selectorDecision = context.parentElement;
    }
    else if (shouldSelectGrandParent(context)) {
        selectorDecision = context.parentElement.parentElement;
    }
    else {
        selectorDecision = context;
    }
    return selectorDecision;
}

function recordAction() {

    alert("Ready for recording an action")

    let listenerObject = window;
    let currentlyHoveredObject;
    let iframe;
    let shouldRecordAction = true;

    // Main hover function for getting the data from the sites
    const returnHoveredObject = (n) => {
        if (shouldRecordAction) {
            if (currentlyHoveredObject) {
                currentlyHoveredObject.style.border = null;
            }

            currentlyHoveredObject = decideSelector(n.target);
            currentlyHoveredObject.style.border = "solid red";

            console.log(currentlyHoveredObject)

            if (n.target.tagName == "FRAME") {
                inFrame = true;
                frame1Name = n.target.name;

                iframe = document.getElementsByName(n.target.name)[0].contentWindow.document;

                currentWindow = n.target;

                listenerObject = document.getElementsByName(n.target.name)[0].contentWindow.document;
                runListener(listenerObject)
                checkIfLeft(listenerObject, n.target.tagName)
            }
            else if (n.target.tagName == "IFRAME") {
                inFrameinFrame = true;
                frame2name = n.target.name;

                iframe2 = iframe.getElementsByName(n.target.name)[0].contentWindow.document;

                if (listenerObject == iframe2) {
                    console.log("Frame in frame in frame")
                    currentWindow = n.target;
                    listenerObject = iframe2.getElementsByName(n.target.name)[0].contentWindow.document;
                }
                else {
                    console.log("Frame in frame")
                    currentWindow = n.target;
                    listenerObject = iframe.getElementsByName(n.target.name)[0].contentWindow.document;

                }
                runListener(listenerObject)
                checkIfLeft(listenerObject, n.target.tagName)
            }
        }
    }

    // When clicked send data to the sendData function
    const returnClickedObject = async (p) => {
        if (shouldRecordAction) {
            var currentlyClickedObject = decideSelector(p.target)
            await sendData(currentlyClickedObject)
        }
    }

    // Main listener functions for hover and click
    function runListener(listenerObject) {
        console.log("Listener running at: " + listenerObject)
        listenerObject.addEventListener('mouseover', returnHoveredObject);
        listenerObject.addEventListener('mouseup', returnClickedObject);
    }

    function stopListener(listenerObject) {
        console.log("Listener stopped")
        listenerObject.removeEventListener('mouseover', returnHoveredObject);
        listenerObject.removeEventListener('click', returnClickedObject);
    }

    function checkIfLeft(listenerObject, frame) {
        listenerObject.addEventListener('mouseleave', async (e) => {
            stopListener(listenerObject)
            if (frame == "IFRAME") {
                inFrameinFrame = false;
                listenerObject = document.getElementsByName("main")[0].contentWindow.document;
            }
        }, { once: true })
    }

    // Running the main listener for the web pages
    runListener(listenerObject);

    // Send the data to background.js, that will then execute the api call to the app
    async function sendData(e) {

        // Call the main locator generator when generating the test string
        let finalString = generateLocator(e, listenerObject);
        console.log(finalString)
        alert(`Action recorded with ${e}`)
        shouldRecordAction = false;

        (async () => {
            const response = await chrome.runtime.sendMessage({ message: "JSON object", actions: "selectElement", value: finalString });

            // Remove hover style after screenshot has been taken in the message sent to the background.js
            if (e) {
                e.style.border = null;
            }
        })();
    }
}

function generateLocator(e, listener) {
    let locator = "";
    let acceptedRoles = ["tab", "alert", "alertdialog", "application", "article", "banner", "blockquote", "button", "caption", "cell", "checkbox", "code", 
    "columnheader", "combobox", "complementary", "contentinfo", "definition", "deletion", "dialog", "directory", "document", 
    "emphasis", "feed", "figure", "form", "generic", "grid", "gridcell", "group", "heading", "img", "insertion", "link", "list", 
    "listbox", "listitem", "log", "main", "marquee", "math", "meter", "menu", "menubar", "menuitem", "menuitemcheckbox", 
    "menuitemradio", "navigation", "none", "note", "option", "paragraph", "presentation", "progressbar", "radio","radiogroup", 
    "region", "row", "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton", "status", 
    "strong", "subscript", "superscript", "switch", "tab", "table", "tablist", "tabpanel", "term", "textbox", "time", "timer", 
    "toolbar", "tooltip", "tree", "treegrid", "treeitem"]

    // Locator generator
    if (e.getAttribute('placeholder')) {
        locator += `getByPlaceholder(\'${e.getAttribute('placeholder')}\')`
    } else if (e.tagName == "IMG" && e.hasAttribute('href')) {
        if (e.getAttribute("alt")) {
            locator += `getByRole('img', { name: '${e.getAttribute("alt")}' })`
        }
        else if (e.get)
        locator += `locator(\'link >> text=${e.getAttribute(alt)}\'})`
    } else if (acceptedRoles.includes(e.getAttribute("role"))) {
        locator += `getByRole('${e.getAttribute("role")}', { name: '${e.innerText.replace(/(\r\n|\n|\r)/gm, "")}' })`
    } else if (e.tagName == 'INPUT') {
        if (e.getAttribute("type") == 'button') {
            locator += `getByRole(\'button\', { name: '${e.value}', exact: true })`
        }
        else if (e.getAttribute("type") == 'text') {
            var labels = listener.getElementsByTagName('LABEL');
            for (let i = 0; i < labels.length; i++) {
                if (labels[i].htmlFor == e.id) {
                    locator += `getByLabel('${labels[i].innerText}')`
                }
            }
        }
        else {
            locator += `locator(\'${e.tagName} >> #${e.id}')`
        }
    } else if (e.innerText.length > 0 || e.innerText.length < 25) {
        locator += `locator(\'${e.tagName} >> text=${e.innerText.replace(/(\r\n|\n|\r)/gm, "")}\')`;
    } else {
        locator += `locator(\'${e.tagName} >> #${e.id}\')`
    }

    // Iframe detector
    if (inFrame) {
        if (inFrameinFrame && currentWindow.name != "main") {
            return "await page.frameLocator(`frame[name='" + frame1Name + "']`).frameLocator(\'#" + frame2name + "\')." + locator + ".first().click();";
        }
        if (e.tagName == 'SPAN' && e.innerText == 'Menu') {
            return "await page.waitForTimeout(5000); await page.frameLocator(`frame[name='" + frame1Name + "']`)." + locator + ".first().click(); ";
        }
        return "await page.frameLocator(`frame[name='" + frame1Name + "']`)." + locator + ".first().click();";
    }
    else {
        return `await page.${locator}.first().click();`;
    }
}

// Gets the current index position in the class tree
function getIndex(node) {
    let i = 1;
    let tagName = node.tagName;

    while (node.previousSibling) {
        node = node.previousSibling;
        if (
            node.nodeType === 1 &&
            tagName.toLowerCase() == node.tagName.toLowerCase()
        ) {
            i++;
        }
    }
    return i;
}
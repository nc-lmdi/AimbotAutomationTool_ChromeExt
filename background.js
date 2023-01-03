chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        console.log("Request message is: " + request.message)

        if (request.message == "Inject inspector") {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "run_record_command" }, function (response) { });
            });
        }

        if (request.message == "JSON object") {
            let data;
            chrome.tabs.query({ active: true }, async function (tabs) {
                await chrome.tabs.captureVisibleTab(function (dataUrl) {

                    data = request;
                    data["screenshot"] = dataUrl;
                    console.log(dataUrl)

                    jsonData = JSON.stringify(data);

                    sendResponse({ farewell: "Background.js received data" });

                    const response = fetch("http://localhost:3000/createTestStep", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: jsonData
                    })

                    console.log("API responded with: " + response)
                })
            });
        }
    }
);

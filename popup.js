document.addEventListener("click", async (e) => {
            const response = chrome.runtime.sendMessage({ message: "Inject inspector" });
            // do something with response here, not outside the function
            console.log(response);
})
chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, { "requestType": "pageActionClicked" }, null);
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var requestType = request.requestType;
        if (requestType == "initializePageActionIcon") {
            chrome.pageAction.show(sender.tab.id);
        }
    }
);
chrome.pageAction.onClicked.addListener(function(tab) {
    var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
        return (tabObject.tabId === tab.id);
    });
    var actionType = "maximize";
    if (typeof biggestFlashPerTab[existingTabIndex] === "object" && biggestFlashPerTab[existingTabIndex].isAlreadyMaximized === true) {
        actionType = "restore";
    }
    if (existingTabIndex !== -1) {
        biggestFlashPerTab.splice(existingTabIndex, 1);
    }

    chrome.tabs.sendMessage(tab.id, { "requestType": "pageActionClicked", "actionType": actionType }, function(response) {});
});

chrome.tabs.onUpdated.addListener(function(tabId, change) {
    if (change.status == "loading") {
        chrome.pageAction.show(tabId);
    }
});

var biggestFlashPerTab = [];

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var requestType = request.requestType;
        if (requestType == "initializePageActionIcon") {
            var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
                return (tabObject.tabId === sender.tab.id);
            });
            if (existingTabIndex !== -1) {
                biggestFlashPerTab.splice(existingTabIndex, 1);
            }
            chrome.pageAction.show(sender.tab.id);
        } else if (requestType == "resizeFlash") {
            var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
                return (tabObject.tabId === sender.tab.id);
            });
            if (existingTabIndex == -1) {
                return;
            }
            biggestFlashPerTab[existingTabIndex].windowWidth = request.windowWidth;
            biggestFlashPerTab[existingTabIndex].windowHeight = request.windowHeight;
            sendResizeEventToTab(sender.tab.id);
        } else if (requestType == "areaOfFlashInFrame") {
            var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
                return (tabObject.tabId === sender.tab.id);
            });
            if (existingTabIndex == -1) {
                var timeoutId = -1;
                if (request.isFrameTop === true) {
                    timeoutId = sendResponseIfValid(sender.tab.id, 10);
                }
                var tabData = { tabId: sender.tab.id, href: request.href, area: request.area, originalAspectRatio: request.originalAspectRatio, timeoutId: timeoutId };
                if (request.isFrameTop === true) {
                    tabData.windowWidth = request.windowWidth;
                    tabData.windowHeight = request.windowHeight;
                }
                biggestFlashPerTab.push(tabData);
            } else {
                if (biggestFlashPerTab[existingTabIndex].area < request.area) {
                    biggestFlashPerTab[existingTabIndex].area = request.area;
                    biggestFlashPerTab[existingTabIndex].href = request.href;
                }
                if (request.isFrameTop === true) {
                    biggestFlashPerTab[existingTabIndex].windowWidth = request.windowWidth;
                    biggestFlashPerTab[existingTabIndex].windowHeight = request.windowHeight;
                }
                if (biggestFlashPerTab[existingTabIndex].area > 1 && biggestFlashPerTab[existingTabIndex].windowWidth != null) {
                    clearTimeout(biggestFlashPerTab[existingTabIndex].timeoutId);
                    var timeoutId = sendResponseIfValid(sender.tab.id, 10);
                    biggestFlashPerTab[existingTabIndex].timeoutId = timeoutId;
                }
            }
        }
    }
);

function sendResponseIfValid(tabId, intervalsLeft) {
    var timeoutId = setTimeout(function() {
        var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
            return (tabObject.tabId === tabId);
        });
        if (existingTabIndex !== -1 && biggestFlashPerTab[existingTabIndex].area > 1 && biggestFlashPerTab[existingTabIndex].windowWidth != null) {
            sendResponseToTab(tabId);
        } else {
            sendResponseIfValid(tabId, intervalsLeft--);
        }
    }, 20);
    return timeoutId;
}

function sendResponseToTab(tabId) {
    var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
        return (tabObject.tabId === tabId);
    });
    if (existingTabIndex == -1) {
        return;
    }
    chrome.tabs.sendMessage(tabId, {
        "requestType": "maximizeFlashForThisFrame",
        href: biggestFlashPerTab[existingTabIndex].href,
        windowWidth: biggestFlashPerTab[existingTabIndex].windowWidth,
        windowHeight: biggestFlashPerTab[existingTabIndex].windowHeight,
    });
    biggestFlashPerTab[existingTabIndex] = {
        tabId: tabId,
        href: biggestFlashPerTab[existingTabIndex].href,
        originalAspectRatio: biggestFlashPerTab[existingTabIndex].originalAspectRatio,
        isAlreadyMaximized: true
    };
}

function sendResizeEventToTab(tabId) {
    var existingTabIndex = _.findIndex(biggestFlashPerTab, function(tabObject) {
        return (tabObject.tabId === tabId);
    });
    if (existingTabIndex == -1) {
        return;
    }
    chrome.tabs.sendMessage(tabId, {
        "requestType": "resizeFlashForFrame",
        href: biggestFlashPerTab[existingTabIndex].href,
        originalAspectRatio: biggestFlashPerTab[existingTabIndex].originalAspectRatio,
        windowWidth: biggestFlashPerTab[existingTabIndex].windowWidth,
        windowHeight: biggestFlashPerTab[existingTabIndex].windowHeight
    });
}
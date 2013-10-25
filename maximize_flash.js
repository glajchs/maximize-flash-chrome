var elementToKeepMaximized = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.requestType == "pageActionClicked") {
        if (elementToKeepMaximized == null) {
            initMaximizeFlash();
        } else {
            restoreFlash();
        }
    }
});

chrome.runtime.sendMessage({ requestType: "initializePageActionIcon" }, function() {});


function initMaximizeFlash() {
    var possibleElements = $("object, embed");
    if (possibleElements.size() == 0) {
        return;
    } else if (possibleElements.size() == 1) {
        elementToKeepMaximized = possibleElements.get(0);
    } else {
        var currentWinnerElement = possibleElements.get(0);
        for (var i = 1 ; i < possibleElements.size(); i++) {
            var currentWinnerElementArea = $(currentWinnerElement).width() * $(currentWinnerElement).height();
            var possibleWinnerElementArea = $(possibleElements.get(i)).width() * $(possibleElements.get(i)).height();
            if (possibleWinnerElementArea > currentWinnerElementArea) {
                currentWinnerElement = possibleElements.get(i);
            }
        }
        elementToKeepMaximized = currentWinnerElement;
    }

    $(elementToKeepMaximized).get(0).style.originalWidth = $(elementToKeepMaximized).getElementStyle("width");
    $(elementToKeepMaximized).get(0).style.originalHeight = $(elementToKeepMaximized).getElementStyle("height");
    $(elementToKeepMaximized).get(0).style.originalPosition = $(elementToKeepMaximized).getElementStyle("position");
    $(elementToKeepMaximized).get(0).style.originalZIndex = $(elementToKeepMaximized).getElementStyle("z-index");
    $(elementToKeepMaximized).get(0).style.originalTop = $(elementToKeepMaximized).getElementStyle("top");
    $(elementToKeepMaximized).get(0).style.originalLeft = $(elementToKeepMaximized).getElementStyle("left");
    maximizeFlash();
    $(window).bind("resize", maximizeFlash);
}

function endsWith(stringToCompare, substring) {
    var indexOfSubstring = stringToCompare.lastIndexOf(substring);
    return (indexOfSubstring != -1 && (indexOfSubstring + substring.length == stringToCompare.length));
}

function restoreCSSValue(originalCssValue, cssProperty) {
    if (originalCssValue == null) {
        $(elementToKeepMaximized).important(cssProperty, false);
        $(elementToKeepMaximized).css(cssProperty, "");
    } else if (endsWith(originalCssValue, "!important;")) {
        var newStr = originalCssValue.substring(0, originalCssValue.lastIndexOf("!important;") - 1);
    } else {
        var newStr = originalCssValue.substring(0, originalCssValue.lastIndexOf(";"));
    }
}

function restoreFlash() {
    $(window).unbind("resize", maximizeFlash);
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalWidth, "width");
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalHeight, "height");
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalPosition, "position");
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalZIndex, "z-index");
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalTop, "top");
    restoreCSSValue($(elementToKeepMaximized).get(0).style.originalLeft, "left");
    elementToKeepMaximized = null;
}

function maximizeFlash() {
    var originalWidth = $(elementToKeepMaximized).width();
    var originalHeight = $(elementToKeepMaximized).height();
    var aspectRatio = originalWidth / originalHeight;
    var windowWidth = $(window).width();
    var windowHeight = $(window).height();
    var windowAspectRatio = windowWidth / windowHeight;
    if (aspectRatio <= windowAspectRatio) {
        $(elementToKeepMaximized).css({
            "height": windowHeight + "px",
            "width": Math.floor(windowHeight * aspectRatio) + "px",
            "position": "fixed",
            "z-index": "2147483647",
            "top": "0px",
            "left": "0px"
        }, true);
    } else {
        $(elementToKeepMaximized).css({
            "height": Math.floor(windowWidth / aspectRatio) + "px",
            "width": windowWidth + "px",
            "position": "fixed",
            "z-index": "2147483647",
            "top": "0px",
            "left": "0px"
        }, true);
    }
}
var elementToKeepMaximized = null;
var parentOfElementToKeepMaximized = null;
var playerControlsElement = null;
var originalData = {
    element: {},
    parent: {},
    playerControls: {},
    iframe: {},
    iframeURL: ""
};
var windowWidth = 0;
var windowHeight = 0;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.requestType == "pageActionClicked") {
        if (request.actionType == "maximize") {
            findLargestFlashForThisFrame();
            var area = $(elementToKeepMaximized).width() * $(elementToKeepMaximized).height();
            if (area > 1 || window.self == window.top) {
                chrome.runtime.sendMessage({
                    requestType: "areaOfFlashInFrame",
                    isFrameTop: window.self == window.top,
                    windowWidth: $(window).width(),
                    windowHeight: $(window).height(),
                    href: window.location.href,
                    area: $(elementToKeepMaximized).width() * $(elementToKeepMaximized).height(),
                    originalAspectRatio: originalData.originalAspectRatio
                });
            }
        } else {
            if (window.self == window.top) {
                $(window).unbind("resize", resizeFlash);
            }
            if (elementToKeepMaximized != null) {
                restoreFlash();
            } else if (window.self == window.top) {
                _.forEach($("iframe"), function(iframe) {
                    if (iframe.src == originalData.iframeURL) {
                        _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
                            restoreCSSValue(iframe, originalData.iframe, cssProperty);
                            restoreCSSValue($(iframe).parent(), originalData.parent, cssProperty);
                        });
                    }
                });
            }
            
        }
    } else if (request.requestType == "maximizeFlashForThisFrame") {
        if (window.self == window.top) {
            var iframes = $("iframe");
            _.forEach(iframes, function(iframe) {
                if (iframe.src == request.href) {
                    originalData.iframeURL = request.href;
                    var parentElement = $(iframe).parent();
                    _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
                        originalData.iframe[cssProperty] = $(iframe).get(0).style[cssProperty];
                    });
                    var stylesToSetOnIFrame = {
                        height: request.windowHeight + "px",
                        width: request.windowWidth + "px",
                        border: "none",
                        margin: "0px",
                        position: "fixed",
                        "z-index": "2147483647",
                        top: "0px",
                        left: "0px",
                        bottom: "initial",
                        right: "initial"
                    };
                    if (parentElement.css("position") === "fixed") {
                        _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
                            originalData.parent[cssProperty] = $(iframe).parent().get(0).style[cssProperty];
                        });
                    }
                    setStylesWithImportantFlag(iframe, stylesToSetOnIFrame);
                    if (parentElement.css("position") === "fixed") {
                        setStylesWithImportantFlag(parentElement, stylesToSetOnIFrame);
                    }
                }
            });
            $(window).bind("resize", resizeFlash);
        }
        if (window.location.href == request.href) {
            windowWidth = request.windowWidth;
            windowHeight = request.windowHeight;
            initMaximizeFlash();
        }
    } else if (request.requestType == "resizeFlashForFrame") {
        if (window.self == window.top) {
            var iframes = $("iframe");
            _.forEach(iframes, function(iframe) {
                if (iframe.src == request.href) {
                    windowWidth = request.windowWidth;
                    windowHeight = request.windowHeight;
                    var windowAspectRatio = windowWidth / windowHeight;
                    var newWidth = 0;
                    var newHeight = 0;
                    if (request.originalAspectRatio <= windowAspectRatio) {
                        newHeight = windowHeight;
                        newWidth = Math.floor(windowHeight * request.originalAspectRatio);
                    } else {
                        newHeight = Math.floor(windowWidth / request.originalAspectRatio);
                        newWidth = windowWidth;
                    }
                    setStyleWithImportantFlag(iframe, "width", newWidth + "px");
                    setStyleWithImportantFlag(iframe, "height", newHeight + "px");
                }
            });
        }
        if (window.location.href == request.href) {
            windowWidth = request.windowWidth;
            windowHeight = request.windowHeight;
            var windowAspectRatio = windowWidth / windowHeight;
            var newWidth = 0;
            var newHeight = 0;
            if (originalData.originalAspectRatio <= windowAspectRatio) {
                newHeight = windowHeight;
                newWidth = Math.floor(windowHeight * originalData.originalAspectRatio);
            } else {
                newHeight = Math.floor(windowWidth / originalData.originalAspectRatio);
                newWidth = windowWidth;
            }
            setStyleWithImportantFlag(elementToKeepMaximized, "width", newWidth + "px");
            setStyleWithImportantFlag(elementToKeepMaximized, "height", newHeight + "px");
            if ($(elementToKeepMaximized).css("position") === "relative") {
                setStyleWithImportantFlag($(parentOfElementToKeepMaximized), "width", newWidth + "px");
                setStyleWithImportantFlag($(parentOfElementToKeepMaximized), "height", newHeight + "px");
            }
        }
    }
});

function resizeFlash() {
    if (elementToKeepMaximized != null) {
        // resize w/out background page request
        windowWidth = $(window).width();
        windowHeight = $(window).height();
        var windowAspectRatio = windowWidth / windowHeight;
        var newWidth = 0;
        var newHeight = 0;
        if (originalData.originalAspectRatio <= windowAspectRatio) {
            newHeight = windowHeight;
            newWidth = Math.floor(windowHeight * originalData.originalAspectRatio);
        } else {
            newHeight = Math.floor(windowWidth / originalData.originalAspectRatio);
            newWidth = windowWidth;
        }
        setStyleWithImportantFlag(elementToKeepMaximized, "width", newWidth + "px");
        setStyleWithImportantFlag(elementToKeepMaximized, "height", newHeight + "px");
        if ($(elementToKeepMaximized).css("position") === "relative") {
            setStyleWithImportantFlag($(parentOfElementToKeepMaximized), "width", newWidth + "px");
            setStyleWithImportantFlag($(parentOfElementToKeepMaximized), "height", newHeight + "px");
        }
        if (window.location.origin.indexOf("youtube.com") !== -1
            && $(elementToKeepMaximized).parent(".html5-video-container").length > 0
            && $(".html5-video-controls").length > 0
            && playerControlsElement !== null) {
            var playerControlsHeight = $(".html5-player-chrome").height() + 3;
            windowHeight -= playerControlsHeight;
            setStyleWithImportantFlag(playerControlsElement, "width", newWidth + "px");
        }
    } else {
        // resize w/background page request
        chrome.runtime.sendMessage({
            requestType: "resizeFlash",
            windowWidth: $(window).width(),
            windowHeight: $(window).height()
        }, function() {});
    }
}

var propertiesToManageForElementAndParent = [ "width", "height", "position", "z-index", "top", "left",
                                              "bottom", "right", "margin", "border" ];

var propertiesToManageForPlayerControlsElement = [ "width", "position", "z-index", "left", "bottom" ];

function findLargestFlashForThisFrame() {
    var possibleElements = $("object, embed, video");
    if (possibleElements.size() == 0) {
        return;
    } else if (possibleElements.size() == 1) {
        elementToKeepMaximized = possibleElements.get(0);
        parentOfElementToKeepMaximized = $(elementToKeepMaximized).parent().get(0);
    } else {
        var currentWinnerElement = possibleElements.get(0);
        for (var i = 1; i < possibleElements.size(); i++) {
            var currentWinnerElementArea = $(currentWinnerElement).width() * $(currentWinnerElement).height();
            var possibleWinnerElementArea = $(possibleElements.get(i)).width() * $(possibleElements.get(i)).height();
            if (possibleWinnerElementArea > currentWinnerElementArea) {
                currentWinnerElement = possibleElements.get(i);
            }
        }
        elementToKeepMaximized = currentWinnerElement;
        parentOfElementToKeepMaximized = $(elementToKeepMaximized).parent().get(0);
    }

    var originalWidth = $(elementToKeepMaximized).width();
    var originalHeight = $(elementToKeepMaximized).height();
    originalData.originalAspectRatio = originalWidth / originalHeight;
}

function initMaximizeFlash() {
    maximizeFlash();
}

function restoreCSSValue(element, original, cssProperty) {
    var originalStyle = original[cssProperty];
    if (originalStyle == null) {
        $(element).important(cssProperty, false);
        $(element).css(cssProperty, "");
    } else {
        $(element).important(cssProperty, false);
        $(element).css(cssProperty, originalStyle);
    }
}

function restoreFlash() {
    if (elementToKeepMaximized != null) {
        var currentPosition = $(elementToKeepMaximized).css("position");
        if (playerControlsElement !== null) {
            _.forEach(propertiesToManageForPlayerControlsElement, function(cssProperty) {
                restoreCSSValue(playerControlsElement, originalData.playerControls, cssProperty);
            });
        }
        _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
            restoreCSSValue(elementToKeepMaximized, originalData.element, cssProperty);
        });
        if (currentPosition === "relative" || $(parentOfElementToKeepMaximized).css("position") === "fixed") {
            _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
                restoreCSSValue($(parentOfElementToKeepMaximized), originalData.parent, cssProperty);
            });
        }
        elementToKeepMaximized = null;
        parentOfElementToKeepMaximized = null;
    }
}

function getOriginalStyleAttributeName(styleAttributeName) {
    if (styleAttributeName === "z-index") {
        return "maximizeFlashOriginalZIndex";
    }
    return "maximizeFlashOriginal" + styleAttributeName[0].toUpperCase() + styleAttributeName.substring(1, styleAttributeName.length);
}

function setStyleWithImportantFlag(element, cssProperty, cssPropertyValue) {
    $(element).important(cssProperty, false);
    $(element).css(cssProperty, cssPropertyValue, true);
}

function setStylesWithImportantFlag(element, cssProperties) {
    _.forOwn(cssProperties, function(propertyValue, propertyName) {
        setStyleWithImportantFlag(element, propertyName, propertyValue);
    });
}

function maximizeFlash() {
    var newPosition = ($(elementToKeepMaximized).css("position") === "relative" || $(elementToKeepMaximized).css("position") === "static")
            ? "relative" : "fixed";
    if ($(elementToKeepMaximized).css("position") === "relative" || $(elementToKeepMaximized).css("position") === "static") {
        $(elementToKeepMaximized).css("position", "relative", true);
    }
    var windowAspectRatio = windowWidth / windowHeight;
    var newWidth = 0;
    var newHeight = 0;
    if (originalData.originalAspectRatio <= windowAspectRatio) {
        newHeight = windowHeight;
        newWidth = Math.floor(windowHeight * originalData.originalAspectRatio);
    } else {
        newHeight = Math.floor(windowWidth / originalData.originalAspectRatio);
        newWidth = windowWidth;
    }

    var stylesToSetOnElementAndParent = {
        height: newHeight + "px",
        width: newWidth + "px",
        border: "none",
        margin: "0px",
        position: newPosition,
        "z-index": "2147483647",
        top: "0px",
        left: "0px",
        bottom: "initial",
        right: "initial"
    };

    _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
        originalData.element[cssProperty] = $(elementToKeepMaximized).get(0).style[cssProperty];
    });
    setStylesWithImportantFlag(elementToKeepMaximized, _.merge(_.clone(stylesToSetOnElementAndParent), { position: newPosition }));
    if (newPosition === "relative" || $(parentOfElementToKeepMaximized).css("position") === "fixed") {
        _.forEach(propertiesToManageForElementAndParent, function(cssProperty) {
            originalData.parent[cssProperty] = $(parentOfElementToKeepMaximized).get(0).style[cssProperty];
        });
        setStylesWithImportantFlag(parentOfElementToKeepMaximized, _.merge(_.clone(stylesToSetOnElementAndParent), { position: "fixed" }));
    }
    if (window.location.origin.indexOf("youtube.com") !== -1
        && $(elementToKeepMaximized).parent(".html5-video-container").length > 0
        && $(".html5-video-controls").length > 0) {
        playerControlsElement = $(".html5-video-controls").get(0);
        var playerControlsHeight = $(".html5-player-chrome").height() + 3;
        windowHeight -= playerControlsHeight;
        _.forEach(propertiesToManageForPlayerControlsElement, function(cssProperty) {
            originalData.playerControls[cssProperty] = playerControlsElement.style[cssProperty];
        });
        setStyleWithImportantFlag(playerControlsElement, "width", newWidth + "px");
        setStyleWithImportantFlag(playerControlsElement, "position", "fixed");
        setStyleWithImportantFlag(playerControlsElement, "left", "0px");
        setStyleWithImportantFlag(playerControlsElement, "bottom", "0px");
        setStyleWithImportantFlag(playerControlsElement, "z-index", 2147483647);
    }
}

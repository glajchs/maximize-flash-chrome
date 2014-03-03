/*!
* !important
*   github.com/premasagar/important/
*
*//*
    css !important manipulator (jQuery plugin)

    by Premasagar Rose
        dharmafly.com

    license
        opensource.org/licenses/mit-license.php
        
    v0.2

*//*
    creates methods
        jQuery.important(boolean)
        jQuery(elem).important(boolean)
        jQuery(elem).isStyleNameSet()
        jQuery(elem).isImportant()

    and wraps the native jQuery CSS methods: css(), width(), height(),
    allowing an optional last argument of boolean true, to pass the request through the !important function
    
    use jQuery.important.noConflict() to revert back to the native jQuery methods, and returns the overriding methods
    
    reference
        http://www.w3.org/TR/CSS2/syndata.html#tokenization

*/
(function($){
    'use strict';

    // return a regular expression of a declaration, with the backreferences as the CSS property and the value
    function find(property, rules){
        var match = rules.match(regexDeclaration(property));
        if (match){
            // a bit inelegant: remove leading semicolon if present
            match[0] = match[0].replace(/^;/, '');
        }
        return match;
    }
    function regexDeclaration(property){
        return new RegExp('(?:^|\\s|;)(' + property + ')\\s*:\\s*([^;]*(?:;|$))', 'i');
    }
    // create CSS text from property & value, optionally inserting it into the supplied CSS rule
    // e.g. declaration('width', '50%', 'margin:2em; width:auto;');
    function cssDeclaration(property, value, rules, makeImportant, elem){ // if value === null, then remove from style; if style then merge with that
        var oldDeclaration, newDeclaration;
        
        rules = rules || '';
        oldDeclaration = find(property, rules);

        if (value === null){
            newDeclaration = '';
        }
        else if (typeof value === 'string'){
            newDeclaration = property + ': ' + value + ((makeImportant) ? ' !important;' : ';');
        }

        if (oldDeclaration){
            if (typeof value === 'boolean'){
                makeImportant = value;
                newDeclaration = $.important(property + ': ' + oldDeclaration[2], makeImportant);
            }
            if (oldDeclaration[0][0] === " ") {
                newDeclaration = " " + newDeclaration;
            }
            rules = rules.replace(oldDeclaration[0], newDeclaration);
        }
        
        else if (typeof newDeclaration !== 'undefined'){
            rules = $.trim(rules);
            if (rules !== ''){
                if (rules.slice(-1) !== ';'){
                    rules += ';';
                }
                rules += ' ';
            }
            rules += newDeclaration;
        }
        return rules;
    }
    
    
    // Add !important to CSS rules if they don't already have it
    function toImportant(rulesets, makeImportant){
        // Cache regular expression
        var re = toImportant.re;
        if (!re){
            re = toImportant.re =
                /\s*(! ?important)?[\s\r\t\n]*;/g;
                // TODO: Make this regexp handle missing semicolons at the end of a ruleset
        }
        if (makeImportant === false){
            return rulesets.replace(re, ';');
        }
        return rulesets.replace(re, function($0, $1){
            return $1 ? $0 : ' !important;';
        });
    }
    
    function htmlStylesToImportant(html, makeImportant){
        // Cache regular expression
        var re = htmlStylesToImportant.re;
        if (!re){
            re = htmlStylesToImportant.re =
                /(?=<style[^>]*>)([\w\W]*?)(?=<\/style>)/g;
        }
        return html.replace(re, function($0, rulesets){
            return toImportant(rulesets, makeImportant);
        });
    }

    
    var important = false;
    var original = {};
    var controller = {};

    // TODO: other methods to be supported
    /*,
     show: function(){},
     hide: function(){},
     animate: function(){}
     */
    $.each([ "css" ], function(index, method) {
        original[method] = $.fn[method];
        controller[method] = function() {
            var args = $.makeArray(arguments);
            var elem = $(this);
            if (elem.length < 1) {
                return original[method].apply(elem, args);
            }
            if (args.length < 1) {
                // Invalid to have no arguments, but just pass it through to let jQuery do it's default handling
                return original[method].apply(elem);
            } else if (typeof args[0] === "object") {
                if (typeof args[0].length === "number") {
                    // .css(propertyNames) --- GET
                    return original[method].apply(elem, args);
                } else {
                    // .css(properties) --- SET
                    // .css(properties, important) --- SET
                    var returnValue = true;
                    var propertyNames = Object.keys(args[0]);
                    for (var i = 0; i < propertyNames.length; i++) {
                        var propertyName = propertyNames[i];
                        var propertyValue = args[0][propertyNames[i]];
                        var isImportantParam = args[1];
                        returnValue = (!returnValue) ? returnValue : applyStyleToElement(elem, propertyName,
                                propertyValue, (isImportantParam === true || important === true), method, [propertyName, propertyValue]);
                    }
                    return returnValue;
                }
            } else if (args.length === 1) {
                // .css(propertyName) --- GET
                return original[method].apply(elem, args);
            } else if (args.length >= 2) {
                // This is a setter, using one of the following formats:
                // .css(name, value) --- SET
                // .css(name, function) --- SET
                // .css(name, value, important) --- SET
                // .css(name, function, important) --- SET
                var propertyName = args[0];
                var propertyValue = args[1];
                var isImportantParam = args[2];
                return applyStyleToElement(elem, propertyName, propertyValue, (isImportantParam === true || important === true), method, [propertyName, propertyValue]);
            } else {
                // This is an invalid set of arguments, or there is a bug in our processing of
                // the different ways .css() can be called so just call the original function
                return original[method].apply(elem, args);
            }
        };
    });
    $.each([ "width", "height" ], function(index, method) {
        original[method] = $.fn[method];
        controller[method] = function() {
            var args = $.makeArray(arguments);
            var elem = $(this);
            if (elem.length < 1) {
                return original[method].apply(elem, args);
            }
            if (args.length < 1) {
                // .width() --- GET
                return original[method].apply(elem);
            } else {
                // .width(value) --- SET
                // .width(function) --- SET
                // .width(value, important) --- SET
                // .width(function, important) --- SET
                var propertyName = method;
                var propertyValue = args[0];
                var isImportantParam = args[1];
                return applyStyleToElement(elem, propertyName, propertyValue, (isImportantParam === true || important === true), method, [propertyValue]);
            }
        };
    });

    // Taken from jQuery 1.10.  The "ms-" conversion is because some ie styles have the leading "-"
    function camelCaseStyleName(string) {
        return string
                .replace(/^-ms-/, "ms-")
                .replace(/-([\da-z])/gi, function(all, letter) {
                    return letter.toUpperCase();
                });
    }

    function applyStyleToElement(elem, propertyName, propertyValue, makeImportant, method, methodArgs) {
        var complexStyles = [
            {
                baseStyle: "background",
                subStyles: [ "background-attachment", "background-color", "background-image",
                             "background-position", "background-repeat" ]
            },
            {
                baseStyle: "border-width",
                subStyles: [ "border-top-width", "border-right-width", "border-bottom-width", "border-left-width" ]
            },
            {
                baseStyle: "border-style",
                subStyles: [ "border-top-style", "border-right-style", "border-bottom-style", "border-left-style" ]
            },
            {
                baseStyle: "border-color",
                subStyles: [ "border-top-color", "border-right-color", "border-bottom-color", "border-left-color" ]
            },
            {
                baseStyle: "border",
                subStyles: [ "border-width", "border-top-width", "border-right-width",
                             "border-bottom-width", "border-left-width", "border-top-style",
                             "border-right-style", "border-bottom-style", "border-left-style",
                             "border-top-color", "border-right-color", "border-bottom-color",
                             "border-left-color", "border-top", "border-right", "border-bottom",
                             "border-left", "border-style", "border-spacing", "border-color",
                             "border-collapse" ]
            },
            {
                baseStyle: "font",
                subStyles: [ "font-weight", "font-variant", "font-style", "font-size", "font-family" ]
            },
            {
                baseStyle: "list-style",
                subStyles: [ "list-style-type", "list-style-position", "list-style-image" ]
            },
            {
                baseStyle: "margin",
                subStyles: [ "margin-top", "margin-right", "margin-bottom", "margin-left" ]
            },
            {
                baseStyle: "outline",
                subStyles: [ "outline-width", "outline-style", "outline-color" ]
            },
            {
                baseStyle: "padding",
                subStyles: [ "padding-top", "padding-right", "padding-bottom", "padding-left" ]
            }
        ];

        var existingStylesWithImportant = [];

        for (var i = 0; i < complexStyles.length; i++) {
            if (camelCaseStyleName(propertyName) === camelCaseStyleName(complexStyles[i].baseStyle)) {
                existingStylesWithImportant.push(complexStyles[i].baseStyle);
                $(elem).important(complexStyles[i].baseStyle, false);
                for (var j = 0; j < complexStyles[i].subStyles.length; j++) {
                    if (elem.isImportant(complexStyles[i].subStyles[j])) {
                        existingStylesWithImportant.push(complexStyles[i].subStyles[j]);
                        $(elem).important(complexStyles[i].subStyles[j], false);
                    }
                }
            }
            for (var j = 0; j < complexStyles[i].subStyles.length; j++) {
                if (camelCaseStyleName(propertyName) === camelCaseStyleName(complexStyles[i].subStyles[j])) {
                    if (elem.isImportant(complexStyles[i].subStyles[j])) {
                        existingStylesWithImportant.push(complexStyles[i].subStyles[j]);
                        $(elem).important(complexStyles[i].subStyles[j], false);
                    }
                    if (elem.isImportant(complexStyles[i].baseStyle)) {
                        existingStylesWithImportant.push(complexStyles[i].baseStyle);
                        $(elem).important(complexStyles[i].baseStyle, false);
                    }
                    break;
                }
            }
            if ($.grep(complexStyles[i].subStyles, function(value) { return camelCaseStyleName(value) === camelCaseStyleName(propertyName); }).length > 0) {
                if (elem.isStyleNameSet(complexStyles[i].baseStyle)) {
                    existingStylesWithImportant.push(complexStyles[i].baseStyle);
                    $.merge(existingStylesWithImportant, complexStyles[i].subStyles);
                }
            }
        }
        if (elem.isImportant(propertyName)) {
            existingStylesWithImportant.push(propertyName);
            $(elem).important(propertyName, false);
        }

        var retVal = original[method].apply(elem, methodArgs);

        if (makeImportant === true) {
            for (var i = 0; i < existingStylesWithImportant.length; i++) {
                $(elem).important(existingStylesWithImportant[i], true);
            }
            $(elem).important(propertyName, true);
        }

        return retVal;
    }
    
    // Override the native jQuery methods with new methods
    $.extend($.fn, controller);
    
    // jQuery.important
    $.important = $.extend(
        function(){
            var
                args = $.makeArray(arguments),
                makeImportant, cacheImportant;
            
            if (typeof args[0] === 'string'){
                if (typeof args[1] === 'undefined' || typeof args[1] === 'boolean'){
                    makeImportant = (args[1] !== false);
                    
                    return (/<\w+.*>/).test(args[0]) ?
                         htmlStylesToImportant(args[0], makeImportant) :
                         toImportant(args[0], makeImportant);
                }
            }
            
            // If a function is passed, then execute it while the !important flag is set to true
            else if ($.isFunction(args[0])){
                cacheImportant = important;
                $.important.status = important = true;
                args[0].call(this);
                $.important.status = important = cacheImportant;
            }
            
            else if (typeof args[0] === 'undefined' || typeof args[0] === 'boolean'){
                $.important.status = important = (args[0] !== false);
            }
            
            return important;
        },
        {
            status: important,
        
            // release native jQuery methods back to their original versions
            noConflict: function(){
                $.each(original, function(method, fn) {
                    $.fn[method] = fn;
                });
            },
            
            declaration: cssDeclaration
        }
    );

    $.fn.getElementStyle = function(cssProperty) {
        if (typeof cssProperty !== 'string') {
            return null;
        }
        var elem = $(this);
        if (elem.length === 0) {
            return null;
        }
        var existingProperty = find(cssProperty, elem.get(0).style.cssText);
        if (existingProperty == null || existingProperty.length < 3) {
            return null;
        } else {
            return existingProperty[2];
        }
    };

    $.fn.isStyleNameSet = function(cssProperty) {
        if (typeof cssProperty !== 'string') {
            return null;
        }
        var elem = $(this);
        if (elem.length === 0) {
            return null;
        }
        var existingProperty = find(cssProperty, elem.get(0).style.cssText);
        if (existingProperty == null) {
            return null;
        } else {
            return true;
        }
    };

    $.fn.isImportant = function(cssProperty) {
        if (typeof cssProperty !== 'string') {
            return null;
        }
        var elem = $(this);
        if (elem.length === 0) {
            return null;
        }
        var existingProperty = find(cssProperty, elem.get(0).style.cssText);
        if (existingProperty == null) {
            return null;
        }
        if (existingProperty.length < 3) {
            return false;
        } else {
            var existingPropertyValue = $.trim(existingProperty[2]);
            if (existingPropertyValue.lastIndexOf("!important;") + "!important;".length == existingPropertyValue.length) {
                return true;
            } else if (existingPropertyValue.lastIndexOf("!important") + "!important".length == existingPropertyValue.length) {
                return true;
            }
            return false;
        }
    };

    // jQuery(elem).important()
    $.fn.important = function(method){
        var
            elem = $(this),
            args = $.makeArray(arguments).concat(true),
            nodeName = elem.data('nodeName'),
            property, makeImportant, fn, oldStyleElem, newStyleInsert, newStyleInsertVerb;
                
        // .css() is the default method, e.g. $(elem).important({border:'1px solid red'});
        if (typeof method === 'undefined' || typeof method === 'boolean'){
            // special behaviour for specific elements
            if (!nodeName){
                nodeName = elem.attr('nodeName').toLowerCase();
                elem.data('nodeName', nodeName);
            }
            // style elements
            if (nodeName === 'style'){
                makeImportant = (method !== false);
                
                elem.html(
                    toImportant(elem.html(), makeImportant)
                );
                
                var stylesheet = elem.attr('sheet');
                if (stylesheet && stylesheet.cssRules){
                    $.each(stylesheet.cssRules, function(i, rule){
                        if (rule.type === CSSRule.STYLE_RULE){
                            rule.style.cssText = $.important(rule.style.cssText, makeImportant);
                        }
                    });
                }
            }
            else {
                elem.attr(
                    'style',
                    $.important(elem.attr('style'), method)
                );
            }
            return elem;
        }
        else if (typeof method === 'object'){
            args.unshift('css');
            return elem.important.apply(this, args);
        }
        else if (typeof method === 'string'){
            // switch the !important statement on or off for a particular property in an element's inline styles - but instead of elem.css(property), they should directly look in the style attribute
            // e.g. $(elem).important('padding');
            // e.g. $(elem).important('padding', false);
            property = method;
            makeImportant = (args[1] === true);

            elem.attr(
                'style',
                cssDeclaration(property, makeImportant, elem.attr('style'))
            );
        }
        // pass a function, which will be executed while the !important flag is set to true
        /* e.g.
            elem.important(function(){
                $(this).css('height', 'auto');
            });
        */
        else if ($.isFunction(method)){
            fn = method;
            $.important.call(this, fn);
        }
               
        return elem;
    };
}(jQuery));

/*
    NOTES:
    http://dev.w3.org/csswg/cssom/#dom-cssstyledeclaration-getpropertypriority
    $('style')[0].sheet.cssRules[0].style.getPropertyPriority('color');
    cssText on style object possible
*/
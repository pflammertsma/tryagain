window.addEventListener("load", function(e) { TryAgain.init(); }, false);

var TryAgain = {
    version: '3.4.3',
    STATUS_UNKNOWN: 0,
    STATUS_POLLING: 1,
    STATUS_LOCAL: 2,
    STATUS_GLOBAL: 3,
    strbundle: 0,
    downStatus: [],
    httpRequest: false,
    xulButtons: 0,
    downCheckServers: {
            downforeojm: [ "http://downforeveryoneorjustme.com/%url%?src=%source%", "<title>([^<]*)</title>", "It's not just you!", "It's just you." ],
            uptimeauditor: [ "http://uptimeauditor.com/quicksitecheck.php?x=%url%&src=%source%", "/(fail|ok).gif", "fail", "ok" ],
        },
    debug: function(msg) { TryAgain_prefs.console.logStringMessage(msg); },
    error: function(msg) { Components.utils.reportError(msg); },
    trace: function(doc, err, msg) {
        if (msg) {
            Components.utils.reportError(msg);
        }
        if (err) {
            TryAgain.error(err);
        }
        if (doc) {
            var trc = "<ul style=\"font-size:80%\">";
            trc += "<li>" + err.fileName + ":" + err.lineNumber + "</li>";
            if (err.stack) {
                var lines = err.stack.split('\n');
                // End one early because the line ends with a linebreak
                for (var i=0, len=lines.length - 1; i<len; i++) {
                    trc += "<li>" + lines[i] + "</li>";
                }
            }
            trc += "</ul>";
            trc += "<div style=\"font-size:80%\">" + navigator.userAgent + "</div>";
            var errorLongDesc = doc.getElementById("errorLongDesc");
            if (errorLongDesc) {
                errorLongDesc.innerHTML +=
                      "<div style=\"-moz-border-radius-bottomleft:10px; -moz-border-radius-bottomright:10px; -moz-border-radius-topleft:10px; -moz-border-radius-topright:10px;border:#F00 2px solid; padding:0 13px; margin:10px 0;\">"
                    + "<p><b>Unable to load TryAgain. Please report the error below <a href=\"http://getsatisfaction.com/tryagain/#problem\">on the support page</a>.</b></p>"
                    + "<blockquote>"
                    + (msg ? "<p>" + msg + "</p>" : "")
                    + (err ? "<p>" + err + "</p>" : "")
                    + (trc ? trc : "")
                    + "</blockquote>"
                    + "</div>";
                errorLongDesc.setAttribute("style", "display: block;");
            }
            var tryagainList = doc.getElementById("tryagainList");
            if (tryagainList) {
                // This element is likely empty due to error; hide it
                tryagainList.setAttribute("style", "display: none;");
            }
        }
    },

    createButton: function(doc, text) {
        var btn;
        if (TryAgain.xulButtons == 0) {
            TryAgain.xulButtons = 1;
            var btn = doc.getElementById('errorTryAgain');
            if (btn) {
                if (btn.nodeName=='button') {
                    TryAgain.xulButtons = 2;
                }
            } else {
                TryAgain.debug("not set: " + btn);
            }
        }
        if (TryAgain.xulButtons == 1) {
            btn = doc.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:button");
            btn.setAttribute("label", TryAgain.getString("text.stop_trying"));
        } else {
            btn = doc.createElement("button");
            btn.innerHTML = TryAgain.getString("text.stop_trying");
        }
        return btn;
    },

    getString: function(str) {
        try {
            return TryAgain.strbundle.getString(str);
        } catch (e) {
            TryAgain.error("missing string: " + str + "; " + e);
            return str;
        }
    },
    getFormattedString: function(str, replacements) {
        try {
            return TryAgain.strbundle.getFormattedString(str, replacements);
        } catch (e) {
            TryAgain.error("missing string: " + str + "; " + e);
            return str;
        }
    },  

    // Executed when application loads
    init: function() {
        try {
            // Load string resource:
            TryAgain.strbundle = document.getElementById("tryagain_strings");
            if (!TryAgain.strbundle) {
                var extensionBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
                TryAgain.strbundle = extensionBundle.createBundle("chrome://tryagain/locale/tryagain.properties");
            }
            
            // Add listener to the PageLoad event:
            var appcontent = document.getElementById("appcontent");
            if (appcontent) {
                appcontent.addEventListener("DOMContentLoaded", TryAgain.onPageLoad, true);
            } else {
                TryAgain.error(new Error("browser cannot be resolved"));
            }

            // Add listener to address bar
            var urlbar = document.getElementById("urlbar");
            urlbar.addEventListener("input", TryAgain.stop, true);

            // Add listener to ESC-key:
            var stop_key = document.getElementById("key_stop");
            stop_key.addEventListener("command", TryAgain.stop, true);

            // Show or hide the menu item:
            if (TryAgain_prefs.getPreference("showmenu")==1) {
                var menu = document.getElementById("TryAgainMenuItem");
                if (menu) {
                    menu.setAttribute("style","");
                    menu.hidden = false;
                }
            }
        } catch (e) {
            TryAgain.trace(document, e);
        }
    },

    // Returns true if the 'Enable TryAgain' menu option is checked.
    isActive: function() {
        return TryAgain_prefs.getPreference("enabled") == 1;
    },

    // Is called when user toggles the 'Enable TryAgain' menu option.
    toggleActive: function(menu) {
        if (menu.getAttribute('checked')=='true') {
            menu.setAttribute('checked',false);
            TryAgain_prefs.savePreference("enabled", 0);
        } else {
            menu.setAttribute('checked',true);
            TryAgain_prefs.savePreference("enabled", 1);
        }
    },

    // Returns the tab from which an onpageload event was fired
    getTabFromPageloadEvent: function(doc) {
        // Enumerate through tabs to find the tab where
        // the event came from:
        var num = gBrowser.browsers.length;
        for (var i = 0; i < num; i++) {
            var b = gBrowser.getBrowserAtIndex(i);
            if (b.contentDocument==doc) {
                return b;
            }
        }
        
        // No tab will be found if the pageload event was fired from within a frame or iframe:
        return false; //gBrowser.mCurrentTab;
    },
    
    // Returns the frame or iframe from which an onpageload event was fired
    getFrameFromPageloadEvent: function(doc) {
        // Enumerate through tabs to find the frame where
        // the event came from:
        var num = gBrowser.browsers.length;
        for (var i = 0; i < num; i++) {
            var b = gBrowser.getBrowserAtIndex(i);
            var result = TryAgain.checkFramesInDocument(b.contentDocument, doc);
            if (result!==false) {
                return result;
            }
        }
        return false;
    },
    
    // Searches through all browsers to find the frame or iframe that fired the pageload event.
    checkFramesInDocument: function(checkDoc, doc) {
        var frames = checkDoc.getElementsByTagName("frame");
        var i, result;
        if (frames) {
            for (i = 0; i < frames.length; i++) {
                if (frames[i].contentWindow.window.document.location == doc.location) {
                    return frames[i];
                } else {
                    result = TryAgain.checkFramesInDocument(frames[i].contentWindow.window.document, doc);
                    if (result!==false) {
                        return result;
                    }
                }
            }
        }
        var iframes = checkDoc.getElementsByTagName("iframe");
        if (iframes) {
            for (i = 0; i < iframes.length; i++) {
                if (iframes[i].contentWindow.window.document.location == doc.location) {
                    return iframes[i];
                } else {
                    result = TryAgain.checkFramesInDocument(iframes[i].contentWindow.window.document, doc);
                    if (result!==false) {
                        return result;
                    }
                }
            }
        }
        return false;
    },
    
    urlify: function(url, tab_uri, for_request) {
        url = url.replace('%source%', 'fx-tryagain-'+TryAgain.version);
        if (!tab_uri) {
            tab_uri = '';
        }
        url = url.replace('%url%', tab_uri);
        url = url.replace('%url_escaped%', escape(tab_uri));
        if (!for_request) {
            url = url.replace('&', '&amp;');
        }
        return url;
    },

    checkDownStatus: function(doc, tab_uri, id, url) {
        try {
            TryAgain.downStatus[id] = TryAgain.STATUS_POLLING;
            var httpRequest = new XMLHttpRequest();
            // Send a request
            url = TryAgain.urlify(url, tab_uri, true);
            httpRequest.open("GET", url, true, null, null);
            httpRequest.send("");
            TryAgain.updateDownStatus(httpRequest, doc, tab_uri, id);
        } catch (e) {
            // General error
            TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
            TryAgain.error(e);
        }
        return httpRequest;
    },
    
    updateDownStatus: function(doc, url, id, httpRequest, regex, matchDown, matchUp) {
        if (httpRequest != false) {
            switch(httpRequest.readyState) {
            case 4:
                var status = httpRequest.status;
                if (status == 200) {
                    var response = httpRequest.responseText;
                    var regexp = new RegExp(regex, "gi");
                    var title = regexp.exec(response);
                    if (title.length == 2) {
                        switch (title[1]) {
                        case matchDown:
                            TryAgain.downStatus[id] = TryAgain.STATUS_GLOBAL;
                            break;
                        case matchUp:
                            TryAgain.downStatus[id] = TryAgain.STATUS_LOCAL;
                            break;
                        default:
                            // The website returned an unknown title
                            TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                            break;
                        }
                    } else {
                        // Regular expression didn't match
                        TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                    }
                } else {
                    // Bad status code
                    TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                }
                break;
            default:
                // TODO issue a timeout
                // No response yet; will try again later
                return false;
            }
        }
        try {
            var server = TryAgain.downCheckServers[id];
            if (!server) {
                TryAgain.debug("downCheckServers not specified");
                return true;
            }
            var status = doc.getElementById('status_'+id);
            if (!status) {
                TryAgain.debug("Required page element missing: status_" + id);
                return true;
            }
            while (url.substr(-1) === "&") {
                // Drop trailing ampersands as it causes an illegal string error
                url = url.substr(0, url.length-1);
            }
            var downStatus = TryAgain.downStatus[id];
            switch (downStatus) {
            case TryAgain.STATUS_POLLING:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div>' + TryAgain.getString("text.site_down_checking") + '</div>';
                break;
            case TryAgain.STATUS_LOCAL:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div style="color:red;"><b>' + TryAgain.getString("text.site_down_local") + '</b> ' +
                    '<a href="'+TryAgain.urlify('http://proxy.org/proxy.pl?url=%url_escaped%&proxy=proxify.com', url) + '">' +
                    TryAgain.getString("text.try_proxy") + '</a>' +
                    '</div>';
                break;
            case TryAgain.STATUS_GLOBAL:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div><b>' + TryAgain.getString("text.site_down_global") + '</b></div>';
                var regexp2 = new RegExp("http[s]?://([^/]*)", "gi");
                var matches = regexp2.exec(url);
                if (matches != null && matches.length == 2) {
                    url = matches[1];
                }
                var errorLongDesc = doc.getElementById('errorShortDescText');
                errorLongDesc.innerHTML = TryAgain.getFormattedString("text.error_site_down", [url]);
                break;
            case TryAgain.STATUS_UNKNOWN:
            default:
                // The website returned an unknown title
                status.innerHTML =
                    TryAgain.getString("text.check_with") + ' <a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.getString("text."+id) + '</a>';
                break;
            }
        } catch (e) {
            TryAgain.trace(doc, e);
        }
        return true;
    },

    // Executed when the user presses ESC
    stop: function(event) {
        var doc = gBrowser.contentDocument;
        if (doc.documentURI.substr(0,14)=="about:neterror" || doc.title=="502 Bad Gateway") {
            if (TryAgain.isActive()) {
                var stopRetry_btn = doc.getElementById("errorStopRetry");
                if (stopRetry_btn) {
                    stopRetry_btn.click();
                }
            }
        }
    },

    // Executed on every pageload
    onPageLoad: function(anEvent) {
        var errmessage = "";

        // Check if pageload concerns a document
        // (and not a favicon or something similar)
        var doc = anEvent.originalTarget;
        if (doc.nodeName != "#document") return;

        // Check if document is netError.xhtml
        if (doc.documentURI.substr(0,14)=="about:neterror") {
            var tab;
            try {
                var script1 = doc.getElementsByTagName("script")[0];
                var extraHTML = "var text_cancelled = '"+TryAgain.getString("text.cancelled")+"';\n"
                                   + "var text_tryagain = '"+TryAgain.getString("text.tryagain")+"';\n"
                                   + "var text_tried_times = '"+TryAgain.getString("text.tried_times")+"';\n";
    
                var tryAgain_btn = doc.getElementById("errorTryAgain");
                
                if (!TryAgain.isActive()) {
                    // Hide the TryAgain part:
                    var tryagainContainer = doc.getElementById("tryagainContainer");
                    if (!tryagainContainer) {
                        return;
                    }
                    tryagainContainer.setAttribute("style", "display: none;");
                    
                    vars.innerHTML = "var p_timeout = -1; var p_repeating = true; var p_max_repeat = 0; var p_repeat = 0;\n"
                                   + extraHTML;
                    tryAgain_btn.disabled = false;
                    return;
                }
    
                var script2 = doc.createElement("script");
                script2.setAttribute("src", "chrome://tryagain/content/netError.js");
                script1.parentNode.appendChild(script2);
    
                var vars = doc.createElement("script");
                script1.parentNode.appendChild(vars);

                var stopRetry_btn = TryAgain.createButton(doc, TryAgain.getString("text.stop_trying"));
                stopRetry_btn.setAttribute("onclick", "stopRetry();");
                stopRetry_btn.setAttribute("id", "errorStopRetry");
                tryAgain_btn.parentNode.appendChild(stopRetry_btn);
    
                var increment_btn = doc.createElement("button");
                increment_btn.setAttribute("id", "errorIncrement");
                increment_btn.setAttribute("onclick", "autoRetryThis();");
                increment_btn.style.display = "none";
                tryAgain_btn.parentNode.appendChild(increment_btn);

                var retry_x_of_y = doc.createElement("p");
                retry_x_of_y.setAttribute("id", "retry_x_of_y");
                doc.getElementById("errorTitle").appendChild(retry_x_of_y);
    
                var page = doc.getElementById("errorPageContainer");
                if (page) {
                    page = doc.getElementById("errorLongContent");
                }
                var tryagainList = doc.createElement("ul");
                tryagainList.setAttribute("id", "tryagainList");
                page.appendChild(tryagainList);

                var li = doc.createElement("li");
                li.setAttribute("id", "status_downforeojm");
                tryagainList.appendChild(li);

                li = doc.createElement("li");
                li.setAttribute("id", "status_uptimeauditor");
                tryagainList.appendChild(li);

                li = doc.createElement("li");
                li.innerHTML = TryAgain.getFormattedString("text.view_with", []) + " ";
                var a = doc.createElement("a");
                a.setAttribute("id", "errorGoogleCache");
                a.innerHTML = TryAgain.getFormattedString("text.cache_google", []);
                li.appendChild(a);
                tryagainList.appendChild(li);

                li = doc.createElement("li");
                li.innerHTML = TryAgain.getFormattedString("text.view_with", []) + " ";
                a = doc.createElement("a");
                a.setAttribute("id", "errorWebArchive");
                a.innerHTML = TryAgain.getFormattedString("text.cache_wayback", []);
                li.appendChild(a);
                tryagainList.appendChild(li);

                li = doc.createElement("li");
                li.innerHTML = TryAgain.getFormattedString("text.notify_me", []) + " ";
                a = doc.createElement("a");
                a.innerHTML = TryAgain.getFormattedString("text.when_site_comes_online", []);
                li.appendChild(a);
                tryagainList.appendChild(li);

                var tryagainContainer = doc.createElement("div");
                tryagainContainer.setAttribute("id", "tryagainContainer");
                page.appendChild(tryagainContainer);
    
                var errorAutoRetry1 = doc.createElement("div");
                errorAutoRetry1.setAttribute("id", "errorAutoRetry1");
                tryagainContainer.appendChild(errorAutoRetry1);
                errorAutoRetry1.innerHTML = TryAgain.getFormattedString("text.if_at_first", []);
    
                var errorAutoRetry2 = doc.createElement("span");
                errorAutoRetry2.setAttribute("id", "errorAutoRetry2");
                errorAutoRetry2.style.marginLeft = "1em";
                errorAutoRetry2.style.height = "12px";
                errorAutoRetry2.style.fontSize = "80%";
                errorAutoRetry2.style.color = "threedshadow";
                errorAutoRetry1.appendChild(errorAutoRetry2);
    
                var errorAutoRetry3 = doc.createElement("div");
                errorAutoRetry3.setAttribute("id", "errorAutoRetry3");
                errorAutoRetry3.style.height = "13px";
                tryagainContainer.appendChild(errorAutoRetry3);

                tab = TryAgain.getTabFromPageloadEvent(doc);
                var tab_uri = false;
                if (tab===false) {
                    tab = TryAgain.getFrameFromPageloadEvent(doc);
                    // Tab is now actually a FRAME or an IFRAME
                    if (tab===false) {
                        return;
                    } else {
                        tab_uri = tab.contentWindow.window.document.location.href;
                    }
                } else {
                    tab_uri = tab.currentURI.asciiSpec;
                }

                // Determine the desired timeout and max. repeats:
                var timeout = TryAgain_prefs.getPreference("timeout");
                var repeating = TryAgain_prefs.getPreference("repeating")==1;
                var max_repeat = TryAgain_prefs.getPreference("repeat");
                var repeat  = 1;

                // If tab indicates that this page is *RE*loaded, update repeat-counter.
                if (tab.hasAttribute("tryagain_rep")) {
                    repeat = 1 + parseInt(tab.getAttribute("tryagain_rep"));
                }

                // If tab fails to load a webpage other than a previous one, reset the counter
                if (tab.hasAttribute("tryagain_uri")) {
                    if (tab_uri != tab.getAttribute("tryagain_uri")) {
                        repeat  = 1;
                        tab.setAttribute("tryagain_uri", tab_uri);
                    }
                } else {
                    tab.setAttribute("tryagain_uri", tab_uri);
                }

                var warningContent = doc.getElementById("securityOverrideContent");
                if (warningContent) {
                    warningContent.innerHTML = "Error...";
                }

                if (TryAgain_prefs.getPreference("hidetips")==1) {
                    var errorLongDesc = doc.getElementById("errorLongDesc");
                    if (errorLongDesc) errorLongDesc.setAttribute("style", "display: none;");
                }

                if (repeat<max_repeat || max_repeat<=0 || !repeating) {
                    tab.setAttribute("tryagain_rep", repeat);
                    if (max_repeat==0 || !repeating) {
                        retry_x_of_y.innerHTML = TryAgain.getFormattedString("text.try_of_infinite", [repeat]);
                    } else {
                        retry_x_of_y.innerHTML = TryAgain.getFormattedString("text.try_of", [repeat, max_repeat]);
                    }
                } else {
                    retry_x_of_y.innerHTML = TryAgain.getFormattedString("text.tried_times", [repeat]);
                    retry_x_of_y.setAttribute("style", "color: red; font-weight: bold;");
                    var tryagainContainer = doc.getElementById("tryagainContainer");
                    tryagainContainer.setAttribute("style", "display: none;");
                    timeout = -1;
                }
                vars.innerHTML = "var p_timeout = "+timeout+"; var p_repeating = "+repeating+"; var p_max_repeat = "+max_repeat+"; var p_repeat = "+repeat+";\n"
                               + extraHTML;
                
                var errorGoogleCache = doc.getElementById("errorGoogleCache");
                if (errorGoogleCache) errorGoogleCache.setAttribute('href', TryAgain.urlify('http://72.14.209.104/search?q=cache:%url_escaped%', tab_uri));

                var errorWebArchive = doc.getElementById("errorWebArchive");
                if (errorWebArchive) errorWebArchive.setAttribute('href', TryAgain.urlify('http://web.archive.org/web/*/%url_escaped%', tab_uri));

                var timer1;
                try {
                    timer1 = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                } catch (e) {
                    TryAgain.error(e);
                    return;
                }
                var event1 = {
                    notify: function(timer) {
                        try {
                            var errorIncrement = doc.getElementById("errorIncrement")
                            if (errorIncrement) errorIncrement.click();
                        } catch (e) {
                            TryAgain.error(e);
                            timer.cancel();
                        }
                    }
                }
                timer1.initWithCallback(event1, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

                if (TryAgain_prefs.getPreference("useauditing")==1) {
                    var timers = [];
                    for (id in TryAgain.downCheckServers) {
                        timers[id] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                    }
                    var events = [];
                    // First and every ten tries only
                    if (repeat == 1 || repeat % 10 == 0) {
                        for (id in TryAgain.downCheckServers) {
                            var server = TryAgain.downCheckServers[id];
                            if (!server) {
                                throw new Error("could not resolve downCheckServers["+id+"]");
                            }
                            var httpRequest = TryAgain.checkDownStatus(doc, tab_uri, id, server[0]);
                            TryAgain.downStatus[id] = TryAgain.STATUS_POLLING;
                            events[id] = {
                                serverId: '',
                                httpRequest: false,
                                regex: '',
                                matchDown: '',
                                matchUp: '',
                                register: function(id, httpRequest, regex, matchDown, matchUp) {
                                    this.id = id;
                                    this.regex = regex;
                                    this.httpRequest = httpRequest;
                                    this.matchDown = matchDown;
                                    this.matchUp = matchUp;
                                },
                                notify: function(timer) {
                                    try {
                                        if (TryAgain.updateDownStatus(doc, tab_uri, this.id, this.httpRequest, this.regex, this.matchDown, this.matchUp)) {
                                            timer.cancel();
                                        }
                                    } catch (e) {
                                        TryAgain.trace(doc, e);
                                        timer.cancel();
                                    }
                                }
                            }
                            events[id].register(id, httpRequest, server[1], server[2], server[3]);
                            timers[id].initWithCallback(events[id], 500, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                        }
                    }
                }
                for (id in TryAgain.downCheckServers) {
                    if (TryAgain_prefs.getPreference("useauditing")==0) {
                        TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                    }
                    TryAgain.updateDownStatus(doc, tab_uri, id, false);
                }
            } catch (exception) {
                TryAgain.trace(doc, exception, errmessage);
            }
        } else {
            try {
                // A new webpage is loaded after the netError.xhtml page, so reset the counter to zero:
                tab = TryAgain.getTabFromPageloadEvent(doc);
                if (tab!==false) {
                    tab.setAttribute("tryagain_rep", "0");
                }
            } catch (exception) {
                // Just to make sure no errors occur on blank tabs.
            }
        }
    }
}
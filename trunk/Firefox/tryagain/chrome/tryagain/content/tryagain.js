window.addEventListener("load", function(e) { TryAgain.init(); }, false);

var TryAgain = {
    version: '3.4.0',
    STATUS_UNKNOWN: 0,
    STATUS_POLLING: 1,
    STATUS_LOCAL: 2,
    STATUS_GLOBAL: 3,
    iAmActive: true,
    strbundle: 0,
    downStatus: [],
    downCheckServers: {
            downforeojm: [ "http://downforeveryoneorjustme.com/%url%?src=%source%", "<title>([^<]*)</title>", "It's not just you!", "It's just you." ],
            uptimeauditor: [ "http://uptimeauditor.com/quicksitecheck.php?x=%url%&src=%source%", "/(fail|ok).gif", "fail", "ok" ],
        },
    console: Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService),

    debug: function(msg) { TryAgain.console.logStringMessage(msg); },

    // Executed when Firefox loads
    init: function() {
        // Load string resource:
        TryAgain.strbundle = document.getElementById("tryagain_strings");
        
        // Add listener to the PageLoad event:
        var appcontent = document.getElementById("appcontent");
        if (appcontent) {
            appcontent.addEventListener("DOMContentLoaded", TryAgain.onPageLoad, true);
        }

        // Add listener to address bar
        var urlbar = document.getElementById("urlbar");
        urlbar.addEventListener("input", TryAgain.stop, true);

        // Add listener to ESC-key:
        var stop_key = document.getElementById("key_stop");
        stop_key.addEventListener("command", TryAgain.stop, true);

        // Show or hide the menu item:
        if (TryAgain_prefs.getPreference("showmenu")==1) {
            TryAgain.iAmActive = document.getElementById("TryAgainMenuItem").getAttribute("checked")=='true';
            var menu = document.getElementById('TryAgainMenuItem');
            menu.setAttribute("style","");
            menu.hidden = false;
        } else {
            TryAgain.iAmActive = true;
        }
    },

    // Returns true if the 'Enable TryAgain' menu option is checked.
    isActive: function() {
        return TryAgain.iAmActive;
    },
    
    // Is called when user toggles the 'Enable TryAgain' menu option.
    toggleActive: function(menu) {
        if (menu.getAttribute('checked')=='true') {
            menu.setAttribute('checked',false);
            TryAgain.iAmActive = false;
        } else {
            menu.setAttribute('checked',true);
            TryAgain.iAmActive = true;
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

    checkDownStatus: function(doc, tab_uri, id, url, regex, matchDown, matchUp) {
        try {
            TryAgain.downStatus[id] = TryAgain.STATUS_POLLING;
            var regexp = new RegExp(regex, "gi");
            var httpRequest = new XMLHttpRequest();
            // Send a request
            url = TryAgain.urlify(url, tab_uri, true);
            httpRequest.open("GET", url, false, null, null);
            httpRequest.send("");
            switch(httpRequest.readyState) {
            case 4:
                var status = httpRequest.status;
                if (status == 200) {
                    var response = httpRequest.responseText;
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
                            TryAgain.debug(id + ' returned unknown match "' + title[1] + '"');
                            TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                            break;
                        }
                    } else {
                        // Regular expression didn't match
                        TryAgain.debug(id + ' didn\'t match regular expression');
                        TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                    }
                } else {
                    // Bad status code
                    TryAgain.debug(id + ' returned HTTP ' + status);
                    TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                }
                break;
            default:
                // Bad ready state
                TryAgain.debug(id + ' returned bad readyState: ' + httpRequest.readyState);
                TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                break;
            }
            TryAgain.debug(id + ': ' + TryAgain.downStatus[id]);
            TryAgain.updateDownStatus(doc, tab_uri, id);
        } catch (e) {
            // General error
            TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
            Components.utils.reportError(e);
        }
    },

    updateDownStatus: function(doc, url, id) {
        try {
            var server = TryAgain.downCheckServers[id];
            var status = doc.getElementById('status_'+id);
            if (!status) {
                Components.utils.reportError("Required page element missing: status_" + id);
                return;
            }
            var downStatus = TryAgain.downStatus[id];
            switch (downStatus) {
            case TryAgain.STATUS_POLLING:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.strbundle.getString("text."+id) + '</a>' +
                    '<div>' + TryAgain.strbundle.getString("text.site_down_checking") + '</div>';
                break;
            case TryAgain.STATUS_LOCAL:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.strbundle.getString("text."+id) + '</a>' +
                    '<div style="color:red;"><b>' + TryAgain.strbundle.getString("text.site_down_local") + '</b> ' +
                    '<a href="'+TryAgain.urlify('http://proxy.org/proxy.pl?url=%url_escaped%&proxy=proxify.com', url) + '">' +
                    TryAgain.strbundle.getString("text.try_proxy") + '</a>' +
                    '</div>';
                break;
            case TryAgain.STATUS_GLOBAL:
                status.innerHTML =
                    '<a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.strbundle.getString("text."+id) + '</a>' +
                    '<div><b>' + TryAgain.strbundle.getString("text.site_down_global") + '</b></div>';
                var regexp2 = new RegExp("http[s]?://([^/]*)", "gi");
                var matches = regexp2.exec(url);
                if (matches.length == 2) {
                    url = matches[1];
                }
                var error_div = doc.getElementById('errorShortDescText');
                error_div.innerHTML = TryAgain.strbundle.getFormattedString("text.error_site_down", [url]);
                break;
            case TryAgain.STATUS_UNKNOWN:
            default:
                // The website returned an unknown title
                status.innerHTML =
                    TryAgain.strbundle.getString("text.check_with") + ' <a id="error_'+id+'" href="'+TryAgain.urlify(server[0], url)+'">' +
                    TryAgain.strbundle.getString("text."+id) + '</a>';
                break;
            }
        } catch (e) {
            Components.utils.reportError(e);
        }
    },

    // Executed when the user presses ESC
    stop: function(stopType) {
        var doc = gBrowser.contentDocument;
        if (doc.documentURI.substr(0,14)=="about:neterror" || doc.title=="502 Bad Gateway") {
            if (TryAgain.isActive()) {
                var stopRetry_btn = doc.getElementById("errorStopRetry");
                stopRetry_btn.click();
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
            var vars = doc.getElementById("variabels");
            var extraHTML = "var text_cancelled = '"+TryAgain.strbundle.getString("text.cancelled")+"';\n"
                               + "var text_tryagain = '"+TryAgain.strbundle.getString("text.tryagain")+"';\n"
                               + "var text_tried_times = '"+TryAgain.strbundle.getString("text.tried_times")+"';\n";

            if (!TryAgain.isActive()) {
                // Hide the TryAgain part:
                var tryagainContainer = doc.getElementById("tryagainContainer");
                tryagainContainer.setAttribute("style", "display: none;");
                
                vars.innerHTML = "var p_timeout = -1; var p_max_repeat = 0; var p_repeat = 0;\n"
                               + extraHTML;
                return;
            }
            
            var tab;
            try {
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

                if (TryAgain_prefs.getPreference("hidetips")==1) {
                    var errorLongDesc = doc.getElementById("errorLongDesc");
                    if (errorLongDesc) errorLongDesc.setAttribute("style", "display: none;");
                }

                var r;
                if (repeat<max_repeat || max_repeat<=0) {
                    vars.innerHTML = "var p_timeout = "+timeout+"; var p_max_repeat = "+max_repeat+"; var p_repeat = "+repeat+";\n"
                                   + extraHTML;
                    tab.setAttribute("tryagain_rep", repeat);

                    r = doc.getElementById("retry_x_of_y");
                    if (max_repeat==0) {
                        r.innerHTML = TryAgain.strbundle.getFormattedString("text.try_of_infinite", [repeat]);
                    } else {
                        r.innerHTML = TryAgain.strbundle.getFormattedString("text.try_of", [repeat, max_repeat]);
                    }
                } else {
                    r = doc.getElementById("retry_x_of_y");
                    r.innerHTML = TryAgain.strbundle.getFormattedString("text.tried_times", [repeat]);
                    r.setAttribute("style", "color: red; font-weight: bold;");
                    var tryagainContainer = doc.getElementById("tryagainContainer");
                    tryagainContainer.setAttribute("style", "display: none;");

                    vars.innerHTML = "var p_timeout = -1; var p_max_repeat = "+max_repeat+"; var p_repeat = "+repeat+";\n"
                                   + extraHTML;
                }
                
                var errorGoogleCache = doc.getElementById("errorGoogleCache");
                if (errorGoogleCache) errorGoogleCache.setAttribute('href', TryAgain.urlify('http://72.14.209.104/search?q=cache:%url_escaped%', tab_uri));

                var errorWebArchive = doc.getElementById("errorWebArchive");
                if (errorWebArchive) errorWebArchive.setAttribute('href', TryAgain.urlify('http://web.archive.org/web/*/%url_escaped%', tab_uri));

                var timer1;
                try {
                    timer1 = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                } catch (e) {
                    Components.utils.reportError(e);
                    return;
                }
                var event1 = {
                  notify: function(timer) {
                    try {
                      var errorIncrement = doc.getElementById("errorIncrement")
                      if (errorIncrement) errorIncrement.click();
                    } catch (e) {
                      Components.utils.reportError(e);
                      timer1.cancel();
                    }
                  }
                }
                timer1.initWithCallback(event1, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

                if (TryAgain_prefs.getPreference("useauditing")==1) {
                    var timers = [];
                    try {
                        for (id in TryAgain.downCheckServers) {
                            timers[id] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                        }
                    } catch (e) {
                        Components.utils.reportError(e);
                        return;
                    }
                    var events = [];
                    // First and every ten tries only
                    if (repeat == 1 || repeat % 10 == 0) {
                        for (id in TryAgain.downCheckServers) {
                            TryAgain.downStatus[id] = TryAgain.STATUS_POLLING;
                            events[id] = {
                              serverId: '',
                              register: function(id) {
                                  this.serverId = id;
                              },
                              notify: function(timer) {
                                try {
                                  var server = TryAgain.downCheckServers[this.serverId];
                                  TryAgain.checkDownStatus(doc, tab_uri, this.serverId, server[0], server[1], server[2], server[3]);
                                } catch (e) {
                                  Components.utils.reportError(e);
                                }
                              }
                            }
                            events[id].register(id);
                            timers[id].initWithCallback(events[id], 100, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
                        }
                    }
                }
                for (id in TryAgain.downCheckServers) {
                    if (TryAgain_prefs.getPreference("useauditing")==0) {
                        TryAgain.downStatus[id] = TryAgain.STATUS_UNKNOWN;
                    }
                    TryAgain.updateDownStatus(doc, tab_uri, id);
                }
            } catch (exception) {
                var error_div = doc.getElementById("errorLongDesc");
                error_div.innerHTML += "<div style=\"border: #F00 2px solid\">"
                                     + "<b>Unable to load TryAgain. Error message:</b>"
                                     + "<br />"+exception+"; "+errmessage+"</div>";
                Components.utils.reportError(exception);
            }
        } else {
            try {
                // A new webpage is loaded after the netError.xhtml page, so reset the counter to zero:
                tab = TryAgain.getTabFromPageloadEvent(doc);
                if (tab!==false)
                    tab.setAttribute("tryagain_rep", "0");
            } catch (exception) {
                // Just to make sure no errors occur on blank tabs.
            }
        }
    }
}
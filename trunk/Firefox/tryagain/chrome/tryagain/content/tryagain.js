var TryAgain = {
    STATUS_UNKNOWN: 0,
    STATUS_POLLING: 1,
    STATUS_LOCAL: 2,
    STATUS_GLOBAL: 3,
    strbundle: 0,
    browser: false,
    windowMediator: false,
    httpRequest: false,
    xulButtons: 0, // 0=unknown; 1=no; 2=yes
    xulNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    remoteIcons: false,
    timers: [],
    isOnline: true,
    checkConflicts: true,
    hasConflict: false,
    observeHTTP: false,
    notifySuccess: false,
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
                    trc += "<li>" + escape(lines[i]) + "</li>";
                }
            }
            trc += "</ul>";
            trc += "<div style=\"font-size:80%\">" + navigator.userAgent + "</div>";
            var errorLongDesc = doc.getElementById("errorLongDesc");
            if (errorLongDesc) {
                try {
                    errorLongDesc.innerHTML +=
                          "<div style=\"-moz-border-radius-bottomleft:10px; -moz-border-radius-bottomright:10px; -moz-border-radius-topleft:10px; -moz-border-radius-topright:10px;border:#F00 2px solid; padding:0 13px; margin:10px 0;\">"
                        + "<p><b>Unable to load TryAgain. Please report the error below <a href=\"http://getsatisfaction.com/tryagain/#problem\">on the support page</a>.</b></p>"
                        + "<blockquote>"
                        + (msg ? "<p>" + TryAgain.escape(msg) + "</p>" : "")
                        + (err ? "<p>" + TryAgain.escape(err) + "</p>" : "")
                        + (trc ? trc : "")
                        + "</blockquote>"
                        + "</div>";
                } catch (e) {
                    errorLongDesc.innerHTML +=
                          "<div style=\"-moz-border-radius-bottomleft:10px; -moz-border-radius-bottomright:10px; -moz-border-radius-topleft:10px; -moz-border-radius-topright:10px;border:#F00 2px solid; padding:0 13px; margin:10px 0;\">"
                        + "<p><b>Unable to load TryAgain. The error could not be displayed; please consult the Error Console.</b></p></div>";
                }
                errorLongDesc.setAttribute("style", "display: block;");
            }
            var tryagainList = doc.getElementById("tryagainList");
            if (tryagainList) {
                // This element is likely empty due to error; hide it
                tryagainList.setAttribute("style", "display: none;");
            }
        }
    },
    escape: function(str) {
        str = str.replace('&', '&amp;');
        str = str.replace('<', '&lt;');
        str = str.replace('>', '&gt;');
        return str;
    },

    createButton: function(doc, parent, text, event) {
        var btn;
        if (TryAgain.xulButtons == 0) {
            TryAgain.xulButtons = 1;
        }
        if (TryAgain.xulButtons == 2) {
            btn = doc.createElementNS(TryAgain.xulNS, "button");
            btn.setAttribute("label", text);
            if (event) btn.setAttribute("oncommand", event);
        } else {
            btn = doc.createElement("button");
            btn.innerHTML = text;
            if (event) btn.setAttribute("onclick", event);
        }
        parent.appendChild(btn);
        return btn;
    },
    
    click: function(btn) {
        if (btn.doCommand) {
            btn.doCommand();
        } else {
            try {
                var evt = doc.createEvent('HTMLEvents');
                evt.initEvent('click', false, false);
                btn.dispatchEvent(evt);
            } catch (e) {
                btn.click();
            }
        }
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
    getProxyServer: function() {
        var selectedProxy = TryAgain_prefs.getPreference("proxyServer");
        if (selectedProxy == null) {
            return TryAgain_prefs.proxyServers[0][1];
        } else {
            return TryAgain_prefs.proxyServers[selectedProxy][1];
        }
    },

    checkConflict: function(name, id) {
        var ext;
        if (typeof Application != 'undefined') {
            if (Application.extensions) {
                ext = Application.extensions.get(id);
                if (ext) {
                    if (ext.enabled) TryAgain.showConflict(name, id, ext);
                }
            } else {
                Application.getExtensions(function(extensions) {
                    ext = extensions.get(id);
                    if (ext) {
                        Components.utils.import("resource://gre/modules/AddonManager.jsm");
                        AddonManager.getAddonByID(id, function(addon) {
                            if (!addon.userDisabled) {
                                TryAgain.showConflict(name, id, ext);
                            }
                        });
                    }
                })
            }
        } else {
            var extMgr = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
            var extMgrDs;
            if (extMgr) {
                ext = extMgr.getItemForID(id);
                extMgrDs = extMgr.datasource;
            }
            if (ext && ext.id) {
                var rdfSvc = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
                if (rdfSvc) {
                    var source = rdfSvc.GetResource("urn:mozilla:item:" + ext.id);
                    var property = rdfSvc.GetResource("http://www.mozilla.org/2004/em-rdf#isDisabled");
                    disabled = extMgrDs.GetTarget(source, property, true);
                    if (disabled) {
                        var disabled2 = disabled.QueryInterface(Ci.nsIRDFLiteral);
                        if (disabled2.Value=="false") {
                            TryAgain.showConflict(name, id, ext);
                        }
                        // TODO check if this is needed:
                        // disabled2.Release();
                    }
                }
            } else {
                TryAgain.showConflict(name, null, null);
            }
        }
    },
    showConflict: function(name, id, ext) {
        TryAgain.hasConflict = true;
        var message = 'TryAgain is incompatible with '+name+'; please only use one of the two add-ons.';
        var nb = TryAgain.browser.getNotificationBox();
        var n = nb.getNotificationWithValue('tryagain-conflict-'+id);
        if (n) {
            n.label = message;
        } else {
            var buttons;
            if (id) {
                buttons = [{
                    label: 'Disable ' + name,
                    accessKey: name[0],
                    popup: null,
                    callback: TryAgain.disableExtension,
                    extension: ext
                }, {
                    label: 'Disable TryAgain',
                    accessKey: 'T',
                    popup: null,
                    callback: TryAgain.disableTryAgain
                }];
            } else {
                id = '0';
                if (typeof BrowserOpenAddonsMgr == 'function') {
                    buttons = [{
                        label: 'Manage add-ons',
                        accessKey: 'a',
                        popup: null,
                        callback: BrowserOpenAddonsMgr
                    }];
                } else {
                    buttons = [];
                }
            }
            const priority = nb.PRIORITY_WARNING_LOW;
            nb.appendNotification(message, 'tryagain-conflict-'+id,
                                 'chrome://tryagain/skin/icon16.png',
                                  priority, buttons);
        }
    },

    extCheck: false,
    // Executed when application loads
    init: function(e) {
        try {

            if (TryAgain.isActive() && TryAgain.checkConflicts) {
                try {
                    try {
                        if (typeof com.RealityRipple.Fierr != "undefined") {
                            TryAgain.checkConflict("Fierr", "{2E481B23-66AC-313F-D6A8-A81DDDF26249}");
                        }
                    } catch (e) {}
                    // TryAgain IS compatible with Resurrect Pages
                    // TryAgain.checkConflict("Resurrect Pages", "{0c8fbd76-bdeb-4c52-9b24-d587ce7b9dc3}");
                } catch (e) {
                    TryAgain.error(e);
                }
            }

            var menu = document.getElementById("TryAgainMenuItem");
            if (menu) {
                // Show or hide the menu item:
                if (TryAgain_prefs.getPreference("showmenu") == 1) {
                    menu.setAttribute("style", "");
                    menu.hidden = false;
                }
                menu.setAttribute('checked', TryAgain_prefs.getPreference("enabled") == 1);
            }

            if (TryAgain.hasConflict) return;

            TryAgain.windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                               .getService(Components.interfaces.nsIWindowMediator);
            if (typeof TryAgain.windowMediator != 'undefined') {
                var browserEnum = TryAgain.windowMediator.getEnumerator("navigator:browser");
                if (browserEnum.hasMoreElements()) {
                    TryAgain.browser = browserEnum.getNext().gBrowser;
                }
            } else {
                TryAgain.windowMediator = false;
            }
            if (!TryAgain.browser && typeof gBrowser != 'undefined') {
                TryAgain.browser = gBrowser;
            }
            if (!TryAgain.browser) {
                TryAgain.error("Could not find a valid browser instance");
                return;
            }

            // Load string resource:
            TryAgain.strbundle = document.getElementById("tryagain_strings");
            if (!TryAgain.strbundle) {
                var extensionBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
                TryAgain.strbundle = extensionBundle.createBundle("chrome://tryagain/locale/tryagain.properties");
            }

            // Add listener to the PageLoad event:
            var appcontent = document.getElementById("appcontent");
            if (!appcontent) {
                // Fennec
                appcontent = document.getElementById("browsers");
            }
            if (appcontent) {
                appcontent.addEventListener("DOMContentLoaded", TryAgain.onPageLoad, true);
            } else {
                TryAgain.error(new Error("browser cannot be resolved"));
            }
            // TODO make enabling this a preference
            if (TryAgain.observeHTTP) {
                try {
                    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                    .getService(Components.interfaces.nsIObserverService);
                    observerService.addObserver(TryAgain, "http-on-examine-response", false);
                } catch (e) {
                    TryAgain.error(e);
                }
            }

            // Add listener to address bar
            var urlbar = document.getElementById("urlbar");
            if (!urlbar) {
                // Fennec
                urlbar = document.getElementById("urlbar-edit");
            }
            if (urlbar) {
                urlbar.addEventListener("change", TryAgain.stop, true);
                urlbar.addEventListener("focus", TryAgain.stop, true);
            }

            // Add listener to ESC-key:
            var stop_key = document.getElementById("key_stop");
            if (stop_key) {
                stop_key.addEventListener("command", TryAgain.stop, true);
            }

        } catch (e) {
            TryAgain.trace(document, e);
        }
    },

    // Returns true if the 'Enable TryAgain' menu option is checked.
    isActive: function() {
        if (!TryAgain.isOnline && TryAgain_prefs.getPreference("offlineModeBehavior") != 1) {
            // Disable TryAgain's automatic retry when in offline mode
            return false;
        }
        return TryAgain_prefs.getPreference("enabled") == 1;
    },

    // Is called when user toggles the 'Enable TryAgain' menu option.
    toggleActive: function(menu) {
        var enabled = TryAgain_prefs.getPreference("enabled");
        if (enabled == 1) {
            TryAgain.disable(menu);
        } else {
            TryAgain.enable(menu);
        }
    },

    enable: function(menu) {
        if (menu) menu.setAttribute('checked', true);
        TryAgain_prefs.savePreference("enabled", 1);
        if (TryAgain.hasConflict) {
            TryAgain.promptRestart();
        }
    },

    disable: function(menu) {
        if (menu) menu.setAttribute('checked', false);
        TryAgain_prefs.savePreference("enabled", 0);
    },

    disableTryAgain: function(notification, data) {
        TryAgain.disable(document.getElementById("TryAgainMenuItem"));
        notification.close();
    },

    disableExtension: function(notification, data) {
        var man = Components.classes["@mozilla.org/extensions/manager;1"];
        if (man) {
            man = man.getService(Components.interfaces.nsIExtensionManager);
        }
        if (man) {
            man.disableItem(data.extension.id);
            TryAgain.promptRestart();
        } else {
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID(data.extension.id, function(addon) {
                addon.userDisabled = true;
                TryAgain.promptRestart();
            });
        }
        notification.close();
    },
    
    promptRestart: function() {
        var name = 'the application';
        try {
            var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                    .getService(Components.interfaces.nsIXULAppInfo);
            name = appInfo.name;
        } catch (e) {
        }
        var message = 'Restart ' + name + ' to apply the changes.';
        var nb = TryAgain.browser.getNotificationBox();
        var n = nb.getNotificationWithValue('tryagain-restart');  
        if (n) {
            n.label = message;
        } else {
            var buttons = [{
                label: 'Restart ' + name,
                accessKey: 'R',
                popup: null,
                callback: TryAgain.restart
            }];

            const priority = nb.PRIORITY_WARNING_LOW;
            nb.appendNotification(message, 'tryagain-restart',
                                 'chrome://tryagain/skin/icon16.png',
                                  priority, buttons);
        }
    },
    restart: function() {
        var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"];
        if (appStartup) {
            appStartup = appStartup.getService(Components.interfaces.nsIAppStartup);
        }
        if (appStartup) {
            appStartup.quit(appStartup.eAttemptQuit | appStartup.eRestart);
        } else if (typeof Application != 'undefined') {
            if (Application.restart) Application.restart();
        }
    },

    // Returns the tab from which an onpageload event was fired
    getTabFromPageloadEvent: function(doc) {
        // Enumerate through tabs to find the tab where
        // the event came from:
        if (TryAgain.browser) {
            var browserEnum = TryAgain.windowMediator.getEnumerator("navigator:browser");
            while (browserEnum.hasMoreElements()) {
                var browser = browserEnum.getNext();
                var tab = TryAgain.getTabFromBrowser(browser.gBrowser, doc);
                if (tab) return tab;
            }
        } else {
            tab = TryAgain.getTabFromBrowser(TryAgain.browser, doc);
            if (tab) return tab;
        }
        
        // No tab will be found if the pageload event was fired from within a frame or iframe:
        return false; //TryAgain.browser.mCurrentTab;
    },

    getTabFromBrowser: function(browser, doc) {
        var num = browser.browsers.length;
        for (var i = 0; i < num; i++) {
            var b = browser.getBrowserAtIndex(i);
            if (b.contentDocument == doc) {
                return b;
            }
        }
        return false;
    },
    
    // Returns the frame or iframe from which an onpageload event was fired
    getFrameFromPageloadEvent: function(doc) {
        // Enumerate through tabs to find the frame where
        // the event came from:
        if (typeof TryAgain.browser != 'undefined') {
            var num = TryAgain.browser.browsers.length;
            for (var i = 0; i < num; i++) {
                var b = TryAgain.browser.getBrowserAtIndex(i);
                var result = TryAgain.checkFramesInDocument(b.contentDocument, doc);
                if (result!==false) {
                    return result;
                }
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
        url = url.replace(/%source%/g, 'fx-tryagain-'+TryAgain_prefs.version);
        if (!tab_uri) {
            tab_uri = '';
        }
        if (TryAgain_prefs.getPreference("dropArguments") == 1) {
            // Remove all arguments
            var pos = tab_uri.indexOf('?');
            if (pos > 0) tab_uri = tab_uri.substr(0, pos);
            tab_uri_unencoded = tab_uri;
        } else {
            // Prevent injecting any arguments
            tab_uri_unencoded = tab_uri;
            tab_uri_unencoded = tab_uri_unencoded.replace(/\?/g, '%3f');
            tab_uri_unencoded = tab_uri_unencoded.replace(/&/g, '%26');
        }
        var domain = tab_uri;
        var protocol = 'http://';
        var pos1 = tab_uri.indexOf('/');
        if (pos1 > 0) {
            pos1++;
            protocol = tab_uri.substr(0, pos1);
        }
        var pos2 = tab_uri.indexOf('/', pos1+1);
        var suffix = '';
        if (pos2 > 0) {
            pos1++;
            domain = tab_uri.substr(pos1, pos2-pos1);
            pos2++;
            if (pos2 < tab_uri.length) {
                suffix = tab_uri.substr(pos2);
            }
        } else {
            pos2 = tab_uri.length;
        }
        url = url.replace(/%url%/g, tab_uri_unencoded);
        url = url.replace(/%url_encoded%/g, encodeURIComponent(tab_uri));
        url = url.replace(/%url_escaped%/g, escape(tab_uri));
        url = url.replace(/%protocol%/g, protocol);
        url = url.replace(/%domain%/g, domain);
        // Add the source argument
        url = url.replace(/%url_suffix%/g, suffix);
        if (!for_request) {
            url = url.replace(/&/g, '&amp;');
        }
        return url;
    },

    checkDownStatus: function(doc, tab, tab_uri, id, url, regex, matchDown, matchUp) {
        try {
            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_POLLING);
            var httpRequest = new XMLHttpRequest();
            // Send a request
            url = TryAgain.urlify(url, tab_uri, true);
            httpRequest.open("GET", url, true, null, null);
            httpRequest.send("");
            httpRequest.onreadystatechange = function(event) {
                TryAgain.updateDownStatus(doc, tab, tab_uri, id, url, httpRequest, regex, matchDown, matchUp);
            };
        } catch (e) {
            // General error
            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_UNKNOWN);
            TryAgain.error(e);
        }
        return httpRequest;
    },

    updateDownStatus: function(doc, tab, url, id, serverUrl, httpRequest, regex, matchDown, matchUp) {
        if (httpRequest != false) {
            switch (httpRequest.readyState) {
            case 4:
                var status = httpRequest.status;
                if (status == 200) {
                    var response = httpRequest.responseText;
                    var regexp = new RegExp(regex, "gi");
                    var match = regexp.exec(response);
                    if (match != null && match.length == 2) {
                        switch (match[1].toLowerCase()) {
                        case matchDown:
                            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_GLOBAL);
                            break;
                        case matchUp:
                            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_LOCAL);
                            break;
                        default:
                            // The website returned an unknown match
                            TryAgain.debug("Unknown match for '" + id + "': " + match[1]);
                            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_UNKNOWN);
                            break;
                        }
                    } else {
                        // Regular expression didn't match
                        tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_UNKNOWN);
                    }
                } else {
                    // Bad status code
                    tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_UNKNOWN);
                }
                break;
            default:
                // TODO issue a timeout
                // No response yet; will try again later
                return false;
            }
        }
        try {
            var status = doc.getElementById('status_' + id);
            if (!status) {
                // The page might have been navigated and the element may no longer exist
                return true;
            }
            while (url.substr(-1) === "&") {
                // Drop trailing ampersands as it causes an illegal string error
                url = url.substr(0, url.length-1);
            }
            var downStatus = tab.getAttribute("tryagain_status_"+id);
            if (!downStatus) downStatus = TryAgain.STATUS_UNKNOWN;
            if (downStatus == TryAgain.STATUS_POLLING) {
                status.innerHTML =
                    '<a id="error_'+id+'" class="left" href="'+TryAgain.urlify(serverUrl, url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div>' + TryAgain.getString("text.site_down_checking") + '</div>';
            } else if (downStatus == TryAgain.STATUS_LOCAL) {
                status.innerHTML =
                    '<a id="error_'+id+'" class="left" href="'+TryAgain.urlify(serverUrl, url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div style="color:red;"><b>' + TryAgain.getString("text.site_down_local") + '</b> ' +
                    '<a href="'+TryAgain.urlify(TryAgain.getProxyServer(), url) + '">' +
                    TryAgain.getString("text.try_proxy") + '</a>' +
                    '</div>';
            } else if (downStatus == TryAgain.STATUS_GLOBAL) {
                status.innerHTML =
                    '<a id="error_'+id+'" class="left" href="'+TryAgain.urlify(serverUrl, url)+'">' +
                    TryAgain.getString("text."+id) + '</a>' +
                    '<div><b>' + TryAgain.getString("text.site_down_global") + '</b></div>';
                var regexp2 = new RegExp("http[s]?://([^/]*)", "gi");
                var matches = regexp2.exec(url);
                if (matches != null && matches.length == 2) {
                    url = matches[1];
                }
                var errorShortDescText = doc.getElementById('errorShortDescText');
                errorShortDescText.innerHTML = TryAgain.getFormattedString("text.error_site_down", [url]);
            } else {
                // The website returned an unknown title
                status.innerHTML =
                    TryAgain.getString("text.check_with") + ' <a id="error_'+id+'" href="'+TryAgain.urlify(serverUrl, url)+'">' +
                    TryAgain.getString("text."+id) + '</a>';
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
                    TryAgain.click(stopRetry_btn);
                    var errorIncrement = doc.getElementById("errorIncrement");
                    if (errorIncrement) errorIncrement.disabled = true;
                }
            }
        }
    },

    addService: function(doc, li, srv, id, tab_uri, className) {
        var div = doc.createElement("div");
        if (className) {
            div.setAttribute("class", className);
        }
        var a = doc.createElement("a");
        a.setAttribute("id", "errorCache_" + id);
        a.setAttribute('href', TryAgain.urlify(srv[1], tab_uri));
        var img = doc.createElement("img");
        try {
            if (TryAgain.remoteIcons) {
                img.src = srv[2];
            } else {
                img.src = "chrome://tryagain/skin/icons/" + srv[0] + ".png";
            }
        } catch (e) {
            TryAgain.error(e);
        }
        a.appendChild(img);
        var span = doc.createElement("span");
        span.innerHTML = TryAgain.getFormattedString("text.cache_" + srv[0], []);
        a.appendChild(span);
        div.appendChild(a);
        li.appendChild(div);
    },
    
    // Executed on every pageload
    onPageLoad: function(anEvent) {
        var errmessage = "";

        if (TryAgain.hasConflict) return;

        // Check if pageload concerns a document
        // (and not a favicon or something similar)
        var doc = anEvent.originalTarget;
        if (doc.nodeName != "#document") return;

        // Check if document is netError.xhtml
        if (doc.documentURI.substr(0,14)=="about:neterror") {
            var errorType = TryAgain_prefs.getVariable(doc.documentURI, "e");
            if (errorType=="fileNotFound" || errorType=="remoteXUL") {
                return;
            }
			var tab;
            try {

                var script1 = doc.getElementsByTagName("script")[0];
                var extraHTML = "var text_cancelled = '"+TryAgain.getString("text.cancelled")+"';\n"
                                   + "var text_tryagain = '"+TryAgain.getString("text.tryagain")+"';\n"
                                   + "var text_tried_times = '"+TryAgain.getString("text.tried_times")+"';\n";
    
                var tryAgain_btn = doc.getElementById('errorTryAgain');
                if (!tryAgain_btn) {
                    // Support for Fierr
                    tryAgain_btn = doc.getElementById('tryAgain');
                }
                if (tryAgain_btn.namespaceURI==TryAgain.xulNS) {
                    TryAgain.xulButtons = 2;
                }

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

                if (TryAgain_prefs.getPreference("customStyle") == 1) {
                    var html = doc.getElementsByTagName("html")[0];
                    html.setAttribute("class", "tryagain");
                    html.style.backgroundImage = "url('chrome://tryagain/skin/backgrounds/aluminium.png')";

                    var page = doc.getElementById('errorPageContainer');
                    var title = doc.getElementById('errorTitle');
                    if (true) {
                        // Reposition title above body
                        page.removeChild(title);
                        page.parentNode.insertBefore(title, page);
                        page.setAttribute("class", "btm");
                        title.setAttribute("class", "top");
                    }
                    var titleTxt = doc.getElementById('errorTitleText');
                    var icon = doc.createElement("div");
                    icon.setAttribute("id", "errorTitleIcon");
                    title.insertBefore(icon, titleTxt);
                    var txt = doc.getElementById('errorShortDescText');
                    txt.parentNode.removeChild(txt);
                    title.appendChild(txt);
                }

                var script2 = doc.createElement("script");
                script2.setAttribute("src", "chrome://tryagain/content/netError.js");
                script1.parentNode.appendChild(script2);

                var vars = doc.createElement("script");
                script1.parentNode.appendChild(vars);

                var style = doc.createElement("link");
                style.setAttribute("rel", "stylesheet");
                style.setAttribute("type", "text/css");
                style.setAttribute("media", "all");
                style.setAttribute("href", "chrome://tryagain/content/tryagain.css");
                script1.parentNode.appendChild(style);

                var stopRetry_btn = TryAgain.createButton(doc, tryAgain_btn.parentNode, TryAgain.getString("text.stop_trying"), "stopRetry();");
                stopRetry_btn.setAttribute("id", "errorStopRetry");

                var increment_btn = TryAgain.createButton(doc, tryAgain_btn.parentNode, "", "autoRetryThis();");
                increment_btn.setAttribute("id", "errorIncrement");
                increment_btn.style.display = "none";

                if (!TryAgain.isActive()) {
                    var iconBox = doc.createElement("div");
                    iconBox.setAttribute("id", "errorTitleIconBox");
                    var icon2 = doc.createElement("div");
                    icon2.setAttribute("id", "errorTitleIcon2");
                    iconBox.appendChild(icon2);
                    tryAgain_btn.parentNode.appendChild(iconBox);
                }

                var retry_x_of_y = doc.createElement("div");
                retry_x_of_y.setAttribute("id", "retry_x_of_y");
                doc.getElementById("errorTitle").appendChild(retry_x_of_y);
    
                var page = doc.getElementById("errorPageContainer");
                if (page) {
                    page = doc.getElementById("errorLongContent");
                }
                var tryagainList = doc.createElement("ul");
                tryagainList.setAttribute("id", "tryagainList");
                page.appendChild(tryagainList);

                var id;
                for (id in TryAgain_prefs.downCheckServers) {
                    var server = TryAgain_prefs.downCheckServers[id];
                    if (server[0]) {
                        var li = doc.createElement("li");
                        li.setAttribute("id", "status_" + server[0]);
                        li.setAttribute("class", "auditor");
                        tryagainList.appendChild(li);
                    } else {
                        TryAgain.error('downCheckServers[' + id + '] is not set');
                    }
                }

                var showCaches = TryAgain_prefs.getPreference("showCaches");
                if (showCaches > 0) {
                    li = doc.createElement("li");
                    li.setAttribute("id", "status_caches");
                    var span = doc.createElement("span");
                    span.innerHTML = TryAgain.getFormattedString("text.view_with", []) + ": ";
                    li.appendChild(span);
                    var moreServices;
                    for (id in TryAgain_prefs.cacheServices) {
                        var srv = TryAgain_prefs.cacheServices[id];
                        if (showCaches != 2 && !srv[3]) {
                            moreServices = true;
                            continue;
                        }
                        TryAgain.addService(doc, li, srv, id, tab_uri, "icon");
                    }
                    if (moreServices) {
                        var div = doc.createElement("div");
                        div.setAttribute("class", "expand");
                        var a = doc.createElement("a");
                        a.innerHTML = TryAgain.getFormattedString("text.more", []);
                        a.href = "javascript:{}";
                        a.addEventListener('click', function() {
                            div.parentNode.setAttribute("class", "expanded");
                            return false;
                        }, false);
                        div.appendChild(a);
                        li.appendChild(div);
                        for (id in TryAgain_prefs.cacheServices) {
                            var srv = TryAgain_prefs.cacheServices[id];
                            if (srv[3]) {
                                continue;
                            }
                            TryAgain.addService(doc, li, srv, id, tab_uri, "icon extra");
                        }
                    }
                    tryagainList.appendChild(li);
                }

                // Use for affiliate program(s)
                if (false) {
                    li = doc.createElement("li");
                    li.innerHTML = TryAgain.getFormattedString("text.notify_me", []) + " ";
                    a = doc.createElement("a");
                    a.innerHTML = TryAgain.getFormattedString("text.when_site_comes_online", []);
                    li.appendChild(a);
                    tryagainList.appendChild(li);
                }

                var tryagainContainer = doc.createElement("div");
                tryagainContainer.setAttribute("id", "tryagainContainer");
                page.appendChild(tryagainContainer);
    
                var errorAutoRetry1 = doc.createElement("div");
                errorAutoRetry1.setAttribute("id", "errorAutoRetry1");
                errorAutoRetry1.innerHTML = TryAgain.getFormattedString("text.if_at_first", []);

                var errorAutoRetry2 = doc.createElement("span");
                errorAutoRetry2.setAttribute("id", "errorAutoRetry2");
                errorAutoRetry1.appendChild(errorAutoRetry2);

                var errorAutoRetry3 = doc.createElement("span");
                errorAutoRetry3.setAttribute("id", "errorAutoRetry3");
                errorAutoRetry1.appendChild(errorAutoRetry3);

                tryagainContainer.appendChild(errorAutoRetry1);

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

                if (TryAgain_prefs.getPreference("hidetips") == 1) {
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

                var timer;
                var idx;
                try {
                    timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
                    idx = TryAgain.timers.length;
                    for (id in TryAgain.timers) {
                        if (!TryAgain.timers[id]) {
                            idx = id;
                        }
                    }
                    TryAgain.timers[idx] = timer;
                } catch (e) {
                    TryAgain.error(e);
                    return;
                }
                var event1 = {
                    notify: function(timer) {
                        timer.delay = 1000;
                        try {
                            var errorIncrement = doc.getElementById("errorIncrement");
                            if (errorIncrement && !errorIncrement.disabled) {
                                TryAgain.click(errorIncrement);
                            } else {
                                // TODO check if new documentURI is not a
                                // netError to determine success
                                // alert(doc.documentURI + "\n" + tab.contentWindow.window.document.documentURI);
                                timer.cancel();
                                TryAgain.timers[idx] = null;
                            }
                        } catch (e) {
                            timer.cancel();
                            TryAgain.timers[idx] = null;
                            TryAgain.error(e);
                        }
                    }
                }
                timer.initWithCallback(event1, 100, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

                for (id in TryAgain_prefs.downCheckServers) {
                    var server = TryAgain_prefs.downCheckServers[id];
                    if (TryAgain_prefs.getPreference("useauditing") == 0) {
                        tab.setAttribute("tryagain_status_" + server[0], TryAgain.STATUS_UNKNOWN);
                    }
                    TryAgain.updateDownStatus(doc, tab, tab_uri, server[0], server[1], false);
                }
                if (TryAgain_prefs.getPreference("useauditing") == 1) {
                    var d = new Date();
                    if (!tab.hasAttribute("tryagain_audit_check") || tab.getAttribute("tryagain_audit_check") < d.getTime() - TryAgain_prefs.getPreference("auditingTimeout") * 1000) {
                        tab.setAttribute("tryagain_audit_check", d.getTime());
                        for (id in TryAgain_prefs.downCheckServers) {
                            var server = TryAgain_prefs.downCheckServers[id];
                            var httpRequest = TryAgain.checkDownStatus(doc, tab, tab_uri, server[0], server[1], server[2], server[3], server[4]);
                            tab.setAttribute("tryagain_status_"+id, TryAgain.STATUS_POLLING);
                        }
                    }
                }

            } catch (exception) {
                TryAgain.trace(doc, exception, errmessage);
            }
        } else {
            try {
                // A new webpage is loaded after the netError.xhtml page, so
                // reset the counter to zero:
                tab = TryAgain.getTabFromPageloadEvent(doc);

                if (tab!==false) {
                    tab.setAttribute("tryagain_rep", "0");
                }
            } catch (exception) {
                // Just to make sure no errors occur on blank tabs.
            }
        }
    },

    // This function implements the nsIObserverService interface and observes
    // the status of all HTTP channels
    observe : function(aSubject, aTopic, aData) {
        try {
            // FIXME confirm that QueryInterface still works in Fx10
            var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
            if (httpChannel.responseStatus == 404) {
                var window = TryAgain.windowFromChannel(httpChannel, aSubject);
                TryAgain.debug("windowFromChannel(): " + window);
                // Only check the URL of the window itself (e.g. not missing images)
                if (window && window.location == httpChannel.originalURI.spec) {
                    TryAgain.onPageErrorCode(window);
                }
            } else if (httpChannel.responseStatus == 200 && TryAgain.notifySuccess) {
                var window = TryAgain.windowFromChannel(httpChannel, aSubject);
                // Only check the URL of the window itself (e.g. not missing images)
                if (window && window.location == httpChannel.originalURI.spec) {
                    var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
                                        .getService(Components.interfaces.nsISessionStore);
                    var retry = ss.getWindowValue(window, "tryagain-retry");
                    TryAgain.debug("this tab: retry=" + retry);
                    // play a sound if setting enabled
                }
            }
        } catch (e) {
            TryAgain.error(e);
            // Probably wasn't relevant; ignore
        }
    },

    windowFromChannel: function(httpChannel, aSubject) {
        var domWindow;
        try {
            var notificationCallbacks;
            if (httpChannel.notificationCallbacks) {
                notificationCallbacks = httpChannel.notificationCallbacks;
            } else {
                notificationCallbacks = aSubject.loadGroup.notificationCallbacks;
            }
            var interfaceRequestor = notificationCallbacks.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
            domWindow = interfaceRequestor.getInterface(Components.interfaces.nsIDOMWindow);
        } catch (e) {
            // No window associated with this channel
            TryAgain.error(e);
            TryAgain.debug("no window for " + httpChannel.originalURI.spec);
            return null;
        }
        TryAgain.debug("windowFromChannel(): " + domWindow);
        return domWindow;
    },

    onPageErrorCode: function(window) {
        var domWindow = gBrowser.selectedBrowser.contentWindow;
        // FIXME This doesn't work because SessionStore expects a tab or a
        // browser window, and we're providing a DOM window; we need to store
        // this information in the tab, but how do we get the tab from the DOM
        // window?
        var retry;
        //var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
        //                    .getService(Components.interfaces.nsISessionStore);
        //retry = ss.getWindowValue(domWindow, "tryagain-retry");
        if (!retry) {
            retry = 0;
        }
        var timer;
        try {
            timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
        } catch (e) {
            TryAgain.error(e);
            return;
        }
        var count = 10;
        var message = "TryAgain is trying to reload this page. [" + count + "]";
        var nb = getNotificationBox(window);
        var id = 'tryagain-retry';
        var n = nb.getNotificationWithValue(id);
        if (n) {
            n.label = message;
        } else {
            var buttons = [{
                label: 'Reload',
                accessKey: 'R',
                popup: null,
                callback: TryAgain.reloadPage,
                location: window.location,
                reloadTimer: timer
            }, {
                label: 'Stop trying',
                accessKey: 'S',
                popup: null,
                callback: TryAgain.stopReloadPage,
                reloadTimer: timer
            }];
            const priority = nb.PRIORITY_WARNING_LOW;
            n = nb.appendNotification(message, id,
                                 'chrome://tryagain/skin/icon16.png',
                                  priority, buttons);
        }
        retry++;
        if (retry > TryAgain_prefs.getPreference("repeat")) {
            n.label = "TryAgain stopped trying to reload this page after " + retry + " attempts.";
            return;
        }
        // FIXME Same as above!
        //ss.setWindowValue(domWindow, "tryagain-retry", retry+1);
        // Add listener to address bar
        var urlbar = document.getElementById("urlbar");
        if (!urlbar) {
            // Fennec
            urlbar = document.getElementById("urlbar-edit");
        }
        if (urlbar) {
            var listener = function(event) {
                var selectedBrowser = gBrowser.selectedBrowser.contentWindow;
                TryAgain.debug("urlbar: selectedBrowser=" + selectedBrowser + " reloadingTab=" + window);
                if (selectedBrowser == window) {
                    TryAgain.stopReloadPage(n, {reloadTimer: timer});
                }
            };
            urlbar.addEventListener("change", listener, true);
            urlbar.addEventListener("focus", listener, true);
        }
        var event = {
            notify: function(timer) {
                count--;
                if (count <= 0) {
                    timer.cancel();
                    // Check that the window is still available and that the notification hasn't been closed
                    if (window && window.location && nb.getNotificationWithValue(id)) {
                        TryAgain.reloadPage(n, {location: window.location, reloadTimer: timer});
                    }
                } else if (n) {
                    n.label = "TryAgain is trying to reload this page. [" + count + "]";
                } else {
                    timer.cancel();
                }
            }
        }
        timer.initWithCallback(event, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    },
    
    reloadPage: function(notification, data) {
        TryAgain.debug("Reloading " + data.location.href);
        data.location.reload();
        data.reloadTimer.cancel();
        if (notification) {
            notification.label = "TryAgain is reloading this page...";
            //notification.close();
        }
    },

    stopReloadPage: function(notification, data) {
        data.reloadTimer.cancel();
        if (notification) {
            notification.close();
        }
    },

    onOffline: function(e) {
        TryAgain.isOnline = false;
    },  
    
    onOnline: function(e) {
        if (TryAgain.isOnline || TryAgain_prefs.getPreference("offlineModeBehavior") != 2) {
            // If we're already online, do not reload tabs
            return;
        }    
        TryAgain.isOnline = true;
        Application.windows.forEach( function(window) {
            window.tabs.forEach( function(tab) {
                if (tab.document.documentURI.substr(0, 14) == 'about:neterror') {
                    // Reload tabs displaying the offline error
                    tab.document.location.reload();
                }
            })
        })
    }

}

window.addEventListener("load", TryAgain.init, false);
window.addEventListener("offline", TryAgain.onOffline, false)
window.addEventListener("online", TryAgain.onOnline, false)

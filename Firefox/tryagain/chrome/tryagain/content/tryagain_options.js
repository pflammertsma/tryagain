var TryAgain_prefs = {
    version: '3.4.7',
    downCheckServers: [
            [ "uptimeauditor", "http://www.uptimeauditor.com/quicksitecheck.php?x=%url%&src=%source%", "/(fail|ok).gif", "fail", "ok" ],
            [ "downforeojm", "http://www.downforeveryoneorjustme.com/%url%?src=%source%", "<title>[^<]*(Is Up|Is Down) -> [^<]*</title>", "is down", "is up" ],
        ],
    proxyServers: [
            ['proxy.org', "'http://proxy.org/proxy.pl?url=%url_escaped%&proxy=proxify.com'"],
            ['anonymouse.org', "http://anonymouse.org/cgi-bin/anon-www.cgi/%url_escaped%"],
        ],
    cacheServices: [
            [ "coral_cdn", "http://%domain%.nyud.net/%url_suffix_escaped%", "http://coralcdn.org/imgs/circles.ico", true ],
            [ "google", "http://webcache.googleusercontent.com/search?q=cache:%url_escaped%", "http://google.com/favicon.ico", true ],
            [ "wayback", "http://web.archive.org/web/*/%url_escaped%", "http://web.archive.org/favicon.ico", false ],
            [ "bing", "http://www.bing.com/search?q=url:%url_escaped%", "http://www.bing.com/favicon.ico", false ],
            [ "yahoo", "http://search.yahoo.com/search?p=%url_escaped%", "http://search.yahoo.com/favicon.ico", false ],
            [ "gigablast", "http://www.gigablast.com/index.php?q=url:%url_escaped%", "http://www.gigablast.com/favicon.ico", false ],
            [ "webcite", "http://webcitation.org/query.php?url=%url_escaped%", "http://webcitation.org/favicon.ico", false ],
        ],
    sounds: [
            [ "3 beeps", "25881.mp3", [ "acclivity", "http://www.freesound.org/samplesViewSingle.php?id=25881" ] ],
            [ "2 blips", "26777.mp3", [ "junggle", "http://www.freesound.org/samplesViewSingle.php?id=26777" ] ],
            [ "Beep & blip", "25885.mp3", [ "acclivity", "http://www.freesound.org/samplesViewSingle.php?id=25885", "junggle", "http://www.freesound.org/samplesViewSingle.php?id=26777" ] ],
            [ "Buzz & blip", "9299.mp3", [ "drogue", "http://www.freesound.org/samplesViewSingle.php?id=7968", "junggle", "http://www.freesound.org/samplesViewSingle.php?id=26777" ] ],
            [ "Computer keyboard", "7968.mp3", [ "cfork", "http://www.freesound.org/samplesViewSingle.php?id=7968" ] ],
            [ "Crystal glass", "35631.mp3", [ "reinsamba", "http://www.freesound.org/samplesViewSingle.php?id=35631" ] ],
            [ "Electromechanical thunk", "35110.mp3", [ "digifishmusic", "http://www.freesound.org/samplesViewSingle.php?id=25885", "junggle", "http://www.freesound.org/samplesViewSingle.php?id=35110" ] ],
            [ "Kick", "5540.mp3", [ "license", "http://www.freesound.org/samplesViewSingle.php?id=5540" ] ],
            [ "Glockenspiel", "26875.mp3", [ "cfork", "http://www.freesound.org/samplesViewSingle.php?id=26875" ] ],
            [ "Tongue click", "34208.mp3", [ "acclivity", "http://www.freesound.org/samplesViewSingle.php?id=25885", "junggle", "http://www.freesound.org/samplesViewSingle.php?id=34208" ] ],
        ],
    errorTypes: [
        'protocolNotFound',
        'fileNotFound',
        'dnsNotFound',
        'connectionFailure',
        'netInterrupt',
        'netTimeout',
        'cspFrameAncestorBlocked',
        'nssBadCert',
        'nssFailure2',
        'phishingBlocked',
        'malwareBlocked',
        'malformedURI',
        'redirectLoop',
        'unknownSocketType',
        'netReset',
        'netOffline',
        'isprinting',
        'deniedPortAccess',
        'proxyResolveFailure',
        'proxyConnectFailure',
        'contentEncodingError',
        'remoteXUL',
        'unsafeContentType',
    ],
    console: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
    debug: function(msg) { TryAgain_prefs.console.logStringMessage(msg); },
    error: function(msg) { Components.utils.reportError(msg); },
    getPreference: function(s) {
        try {
            var pObj = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch("extensions.tryagain.");
            return pObj.getIntPref(s);
        } catch(e) {
            TryAgain_prefs.error("Failed to load preference " + s);
        }
        return null;
    },
    savePreference: function(s, v) {
        try {
            var pObj = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch("extensions.tryagain.");
            pObj.setIntPref(s, parseInt(v));
        } catch(e) {
            TryAgain_prefs.error("Failed to save preference " + s);
        }
    },
    // URL might be window.location or document.documentURI
    getVariable: function(url, variable) {
        var query = url;
        if (typeof query.search == "string") {
            query = query.search.substring(1);
        } else {
            var pos = query.indexOf("?");
            if (pos >= 0) query = query.substring(pos+1);
        }
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return "";
    },
    
    updateOptions: function(option) {
        var op_repeating = document.getElementById("tryagainRepeating");
        var op_repeat = document.getElementById("tryagainRepeat");
        op_repeat.disabled = (op_repeating.getAttribute('checked') != 'true');
    },

    // Loads preferences into the options.xul window
    load: function() {
        try {
            var version = document.getElementById("tryAgainVersion");
            version.value = TryAgain_prefs.version;
            var op_enabled = document.getElementById("tryagainEnabled");
            op_enabled.setAttribute('checked', (TryAgain_prefs.getPreference("enabled")==1 ? 'true' : 'false'));
            op_enabled.focus();
            var op_timeout = document.getElementById("tryagainTimeout");
            op_timeout.value = TryAgain_prefs.getPreference("timeout");
            var op_repeating = document.getElementById("tryagainRepeating");
            op_repeating.setAttribute('checked', (TryAgain_prefs.getPreference("repeating")==1 ? 'true' : 'false'));
            var op_repeat = document.getElementById("tryagainRepeat");
            op_repeat.value = TryAgain_prefs.getPreference("repeat");
            if (op_repeat.value == 0) {
                op_repeating.setAttribute('checked', 'false');
            }
            var op_showmenu = document.getElementById("tryagainShowMenu");
            op_showmenu.setAttribute('checked', (TryAgain_prefs.getPreference("showmenu")==1 ? 'true' : 'false'));
            var op_hidetips = document.getElementById("tryagainHideTips");
            op_hidetips.setAttribute('checked', (TryAgain_prefs.getPreference("hidetips")==1 ? 'true' : 'false'));
            var op_useauditing = document.getElementById("tryagainUseAuditing");
            op_useauditing.setAttribute('checked', (TryAgain_prefs.getPreference("useauditing")==1 ? 'true' : 'false'));
            
            // Update controls
            TryAgain_prefs.updateOptions(op_repeating);
        } catch(e) {
            TryAgain_prefs.error(e);
        }
    },

    // Save preferences from the options.xul window
    save: function() {
        try {
            var op_enabled = document.getElementById("tryagainEnabled");
            if (op_enabled.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("enabled", 1);
            } else {
                TryAgain_prefs.savePreference("enabled", 0);
            }

            var op_timeout = document.getElementById("tryagainTimeout");
            if(parseInt(op_timeout.value) < 1) op_timeout.value = "1";
            TryAgain_prefs.savePreference("timeout", op_timeout.value);

            var op_repeating = document.getElementById("tryagainRepeating");
            if (op_repeating.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("repeating", 1);
            } else {
                TryAgain_prefs.savePreference("repeating", 0);
            }

            var op_repeat = document.getElementById("tryagainRepeat");
            if(parseInt(op_repeat.value) < 0) op_repeat.value = "0";
            TryAgain_prefs.savePreference("repeat", op_repeat.value);
            
            var op_showmenu = document.getElementById("tryagainShowMenu");
            var wm  = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator)
            var win, menu;
            if (wm) {
                // Default for Mozilla browsers
                var win = wm.getMostRecentWindow("navigator:browser");
                if (!win) {
                    // Try Songbird
                    win = wMediator.getMostRecentWindow("Songbird:Main");
                }
                if (win) {
                    menu = win.document.getElementById('TryAgainMenuItem');
                }
            }
            if (!menu) {
                menu = document.getElementById("TryAgainMenuItem");
            }
            if (menu) {
                // Show or hide the menu item
                if (op_showmenu.getAttribute('checked')=="true") {
                    menu.hidden = false;
                    menu.removeAttribute('style'); // In case style='display:none;' (leftover from 3.0 alpha version)
                    TryAgain_prefs.savePreference("showmenu", 1);
                } else {
                    menu.hidden = true;
                    TryAgain_prefs.savePreference("showmenu", 0);
                }
                menu.setAttribute("checked", op_enabled.getAttribute('checked'));
                win.TryAgain.iAmActive = !win.TryAgain.iAmActive;
            } else {
                TryAgain_prefs.error("could not find menu entry");
            }

            var op_hidetips = document.getElementById("tryagainHideTips");
            if (op_hidetips.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("hidetips", 1);
            } else {
                TryAgain_prefs.savePreference("hidetips", 0);
            }

            var op_useauditing = document.getElementById("tryagainUseAuditing");
            if (op_useauditing.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("useauditing", 1);
            } else {
                TryAgain_prefs.savePreference("useauditing", 0);
            }
        } catch(e) {
            TryAgain_prefs.error(e);
        }
    }
};
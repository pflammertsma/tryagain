var TryAgain_prefs = {
    debug: function(msg) { TryAgain.console.logStringMessage(msg); },
    error: function(msg) { Components.utils.reportError(msg); },

    getPreference: function(s) {
        try {
            var pObj = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch("extensions.tryagain.");
            return pObj.getIntPref(s);
        } catch(e) {
            alert(e);
        }
    },

    savePreference: function(s, v) {
        try {
            var pObj = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch("extensions.tryagain.");
            pObj.setIntPref(s, parseInt(v));
        } catch(e) {
            alert(e);
        }
    },
    
    // Loads preferences into the options.xul window
    load: function() {
        try {
            var tb1 = document.getElementById("tryagainTimeout");
            tb1.value = TryAgain_prefs.getPreference("timeout");
            var tb2 = document.getElementById("tryagainRepeat");
            tb2.value = TryAgain_prefs.getPreference("repeat");
            var tb3 = document.getElementById("tryagainShowMenu");
            tb3.setAttribute('checked', (TryAgain_prefs.getPreference("showmenu")==1 ? 'true' : 'false'));
            var tb4 = document.getElementById("tryagainHideTips");
            tb4.setAttribute('checked', (TryAgain_prefs.getPreference("hidetips")==1 ? 'true' : 'false'));
            var tb5 = document.getElementById("tryagainUseAuditing");
            tb5.setAttribute('checked', (TryAgain_prefs.getPreference("useauditing")==1 ? 'true' : 'false'));
        } catch(e) {
            alert(e);
        }
    },

    // Save preferences from the options.xul window
    save: function() {
        try {
            var tb1 = document.getElementById("tryagainTimeout");
            if(parseInt(tb1.value) < 1) tb1.value = "1";
            TryAgain_prefs.savePreference("timeout", tb1.value);
            var tb2 = document.getElementById("tryagainRepeat");
            if(parseInt(tb2.value) < 0) tb2.value = "0";
            TryAgain_prefs.savePreference("repeat", tb2.value);
            
            var tb3 = document.getElementById("tryagainShowMenu");
            var wm  = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator)
            var win, menu;
            if (!wm) {
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
            if (menu) {
                if (tb3.getAttribute('checked')=="true") {
                    menu.hidden = false;
                    menu.removeAttribute('style'); // In case style='display:none;' (leftover from 3.0 alpha version)
                    TryAgain_prefs.savePreference("showmenu", 1);
                } else {
                    menu.hidden = true;
                    menu.setAttribute("checked","true");
                    TryAgain_prefs.savePreference("showmenu", 0);
                }
                win.TryAgain.iAmActive = !win.TryAgain.iAmActive;
            } else {
                TryAgain_prefs.error("could not find menu entry");
            }
            var tb4 = document.getElementById("tryagainHideTips");
            if (tb4.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("hidetips", 1);
            } else {
                TryAgain_prefs.savePreference("hidetips", 0);
            }

            var tb5 = document.getElementById("tryagainUseAuditing");
            if (tb5.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("useauditing", 1);
            } else {
                TryAgain_prefs.savePreference("useauditing", 0);
            }
        } catch(e) {
            TryAgain_prefs.error(e);
        }
    }
};
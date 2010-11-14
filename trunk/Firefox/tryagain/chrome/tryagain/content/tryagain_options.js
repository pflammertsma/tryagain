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
            var op_enabled = document.getElementById("tryagainEnabled");
            op_enabled.value = TryAgain_prefs.getPreference("enabled");
            var op_timeout = document.getElementById("tryagainTimeout");
            op_timeout.value = TryAgain_prefs.getPreference("timeout");
            var op_repeat = document.getElementById("tryagainRepeat");
            op_repeat.value = TryAgain_prefs.getPreference("repeat");
            var op_showmenu = document.getElementById("tryagainShowMenu");
            op_showmenu.setAttribute('checked', (TryAgain_prefs.getPreference("showmenu")==1 ? 'true' : 'false'));
            var op_hidetips = document.getElementById("tryagainHideTips");
            op_hidetips.setAttribute('checked', (TryAgain_prefs.getPreference("hidetips")==1 ? 'true' : 'false'));
            var op_useauditing = document.getElementById("tryagainUseAuditing");
            op_useauditing.setAttribute('checked', (TryAgain_prefs.getPreference("useauditing")==1 ? 'true' : 'false'));
        } catch(e) {
            alert(e);
        }
    },

    // Save preferences from the options.xul window
    save: function() {
        try {
            var op_enabled = document.getElementById("tryagainEnabled");
            if (op_enabled.getAttribute('checked')=="true") {
                TryAgain_prefs.savePreference("enabled", 1);
                TryAgain.iAmActive = true;
            } else {
                TryAgain_prefs.savePreference("enabled", 0);
                TryAgain.iAmActive = false;
            }

            var op_timeout = document.getElementById("tryagainTimeout");
            if(parseInt(op_timeout.value) < 1) op_timeout.value = "1";
            TryAgain_prefs.savePreference("timeout", op_timeout.value);

            var op_repeat = document.getElementById("tryagainRepeat");
            if(parseInt(op_repeat.value) < 0) op_repeat.value = "0";
            TryAgain_prefs.savePreference("repeat", op_repeat.value);
            
            var op_showmenu = document.getElementById("tryagainShowMenu");
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
            } else {
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
                    menu.setAttribute("checked","true");
                    TryAgain_prefs.savePreference("showmenu", 0);
                }
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
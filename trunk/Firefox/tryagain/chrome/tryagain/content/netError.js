// Error url MUST be formatted like this:
//   moz-neterror:page?e=error&u=url&d=desc
//
// or optionally, to specify an alternate CSS class to allow for
// custom styling and favicon:
//
//   moz-neterror:page?e=error&u=url&s=classname&d=desc
//
// Note that this file uses document.documentURI to get
// the URL (with the format from above). This is because
// document.location.href gets the current URI off the docshell,
// which is the URL displayed in the location bar, i.e.
// the URI that the user attempted to load.

const RETRY_CANCEL = 0;
const RETRY_NORMAL = 1;
const RETRY_OTHER  = 2;
const RETRY_NONE   = 3;

var count           = -1;
var countdown       = "";
var auto_retry      = RETRY_NORMAL;

var retrying = false;

function disableTryAgain() {
    p_timeout = -1;
    auto_retry = RETRY_NONE;
    var btn = document.getElementById("errorTryAgain");
    if (btn) {
        btn.style.display = "none";
    }
    document.getElementById("tryagainContainer").style.display = "none";
    document.getElementById("tryagainList").style.display = "none";
    document.getElementById("retry_x_of_y").style.display = "none";
}

function retryThisExtended() {
    document.getElementById("errorStopRetry").disabled = false;
    auto_retry = RETRY_OTHER;
    retryThis(null);
}

function autoRetryThis() {
    var strbundle = document.getElementById("strings");
    
    if (retrying || typeof p_timeout == 'undefined') return;
    
    var lbl3 = document.getElementById("errorAutoRetry3");
    if (auto_retry != RETRY_NORMAL) {
        if (auto_retry == RETRY_CANCEL && text_cancelled && lbl3) {
            // User has pressed the cancel button
            lbl3.innerHTML = text_cancelled;
        }
        return;
    }
    if (p_timeout<0) {
        // Maximum number of retries reached
        var btn = document.getElementById("errorStopRetry");
        if (btn) {
            btn.disabled=true;
        }
        window.stop();
        return;
    }

    if (count < 0) {
        // Page has just loaded, and counter is still null.
        // Get the correct value from the p_timeout variable.
        count = p_timeout + 1;
    }
    if (count > 0) {
        // Countdown 1 second..
        count--;
        if(count > 0) {
            countdown += " "+count+"..";
        }
    }
    var lbl2 = document.getElementById("errorAutoRetry2");
    if (lbl2) {
        lbl2.innerHTML = countdown;
    }
    if (count == 0) {
        // Done counting down; reload.
        retrying = true;
        if (lbl3) {
            lbl3.innerHTML = text_tryagain;
        }
        retryThis(null);
    }
}

function stopRetry() {
    window.stop();
    auto_retry = RETRY_CANCEL;
    var btn = document.getElementById("errorTryAgain");
    if (btn) {
        btn.disabled = false;
    }
    document.getElementById("errorStopRetry").disabled = true;
    autoRetryThis();
}

function getErrorCode() {
    var url = document.documentURI;
    var error = url.search(/e\=/);
    var duffUrl = url.search(/\&u\=/);
    return decodeURIComponent(url.slice(error + 2, duffUrl));
}

function getCSSClass() {
    var url = document.documentURI;
    var matches = url.match(/s\=([^&]+)\&/);
    // s is optional, if no match just return nothing
    if (!matches || matches.length < 2)
        return "";

    // parenthetical match is the second entry
    return decodeURIComponent(matches[1]);
}

function getDescription() {
    var url = document.documentURI;
    var desc = url.search(/d\=/);

    // desc == -1 if not found; if so, return an empty string
    // instead of what would turn out to be portions of the URI
    if (desc == -1)
        return "";

    return decodeURIComponent(url.slice(desc + 2));
}

function retryThis(buttonEl) {
    // Session history has the URL of the page that failed
    // to load, not the one of the error page. So, just call
    // reload(), which will also repost POST data correctly.
    try {
        location.reload();
    } catch (e) {
        // We probably tried to reload a URI that caused an exception to
        // occur;    e.g. a non-existent file.
    }
    var btn = document.getElementById("errorTryAgain");
    if (btn) {
        btn.disabled = true;
    }
    document.getElementById("errorStopRetry").disabled = false;
}

function initPage() {
    var err = getErrorCode();
    
    // if it's an unknown error or there's no title or description
    // defined, get the generic message
    var errTitle = document.getElementById("et_" + err);
    var errDesc    = document.getElementById("ed_" + err);
    if (!errTitle || !errDesc)
    {
        errTitle = document.getElementById("et_generic");
        errDesc    = document.getElementById("ed_generic");
    }

    var title = document.getElementById("errorTitleText");
    if (title)
    {
        title.parentNode.replaceChild(errTitle, title);
        // change id to the replaced child's id so styling works
        errTitle.id = "errorTitleText";
    }

    var sd = document.getElementById("errorShortDescText");
    if (sd)
        sd.textContent = getDescription();

    var ld = document.getElementById("errorLongDesc");
    if (ld)
    {
        ld.parentNode.replaceChild(errDesc, ld);
        // change id to the replaced child's id so styling works
        errDesc.id = "errorLongDesc";
    }

    // remove undisplayed errors to avoid bug 39098
    var errContainer = document.getElementById("errorContainer");
    errContainer.parentNode.removeChild(errContainer);

    var className = getCSSClass();
    if (className && className != "expertBadCert") {
        // Associate a CSS class with the root of the page, if one was passed in,
        // to allow custom styling.
        // Not "expertBadCert" though, don't want to deal with the favicon
        document.documentElement.className = className;

        // Also, if they specified a CSS class, they must supply their own
        // favicon.    In order to trigger the browser to repaint though, we
        // need to remove/add the link element.
        var favicon = document.getElementById("favicon");
        var faviconParent = favicon.parentNode;
        faviconParent.removeChild(favicon);
        favicon.setAttribute("href", "chrome://global/skin/icons/" + className + "_favicon.png");
        faviconParent.appendChild(favicon);
    }
    if (className == "expertBadCert") {
        showSecuritySection();
    }

    if (err == "nssBadCert") {
        // Remove the "Try again" button for security exceptions, since it's
        // almost certainly useless.
        var btn = document.getElementById("errorTryAgain");
        if (btn) {
            btn.style.display = "none";
        }
        document.getElementById("errorPageContainer").setAttribute("class", "certerror");
        disableTryAgain();
        addDomainErrorLink();
    }
    else {
        // Remove the override block for non-certificate errors.    CSS-hiding
        // isn't good enough here, because of bug 39098
        var secOverride = document.getElementById("securityOverrideDiv");
        secOverride.parentNode.removeChild(secOverride);
    }
}

function showSecuritySection() {
    // Swap link out, content in
    document.getElementById('securityOverrideContent').style.display = '';
    document.getElementById('securityOverrideLink').style.display = 'none';
}

/* In the case of SSL error pages about domain mismatch, see if
     we can hyperlink the user to the correct site.    We don't want
     to do this generically since it allows MitM attacks to redirect
     users to a site under attacker control, but in certain cases
     it is safe (and helpful!) to do so.    Bug 402210
*/
function addDomainErrorLink() {
    // Rather than textContent, we need to treat description as HTML
    var sd = document.getElementById("errorShortDescText");
    if (sd)
        sd.innerHTML = getDescription();

    var link = document.getElementById('cert_domain_link');
    if (!link)
        return;

    var okHost = link.getAttribute("title");
    var thisHost = document.location.hostname;
    var proto = document.location.protocol;

    // If okHost is a wildcard domain ("*.example.com") let's
    // use "www" instead.    "*.example.com" isn't going to
    // get anyone anywhere useful. bug 432491
    okHost = okHost.replace(/^\*\./, "www.");

    /* case #1: 
     * example.com uses an invalid security certificate.
     *
     * The certificate is only valid for www.example.com
     *
     * Make sure to include the "." ahead of thisHost so that
     * a MitM attack on paypal.com doesn't hyperlink to "notpaypal.com"
     *
     * We'd normally just use a RegExp here except that we lack a
     * library function to escape them properly (bug 248062), and
     * domain names are famous for having '.' characters in them,
     * which would allow spurious and possibly hostile matches.
     */
    if (endsWith(okHost, "." + thisHost))
        link.href = proto + okHost;

    /* case #2:
     * browser.garage.maemo.org uses an invalid security certificate.
     *
     * The certificate is only valid for garage.maemo.org
     */
    if (endsWith(thisHost, "." + okHost))
        link.href = proto + okHost;
}

function endsWith(haystack, needle) {
    return haystack.slice(-needle.length) == needle;
}


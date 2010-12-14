try {
  const RETRY_CANCEL = 0;
  const RETRY_NORMAL = 1;
  const RETRY_OTHER  = 2;
  const RETRY_NONE   = 3;

  var auto_retry      = RETRY_NORMAL;
  var seconds         = 3;

  document.onkeydown = keyPress;

  var errorTimeout = document.getElementById('errorTimeout');
  if (errorTimeout) {
    var head = document.getElementsByTagName('head')[0];
    var errorMessage = document.getElementById('errorMessage');
    for (i in head.childNodes) {
      switch (head.childNodes[i].nodeName) {
        case "TITLE":
          if (errorMessage) {
            head.childNodes[i].innerHTML = errorMessage.value;
          }
          break;
        case "STYLE":
          head.removeChild(head.childNodes[i]);
          break;
      }
    }
    seconds = errorTimeout.value;
    setTimeout("autoRetryThis()", 100);
  } else {
    document.getElementById("errorStopRetry").disabled = false;
  }
} catch (e) {}

function keyPress(e) {
  if (e.keyCode == 27) {
    stopRetry();
  }
}

function autoRetryThis() {
  var countdown = this.document.getElementById('countdown');
  if (auto_retry == RETRY_NORMAL) {
    if (seconds <= 0) {
      var action = this.document.getElementById('action');
      action.innerHTML = "try again!";
      retryThis(null);
    } else {
      countdown.innerHTML += seconds + "... ";
      setTimeout("autoRetryThis()", 1000);
      seconds--;
    }
  } else if (auto_retry == RETRY_CANCEL) {
    countdown.innerHTML += "Canceled.";
    auto_retry = RETRY_NONE;
  }
}

function retryThis(btn) {
  // Session history has the URL of the page that failed
  // to load, not the one of the error page. So, just call
  // reload(), which will also repost POST data correctly.
  try {
    var url = this.document.getElementById('errorRetry').value;
    // Reload doesn't work in Chrome
    //location.reload();
    // Just pass along the original URL; POST data will be dropped :(
    location.href = url;
  } catch (e) {
    // We probably tried to reload a URI that caused an exception to
    // occur;    e.g. a non-existent file.
  }
  if (!btn) {
    btn = document.getElementById("errorTryAgain");
  }
  if (btn) {
    btn.disabled = true;
  }
  document.getElementById("errorStopRetry").disabled = false;
}

function retryThisExtended() {
  auto_retry = RETRY_OTHER;
  retryThis(null);
}

function stopRetry() {
  window.stop();
  if (auto_retry == RETRY_NORMAL) {
    auto_retry = RETRY_CANCEL;
  }
  autoRetryThis();
  var errorStopRetry = document.getElementById('errorStopRetry');
  errorStopRetry.setAttribute("disabled", "disabled");
}

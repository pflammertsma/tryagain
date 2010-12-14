var version = "1.0";

function pageLoad() {
  try {
    window.scrollTo(0,0);
  } catch(e) {
    setTimeout('pageLoad();', 50);
    return;
  }
  tryAgain();
}

function tryAgain() {
  if (location.hostname == 'chromewebdata') {
    var title = this.document.getElementById('tryagain');
    if (title != null) {
      return;
    }
    var noMore = true;
    if (retryCount < maxTries || maxTries == 0) {
      noMore = false;
      retryCount++;
    }
    retried = true;
    var content = this.document.getElementById('content');
    var form = this.document.getElementsByTagName('form');
    var scripts = this.document.getElementsByTagName('script');
    var errorDetails = this.document.getElementById('errorDetails');
    if (errorDetails) {
      errorDetails.parentNode.removeChild(errorDetails);
    }
    if (scripts) {
      script = document.createElement("script");
      script.setAttribute("src", extPath + "tryagain.js?" + version);
      scripts[0].parentNode.appendChild(script);
      link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", extPath + "tryagain.css?" + version);
      scripts[0].parentNode.appendChild(link);
    }
    var message1 = "Server not found.";
    var message2 = url + " could not be found";
    var query = url;
    if (form && form[0]) {
      form = form[0];
    } else {
      form = document.createElement("form");
      form.setAttribute("method", "get");
      form.setAttribute("action", "http://google.com/search");
      label = document.createElement("label");
      label.setAttribute("for", "search");
      label.innerHTML = "Search on Google:";
      form.appendChild(label);
      input = document.createElement("input");
      input.name = "q";
      input.setAttribute("id", "search");
      input.setAttribute("type", "text");
      input.setAttribute("value", query);
      form.appendChild(input);
      input = document.createElement("input");
      input.setAttribute("type", "submit");
      input.setAttribute("value", "Google Search");
      form.appendChild(input);
    }
    if (!content) {
      // We need to create a page from scratch
      content = document.createElement("div");
      var body = this.document.getElementsByTagName('body')[0];
      for (i in body.childNodes) {
        switch (body.childNodes[i].nodeName) {
          case "H1":
            message1 = body.childNodes[i].innerHTML;
            message2 = false;
          case "DIV":
            body.removeChild(body.childNodes[i]);
            break;
        }
      }
      content.setAttribute("id", "content");
      body.appendChild(content);
    }
    // clear contents
    content.innerHTML = "";
    // stylize message
    h1 = document.createElement("h1");
    h1.setAttribute('id', 'tryagain');
    h1.innerHTML = message1;
    content.appendChild(h1);
    div = document.createElement("div");
    div.className = "small pad";
    if (!noMore) {
      if (maxTries > 0) {
        div.innerHTML = "Try " + retryCount + " of " + maxTries + ".";
      } else {
        div.innerHTML = "Try " + retryCount + ".";
      }
    } else {
      div.innerHTML = "Tried " + retryCount + " times.";
      div.className += " failed";
    }
    content.appendChild(div);
    div = document.createElement("div");
    div.innerHTML = "Chrome can't find the server at " + domain + ".";
    content.appendChild(div);
    hr = document.createElement("hr");
    content.appendChild(hr);
    // search box
    content.appendChild(form);
    var search = this.document.getElementById('search');
    if (search) {
      query = search.getAttribute("value");
      search.setAttribute("onfocus", "stopRetry();");
      var input = search;
      while (input != null) {
        if (input.type == "submit") {
          input.setAttribute("onclick", "stopRetry();");
        }
        input = input.nextSibling;
      }
    }
    hr = document.createElement("hr");
    content.appendChild(hr);
    // countdown text
    if (!noMore) {
      div = document.createElement("div");
      div.innerHTML = "If at first you don't succeed... ";
      span1 = document.createElement("span");
      span1.className = "small";
      span1.setAttribute('id', 'countdown');
      div.appendChild(span1);
      span2 = document.createElement("span");
      span2.setAttribute('id', 'action');
      div.appendChild(span2);
      content.appendChild(div);
    }
    // buttons
    div = document.createElement("div");
    div.setAttribute('id', 'buttons');
    input = document.createElement("input");
    input.setAttribute('id', 'errorTryAgain');
    input.setAttribute("onclick", "retryThisExtended();");
    input.setAttribute("type", "button");
    input.setAttribute("value", "Try Again");
    div.appendChild(input);
    input = document.createElement("input");
    input.setAttribute('id', 'errorStopRetry');
    input.setAttribute("onclick", "stopRetry();");
    input.setAttribute("type", "button");
    input.setAttribute("value", "Stop trying");
    div.appendChild(input);
    input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("value", url);
    input.setAttribute("id", "errorRetry");
    div.appendChild(input);
    if (message2) {
      input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("value", message2);
      input.setAttribute("id", "errorMessage");
      div.appendChild(input);
    }
    if (!noMore) {
      input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("value", timeout);
      input.setAttribute("id", "errorTimeout");
      div.appendChild(input);
    }
    content.appendChild(div);
    if (errorDetails) {
      hr = document.createElement("hr");
      content.appendChild(hr);
      content.appendChild(errorDetails);
    }
    var about = this.document.getElementById('about');
    if (about) {
      about.parentNode.removeChild(about);
    }
    chrome.extension.sendRequest({retry: retryCount});
  } else {
    retry = 1;
  }
}

pageLoad();

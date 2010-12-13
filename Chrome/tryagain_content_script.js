function pageLoad() {
  try {
    window.scrollTo(0,0);
    tryAgain();
  } catch(e) {
    setTimeout('pageLoad();', 50);
    return;
  }
}

function tryAgain() {
  if (location.hostname == 'chromewebdata') {
    var title = this.document.getElementById('tryagain');
    if (title != null) {
      return;
    }
    retryCount++;
    retried = true;
    var content = this.document.getElementById('content');
    var about = this.document.getElementById('about');
    var form = this.document.getElementsByTagName('form');
    var search = this.document.getElementById('search');
    var scripts = this.document.getElementsByTagName('script');
    if (scripts) {
      script = document.createElement("script");
      script.setAttribute("src", extPath + "tryagain.js?" + Math.random()*1000);
      scripts[0].parentNode.appendChild(script);
      link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", extPath + "tryagain.css");
      scripts[0].parentNode.appendChild(link);
    }
    var query = url;
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
    if (form) {
      form = form[0];
    } else {
      form = document.createElement("form");
      form.setAttribute("method", "get");
      form.setAttribute("action", "http://google.com/search");
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
    // clear contents
    content.innerHTML = "";
    // stylize message
    h1 = document.createElement("h1");
    h1.setAttribute('id', 'tryagain');
    h1.innerHTML = "Server not found";
    content.appendChild(h1);
    div = document.createElement("div");
    div.className = "small pad";
    div.innerHTML = "Try " + retryCount + ".";
    content.appendChild(div);
    div = document.createElement("div");
    div.innerHTML = "Chrome can't find the server at " + domain + ".";
    content.appendChild(div);
    hr = document.createElement("hr");
    content.appendChild(hr);
    // search box
    content.appendChild(form);
    hr = document.createElement("hr");
    content.appendChild(hr);
    // countdown text
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
    input.setAttribute("onclick", "autoRetryThis();");
    input.setAttribute("type", "button");
    input.setAttribute("value", url);
    input.setAttribute("id", "errorRetry");
    input.style.display = 'none';
    // setTimeout(function() { input.click(); }, 100);
    div.appendChild(input);
    content.appendChild(div);
    about.parentNode.removeChild(about);
    chrome.extension.sendRequest({retry: retryCount});
  } else {
    retry = 1;
  }
}

pageLoad();

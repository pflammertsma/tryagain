if (this.location.hostname == 'chromewebdata') {
  chrome.tabs.sendRequest(tabId, {this})
}
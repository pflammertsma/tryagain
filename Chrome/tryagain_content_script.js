chrome.extension.sendRequest({attempt: 1},
  function(response) {
    $('#content').html("TryAgain!");
    console.log(response.url);
  }
);

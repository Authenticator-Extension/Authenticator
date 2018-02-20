var text = location.search.substr(1);
text = decodeURIComponent(text);
document.title = chrome.i18n.getMessage('extName');
document.body.innerText = text;
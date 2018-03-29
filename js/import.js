document.title = chrome.i18n.getMessage('import_backup');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'lock') {
      window.close();
    }
  });
/* tslint:disable:no-reference */
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />

let encryption = new Encription('');

function _updateEncription(password: string) {
  encryption = new Encription(password);
}

async function _getEntries() {
  const optEntries: OTP[] = await EntryStorage.get(encryption);
  return optEntries;
}

chrome.runtime.onMessage.addListener((request, sender, cb) => {
  switch (request.action) {
    case 'GET_ENTRIES':
      _getEntries().then(cb);
      break;
    default:
      break;
  }
  // return true is must,
  // so that chrome knows the response is async.
  // Or callback value will be undefined
  return true;
});
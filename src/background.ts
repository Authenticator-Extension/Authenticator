/* tslint:disable:no-reference */
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />

chrome.runtime.onMessage.addListener((request, sender, cb) => {
  switch (request.action) {
    default:
      break;
  }
  // return true is must,
  // so that chrome knows the response is async.
  // Or callback value will be undefined
  return true;
});
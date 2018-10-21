/* tslint:disable:no-reference no-unused-expression */
/// <reference path="../models/storage.ts" />

afterEach(() => {
  // Restore the default sandbox here
  sinon.restore();
});

describe('smoke test', () => {
  it('checks equality', () => {
    // @ts-ignore
    expect(true).to.be.true;
  });
});

describe('BrowserStorage test local', () => {
  it('Tries to set some data', async () => {
    localStorage.storageLocation = 'local';
    await BrowserStorage.set({test: 'data'});
    chrome.storage.local.set.should.have.been.calledWith({test: 'data'});
  });
});
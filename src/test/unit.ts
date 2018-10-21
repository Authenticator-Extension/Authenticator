/* tslint:disable:no-reference no-unused-expression */
/// <reference path="../models/storage.ts" />

afterEach(() => {
  // Restore the default sandbox here
  sinon.restore();
});

describe('test test', () => {
  it('checks equality', () => {
    true.should.be.true;
  });
});

describe('BrowserStorage', () => {
  describe('local', () => {
    before(() => {
      localStorage.storageLocation = 'local';
    })
    it('Set some data', async () => {
      await BrowserStorage.set({ test: 'data' });
      chrome.storage.local.set.should.have.been.calledWith({ test: 'data' });
    });
  })
});

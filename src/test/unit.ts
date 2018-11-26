/* tslint:disable:no-reference */
/// <reference path="./integration.ts" />
/// <reference path="../models/storage.ts" />

afterEach(() => {
  // @ts-ignore
  chrome.flush();
});

const testData = {
  'generic': {
    '1b0c21ad1ec44264f665708ef82dae84': {
      'account': 'test',
      'counter': 0,
      'encrypted': false,
      'hash': '1b0c21ad1ec44264f665708ef82dae84',
      'index': 0,
      'issuer': '',
      'secret': 'p5s7k2inz3mjoqfg',
      'type': 'totp'
    }
  },
  'enc': {
    // pass: test
    '55d3fb6bf4e8e24ad86b1461b12ea4c0': {
      'account': 'test@security-totp.appspot.com',
      'hash': '55d3fb6bf4e8e24ad86b1461b12ea4c0',
      'issuer': '',
      'secret':
          'U2FsdGVkX18lqvsFwXRksBGdthaz3Y3sQnNMVkCvqCdvR0OzEzHADXWGpnV6ptxBhqGoPs7kLUYZEz+Ll/a27Q==',
      'type': 'totp',
      'encrypted': true,
      'index': 0,
      'counter': 0
    }
  },
  'enc-unencrypted': {
    '55d3fb6bf4e8e24ad86b1461b12ea4c0': {
      'account': 'test@security-totp.appspot.com',
      'hash': '55d3fb6bf4e8e24ad86b1461b12ea4c0',
      'issuer': '',
      'secret': 'YVPGU6YPAVYIYVQQUJVDPCQY4RBWAUAE',
      'type': 'totp',
      'encrypted': false,
      'index': 0,
      'counter': 0
    }
  }
};

// https://github.com/domenic/sinon-chai#assertions

describe('BrowserStorage', () => {
  ['local', 'sync'].forEach((space) => {
    describe(space, () => {
      before(() => {
        localStorage.storageLocation = space;
      });
      it('Set some data', async () => {
        await BrowserStorage.set(testData.generic);
        if (space === 'local') {
          chrome.storage.local.set.should.have.been.calledWith(
              testData.generic);
        } else if (space === 'sync') {
          chrome.storage.sync.set.should.have.been.calledWith(testData.generic);
        }
      });
      it('Get some data', async () => {
        if (space === 'local') {
          // @ts-ignore
          chrome.storage.local.get.yields(testData.generic);
        } else if (space === 'sync') {
          // @ts-ignore
          chrome.storage.sync.get.yields(testData.generic);
        }
        await BrowserStorage.get((result) => {
          result.should.equal(testData.generic);
        });
      });
      it('Delete some data', async () => {
        await BrowserStorage.remove('test');
        if (space === 'local') {
          chrome.storage.local.remove.should.be.calledWith('test');
        } else if (space === 'sync') {
          chrome.storage.sync.remove.should.be.calledWith('test');
        }
      });
    });
  });
});

describe('EntryStorage', () => {
  describe('hasEncryptedEntry', () => {
    it('Has an encrypted entry', async () => {
      // @ts-ignore
      chrome.storage.sync.get.yields(testData.enc);
      const result = await EntryStorage.hasEncryptedEntry();
      result.should.equal(true);
    });
    it('Does not have an encrypted entry', async () => {
      // @ts-ignore
      chrome.storage.sync.get.yields(testData.generic);
      const result = await EntryStorage.hasEncryptedEntry();
      result.should.equal(false);
    });
  });
  describe('getExport', () => {
    it('Get unencrypted export data from encrypted data', async () => {
      // @ts-ignore
      chrome.storage.sync.get.yields(testData.enc);
      const result =
          await EntryStorage.getExport(new Encryption('test'), false);
      result.should.eql(testData['enc-unencrypted']);
    });
    it('Get encrypted export data', async () => {
      // @ts-ignore
      chrome.storage.sync.get.yields(testData.enc);
      const result = await EntryStorage.getExport(new Encryption('test'), true);
      result.should.eql(testData.enc);
    });
  });
  /*
  describe('import', () => {

  });
  describe('add', () => {

  });
  describe('update', () => {

  });
  describe('set', () => {

  });
  describe('get', () => {

  });
  describe('remove', () => {

  });
  describe('delete', () => {

  });
  */
});

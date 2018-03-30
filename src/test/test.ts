interface TestCase {
  name: string;
  data: {
    /* tslint:disable-next-line:no-any */
    [hash: string]: {
      /* tslint:disable-next-line:no-any */
      [key: string]: any
    };
  };
}

const cases: TestCase[] = [
  {
    name: 'Missing fields',
    data: {'7733be61632fa6af88d31218e6c4afb2': {'secret': 'abcd2345'}}
  },
  {
    name: 'Bad hash in key',
    data: {
      'badhash': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '7733be61632fa6af88d31218e6c4afb2',
        'index': 0,
        'issuer': '',
        'secret': 'abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Bad hash',
    data: {
      'badhash': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': 'badhash',
        'index': 0,
        'issuer': '',
        'secret': 'abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Bad type for HEX',
    data: {
      'e19d5cd5af0378da05f63f891c7467af': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': 'e19d5cd5af0378da05f63f891c7467af',
        'index': 0,
        'issuer': '',
        'secret': 'abcd1234',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Unicode in issuer',
    data: {
      '7733be61632fa6af88d31218e6c4afb2': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '7733be61632fa6af88d31218e6c4afb2',
        'index': 0,
        'issuer': '✓ à la mode',
        'secret': 'abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Battle migrate',
    data: {
      '95c869de1221960c7f7e6892f78d7062': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '95c869de1221960c7f7e6892f78d7062',
        'index': 0,
        'issuer': '',
        'secret': 'blz-abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Steam migrate',
    data: {
      '95c869de1221960c7f7e6892f78d7062': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '95c869de1221960c7f7e6892f78d7062',
        'index': 0,
        'issuer': '',
        'secret': 'stm-abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Missing field with HEX secret',
    data: {'e19d5cd5af0378da05f63f891c7467af': {'secret': 'abcd1234'}}
  },
  {
    name: 'Mess index',
    data: {
      '7733be61632fa6af88d31218e6c4afb2': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '7733be61632fa6af88d31218e6c4afb2',
        'index': 6,
        'issuer': '',
        'secret': 'abcd2345',
        'type': 'totp'
      },
      '770f51f23603ddae810e446630c2f673': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '770f51f23603ddae810e446630c2f673',
        'index': 6,
        'issuer': '',
        'secret': 'abcd2346',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Base32 with padding',
    data: {
      'b905232a977347a0a113a7d1c924fb8d': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': 'b905232a977347a0a113a7d1c924fb8d',
        'index': 0,
        'issuer': '',
        'secret': 'DKCE3SQPHJRJQGBGI322QA7Z5E======',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Incorrect but valid hash',
    data: {
      'ffffffffffffffffffffffffffffffff': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': 'ffffffffffffffffffffffffffffffff',
        'index': 0,
        'issuer': '',
        'secret': 'abcd2345',
        'type': 'totp'
      }
    }
  },
  {
    name: 'HOTP with HEX secret',
    data: {
      '7c117a118e015b6232ff359958b9e270': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '7c117a118e015b6232ff359958b9e270',
        'index': 0,
        'issuer': '',
        'secret': '2c52e8fcfac34091da63ef7b118f1cc50b925a42',
        'type': 'hhex'
      }
    }
  },
  {
    name: 'Amazon 2FA',
    data: {
      '0e00b601f60a4d7154d54ba94c429afb': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '0e00b601f60a4d7154d54ba94c429afb',
        'index': 0,
        'issuer': '',
        'secret': 'QLGNXJ2KLSOACXOEKJ47X6VA6ZPGT5HE2GBO5NPXTLD7FJAKD4JQ',
        'type': 'totp'
      }
    }
  },
  {
    name: 'Secret contains spaces',
    data: {
      '1b0c21ad1ec44264f665708ef82dae84': {
        'account': 'test',
        'counter': 0,
        'encrypted': false,
        'hash': '1b0c21ad1ec44264f665708ef82dae84',
        'index': 0,
        'issuer': '',
        'secret': 'p5s7 k2in z3mj oqfg',
        'type': 'totp'
      }
    }
  }
];

let testCaseIndex = 0;
let testRes: Array<{pass: boolean, error: string}> = [];
let testResData: string[] = [];

function testStart() {
  if (document.getElementById('lock')) {
    const checkbox = document.getElementById('lock') as HTMLInputElement;
    if (!checkbox.checked) {
      return;
    }
  }
  const startBtn = document.getElementById('start');
  if (startBtn) {
    startBtn.setAttribute('disabled', 'true');
  }
  testCaseIndex = 0;
  testRes = [];
  test();
}

function testFinished() {
  clear();
  console.log('Test finished.');
  for (const res of testRes) {
    if (!res.pass) {
      alert('Test failed!');
      return;
    }
  }
  alert('Test passed!');
  return;
}

async function clear() {
  return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
    try {
      chrome.storage.sync.clear(resolve);
    } catch (error) {
      reject(error);
    }
  });
}

async function get<T>() {
  return new Promise(
      (resolve: (items: {[key: string]: T}) => void,
       reject: (reason: Error) => void) => {
        try {
          chrome.storage.sync.get(resolve);
        } catch (error) {
          reject(error);
        }
      });
}

async function set(items: {[key: string]: {}}) {
  /* tslint:disable-next-line:no-any */
  return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
    try {
      chrome.storage.sync.set(items, resolve);
    } catch (error) {
      reject(error);
    }
  });
}

async function test() {
  if (testCaseIndex === cases.length * 2) {
    testFinished();
    return;
  }

  console.log(
      cases[Math.floor(testCaseIndex / 2)].name,
      testCaseIndex % 2 ? 'Reopen' : '');

  if (testCaseIndex % 2 === 0) {
    clear();
    await set(cases[Math.floor(testCaseIndex / 2)].data);
  }

  if (document.getElementsByTagName('iframe') &&
      document.getElementsByTagName('iframe')[0]) {
    testRes[testCaseIndex] = {pass: true, error: ''};

    document.getElementsByTagName('iframe')[0].src = 'popup.html';
    document.getElementsByTagName('iframe')[0].onload = () => {
      document.getElementsByTagName('iframe')[0].contentWindow.addEventListener(
          'unhandledrejection', event => {
            const rejectionEvent = event as PromiseRejectionEvent;
            testRes[testCaseIndex] = {
              pass: false,
              error: rejectionEvent.reason
            };
          });

      document.getElementsByTagName('iframe')[0].contentWindow.onerror =
          error => {
            testRes[testCaseIndex] = {pass: false, error};
          };
    };
  }

  setTimeout(async () => {
    const data = await get<{
      /* tslint:disable-next-line:no-any */
      [key: string]: any
    }>();

    testResData[testCaseIndex] = JSON.stringify(data, null, 2);

    if (testRes[testCaseIndex].pass) {
      if (Object.keys(data).length !==
          Object.keys(cases[Math.floor(testCaseIndex / 2)].data).length) {
        testRes[testCaseIndex] = {pass: false, error: `Missing data`};
      } else {
        for (const hash of Object.keys(data)) {
          const item = data[hash];
          const keys = [
            'issuer', 'account', 'secret', 'hash', 'index', 'type', 'counter',
            'encrypted'
          ];
          for (const key of keys) {
            if (item[key] === undefined) {
              testRes[testCaseIndex] = {
                pass: false,
                error: `Missing key<${key}>: ${JSON.stringify(item)}`
              };
              break;
            }
          }
        }
      }
    }

    showTestResult();
    testCaseIndex++;

    if (document.getElementsByTagName('iframe') &&
        document.getElementsByTagName('iframe')[0]) {
      document.getElementsByTagName('iframe')[0].src = 'about:blank';
    }

    await test();
  }, 1000);
}

function showTestResult() {
  const testResultContainer = document.getElementById('test');
  if (!testResultContainer) {
    return;
  }

  testResultContainer.innerHTML = '';
  for (let i = 0; i < testRes.length; i++) {
    const el = document.createElement('tr');
    el.innerHTML = `<td style="vertical-align: text-top; width: 50px; color: ${
        testRes[i].pass ? 'green' :
                          'red'}">[${testRes[i].pass ? 'Pass' : 'Fail'}]</td>`;
    el.innerHTML +=
        `<td><h3 style="margin: 0">${cases[Math.floor(i / 2)].name}${
            i % 2 === 1 ? ' (Reopen)' :
                          ''}</h3>${testRes[i].error}<br><pre><code>${
            testResData[i]}</code></pre><br></td>`;

    testResultContainer.appendChild(el);
  }
}

const startBtn = document.getElementById('start');
if (startBtn) {
  startBtn.onclick = testStart;
}

window.addEventListener('message', (event) => {
  testRes[testCaseIndex] = {pass: false, error: event.data};
}, false);

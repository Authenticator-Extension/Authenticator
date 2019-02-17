if (!document.getElementById('__ga_grayLayout__')) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'capture':
        sendResponse('beginCapture');
        showGrayLayout();
        break;
      case 'errorsecret':
        alert(chrome.i18n.getMessage('errorsecret') + message.secret);
        break;
      case 'errorqr':
        alert(chrome.i18n.getMessage('errorqr'));
        break;
      case 'added':
        alert(message.account + chrome.i18n.getMessage('added'));
        break;
      case 'text':
        showQrCode(message.text);
        break;
      case 'pastecode':
        pasteCode(message.code);
        break;
      default:
        // invalid command, ignore it
        break;
    }
  });
}

sessionStorage.setItem('captureBoxPositionLeft', '0');
sessionStorage.setItem('captureBoxPositionTop', '0');

function showGrayLayout() {
  let grayLayout = document.getElementById('__ga_grayLayout__');
  if (!grayLayout) {
    grayLayout = document.createElement('div');
    grayLayout.id = '__ga_grayLayout__';
    document.body.appendChild(grayLayout);
    const scan = document.createElement('div');
    scan.className = 'scan';
    scan.style.background = 'url(' +
        chrome.extension.getURL('images/scan.gif') + ') no-repeat center';
    grayLayout.appendChild(scan);
    const captureBox = document.createElement('div');
    captureBox.id = '__ga_captureBox__';
    grayLayout.appendChild(captureBox);
    grayLayout.onmousedown = grayLayoutDown;
    grayLayout.onmousemove = grayLayoutMove;
    grayLayout.onmouseup = (event) => {
      grayLayoutUp(event);
    };
    grayLayout.oncontextmenu = (event) => {
      event.preventDefault();
      return;
    };
  }
  grayLayout.style.display = 'block';
}

function grayLayoutDown(event: MouseEvent) {
  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }
  const captureBox = document.getElementById('__ga_captureBox__');
  if (!captureBox) {
    return;
  }

  sessionStorage.setItem('captureBoxPositionLeft', event.clientX.toString());
  sessionStorage.setItem('captureBoxPositionTop', event.clientY.toString());
  captureBox.style.left = event.clientX + 'px';
  captureBox.style.top = event.clientY + 'px';
  captureBox.style.width = '1px';
  captureBox.style.height = '1px';
  captureBox.style.display = 'block';
  return;
}

function grayLayoutMove(event: MouseEvent) {
  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }
  const captureBox = document.getElementById('__ga_captureBox__');
  if (!captureBox) {
    return;
  }

  const captureBoxLeft = Math.min(
      Number(sessionStorage.getItem('captureBoxPositionLeft')), event.clientX);
  const captureBoxTop = Math.min(
      Number(sessionStorage.getItem('captureBoxPositionTop')), event.clientY);
  const captureBoxWidth =
      Math.abs(
          Number(sessionStorage.getItem('captureBoxPositionLeft')) -
          event.clientX) -
      1;
  const captureBoxHeight =
      Math.abs(
          Number(sessionStorage.getItem('captureBoxPositionTop')) -
          event.clientY) -
      1;
  captureBox.style.left = captureBoxLeft + 'px';
  captureBox.style.top = captureBoxTop + 'px';
  captureBox.style.width = captureBoxWidth + 'px';
  captureBox.style.height = captureBoxHeight + 'px';
  return;
}

function grayLayoutUp(event: MouseEvent) {
  const grayLayout = document.getElementById('__ga_grayLayout__');
  const captureBox = document.getElementById('__ga_captureBox__');
  if (!captureBox || !grayLayout) {
    return;
  }

  setTimeout(() => {
    captureBox.style.display = 'none';
    grayLayout.style.display = 'none';
  }, 100);

  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }

  const captureBoxLeft =
      Math.min(
          Number(sessionStorage.getItem('captureBoxPositionLeft')),
          event.clientX) +
      1;
  const captureBoxTop =
      Math.min(
          Number(sessionStorage.getItem('captureBoxPositionTop')),
          event.clientY) +
      1;
  const captureBoxWidth =
      Math.abs(
          Number(sessionStorage.getItem('captureBoxPositionLeft')) -
          event.clientX) -
      1;
  const captureBoxHeight =
      Math.abs(
          Number(sessionStorage.getItem('captureBoxPositionTop')) -
          event.clientY) -
      1;

  // make sure captureBox and grayLayout is hidden
  setTimeout(() => {
    sendPosition(
        captureBoxLeft, captureBoxTop, captureBoxWidth, captureBoxHeight);
  }, 200);
  return false;
}

function sendPosition(
    left: number, top: number, width: number, height: number) {
  chrome.runtime.sendMessage({
    action: 'position',
    info: {left, top, width, height, windowWidth: window.innerWidth}
  });
}

function showQrCode(msg: string) {
  const left = (screen.width / 2) - 200;
  const top = (screen.height / 2) - 100;
  const url =
      chrome.extension.getURL('view/qr.html') + '?' + encodeURIComponent(msg);
  window.open(
      url, '_blank',
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, copyhistory=no, width=400, height=200, left=' +
          left + ',top=' + top);
}

function pasteCode(code: string) {
  const _inputBoxes = document.getElementsByTagName('input');
  const inputBoxes: HTMLInputElement[] = [];
  for (let i = 0; i < _inputBoxes.length; i++) {
    if (_inputBoxes[i].type === 'text' || _inputBoxes[i].type === 'number' ||
        _inputBoxes[i].type === 'tel' || _inputBoxes[i].type === 'password') {
      inputBoxes.push(_inputBoxes[i]);
    }
  }
  if (!inputBoxes.length) {
    return;
  }
  const identities = [
    '2fa', 'otp', 'authenticator', 'factor', 'code', 'totp', 'twoFactorCode'
  ];
  for (const inputBox of inputBoxes) {
    for (const identity of identities) {
      if (inputBox.name.toLowerCase().indexOf(identity) >= 0 ||
          inputBox.id.toLowerCase().indexOf(identity) >= 0) {
        if (!inputBox.value) {
          inputBox.value = code;
        }
        return;
      }
    }
  }

  const activeInputBox =
      document.activeElement && document.activeElement.tagName === 'INPUT' ?
      document.activeElement :
      null;
  if (activeInputBox) {
    const inputBox = activeInputBox as HTMLInputElement;
    if (!inputBox.value) {
      inputBox.value = code;
    }
    return;
  }

  for (const inputBox of inputBoxes) {
    if (!inputBox.value && inputBox.type !== 'password') {
      inputBox.value = code;
      return;
    }
  }
  return;
}

window.onkeydown = (event) => {
  if (event.keyCode === 27) {
    event.preventDefault();
    const grayLayout = document.getElementById('__ga_grayLayout__');
    const captureBox = document.getElementById('__ga_captureBox__');

    if (grayLayout) {
      grayLayout.style.display = 'none';
    }
    if (captureBox) {
      captureBox.style.display = 'none';
    }
  }
};

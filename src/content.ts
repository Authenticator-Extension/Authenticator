chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'capture':
      sendResponse('beginCapture');
      showGrayLayout(message.passphrase);
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
    default:
      // invalid command, ignore it
      break;
  }
});

interface CaptureBoxPosition {
  left: number;
  top: number;
}

let captureBoxPosition: CaptureBoxPosition = {left: 0, top: 0};

function showGrayLayout(passphrase: string) {
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
      grayLayoutUp(event, passphrase);
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

  captureBoxPosition.left = event.clientX;
  captureBoxPosition.top = event.clientY;
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

  const captureBoxLeft = Math.min(captureBoxPosition.left, event.clientX);
  const captureBoxTop = Math.min(captureBoxPosition.top, event.clientY);
  const captureBoxWidth = Math.abs(captureBoxPosition.left - event.clientX) - 1;
  const captureBoxHeight = Math.abs(captureBoxPosition.top - event.clientY) - 1;
  captureBox.style.left = captureBoxLeft + 'px';
  captureBox.style.top = captureBoxTop + 'px';
  captureBox.style.width = captureBoxWidth + 'px';
  captureBox.style.height = captureBoxHeight + 'px';
  return;
}

function grayLayoutUp(event: MouseEvent, passphrase: string) {
  const grayLayout = document.getElementById('__ga_grayLayout__');
  const captureBox = document.getElementById('__ga_captureBox__');
  if (!captureBox || !grayLayout) {
    return;
  }

  let captureBoxLeft = Math.min(captureBoxPosition.left, event.clientX) + 1;
  let captureBoxTop = Math.min(captureBoxPosition.top, event.clientY) + 1;
  let captureBoxWidth = Math.abs(captureBoxPosition.left - event.clientX) - 1;
  let captureBoxHeight = Math.abs(captureBoxPosition.top - event.clientY) - 1;
  captureBoxLeft *= window.devicePixelRatio;
  captureBoxTop *= window.devicePixelRatio;
  captureBoxWidth *= window.devicePixelRatio;
  captureBoxHeight *= window.devicePixelRatio;

  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }

  setTimeout(() => {
    captureBox.style.display = 'none';
    grayLayout.style.display = 'none';
  }, 100);
  // make sure captureBox and grayLayout is hidden
  setTimeout(() => {
    sendPosition(
        captureBoxLeft, captureBoxTop, captureBoxWidth, captureBoxHeight,
        passphrase);
  }, 200);
  return false;
}

function sendPosition(
    left: number, top: number, width: number, height: number,
    passphrase: string) {
  chrome.runtime.sendMessage({
    action: 'position',
    info: {
      left,
      top,
      width,
      height,
      windowWidth: window.innerWidth,
      passphrase
    }
  });
}

function showQrCode(msg: string) {
  const left = (screen.width / 2) - 200;
  const top = (screen.height / 2) - 100;
  const url =
      chrome.extension.getURL('qr.html') + '?' + encodeURIComponent(msg);
  window.open(
      url, '_blank',
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, copyhistory=no, width=400, height=200, left=' +
          left + ',top=' + top);
}
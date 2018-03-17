chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'position') {
    if (!sender.tab) {
      return;
    }
    getQrDebug(
        sender.tab, message.info.left, message.info.top, message.info.width,
        message.info.height, message.info.windowWidth, message.info.passphrase);
  }
});

function getQrDebug(
    tab: chrome.tabs.Tab, left: number, top: number, width: number,
    height: number, windowWidth: number, passphrase: string) {
  chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, (dataUrl) => {
    const qr = new Image();
    qr.src = dataUrl;
    qr.onload = () => {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = width;
      captureCanvas.height = height;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(qr, left, top, width, height, 0, 0, width, height);
      const url = captureCanvas.toDataURL();
      const infoDom = document.getElementById('info');
      if (infoDom) {
        infoDom.innerHTML = '<b>Scan Data:</b><br>' +
            `<br>` +
            `Window Inner Width: ${windowWidth}<br>` +
            `Width: ${width}<br>` +
            `Height: ${height}<br>` +
            `Left: ${left}<br>` +
            `Top: ${top}<br>` +
            `Screen Width: ${window.screen.width}<br>` +
            `Screen Height: ${window.screen.height}<br>` +
            `Capture Width: ${qr.width}<br>` +
            `Capture Height: ${qr.height}<br>` +
            `Device Pixel Ratio:${window.devicePixelRatio}<br>` +
            `Tab ID: ${tab.id}<br>` +
            '<br>' +
            '<b>Captured Screenshot:</b>';
      }

      const qrDom = document.getElementById('qr') as HTMLImageElement;
      if (qrDom) {
        qrDom.src = url;
      }
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "position") {
    if (!sender.tab) {
      return;
    }
    getQrDebug(
      sender.tab,
      message.info.left,
      message.info.top,
      message.info.width,
      message.info.height,
      message.info.windowWidth
    );
  }
});

function getQrDebug(
  tab: chrome.tabs.Tab,
  left: number,
  top: number,
  width: number,
  height: number,
  windowWidth: number
) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
    const qr = new Image();
    qr.src = dataUrl;
    qr.onload = () => {
      const devicePixelRatio = qr.width / windowWidth;
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = width * devicePixelRatio;
      captureCanvas.height = height * devicePixelRatio;
      const ctx = captureCanvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(
        qr,
        left * devicePixelRatio,
        top * devicePixelRatio,
        width * devicePixelRatio,
        height * devicePixelRatio,
        0,
        0,
        width * devicePixelRatio,
        height * devicePixelRatio
      );
      const url = captureCanvas.toDataURL();
      const infoDom = document.getElementById("info");
      if (infoDom) {
        infoDom.innerHTML =
          "<b>Scan Data:</b><br>" +
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
          `Device Pixel Ratio: ${devicePixelRatio} / ${window.devicePixelRatio}<br>` +
          `Tab ID: ${tab.id}<br>` +
          "<br>" +
          "<b>Captured Screenshot:</b>";
      }

      const qrDom = document.getElementById("qr") as HTMLImageElement;
      if (qrDom) {
        qrDom.src = url;
      }
    };
  });
}

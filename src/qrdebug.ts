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
      message.info.windowWidth,
    );
  }
  // no response is sent, so don't return true (which leaves the sender's
  // message channel open and rejects it on close)
});

function getQrDebug(
  tab: chrome.tabs.Tab,
  left: number,
  top: number,
  width: number,
  height: number,
  windowWidth: number,
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
        height * devicePixelRatio,
      );
      const url = captureCanvas.toDataURL();
      const infoDom = document.getElementById("info");
      if (infoDom) {
        infoDom.textContent = "";
        const title = document.createElement("b");
        title.textContent = "Scan Data:";
        infoDom.appendChild(title);
        infoDom.appendChild(document.createElement("br"));
        infoDom.appendChild(document.createElement("br"));
        const lines = [
          `Window Inner Width: ${windowWidth}`,
          `Width: ${width}`,
          `Height: ${height}`,
          `Left: ${left}`,
          `Top: ${top}`,
          `Screen Width: ${window.screen.width}`,
          `Screen Height: ${window.screen.height}`,
          `Capture Width: ${qr.width}`,
          `Capture Height: ${qr.height}`,
          `Device Pixel Ratio: ${devicePixelRatio} / ${window.devicePixelRatio}`,
          `Tab ID: ${tab.id}`,
        ];
        for (const line of lines) {
          infoDom.appendChild(document.createTextNode(line));
          infoDom.appendChild(document.createElement("br"));
        }
        infoDom.appendChild(document.createElement("br"));
        const footer = document.createElement("b");
        footer.textContent = "Captured Screenshot:";
        infoDom.appendChild(footer);
      }

      const qrDom = document.getElementById("qr") as HTMLImageElement;
      if (qrDom) {
        qrDom.src = url;
      }
    };
  });
}

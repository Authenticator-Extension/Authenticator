// @ts-expect-error - injected by vue-svg-loader
import scanGIF from "../images/scan.gif";

if (!document.getElementById("__ga_grayLayout__")) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case "capture":
        sendResponse("beginCapture");
        showGrayLayout();
        break;
      case "errorqr":
        alert(chrome.i18n.getMessage("errorqr"));
        break;
      case "errorsecret":
        alert(chrome.i18n.getMessage("errorsecret") + message.secret);
        break;
      case "errorenc":
        alert(chrome.i18n.getMessage("phrase_incorrect"));
        break;
      case "added":
        alert(message.account + chrome.i18n.getMessage("added"));
        break;
      case "text":
        alert(message.text);
        break;
      case "migrationfail":
        alert(chrome.i18n.getMessage("migration_fail"));
        break;
      case "migrationpartlyfail":
        alert(chrome.i18n.getMessage("migration_partly_fail"));
        break;
      case "migrationsuccess":
        alert(chrome.i18n.getMessage("updateSuccess"));
        break;
      case "pastecode":
        pasteCode(message.code);
        break;
      case "stopCapture": {
        const captureBox = document.getElementById("__ga_captureBox__");
        if (captureBox) {
          captureBox.style.display = "none";
        }

        const grayLayout = document.getElementById("__ga_grayLayout__");
        if (grayLayout) {
          grayLayout.style.display = "none";
        }
        break;
      }
      default:
        // invalid command, ignore it
        break;
    }
    // Only "capture" responds, and it does so synchronously, so don't return
    // true. Returning true kept the channel open waiting for a response that
    // never came for the other actions (e.g. errorqr when a scan finds no QR),
    // making the background sender's sendMessage promise reject.
  });
}

sessionStorage.setItem("captureBoxPositionLeft", "0");
sessionStorage.setItem("captureBoxPositionTop", "0");

function showGrayLayout() {
  let grayLayout = document.getElementById("__ga_grayLayout__");
  if (!grayLayout) {
    grayLayout = document.createElement("div");
    grayLayout.id = "__ga_grayLayout__";
    document.body.appendChild(grayLayout);
    const scan = document.createElement("div");
    scan.className = "scan";
    scan.id = "__ga_scan__";
    scan.style.background = `url('${scanGIF}') no-repeat center`;
    grayLayout.appendChild(scan);
    const captureBox = document.createElement("div");
    captureBox.id = "__ga_captureBox__";
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
    // Belt-and-suspenders: explicitly refuse native drag (e.g. dragging over an
    // image/link under the overlay), which otherwise shows the no-drop cursor.
    grayLayout.ondragstart = () => false;
    grayLayout.style.userSelect = "none";
  }
  grayLayout.style.display = "block";
}

function grayLayoutDown(event: MouseEvent) {
  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }
  const captureBox = document.getElementById("__ga_captureBox__");
  if (!captureBox) {
    return;
  }

  // Stop the browser from starting a native text-selection / image drag, which
  // shows the "no-drop" cursor and steals the gesture from our drag-select.
  event.preventDefault();

  sessionStorage.setItem("captureBoxPositionLeft", event.clientX.toString());
  sessionStorage.setItem("captureBoxPositionTop", event.clientY.toString());
  captureBox.style.left = event.clientX + "px";
  captureBox.style.top = event.clientY + "px";
  captureBox.style.width = "1px";
  captureBox.style.height = "1px";
  captureBox.style.display = "block";

  const scan = document.getElementById("__ga_scan__");
  if (scan) {
    scan.style.background = "transparent";
  }
  return;
}

function grayLayoutMove(event: MouseEvent) {
  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }
  // Only redraw while the left button is actually held. Without this the box
  // tracked every bare pointer move (before the first click and after release),
  // so the selection felt jumpy and "undraggable".
  if (event.buttons !== 1) {
    return;
  }
  const captureBox = document.getElementById("__ga_captureBox__");
  if (!captureBox) {
    return;
  }

  const captureBoxLeft = Math.min(
    Number(sessionStorage.getItem("captureBoxPositionLeft")),
    event.clientX,
  );
  const captureBoxTop = Math.min(
    Number(sessionStorage.getItem("captureBoxPositionTop")),
    event.clientY,
  );
  const captureBoxWidth =
    Math.abs(
      Number(sessionStorage.getItem("captureBoxPositionLeft")) - event.clientX,
    ) - 1;
  const captureBoxHeight =
    Math.abs(
      Number(sessionStorage.getItem("captureBoxPositionTop")) - event.clientY,
    ) - 1;
  captureBox.style.left = captureBoxLeft + "px";
  captureBox.style.top = captureBoxTop + "px";
  captureBox.style.width = captureBoxWidth + "px";
  captureBox.style.height = captureBoxHeight + "px";
  return;
}

function grayLayoutUp(event: MouseEvent) {
  const grayLayout = document.getElementById("__ga_grayLayout__");
  const captureBox = document.getElementById("__ga_captureBox__");
  if (!captureBox || !grayLayout) {
    return;
  }

  setTimeout(() => {
    captureBox.style.display = "none";
    grayLayout.style.display = "none";
  }, 100);

  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    return;
  }

  const captureBoxLeft =
    Math.min(
      Number(sessionStorage.getItem("captureBoxPositionLeft")),
      event.clientX,
    ) + 1;
  const captureBoxTop =
    Math.min(
      Number(sessionStorage.getItem("captureBoxPositionTop")),
      event.clientY,
    ) + 1;
  const captureBoxWidth =
    Math.abs(
      Number(sessionStorage.getItem("captureBoxPositionLeft")) - event.clientX,
    ) - 1;
  const captureBoxHeight =
    Math.abs(
      Number(sessionStorage.getItem("captureBoxPositionTop")) - event.clientY,
    ) - 1;

  // make sure captureBox and grayLayout is hidden
  setTimeout(() => {
    chrome.runtime
      .sendMessage({
        action: "getCapture",
        info: {
          captureBoxLeft,
          captureBoxTop,
          captureBoxWidth,
          captureBoxHeight,
          // Sent so the background can recover the display's device pixel ratio
          // (bitmap.width / windowInnerWidth) when cropping the captured image.
          windowInnerWidth: window.innerWidth,
        },
      })
      .catch(() => {
        // The background listener never sendResponse()s or returns true for
        // getCapture (see background.ts), so a normal round-trip resolves
        // with undefined and never reaches here. This only rejects when the
        // service worker itself is unreachable (e.g. failed to start), which
        // otherwise left the user staring at a capture box that silently did
        // nothing.
        alert(chrome.i18n.getMessage("capture_failed"));
      });
  }, 200);
  return false;
}

// Skip inputs the user can't see (hidden honeypots, off-screen fields) so the
// code doesn't land in the wrong box. checkVisibility is guarded for older
// browsers that don't support it. (#1273, #1136)
function isVisibleInput(input: HTMLInputElement) {
  return typeof input.checkVisibility !== "function" || input.checkVisibility();
}

function pasteCode(code: string) {
  const _inputBoxes = document.getElementsByTagName("input");
  const inputBoxes: HTMLInputElement[] = [];
  for (let i = 0; i < _inputBoxes.length; i++) {
    if (
      (_inputBoxes[i].type === "text" ||
        _inputBoxes[i].type === "number" ||
        _inputBoxes[i].type === "tel" ||
        _inputBoxes[i].type === "password") &&
      isVisibleInput(_inputBoxes[i])
    ) {
      inputBoxes.push(_inputBoxes[i]);
    }
  }
  if (!inputBoxes.length) {
    return;
  }
  const identities = [
    "2fa",
    "otp",
    "authenticator",
    "factor",
    "code",
    "totp",
    "twoFactorCode",
  ];
  for (const inputBox of inputBoxes) {
    for (const identity of identities) {
      if (
        inputBox.name.toLowerCase().indexOf(identity) >= 0 ||
        inputBox.id.toLowerCase().indexOf(identity) >= 0
      ) {
        if (!inputBox.value || /^(\d{6}|\d{8})$/.test(inputBox.value)) {
          inputBox.value = code;
          fireInputEvents(inputBox);
        }
        return;
      }
    }
  }

  const activeInputBox =
    document.activeElement && document.activeElement.tagName === "INPUT"
      ? document.activeElement
      : null;
  if (activeInputBox) {
    const inputBox = activeInputBox as HTMLInputElement;
    if (!inputBox.value || /^(\d{6}|\d{8})$/.test(inputBox.value)) {
      inputBox.value = code;
      fireInputEvents(inputBox);
    }
    return;
  }

  for (const inputBox of inputBoxes) {
    if (
      (!inputBox.value || /^(\d{6}|\d{8})$/.test(inputBox.value)) &&
      inputBox.type !== "password"
    ) {
      inputBox.value = code;
      fireInputEvents(inputBox);
      return;
    }
  }
  return;
}

function fireInputEvents(inputBox: HTMLInputElement) {
  const events = [
    new KeyboardEvent("keydown"),
    new KeyboardEvent("keyup"),
    new KeyboardEvent("keypress"),
    new Event("input", { bubbles: true }),
    new Event("change", { bubbles: true }),
  ];
  for (const event of events) {
    inputBox.dispatchEvent(event);
  }
  return;
}

window.onkeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    const grayLayout = document.getElementById("__ga_grayLayout__");
    const captureBox = document.getElementById("__ga_captureBox__");

    if (grayLayout) {
      grayLayout.style.display = "none";
    }
    if (captureBox) {
      captureBox.style.display = "none";
    }
  }
};

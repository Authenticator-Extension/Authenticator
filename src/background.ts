// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import QRCode from "qrcode-reader";
import jsQR from "jsqr";

import { getCredentials } from "./models/credentials";
import { Encryption } from "./models/encryption";
import { EntryStorage, ManagedStorage } from "./models/storage";
import { Dropbox, Drive, OneDrive } from "./models/backup";
import * as uuid from "uuid/v4";

import { getOTPAuthPerLineFromOPTAuthMigration } from "./models/migration";

let cachedPassphrase = "";
let autolockTimeout: number;
let contentTab: chrome.tabs.Tab | undefined;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "position") {
    if (!sender.tab) {
      return;
    }
    getQr(
      sender.tab,
      message.info.left,
      message.info.top,
      message.info.width,
      message.info.height,
      message.info.windowWidth
    );
  } else if (message.action === "cachePassphrase") {
    cachedPassphrase = message.value;
    clearTimeout(autolockTimeout);
    setAutolock();
  } else if (message.action === "passphrase") {
    sendResponse(cachedPassphrase);
  } else if (["dropbox", "drive", "onedrive"].indexOf(message.action) > -1) {
    getBackupToken(message.action);
  } else if (message.action === "lock") {
    cachedPassphrase = "";
    document.cookie = 'passphrase=";expires=Thu, 01 Jan 1970 00:00:00 GMT"';
  } else if (message.action === "resetAutolock") {
    clearTimeout(autolockTimeout);
    setAutolock();
  } else if (message.action === "updateContentTab") {
    contentTab = message.data;
  }
});

function getQr(
  tab: chrome.tabs.Tab,
  left: number,
  top: number,
  width: number,
  height: number,
  windowWidth: number
) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
    contentTab = tab;
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
      const qrReader = new QRCode();
      qrReader.callback = (
        error: string,
        text: {
          result: string;
          points: Array<{
            x: number;
            y: number;
            count: number;
            estimatedModuleSize: number;
          }>;
        }
      ) => {
        if (error) {
          console.error(error);
          const qrImageData = ctx.getImageData(
            0,
            0,
            captureCanvas.width,
            captureCanvas.height
          );
          const jsQrCode = jsQR(
            qrImageData.data,
            captureCanvas.width,
            captureCanvas.height
          );
          if (jsQrCode) {
            getTotp(jsQrCode.data);
          } else {
            if (!contentTab || !contentTab.id) {
              return;
            }
            const id = contentTab.id;
            chrome.tabs.sendMessage(id, { action: "errorqr" });
          }
        } else {
          getTotp(text.result);
        }
      };
      qrReader.decode(url);
    };
  });
}

async function getTotp(text: string, silent = false) {
  if (!contentTab || !contentTab.id || !text) {
    return false;
  }
  const id = contentTab.id;

  if (text.indexOf("otpauth://") !== 0) {
    if (text.indexOf("otpauth-migration://") === 0) {
      const otpUrls = getOTPAuthPerLineFromOPTAuthMigration(text);
      if (otpUrls.length === 0) {
        !silent && chrome.tabs.sendMessage(id, { action: "errorenc" });
        return false;
      }

      const getTotpPromises: Array<Promise<boolean>> = [];
      for (const otpUrl of otpUrls) {
        getTotpPromises.push(getTotp(otpUrl, true));
      }

      const getTotpResults = await Promise.allSettled(getTotpPromises);
      const failedCount = getTotpResults.filter((res) => !res).length;
      if (failedCount === otpUrls.length) {
        !silent && chrome.tabs.sendMessage(id, { action: "migrationfail" });
        return false;
      }

      if (failedCount > 0) {
        !silent &&
          chrome.tabs.sendMessage(id, { action: "migrationpartlyfail" });
        return true;
      }

      !silent && chrome.tabs.sendMessage(id, { action: "migrationsuccess" });
      return true;
    } else if (text === "error decoding QR Code") {
      !silent && chrome.tabs.sendMessage(id, { action: "errorqr" });
      return false;
    } else {
      !silent && chrome.tabs.sendMessage(id, { action: "text", text });
      return true;
    }
  } else {
    let uri = text.split("otpauth://")[1];
    let type = uri.substr(0, 4).toLowerCase();
    uri = uri.substr(5);
    let label = uri.split("?")[0];
    const parameterPart = uri.split("?")[1];
    if (!label || !parameterPart) {
      !silent && chrome.tabs.sendMessage(id, { action: "errorqr" });
      return false;
    } else {
      let secret = "";
      let account: string | undefined;
      let issuer: string | undefined;
      let algorithm: string | undefined;
      let period: number | undefined;
      let digits: number | undefined;

      try {
        label = decodeURIComponent(label);
      } catch (error) {
        console.error(error);
      }
      if (label.indexOf(":") !== -1) {
        issuer = label.split(":")[0];
        account = label.split(":")[1];
      } else {
        account = label;
      }
      const parameters = parameterPart.split("&");
      parameters.forEach((item) => {
        const parameter = item.split("=");
        if (parameter[0].toLowerCase() === "secret") {
          secret = parameter[1];
        } else if (parameter[0].toLowerCase() === "issuer") {
          try {
            issuer = decodeURIComponent(parameter[1]);
          } catch {
            issuer = parameter[1];
          }
          issuer = issuer.replace(/\+/g, " ");
        } else if (parameter[0].toLowerCase() === "counter") {
          // let counter = Number(parameter[1]);
          // counter = isNaN(counter) || counter < 0 ? 0 : counter;
        } else if (parameter[0].toLowerCase() === "period") {
          period = Number(parameter[1]);
          period =
            isNaN(period) || period < 0 || period > 60 || 60 % period !== 0
              ? undefined
              : period;
        } else if (parameter[0].toLowerCase() === "digits") {
          digits = Number(parameter[1]);
          digits = isNaN(digits) || digits === 0 ? 6 : digits;
        } else if (parameter[0].toLowerCase() === "algorithm") {
          algorithm = parameter[1];
        }
      });

      if (!secret) {
        !silent && chrome.tabs.sendMessage(id, { action: "errorqr" });
        return false;
      } else if (
        !/^[0-9a-f]+$/i.test(secret) &&
        !/^[2-7a-z]+=*$/i.test(secret)
      ) {
        !silent && chrome.tabs.sendMessage(id, { action: "secretqr", secret });
        return false;
      } else {
        const encryption = new Encryption(cachedPassphrase);
        const hash = await uuid();
        if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "totp"
        ) {
          type = "hex";
        } else if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "hotp"
        ) {
          type = "hhex";
        }
        const entryData: { [hash: string]: OTPStorage } = {};
        entryData[hash] = {
          account,
          hash,
          issuer,
          secret,
          type,
          encrypted: false,
          index: 0,
          counter: 0,
          pinned: false,
        };
        if (period) {
          entryData[hash].period = period;
        }
        if (digits) {
          entryData[hash].digits = digits;
        }
        if (algorithm) {
          entryData[hash].algorithm = algorithm;
        }
        if (
          (await EntryStorage.hasEncryptedEntry()) !==
          encryption.getEncryptionStatus()
        ) {
          !silent && chrome.tabs.sendMessage(id, { action: "errorenc" });
          return false;
        }
        await EntryStorage.import(encryption, entryData);
        !silent && chrome.tabs.sendMessage(id, { action: "added", account });
        return true;
      }
    }
  }
}

function getBackupToken(service: string) {
  if (
    navigator.userAgent.indexOf("Chrome") !== -1 &&
    navigator.userAgent.indexOf("Edg") === -1 &&
    service === "drive"
  ) {
    chrome.identity.getAuthToken(
      {
        interactive: true,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      },
      (value) => {
        if (!value) {
          return false;
        }
        localStorage.driveToken = value;
        chrome.runtime.sendMessage({ action: "drivetoken", value });
        return true;
      }
    );
  } else {
    let authUrl = "";
    let redirUrl = "";
    if (service === "dropbox") {
      redirUrl = encodeURIComponent(chrome.identity.getRedirectURL());
      authUrl =
        "https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=" +
        getCredentials().dropbox.client_id +
        "&redirect_uri=" +
        redirUrl;
    } else if (service === "drive") {
      if (navigator.userAgent.indexOf("Edg") !== -1) {
        redirUrl = encodeURIComponent("https://authenticator.cc/oauth-edge");
      } else if (navigator.userAgent.indexOf("Firefox") !== -1) {
        redirUrl = encodeURIComponent(chrome.identity.getRedirectURL());
      } else {
        redirUrl = encodeURIComponent("https://authenticator.cc/oauth");
      }

      authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&client_id=" +
        getCredentials().drive.client_id +
        "&scope=https%3A//www.googleapis.com/auth/drive.file&prompt=consent&redirect_uri=" +
        redirUrl;
    } else if (service === "onedrive") {
      redirUrl = encodeURIComponent(chrome.identity.getRedirectURL());
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${
        getCredentials().onedrive.client_id
      }&response_type=code&redirect_uri=${redirUrl}&scope=https%3A%2F%2Fgraph.microsoft.com%2FFiles.ReadWrite${
        localStorage.oneDriveBusiness !== "true" ? ".AppFolder" : ""
      }%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access&response_mode=query&prompt=consent`;
    }
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (url) => {
        if (!url) {
          return;
        }
        let hashMatches = url.split("#");
        if (service === "drive") {
          hashMatches = url.slice(0, -1).split("?");
        } else if (service === "onedrive") {
          hashMatches = url.split("?");
        }

        if (hashMatches.length < 2) {
          return;
        }

        const hash = hashMatches[1];

        const resData = hash.split("&");
        for (let i = 0; i < resData.length; i++) {
          const kv = resData[i];
          if (/^(.*?)=(.*?)$/.test(kv)) {
            const kvMatches = kv.match(/^(.*?)=(.*?)$/);
            if (!kvMatches) {
              continue;
            }
            const key = kvMatches[1];
            const value = kvMatches[2];
            if (key === "access_token") {
              if (service === "dropbox") {
                localStorage.dropboxToken = value;
                uploadBackup("dropbox");
                return;
              }
            } else if (key === "code") {
              if (service === "drive") {
                const xhr = new XMLHttpRequest();
                // Need to trade code we got from launchWebAuthFlow for a
                // token & refresh token
                await new Promise(
                  (
                    resolve: (value: boolean) => void,
                    reject: (reason: Error) => void
                  ) => {
                    xhr.open(
                      "POST",
                      "https://www.googleapis.com/oauth2/v4/token?client_id=" +
                        getCredentials().drive.client_id +
                        "&client_secret=" +
                        getCredentials().drive.client_secret +
                        "&code=" +
                        value +
                        "&redirect_uri=" +
                        redirUrl +
                        "&grant_type=authorization_code"
                    );
                    xhr.setRequestHeader("Accept", "application/json");
                    xhr.setRequestHeader(
                      "Content-Type",
                      "application/x-www-form-urlencoded"
                    );
                    xhr.onreadystatechange = () => {
                      if (xhr.readyState === 4) {
                        try {
                          const res = JSON.parse(xhr.responseText);
                          if (res.error) {
                            console.error(res.error_description);
                            resolve(false);
                          } else {
                            localStorage.driveToken = res.access_token;
                            localStorage.driveRefreshToken = res.refresh_token;
                            resolve(true);
                          }
                        } catch (error) {
                          console.error(error);
                          reject(error);
                        }
                      }
                      return;
                    };
                    xhr.send();
                  }
                );
                uploadBackup("drive");
              } else if (service === "onedrive") {
                const xhr = new XMLHttpRequest();
                // Need to trade code we got from launchWebAuthFlow for a
                // token & refresh token
                await new Promise(
                  (
                    resolve: (value: boolean) => void,
                    reject: (reason: Error) => void
                  ) => {
                    xhr.open(
                      "POST",
                      "https://login.microsoftonline.com/common/oauth2/v2.0/token"
                    );
                    xhr.setRequestHeader("Accept", "application/json");
                    xhr.setRequestHeader(
                      "Content-Type",
                      "application/x-www-form-urlencoded"
                    );
                    xhr.onreadystatechange = () => {
                      if (xhr.readyState === 4) {
                        try {
                          const res = JSON.parse(xhr.responseText);
                          if (res.error) {
                            console.error(res.error_description);
                            resolve(false);
                          } else {
                            localStorage.oneDriveToken = res.access_token;
                            localStorage.oneDriveRefreshToken =
                              res.refresh_token;
                            resolve(true);
                          }
                        } catch (error) {
                          console.error(error);
                          reject(error);
                        }
                      }
                      return;
                    };
                    xhr.send(
                      `client_id=${
                        getCredentials().onedrive.client_id
                      }&grant_type=authorization_code&scope=https%3A%2F%2Fgraph.microsoft.com%2FFiles.ReadWrite${
                        localStorage.oneDriveBusiness !== "true"
                          ? ".AppFolder"
                          : ""
                      }%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access&code=${value}&redirect_uri=${redirUrl}&client_secret=${encodeURIComponent(
                        getCredentials().onedrive.client_secret
                      )}`
                    );
                  }
                );
                uploadBackup("onedrive");
              }
            }
          }
        }
        return;
      }
    );
  }
}

async function uploadBackup(service: string) {
  const encryption = new Encryption(cachedPassphrase);

  switch (service) {
    case "dropbox":
      await new Dropbox().upload(encryption);
      break;

    case "drive":
      await new Drive().upload(encryption);
      break;

    case "onedrive":
      await new OneDrive().upload(encryption);
      break;

    default:
      break;
  }
}

// Show issue page after first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") {
    return;
  } else if (await ManagedStorage.get("disableInstallHelp")) {
    return;
  }

  let url: string | null = null;

  if (
    navigator.userAgent.indexOf("Chrome") !== -1 &&
    navigator.userAgent.indexOf("Edg") === -1
  ) {
    url = "https://otp.ee/chromeissues";
  }

  if (url) {
    window.open(url, "_blank");
  }
});

chrome.commands.onCommand.addListener(async (command: string) => {
  switch (command) {
    case "scan-qr":
      await new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            return chrome.tabs.executeScript(
              { file: "/dist/content.js" },
              () => {
                chrome.tabs.insertCSS({ file: "/css/content.css" }, resolve);
              }
            );
          } catch (error) {
            console.error(error);
            return reject(error);
          }
        }
      );

      if (cachedPassphrase === "") {
        return;
      }

      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) {
          return;
        }
        contentTab = tab;
        chrome.tabs.sendMessage(tab.id, { action: "capture" });
      });
      break;

    default:
      break;
  }
});

async function setAutolock() {
  const enforcedAutolock = Number(await ManagedStorage.get("enforceAutolock"));

  if (enforcedAutolock && enforcedAutolock > 0) {
    autolockTimeout = window.setTimeout(() => {
      cachedPassphrase = "";
      if (contentTab && contentTab.id) {
        chrome.tabs.sendMessage(contentTab.id, { action: "stopCapture" });
      }
      chrome.runtime.sendMessage({ action: "stopImport" });
    }, enforcedAutolock * 60000);
    return;
  }

  if (Number(localStorage.autolock) > 0) {
    autolockTimeout = window.setTimeout(() => {
      cachedPassphrase = "";
      if (contentTab && contentTab.id) {
        chrome.tabs.sendMessage(contentTab.id, { action: "stopCapture" });
      }
      chrome.runtime.sendMessage({ action: "stopImport" });
    }, Number(localStorage.autolock) * 60000);
  }
}

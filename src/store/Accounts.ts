import { EntryStorage, BrowserStorage } from "../models/storage";
import { Encryption } from "../models/encryption";
import * as CryptoJS from "crypto-js";
import { OTPType } from "../models/otp";
import { ActionContext } from "vuex";

export class Accounts implements IModule {
  async getModule() {
    const cachedPassphrase = await this.getCachedPassphrase();
    const encryption: Encryption = new Encryption(cachedPassphrase);
    let shouldShowPassphrase = cachedPassphrase
      ? false
      : await EntryStorage.hasEncryptedEntry();
    const entries = shouldShowPassphrase ? [] : await this.getEntries();

    for (let i = 0; i < entries.length; i++) {
      if (entries[i].code === "Encrypted") {
        shouldShowPassphrase = true;
        break;
      }
    }

    return {
      state: {
        entries,
        encryption,
        OTPType,
        shouldShowPassphrase,
        sectorStart: false, // Should display timer circles?
        sectorOffset: 0, // Offset in seconds for animations
        second: 0, // Offset in seconds for math
        filter: true,
        siteName: await this.getSiteName(),
        showSearch: false,
        exportData: await EntryStorage.getExport(entries),
        exportEncData: await EntryStorage.getExport(entries, true),
        key: await BrowserStorage.getKey(),
        wrongPassword: false
      },
      getters: {
        shouldFilter(
          state: AccountsState,
          getters: { matchedEntries: string[] }
        ) {
          return getters.matchedEntries.length;
        },
        matchedEntries: (state: AccountsState) => {
          return this.matchedEntries(state.siteName, state.entries);
        },
        currentlyEncrypted(state: AccountsState) {
          for (const entry of state.entries) {
            if (entry.secret === null) {
              return true;
            }
          }
          return false;
        }
      },
      mutations: {
        stopFilter(state: AccountsState) {
          state.filter = false;
        },
        showSearch(state: AccountsState) {
          state.showSearch = true;
        },
        updateCodes(state: AccountsState) {
          let second = new Date().getSeconds();
          if (localStorage.offset) {
            // prevent second from negative
            second += Number(localStorage.offset) + 60;
          }

          second = second % 60;
          state.second = second;

          let currentlyEncrypted = false;

          for (const entry of state.entries) {
            if (entry.secret === null) {
              currentlyEncrypted = true;
            }
          }

          if (
            !state.sectorStart &&
            state.entries.length > 0 &&
            !currentlyEncrypted
          ) {
            state.sectorStart = true;
            state.sectorOffset = -second;
          }

          // if (second > 25) {
          //   app.class.timeout = true;
          // } else {
          //   app.class.timeout = false;
          // }
          // if (second < 1) {
          //   const entries = app.entries as OTP[];
          //   for (let i = 0; i < entries.length; i++) {
          //     if (entries[i].type !== OTPType.hotp &&
          //         entries[i].type !== OTPType.hhex) {
          //       entries[i].generate();
          //     }
          //   }
          // }
          const entries = state.entries as IOTPEntry[];
          for (let i = 0; i < entries.length; i++) {
            if (
              entries[i].type !== OTPType.hotp &&
              entries[i].type !== OTPType.hhex
            ) {
              entries[i].generate();
            }
          }
        },
        loadCodes(state: AccountsState, newCodes: IOTPEntry[]) {
          state.entries = newCodes;
        },
        moveCode(state: AccountsState, opts: { from: number; to: number }) {
          state.entries.splice(
            opts.to,
            0,
            state.entries.splice(opts.from, 1)[0]
          );

          for (let i = 0; i < state.entries.length; i++) {
            if (state.entries[i].index !== i) {
              state.entries[i].index = i;
            }
          }
        },
        updateExport(
          state: AccountsState,
          exportData: { [k: string]: IOTPEntry }
        ) {
          state.exportData = exportData;
        },
        updateEncExport(
          state: AccountsState,
          exportData: { [k: string]: IOTPEntry }
        ) {
          state.exportEncData = exportData;
        },
        updateKeyExport(
          state: AccountsState,
          key: { enc: string; hash: string } | null
        ) {
          state.key = key;
        },
        wrongPassword(state: AccountsState) {
          state.wrongPassword = true;
        }
      },
      actions: {
        deleteCode: async (
          state: ActionContext<AccountsState, {}>,
          hash: string
        ) => {
          const index = state.state.entries.findIndex(
            entry => entry.hash === hash
          );
          if (index > -1) {
            state.state.entries.splice(index, 1);
          }
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit(
            "updateEncExport",
            await EntryStorage.getExport(state.state.entries, true)
          );
        },
        addCode: async (
          state: ActionContext<AccountsState, {}>,
          entry: IOTPEntry
        ) => {
          state.state.entries.unshift(entry);
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit(
            "updateEncExport",
            await EntryStorage.getExport(state.state.entries, true)
          );
        },
        applyPassphrase: async (
          state: ActionContext<AccountsState, {}>,
          password: string
        ) => {
          if (!password) {
            return;
          }

          state.commit("currentView/changeView", "LoadingPage", { root: true });

          const encKey = await BrowserStorage.getKey();
          if (!encKey) {
            // --- migrate to key
            // verify current password
            state.state.encryption.updateEncryptionPassword(password);
            await state.dispatch("updateEntries");

            if (state.getters.currentlyEncrypted) {
              state.commit("style/hideInfo", true, { root: true });
              return;
            }
            // gen key
            const randomKey = crypto.getRandomValues(new Uint32Array(30));
            const wordArray = CryptoJS.lib.WordArray.create(randomKey);
            const encKey = CryptoJS.AES.encrypt(wordArray, password).toString();
            const encKeyHash = await new Promise(
              (resolve: (value: string) => void) => {
                const iframe = document.getElementById("argon-sandbox");
                const message = {
                  action: "hash",
                  value: wordArray.toString()
                };
                if (iframe) {
                  window.addEventListener("message", response => {
                    resolve(response.data.response);
                  });
                  //@ts-ignore
                  iframe.contentWindow.postMessage(message, "*");
                }
              }
            );

            if (!encKeyHash) {
              state.commit("style/hideInfo", true, { root: true });
              return;
            }

            // store key
            await BrowserStorage.set({
              key: { enc: encKey, hash: encKeyHash }
            });
            // change entry encryption to key and remove old hash
            for (const entry of state.state.entries) {
              await entry.changeEncryption(
                new Encryption(wordArray.toString())
              );
              await entry.genUUID();
            }

            state.state.encryption.updateEncryptionPassword(
              wordArray.toString()
            );
            await state.dispatch("updateEntries");
          } else {
            // --- decrypt using key
            const key = CryptoJS.AES.decrypt(encKey.enc, password).toString();
            const isCorrectPassword = await new Promise(
              (resolve: (value: string) => void) => {
                const iframe = document.getElementById("argon-sandbox");
                const message = {
                  action: "verify",
                  value: key,
                  hash: encKey.hash
                };
                if (iframe) {
                  window.addEventListener("message", response => {
                    resolve(response.data.response);
                  });
                  //@ts-ignore
                  iframe.contentWindow.postMessage(message, "*");
                }
              }
            );

            if (!isCorrectPassword) {
              state.commit("wrongPassword");
              state.commit("currentView/changeView", "EnterPasswordPage", {
                root: true
              });
              return;
            }

            state.state.encryption.updateEncryptionPassword(key);
            await state.dispatch("updateEntries");

            if (!state.getters.currentlyEncrypted) {
              chrome.runtime.sendMessage({
                action: "cachePassphrase",
                value: key
              });
            }
          }
          state.commit("style/hideInfo", true, { root: true });
          return;
        },
        changePassphrase: async (
          state: ActionContext<AccountsState, {}>,
          password: string
        ) => {
          if (password) {
            const randomKey = crypto.getRandomValues(new Uint32Array(30));
            const wordArray = CryptoJS.lib.WordArray.create(randomKey);
            const encKey = CryptoJS.AES.encrypt(wordArray, password).toString();
            const encKeyHash = await new Promise(
              (resolve: (value: string) => void) => {
                const iframe = document.getElementById("argon-sandbox");
                const message = {
                  action: "hash",
                  value: wordArray.toString()
                };
                if (iframe) {
                  window.addEventListener("message", response => {
                    resolve(response.data.response);
                  });
                  //@ts-ignore
                  iframe.contentWindow.postMessage(message, "*");
                }
              }
            );

            if (!encKeyHash) {
              return;
            }

            // store key
            await BrowserStorage.set({
              key: { enc: encKey, hash: encKeyHash }
            });
            // change entry encryption and regen hash
            for (const entry of state.state.entries) {
              await entry.changeEncryption(
                new Encryption(wordArray.toString())
              );
              await entry.genUUID();
            }

            state.state.encryption.updateEncryptionPassword(
              wordArray.toString()
            );

            await state.dispatch("updateEntries");

            // https://github.com/Authenticator-Extension/Authenticator/issues/412
            if (navigator.userAgent.indexOf("Chrome") !== -1) {
              await BrowserStorage.clearLogs();
            }

            chrome.runtime.sendMessage({
              action: "cachePassphrase",
              value: wordArray.toString()
            });
          } else {
            for (const entry of state.state.entries) {
              await entry.changeEncryption(new Encryption(""));
            }

            state.state.encryption.updateEncryptionPassword("");

            BrowserStorage.remove("key");

            await state.dispatch("updateEntries");

            chrome.runtime.sendMessage({
              action: "lock"
            });
          }

          // remove cached passphrase in old version
          localStorage.removeItem("encodedPhrase");
        },
        updateEntries: async (state: ActionContext<AccountsState, {}>) => {
          const entries = await this.getEntries();

          if (state.state.encryption.getEncryptionStatus()) {
            for (const entry of entries) {
              await entry.applyEncryption(state.state.encryption as Encryption);
            }
          }

          state.commit("loadCodes", entries);
          state.commit("updateCodes");
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit(
            "updateEncExport",
            await EntryStorage.getExport(state.state.entries, true)
          );
          state.commit("updateKeyExport", await BrowserStorage.getKey());
          return;
        },
        clearFilter: (state: ActionContext<AccountsState, {}>) => {
          state.commit("stopFilter");
          if (state.state.entries.length >= 10) {
            state.commit("showSearch");
          }
        },
        migrateStorage: async (
          state: ActionContext<AccountsState, {}>,
          newStorageLocation: string
        ) => {
          // sync => local
          if (
            localStorage.storageLocation === "sync" &&
            newStorageLocation === "local"
          ) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.get(syncData => {
                chrome.storage.local.set(syncData, () => {
                  chrome.storage.local.get(localData => {
                    // Double check if data was set
                    if (
                      Object.keys(syncData).every(
                        value => Object.keys(localData).indexOf(value) >= 0
                      )
                    ) {
                      localStorage.storageLocation = "local";
                      chrome.storage.sync.clear();
                      resolve("updateSuccess");
                      return;
                    } else {
                      reject(" All data not transferred successfully.");
                      return;
                    }
                  });
                });
              });
            });
            // local => sync
          } else if (
            localStorage.storageLocation === "local" &&
            newStorageLocation === "sync"
          ) {
            return new Promise((resolve, reject) => {
              chrome.storage.local.get(localData => {
                chrome.storage.sync.set(localData, () => {
                  chrome.storage.sync.get(syncData => {
                    // Double check if data was set
                    if (
                      Object.keys(localData).every(
                        value => Object.keys(syncData).indexOf(value) >= 0
                      )
                    ) {
                      localStorage.storageLocation = "sync";
                      chrome.storage.local.clear();
                      resolve("updateSuccess");
                      return;
                    } else {
                      reject(" All data not transferred successfully.");
                      return;
                    }
                  });
                });
              });
            });
          }
        }
      },
      namespaced: true
    };
  }

  private async getSiteName() {
    return new Promise(
      (
        resolve: (value: Array<string | null>) => void,
        reject: (reason: Error) => void
      ) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
          const tab = tabs[0];
          if (!tab) {
            return resolve([null, null]);
          }

          const title = tab.title
            ? tab.title.replace(/[^a-z0-9]/gi, "").toLowerCase()
            : null;

          if (!tab.url) {
            return resolve([title, null]);
          }

          const urlParser = document.createElement("a");
          urlParser.href = tab.url;
          const hostname = urlParser.hostname.toLowerCase();

          // try to parse name from hostname
          // i.e. hostname is www.example.com
          // name should be example
          let nameFromDomain = "";

          // ip address
          if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            nameFromDomain = hostname;
          }

          // local network
          if (hostname.indexOf(".") === -1) {
            nameFromDomain = hostname;
          }

          const hostLevelUnits = hostname.split(".");

          if (hostLevelUnits.length === 2) {
            nameFromDomain = hostLevelUnits[0];
          }

          // www.example.com
          // example.com.cn
          if (hostLevelUnits.length > 2) {
            // example.com.cn
            if (
              ["com", "net", "org", "edu", "gov", "co"].indexOf(
                hostLevelUnits[hostLevelUnits.length - 2]
              ) !== -1
            ) {
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 3];
            } else {
              // www.example.com
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 2];
            }
          }

          nameFromDomain = nameFromDomain.replace(/-/g, "").toLowerCase();

          return resolve([title, nameFromDomain, hostname]);
        });
      }
    );
  }

  private getCachedPassphrase() {
    return new Promise((resolve: (value: string) => void) => {
      chrome.runtime.sendMessage(
        { action: "passphrase" },
        (passphrase: string) => {
          return resolve(passphrase);
        }
      );
    });
  }

  private async getEntries() {
    const otpEntries = await EntryStorage.get();
    return otpEntries;
  }

  private matchedEntries(siteName: Array<string | null>, entries: IOTPEntry[]) {
    if (siteName.length < 2) {
      return false;
    }

    const matched = [];

    for (const entry of entries) {
      if (this.isMatchedEntry(siteName, entry)) {
        matched.push(entry.hash);
      }
    }

    return matched;
  }

  private isMatchedEntry(siteName: Array<string | null>, entry: IOTPEntry) {
    if (!entry.issuer) {
      return false;
    }

    const issuerHostMatches = entry.issuer.split("::");
    const issuer = issuerHostMatches[0]
      .replace(/[^0-9a-z]/gi, "")
      .toLowerCase();

    if (!issuer) {
      return false;
    }

    const siteTitle = siteName[0] || "";
    const siteNameFromHost = siteName[1] || "";
    const siteHost = siteName[2] || "";

    if (issuerHostMatches.length > 1) {
      if (siteHost && siteHost.indexOf(issuerHostMatches[1]) !== -1) {
        return true;
      }
    }
    // site title should be more detailed
    // so we use siteTitle.indexOf(issuer)
    if (siteTitle && siteTitle.indexOf(issuer) !== -1) {
      return true;
    }

    if (siteNameFromHost && issuer.indexOf(siteNameFromHost) !== -1) {
      return true;
    }

    return false;
  }
}

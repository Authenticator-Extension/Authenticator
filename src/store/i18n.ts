export async function loadI18nMessages() {
  return new Promise(
    (
      resolve: (value: { [key: string]: string }) => void,
      reject: (reason: Error) => void
    ) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            const i18nMessage: I18nMessage = JSON.parse(xhr.responseText);
            const i18nData: { [key: string]: string } = {};
            for (const key of Object.keys(i18nMessage)) {
              i18nData[key] = chrome.i18n.getMessage(key);
            }
            return resolve(i18nData);
          }
          return;
        };
        xhr.open("GET", chrome.runtime.getURL("/_locales/en/messages.json"));
        xhr.send();
      } catch (error) {
        if (typeof error === "string" || error === undefined) {
          return reject(Error(error));
        } else if (error instanceof Error) {
          return reject(error);
        } else {
          return reject(Error(String(error)));
        }
      }
    }
  );
}

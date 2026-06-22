export async function loadI18nMessages() {
  // bundled extension resource; only the keys are used -- each value is
  // resolved through chrome.i18n.getMessage for the active locale.
  const response = await fetch(
    chrome.runtime.getURL("/_locales/en/messages.json")
  );
  const i18nMessage: I18nMessage = await response.json();
  const i18nData: { [key: string]: string } = {};
  for (const key of Object.keys(i18nMessage)) {
    i18nData[key] = chrome.i18n.getMessage(key);
  }
  return i18nData;
}

export const isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;
export const isWebKit = navigator.userAgent.indexOf("AppleWebKit") >= 0;
export const isEdge = navigator.userAgent.indexOf("Edg") >= 0;
export const isChromium = navigator.userAgent.indexOf("Chrome") >= 0;
export const isSafari =
  !isChromium && navigator.userAgent.indexOf("Safari") >= 0;
export const isChrome =
  navigator.userAgent.indexOf("Chrome") !== -1 &&
  navigator.userAgent.indexOf("Edg") === -1;

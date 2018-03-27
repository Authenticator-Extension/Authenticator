<img align="right" width="100" height="100" src="https://github.com/Authenticator-Extension/Authenticator/raw/dev/images/icon128.png">

# Authenticator [![Build Status](https://travis-ci.org/Authenticator-Extension/Authenticator.svg?branch=dev)](https://travis-ci.org/Authenticator-Extension/Authenticator) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/authenticator-firefox/localized.svg)](https://crowdin.com/project/authenticator-firefox) 

> Authenticator generates 2-Step Verification codes in your browser.

[![Chrome Web Store](chrome-web-store.png)](https://chrome.google.com/webstore/detail/authenticator/bhghoamapcdpbohphigoooaddinpkbai) [![Firefox Add-ons](firefox-add-ons.png)](https://addons.mozilla.org/en-US/firefox/addon/auth-helper/)

## Build Setup

Compile for Chrome:

```bash
npm install
npm run chrome
```
Compile for Firefox:

```bash
npm install
npm run firefox
```

Compile for development:

``` bash
# install typescript
npm install -g typescript
#install gts
npm install -g gts
# install dependencies
npm install
# check typescript style
gts check
# try to auto fix style issue
gts fix
# compile
npm run compile
```

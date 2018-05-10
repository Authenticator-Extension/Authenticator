<img align="right" width="100" height="100" src="https://github.com/Authenticator-Extension/Authenticator/raw/dev/images/icon128.png">

# Authenticator [![Build Status](https://travis-ci.org/Authenticator-Extension/Authenticator.svg?branch=dev)](https://travis-ci.org/Authenticator-Extension/Authenticator) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/authenticator-firefox/localized.svg)](https://crowdin.com/project/authenticator-firefox) 

> Authenticator generates 2-Step Verification codes in your browser.

## Available for Chrome and Firefox

[<img src="https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_206x58.png" title="Chrome Web Store" width="170" height="48" />](https://chrome.google.com/webstore/detail/authenticator/bhghoamapcdpbohphigoooaddinpkbai) [<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/firefox-add-ons.png" title="Firefox Add-ons" width="170" height="48" />](https://addons.mozilla.org/en-US/firefox/addon/auth-helper?src=external-github)

## Build Setup

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
# compile for Chrome
npm run chrome
# compile for Firefox
npm run firefox
```

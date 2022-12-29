# Authenticator [![Build Status](https://travis-ci.com/Authenticator-Extension/Authenticator.svg?branch=dev)](https://travis-ci.com/Authenticator-Extension/Authenticator) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/authenticator-firefox/localized.svg)](https://crowdin.com/project/authenticator-firefox) <img align="right" width="100" height="100" src="https://github.com/Authenticator-Extension/Authenticator/raw/dev/images/icon.svg">

> Authenticator generates 2-Step Verification codes in your browser.

## Available for Chrome, Firefox, Microsoft Edge and Safari

[<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/chrome-web-store.png" title="Chrome Web Store" width="170" height="48" />](https://chrome.google.com/webstore/detail/authenticator/bhghoamapcdpbohphigoooaddinpkbai) [<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/firefox-add-ons.png" title="Firefox Add-ons" width="170" height="48" />](https://addons.mozilla.org/en-US/firefox/addon/auth-helper?src=external-github) [<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/microsoft-store.png" title="Microsoft Store" height="48">](https://microsoftedge.microsoft.com/addons/detail/ocglkepbibnalbgmbachknglpdipeoio) [<img width="150" alt="Download on the App Store" src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"/>](https://apps.apple.com/us/app/authen/id1602945200?mt=12)

## Build Setup

``` bash
# install development dependencies
npm install
# compile
npm run [chrome, firefox, prod]
```

To reproduce a build:

``` bash
npm ci
npm run prod
```

To reproduce a build for Safari, please follow contribution guidance in [Authenticator-Extension/Authen](https://github.com/Authenticator-Extension/Authen#how-to-contribute)

## Development (Chrome)

``` bash
# install development dependencies
npm install
# compiles the Chrome extension to the `./test/chrome` directory
npm run dev:chrome
# load the unpacked extension from the `./test/chrome/ directory in Chrome
```

Note that Windows users should download a tool like [Git Bash](https://git-scm.com/download/win) or [Cygwin](http://cygwin.com/) to build.

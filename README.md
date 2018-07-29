<img align="right" width="100" height="100" src="https://github.com/Authenticator-Extension/Authenticator/raw/dev/images/icon128.png">

# Authenticator [![Build Status](https://travis-ci.org/Authenticator-Extension/Authenticator.svg?branch=dev)](https://travis-ci.org/Authenticator-Extension/Authenticator) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/authenticator-firefox/localized.svg)](https://crowdin.com/project/authenticator-firefox) 

> Authenticator generates 2-Step Verification codes in your browser.

## Available for Chrome and Firefox

[<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/chrome-web-store.png" title="Chrome Web Store" width="170" height="48" />](https://chrome.google.com/webstore/detail/authenticator/bhghoamapcdpbohphigoooaddinpkbai) [<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/firefox-add-ons.png" title="Firefox Add-ons" width="170" height="48" />](https://addons.mozilla.org/en-US/firefox/addon/auth-helper?src=external-github) [<img src="https://raw.githubusercontent.com/wiki/Authenticator-Extension/Authenticator/readme-images/microsoft-store.png" title="Microsoft Store" height="48">](https://www.microsoft.com/store/apps/9P0FD39WFFMK?ocid=badge)

Authenticator is one of the [featured extensions on Firefox Add-ons this month](https://blog.mozilla.org/addons/2018/07/02/julys-featured-extensions-2/)! 

## Build Setup

``` bash
# install typescript and gts
npm install -g typescript gts
# install development dependencies
npm install
# fix code style issues
gts fix
# compile
npm run [chrome, firefox, edge]
```

Note that Windows users should download [Cygwin](http://cygwin.com/) to build. Building for Edge requires the [Windows App Certification Kit](https://developer.microsoft.com/en-us/windows/develop/app-certification-kit)

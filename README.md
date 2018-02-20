# Authenticator [![Crowdin](https://d322cqt584bo4o.cloudfront.net/authenticator-firefox/localized.svg)](https://crowdin.com/project/authenticator-firefox)

> Authenticator generates 2-Step Verification codes in your browser.

## Build Setup

Compile for chrome:

```bash
npm install
npm run chrome
```
Compile for firefox:

```bash
npm install
npm run firefox
```

Compile for development:

``` bash
# install typescript
npm install -g typescript
# install dependencies
npm install
# check typescript style
gts check
# try to auto fix style issue
gts fix
# compile
npm run compile
```

## FAQ

### gts is not found

gts (Google TypeScript style) is installed locally by default, see <https://stackoverflow.com/questions/9679932/how-to-use-package-installed-locally-in-node-modules> to add local node modules into path, or run `npm install -g gts` to install gts global.

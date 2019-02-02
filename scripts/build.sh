#!/bin/bash

# Extension build script
# Syntax:
#   build.sh <platform>
# Platforms:
#   'chrome', 'firefox', and 'edge'

PLATFORM=$1
REMOTE=$(git config --get remote.origin.url)
CREDS=$(cat ./src/models/credentials.ts | tr -d '\n')
CREDREGEX="^.*'.+'.*'.+'.*'.+'.*$"
set -e

if [[ $PLATFORM != "chrome" ]] && [[ $PLATFORM != "firefox" ]] && [[ $PLATFORM != "edge" ]]; then
  echo "Invalid platform type. Supported platforms are 'chrome', 'firefox', and 'edge'"
  exit 1
fi

echo "Removing old build files..."
rm -rf build
rm -rf $PLATFORM
echo "Checking code style..."
if gts check 1> /dev/null ; then
  true
else
  echo "Fixing code style..."
  gts fix 
fi

if ! [[ $CREDS =~ $CREDREGEX ]] ; then
  echo -e "\e[7m\033[33mWarning: Missing info in credentials.ts\033[0m"
fi

if ! [[ $REMOTE = *"https://github.com/Authenticator-Extension/Authenticator.git"* || $REMOTE = *"git@github.com:Authenticator-Extension/Authenticator.git"* ]] ; then
  echo
  echo -e "\e[7m\033[33mNotice\033[0m"
  echo
  echo -e "Thanks for forking Authenticator! If you plan on redistributing your own version of Authenticator please generate your own API keys and put them in ./src/models/credentials.ts and ./manifest-chrome.json"
  echo "Clear this warning by commenting it out in ./scripts/build.sh"
  echo
  read -rsp $'Press any key to continue...\n' -n1 key
  echo
fi

echo "Compiling..."
./node_modules/typescript/bin/tsc -p .
./node_modules/sass/sass.js sass:css
mkdir $PLATFORM
if [[ $PLATFORM = "edge" ]]; then
  mkdir $PLATFORM/Extension
  mkdir $PLATFORM/Assets
  cp -r build css js _locales LICENSE view edge-files $PLATFORM/Extension
  mv $PLATFORM/Extension/edge-files/AppXManifest.xml $PLATFORM
  mv $PLATFORM/Extension/edge-files/images $PLATFORM/Extension
  mv $PLATFORM/Extension/edge-files/Assets/icon*.png $PLATFORM/Assets
  cp manifest-$PLATFORM.json $PLATFORM/Extension/manifest.json
else
  cp -r build css images js _locales LICENSE view $PLATFORM
  cp manifest-$PLATFORM.json $PLATFORM/manifest.json
fi

echo -e "\033[0;32mDone!\033[0m"

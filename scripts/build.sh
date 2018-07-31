#!/bin/bash

# Extension build script
# Syntax:
#   build.sh <platform>
# Platforms:
#   'chrome', 'firefox', and 'edge'

PLATFORM=$1

if [[ $PLATFORM != "chrome" ]] && [[ $PLATFORM != "firefox" ]] && [[ $PLATFORM != "edge" ]]; then
  echo "Invalid platform type. Supported platforms are 'chrome', 'firefox', and 'edge'"
  exit 1
fi

echo "Removing old build files..."
rm -rf build
rm -rf $PLATFORM
echo "Checking code style..."
gts check
echo "Compiling..."
npm run compile
mkdir $PLATFORM
if [[ $PLATFORM = "edge" ]]; then
  mkdir $PLATFORM/Extension
  mkdir $PLATFORM/Assets
  cp -r build css images js _locales LICENSE view edge-files $PLATFORM/Extension
  mv $PLATFORM/Extension/edge-files/AppXManifest.xml $PLATFORM
  mv $PLATFORM/Extension/edge-files/icon*.png $PLATFORM/Assets
  cp manifest-$PLATFORM.json $PLATFORM/Extension/manifest.json
else
  cp -r build css images js _locales LICENSE view $PLATFORM
  cp manifest-$PLATFORM.json $PLATFORM/manifest.json
fi

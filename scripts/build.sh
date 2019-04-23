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

if [[ $PLATFORM != "chrome" ]] && [[ $PLATFORM != "firefox" ]] && [[ $PLATFORM != "edge" ]] && [[ $PLATFORM != "prod" ]]; then
    echo "Invalid platform type. Supported platforms are 'chrome', 'firefox', and 'edge'"
    exit 1
fi

echo "Removing old build files..."
rm -rf build dist
rm -rf firefox edge chrome release
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

echo "Compiling..."+
if [[ $PLATFORM = "prod" ]]; then
    ./node_modules/webpack-cli/bin/cli.js --config webpack.prod.js
else
    ./node_modules/webpack-cli/bin/cli.js
fi
./node_modules/sass/sass.js sass:css

postCompile () {
    mkdir $1
    if [[ $1 = "edge" ]]; then
        mkdir $1/Extension
        mkdir $1/Assets
        cp -r dist css _locales LICENSE view edge-files $1/Extension
        mv $1/Extension/edge-files/AppXManifest.xml $1
        mv $1/Extension/edge-files/images $1/Extension
        mv $1/Extension/edge-files/Assets/icon*.png $1/Assets
        cp manifest-$1.json $1/Extension/manifest.json
    else
        cp -r dist css images _locales LICENSE view $1
        cp manifest-$1.json $1/manifest.json
        if [[ $1 = "chrome" ]]; then
            cp schema-chrome.json $1/schema.json
        fi
    fi
    
}

if [[ $PLATFORM = "prod" ]]; then
    postCompile "chrome"
    postCompile "firefox"
    postCompile "edge"
    mkdir release
    mv chrome firefox edge release
else
    postCompile $PLATFORM
fi

echo -e "\033[0;32mDone!\033[0m"

#!/bin/bash

# Extension build script
# Syntax:
#   build.sh <platform>
# Platforms:
#   'chrome', 'firefox', 'edge', 'test', or 'prod'

PLATFORM=$1
REMOTE=$(git config --get remote.origin.url)
CREDS=$(cat ./src/models/credentials.ts | tr -d '\n')
CREDREGEX='^.*".+".*".+".*".+".*".+".*".+".*$'
STYLEFILES="./src/* ./src/**/* ./src/**/**/* ./src/**/**/**/* ./sass/*.scss"
set -e

if [[ $PLATFORM != "chrome" ]] && [[ $PLATFORM != "firefox" ]] && [[ $PLATFORM != "edge" ]] && [[ $PLATFORM != "prod" ]] && [[ $PLATFORM != "test" ]]; then
    echo "Invalid platform type. Supported platforms are 'chrome', 'firefox', 'test', and 'prod'"
    exit 1
fi

echo "Removing old build files..."
rm -rf build dist
rm -rf firefox chrome edge release test
echo "Checking style..."
if ./node_modules/.bin/prettier --check $STYLEFILES 1> /dev/null ; then
    true
else
    ./node_modules/.bin/prettier --check $STYLEFILES --write
fi

./node_modules/.bin/eslint . --ext .js,.ts

if ! [[ $CREDS =~ $CREDREGEX ]] ; then
    if [[ $PLATFORM = "prod" ]]; then
        echo -e "\e[7m\033[33mError: Missing info in credentials.ts\033[0m"
        exit 1
    else
        echo -e "\e[7m\033[33mWarning: Missing info in credentials.ts\033[0m"
    fi
fi

if ! [[ $REMOTE = *"https://github.com/Authenticator-Extension/Authenticator.git"* || $REMOTE = *"git@github.com:Authenticator-Extension/Authenticator.git"* || $CI ]] ; then
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
if [[ $PLATFORM = "prod" ]]; then
    ./node_modules/webpack-cli/bin/cli.js --config webpack.prod.js
elif [[ $PLATFORM = "test" ]]; then
    ./node_modules/webpack-cli/bin/cli.js --config webpack.dev.js
    ./node_modules/.bin/tsc --target ES2015 --esModuleInterop --moduleResolution nodenext --module commonjs scripts/test-runner.ts
else
    ./node_modules/webpack-cli/bin/cli.js
fi
./node_modules/sass/sass.js sass:css
cp ./sass/DroidSansMono.woff2 ./sass/mocha.css ./css/

if [[ $PLATFORM = "prod" ]]; then
    echo "Generating licenses file..."
    ./node_modules/.bin/npm-license-generator \
        --out-path ./view/licenses.html \
        --template ./scripts/licenses-template.html \
        --error-missing=true
fi

postCompile () {
    mkdir $1
    cp -r dist css images _locales LICENSE view $1

    if [[ $PLATFORM == "test" ]]; then
        cp manifests/manifest-$1-testing.json $1/manifest.json
    else
        cp manifests/manifest-$1.json $1/manifest.json
    fi

    if [[ $1 = "chrome" ]] || [[ $1 = "edge" ]]; then
        cp manifests/schema-chrome.json $1/schema.json
    fi

    cp manifests/manifest-pwa.json $1/manifest-pwa.json
}

if [[ $PLATFORM = "prod" ]]; then
    postCompile "chrome"
    postCompile "firefox"
    postCompile "edge"
    mkdir release
    mv chrome firefox edge release
elif [[ $PLATFORM = "test" ]]; then
    postCompile "chrome"
    postCompile "firefox"
    mkdir test
    mv chrome firefox test
else
    postCompile $PLATFORM
fi

echo -e "\033[0;32mDone!\033[0m"

#!/bin/bash
# This script automatically adds new translation strings from _locales/en/messages.json to other locale files

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

# Configure git
git config --global user.email "deploy@travis-ci.org"
git config --global user.name "Travis CI"
git remote set-url origin git@github.com:Authenticator-Extension/Authenticator.git
openssl aes-256-cbc -K $encrypted_2b3e3bd93233_key -iv $encrypted_2b3e3bd93233_iv -in $TRAVIS_BUILD_DIR/ci/authenticator-build-key.enc -out $TRAVIS_BUILD_DIR/ci/authenticator-build-key -d
chmod 600 $TRAVIS_BUILD_DIR/ci/authenticator-build-key
eval `ssh-agent -s`
ssh-add $TRAVIS_BUILD_DIR/ci/authenticator-build-key

# Fix i18n issues
cd $TRAVIS_BUILD_DIR
node ./ci/i18n.js

# Branch changes and error with details on how to fix i18n if branched
if [[ `git diff _locales` ]]; then
  git checkout -b i18n-$TRAVIS_BUILD_NUMBER
  git add ./_locales/*/messages.json
  git commit -m "Add new strings" -m "This commit was automatically made by TravisCI build $TRAVIS_JOB_NUMBER"
  git push -u origin i18n-$TRAVIS_BUILD_NUMBER
  printf "${RED}You added new strings to _locales/en/messages.json, but not some of the other translation files. A branch has been created at ${BOLD}i18n-$TRAVIS_BUILD_NUMBER ${NC}${RED}with the required changes already made. \n\nPlease ${BOLD}merge i18n-$TRAVIS_BUILD_NUMBER into $TRAVIS_BRANCH ${NC}${RED}to resolve this issue.${NC}"
  exit 1
else
  printf "${GREEN}No new translation strings detected.${NC}"
fi

# Debugging since I'm curious about a few things
echo $TRAVIS_JOB_NUMBER
echo $TRAVIS_BUILD_NUMBER
firefox --version

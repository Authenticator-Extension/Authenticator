#!/bin/bash
# This script automatically adds new translation strings from _locales/en/messages.json to other locale files

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [[ -n $TRAVIS_PULL_REQUEST_BRANCH ]]; then
  BRANCH=$TRAVIS_PULL_REQUEST_BRANCH
else
  BRANCH=$TRAVIS_BRANCH
fi

# Configure git
git config --global user.email "deploy@travis-ci.org"
git config --global user.name "Travis CI"
git remote set-url origin git@github.com:Authenticator-Extension/Authenticator.git
openssl aes-256-cbc -K $encrypted_2b3e3bd93233_key -iv $encrypted_2b3e3bd93233_iv -in $TRAVIS_BUILD_DIR/scripts/authenticator-build-key.enc -out $TRAVIS_BUILD_DIR/scripts/authenticator-build-key -d
chmod 600 $TRAVIS_BUILD_DIR/scripts/authenticator-build-key
eval `ssh-agent -s` &> /dev/null
ssh-add $TRAVIS_BUILD_DIR/scripts/authenticator-build-key &> /dev/null

# Fix i18n issues
cd $TRAVIS_BUILD_DIR
node ./scripts/i18n.js

# Branch changes and error with details on how to fix i18n if branched
if [[ `git diff _locales` ]]; then
  git checkout $BRANCH &> /dev/null
  git add ./_locales/*/messages.json
  git commit -m "Add new strings" -m "This commit was automatically made by TravisCI build $TRAVIS_JOB_NUMBER" --quiet
  git push --quiet
  printf "${RED}You added new strings to _locales/en/messages.json, but not some of the other translation files. A commit has been created on the current branch with the required changes already made. ${NC}\n"
  exit 0
else
  printf "${GREEN}No new translation strings detected.${NC}"
fi

#!/bin/bash
# This script automatically adds new translation strings from _locales/en/messages.json to other locale files

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

BRANCH=${GITHUB_REF##*/}

# Configure git
git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --global user.name "github-actions[bot]"
git remote set-url origin git@github.com:${GITHUB_REPOSITORY}.git
gpg --quiet --batch --yes --decrypt --passphrase="$DEPLOY_KEY_PASSWORD" \
  --output $GITHUB_WORKSPACE/scripts/deploy-key $GITHUB_WORKSPACE/scripts/deploy-key.gpg
chmod 600 $GITHUB_WORKSPACE/scripts/deploy-key
eval `ssh-agent -s` &> /dev/null
ssh-add $GITHUB_WORKSPACE/scripts/deploy-key &> /dev/null

# Fix i18n issues
cd $GITHUB_WORKSPACE
node ./scripts/i18n.js

# Branch changes and error with details on how to fix i18n if branched
if [[ `git diff _locales` ]]; then
  git checkout $BRANCH &> /dev/null
  git add ./_locales/*/messages.json
  git commit -m "Add new strings" -m "This commit was automatically made by run $GITHUB_RUN_ID" --quiet
  git push --quiet
  printf "${RED}You added new strings to _locales/en/messages.json, but not some of the other translation files. A commit has been created on the current branch with the required changes already made. ${NC}\n"
  exit 0
else
  printf "${GREEN}No new translation strings detected.${NC}"
fi

#!/bin/bash
# This script is used by travis to auto tag our releases

# Configure git
git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --global user.name "github-actions[bot]"
git remote set-url origin git@github.com:${GITHUB_REPOSITORY}.git
gpg --quiet --batch --yes --decrypt --passphrase="$DEPLOY_KEY_PASSWORD" \
  --output $GITHUB_WORKSPACE/scripts/deploy-key $GITHUB_WORKSPACE/scripts/deploy-key.gpg
chmod 600 $GITHUB_WORKSPACE/scripts/deploy-key
eval `ssh-agent -s` &> /dev/null
ssh-add $GITHUB_WORKSPACE/scripts/deploy-key &> /dev/null

# Create and push tag
export GIT_TAG=v$(grep -m 1 "\"version\"" $GITHUB_WORKSPACE/manifests/manifest-chrome.json | sed -r 's/^ *//;s/.*: *"//;s/",?//')
git checkout ${GITHUB_REF##*/}
git tag $GIT_TAG -a -m "Automatic tag from run $GITHUB_RUN_ID"
git push origin $GIT_TAG

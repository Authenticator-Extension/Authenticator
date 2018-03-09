#!/bin/bash
# This script is used by travis to auto tag our releases

# Configure git
git config --global user.email "builds@travis-ci.com"
git config --global user.name "Travis CI"
git remote set-url origin git@github.com:Authenticator-Extension/Authenticator.git
export GIT_TAG=v$(grep -m 1 "\"version\"" $TRAVIS_BUILD_DIR/manifest-chrome.json | sed -r 's/^ *//;s/.*: *"//;s/",?//')
openssl aes-256-cbc -K $encrypted_2b3e3bd93233_key -iv $encrypted_2b3e3bd93233_iv -in $TRAVIS_BUILD_DIR/ci/authenticator-build-key.enc -out $TRAVIS_BUILD_DIR/ci/authenticator-build-key -d
chmod 600 $TRAVIS_BUILD_DIR/ci/authenticator-build-key
eval `ssh-agent -s`
ssh-add $TRAVIS_BUILD_DIR/ci/authenticator-build-key

# Create and push tag
git checkout $TRAVIS_BRANCH
git tag $GIT_TAG -a -m "Automatic tag from TravisCI build $TRAVIS_BUILD_NUMBER"
git push origin $GIT_TAG

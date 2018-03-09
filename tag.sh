#!/bin/bash

# This script is used by travis to auto tag our releases
git config --global user.email "builds@travis-ci.com"
git config --global user.name "Travis CI"
export GIT_TAG=v$(grep -m 1 "\"version\"" manifest-chrome.json | sed -r 's/^ *//;s/.*: *"//;s/",?//')
git tag $GIT_TAG -a -m "Automatic tag from TravisCI build $TRAVIS_BUILD_NUMBER"
git push --quiet https://$GITHUBKEY@github.com/Authenticator-Extension/Authenticator $GIT_TAG > /dev/null 2>&1

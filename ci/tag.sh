#!/bin/bash

# This script is used by travis to auto tag our releases
git config --global user.email "builds@travis-ci.com"
git config --global user.name "Travis CI"
export GIT_TAG=v$(grep -m 1 "\"version\"" manifest-chrome.json | sed -r 's/^ *//;s/.*: *"//;s/",?//')
openssl aes-256-cbc -K $encrypted_2b3e3bd93233_key -iv $encrypted_2b3e3bd93233_iv -in authenticator-build-key.enc -out authenticator-build-key -d
chmod 600 ../deploy_key
eval `ssh-agent -s`
ssh-add authenticator-build-key
git tag $GIT_TAG -a -m "Automatic tag from TravisCI build $TRAVIS_BUILD_NUMBER"
git push $GIT_TAG

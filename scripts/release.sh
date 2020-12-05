#!/bin/bash
# This script builds for release and puts api secrets in relevant files

# Insert secrets
gpg --quiet --batch --yes --decrypt --passphrase="$CREDS_FILE_PASSWORD" \
  --output $GITHUB_WORKSPACE/src/models/credentials.ts $GITHUB_WORKSPACE/scripts/credentials.ts.gpg

# Build release
bash scripts/build.sh prod

tar -cvzf release.tar.gz release/*

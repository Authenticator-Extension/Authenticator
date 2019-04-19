#!/bin/bash
# This script builds for release and puts api secrets in relevant files

# Insert secrets
openssl aes-256-cbc -K $encrypted_cb700307e8da_key -iv $encrypted_cb700307e8da_iv -in scripts/credentials.ts.enc -out src/models/credentials.ts -d

# Build release
bash scripts/build.sh prod

tar -cvzf release.tar.gz release/*

#!/bin/bash
# This script builds for release and puts api secrets in relevant files

# Insert secrets
openssl aes-256-cbc -K $encrypted_a5950de01601_key -iv $encrypted_a5950de01601_iv -in scripts/credentials.ts.enc -out src/models/credentials.ts -d

# Build release
bash scripts/build.sh prod

tar -cvzf release.tar.gz release/*

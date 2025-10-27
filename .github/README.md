# GitHub Secrets Sync Script

This directory contains scripts to sync secrets from Replit environment to GitHub repository secrets.

## Overview

The GitHub Actions workflow for iOS builds requires `EXPO_TOKEN` to be available as a repository secret. This script automates the process of syncing the `EXPO_TOKEN` from Replit Secrets to GitHub repository secrets.

## Prerequisites

Before running the script, ensure you have:

1. **EXPO_TOKEN** - Set in Replit Secrets (already configured ✅)
2. **GITHUB_PERSONAL_ACCESS_TOKEN** - Set in Replit Secrets with `repo` scope (already configured ✅)

## How It Works

The script performs the following steps:

1. **Fetches Repository Public Key** - Gets the public key from GitHub API
2. **Encrypts Secret** - Uses libsodium to encrypt EXPO_TOKEN with the public key
3. **Uploads to GitHub** - Sends the encrypted secret to GitHub repository secrets

## Usage

Simply run the bash script from the project root:

```bash
bash .github/sync-secrets.sh
```

### Expected Output

When successful, you'll see:

```
🚀 Starting secret sync process...

🔑 Fetching repository public key...
🔐 Encrypting EXPO_TOKEN...
📤 Uploading secret to GitHub...
✅ Successfully synced EXPO_TOKEN to GitHub repository secrets!
   Repository: berkemd/lilove
   Secret: EXPO_TOKEN
```

## Files

- **sync-secrets.sh** - Bash wrapper script that validates environment and runs the Node.js script
- **sync-secrets.cjs** - Node.js script that handles encryption and GitHub API communication

## Troubleshooting

### Error: EXPO_TOKEN environment variable is not set
- Make sure `EXPO_TOKEN` is configured in Replit Secrets

### Error: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set
- Make sure `GITHUB_PERSONAL_ACCESS_TOKEN` is configured in Replit Secrets
- Ensure the token has `repo` scope permissions

### HTTP 401 or 403 errors
- Your GitHub Personal Access Token may have expired or lacks proper permissions
- Generate a new token with `repo` scope at https://github.com/settings/tokens

## Technical Details

The script uses:
- **libsodium-wrappers** for encryption (sealed box with X25519 and XSalsa20-Poly1305)
- **GitHub REST API** for secret management
- Native Node.js HTTPS module for API requests

## Security Notes

- Secrets are encrypted before transmission using GitHub's public key
- The script never logs or stores secret values
- All communication is over HTTPS
- The GITHUB_PERSONAL_ACCESS_TOKEN should have minimal required scopes (only `repo`)

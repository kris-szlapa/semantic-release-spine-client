#!/bin/bash

# Exit on error
set -e

echo "Running publish.sh script..."

# Run semantic-release to get the version
VERSION_SPACES=$(npx semantic-release --dryRun | grep -oP 'Published release \K.*? ')
VERSION="${VERSION_SPACES// /}"  # Remove spaces

# Log the version
echo "Release Version: $VERSION"

# Run npm publish with the specified tag
echo "Running npm publish..."
npm publish --tag "$VERSION"

echo "Publish script completed successfully."

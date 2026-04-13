#!/bin/bash
#
# MarkUp — Package Script
#
# Creates a distributable zip file for the Chrome Web Store or manual installation.
# Copies src/ to dist/, excludes development artifacts, and zips the result.
#
# Usage: bash scripts/package.sh
#

set -e

# Configuration
VERSION="0.3.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_DIR/src"
DIST_DIR="$PROJECT_DIR/dist"
ZIP_NAME="markup-extension-v${VERSION}.zip"
ZIP_PATH="$PROJECT_DIR/$ZIP_NAME"

echo "================================================"
echo "  MarkUp — Package Script v${VERSION}"
echo "================================================"
echo ""

# Step 1: Validate source directory
if [ ! -d "$SRC_DIR" ]; then
  echo "❌ Error: Source directory not found: $SRC_DIR"
  exit 1
fi

if [ ! -f "$SRC_DIR/manifest.json" ]; then
  echo "❌ Error: manifest.json not found in $SRC_DIR"
  exit 1
fi

echo "📁 Source: $SRC_DIR"
echo "📦 Output: $ZIP_PATH"
echo ""

# Step 2: Clean previous dist
if [ -d "$DIST_DIR" ]; then
  echo "🧹 Cleaning previous dist/..."
  rm -rf "$DIST_DIR"
fi

if [ -f "$ZIP_PATH" ]; then
  echo "🧹 Removing previous zip..."
  rm -f "$ZIP_PATH"
fi

# Step 3: Copy source to dist
echo "📋 Copying src/ to dist/..."
mkdir -p "$DIST_DIR"
cp -r "$SRC_DIR"/* "$DIST_DIR/"

# Step 4: Remove development artifacts from dist
echo "🗑️  Removing development artifacts..."

# Remove macOS artifacts
find "$DIST_DIR" -name ".DS_Store" -delete 2>/dev/null || true
find "$DIST_DIR" -name "._*" -delete 2>/dev/null || true

# Remove editor artifacts
find "$DIST_DIR" -name "*.swp" -delete 2>/dev/null || true
find "$DIST_DIR" -name "*.swo" -delete 2>/dev/null || true
find "$DIST_DIR" -name "*~" -delete 2>/dev/null || true

echo "✅ Dist directory ready."
echo ""

# Step 5: Create zip
echo "📦 Creating zip archive..."
cd "$DIST_DIR"
zip -r "$ZIP_PATH" . -x "*.DS_Store" -x "._*" > /dev/null

echo ""
echo "================================================"
echo "  ✅ Package created successfully!"
echo "  📦 $ZIP_NAME"
echo "  📏 Size: $(du -h "$ZIP_PATH" | cut -f1)"
echo "================================================"
echo ""
echo "To install:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Drag and drop $ZIP_NAME into the page"
echo "     — or —"
echo "  3. Click 'Load unpacked' and select the dist/ directory"
echo ""

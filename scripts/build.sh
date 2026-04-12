#!/bin/bash
#
# MarkUp — Build Script
#
# Optional build script for future transpilation or processing.
# Currently a no-op — the extension uses vanilla JS that runs directly
# in the browser without any build step.
#
# This script exists as a placeholder for potential future needs:
# - TypeScript compilation
# - CSS preprocessing
# - Module bundling
# - Minification
#
# Usage: bash scripts/build.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_DIR/src"

echo "================================================"
echo "  MarkUp — Build Script"
echo "================================================"
echo ""
echo "ℹ️  No build step required."
echo "   MarkUp uses vanilla JavaScript that runs directly"
echo "   in the browser without transpilation or bundling."
echo ""
echo "   To load the extension:"
echo "   1. Open chrome://extensions"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the src/ directory"
echo ""
echo "   To create a distributable package:"
echo "   bash scripts/package.sh"
echo ""
echo "================================================"

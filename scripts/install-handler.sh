#!/usr/bin/env bash
set -euo pipefail

# Install skyclaw-handler binary + oh-my-pi native addon.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/polka-computer/Skyclaw/master/scripts/install-handler.sh | bash
#   curl -fsSL ... | INSTALL_DIR=/opt/bin VERSION=v0.1.0 bash

REPO="polka-computer/Skyclaw"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${VERSION:-latest}"

if [ "$VERSION" = "latest" ]; then
  BASE_URL="https://github.com/$REPO/releases/latest/download"
else
  BASE_URL="https://github.com/$REPO/releases/download/$VERSION"
fi

echo "[install] downloading skyclaw-handler ($VERSION) to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

curl -fsSL "$BASE_URL/skyclaw-handler" -o "$INSTALL_DIR/skyclaw-handler"
chmod +x "$INSTALL_DIR/skyclaw-handler"

curl -fsSL "$BASE_URL/pi_natives.linux-x64.node" -o "$INSTALL_DIR/pi_natives.linux-x64.node"

echo "[install] done — run: $INSTALL_DIR/skyclaw-handler start"

# Add to PATH hint
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "[install] hint: add $INSTALL_DIR to your PATH" ;;
esac

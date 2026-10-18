#!/bin/bash
set -e

# ==============================================================================
# AIMux Global Installer (CLI & Desktop GUI)
# Repository: https://github.com/Vs153698/aimux
# ==============================================================================

REPO="Vs153698/aimux"
VERSION="0.1.0"
INSTALL_DIR_CLI="$HOME/.local/bin"
INSTALL_DIR_APP="/Applications"

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}===============================================${RESET}"
echo -e "${BOLD}${BLUE}    AIMux — Global Installation Script         ${RESET}"
echo -e "${BOLD}${BLUE}===============================================${RESET}"

OS="$(uname -s)"
ARCH="$(uname -m)"

echo -e "Detected Platform: ${BOLD}${OS} (${ARCH})${RESET}"

mkdir -p "$INSTALL_DIR_CLI"

# 1. Install CLI Tool
echo -e "\n${BOLD}1. Installing 'aimux' CLI...${RESET}"

# Check if prebuilt releases exist or build via cargo
INSTALLED_CLI=false

if command -v cargo >/dev/null 2>&1; then
    echo -e "Installing standalone CLI using cargo..."
    cargo install --git "https://github.com/${REPO}.git" aimux-cli --root "$HOME/.local" --quiet
    INSTALLED_CLI=true
fi

if [ "$INSTALLED_CLI" = false ]; then
    # Fallback to direct release binary download
    RELEASE_URL="https://github.com/${REPO}/releases/download/v${VERSION}/aimux-${OS}-${ARCH}"
    echo -e "Downloading binary from GitHub Releases: ${RELEASE_URL}"
    if curl -sLf "$RELEASE_URL" -o "$INSTALL_DIR_CLI/aimux"; then
        chmod +x "$INSTALL_DIR_CLI/aimux"
        INSTALLED_CLI=true
    else
        echo -e "${YELLOW}Prebuilt release asset not found for ${OS}-${ARCH}. Please ensure Rust is installed to build locally.${RESET}"
    fi
fi

if [ -f "$INSTALL_DIR_CLI/aimux" ]; then
    echo -e "${GREEN}✔ aimux CLI installed at:${RESET} ${INSTALL_DIR_CLI}/aimux"
fi

# 2. Install Desktop App (macOS)
if [ "$OS" = "Darwin" ]; then
    echo -e "\n${BOLD}2. Installing AIMux Desktop Application...${RESET}"
    
    APP_RELEASE_URL="https://github.com/${REPO}/releases/download/v${VERSION}/AIMux.app.tar.gz"
    TMP_DIR=$(mktemp -d)
    
    if curl -sLf "$APP_RELEASE_URL" -o "$TMP_DIR/AIMux.app.tar.gz"; then
        tar -xzf "$TMP_DIR/AIMux.app.tar.gz" -C "$TMP_DIR"
        rm -rf "$INSTALL_DIR_APP/AIMux.app"
        cp -R "$TMP_DIR/AIMux.app" "$INSTALL_DIR_APP/AIMux.app"
        echo -e "${GREEN}✔ AIMux.app installed to /Applications/AIMux.app${RESET}"
    else
        # If running from cloned source or locally:
        if [ -d "./crates/aimux-desktop" ]; then
            echo -e "Packaging and installing local desktop build..."
            ./scripts/package-macos.sh --install
        else
            echo -e "${YELLOW}Note: Desktop .app bundle will be downloaded from GitHub Releases once v${VERSION} release assets are attached.${RESET}"
        fi
    fi
    rm -rf "$TMP_DIR"
fi

# 3. Path Verification
echo -e "\n${BOLD}3. Shell Configuration:${RESET}"
case ":$PATH:" in
    *":$INSTALL_DIR_CLI:"*)
        echo -e "${GREEN}✔ $INSTALL_DIR_CLI is already in your PATH.${RESET}"
        ;;
    *)
        echo -e "${YELLOW}⚠ Add the following line to your ~/.zshrc or ~/.bashrc:${RESET}"
        echo -e "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        ;;
esac

echo -e "\n${BOLD}${GREEN}✔ Installation Finished!${RESET}"
echo -e "Run ${BOLD}aimux doctor${RESET} to verify your AI environment."
if [ "$OS" = "Darwin" ]; then
    echo -e "Open ${BOLD}AIMux${RESET} from Spotlight or Launchpad to use the Desktop GUI."
fi

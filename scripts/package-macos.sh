#!/bin/bash
set -e

echo "=== Building AIMux Desktop Application for macOS ==="

# Build UI
echo "1. Building React web assets..."
cd "$(dirname "$0")/../crates/aimux-desktop/ui"
npm install --silent
npm run build

# Build Release Binary
echo "2. Compiling optimized release binary..."
cd ../../..
cargo build --release -p aimux-desktop -p aimux-cli

# Package macOS App Bundle
echo "3. Creating AIMux.app bundle..."
APP_BUNDLE="target/release/bundle/osx/AIMux.app"
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

cp target/release/aimux-desktop "$APP_BUNDLE/Contents/MacOS/aimux-desktop"
chmod +x "$APP_BUNDLE/Contents/MacOS/aimux-desktop"

if [ -f "crates/aimux-desktop/icons/icon.icns" ]; then
    cp crates/aimux-desktop/icons/icon.icns "$APP_BUNDLE/Contents/Resources/icon.icns"
fi

cat <<EOF > "$APP_BUNDLE/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleName</key>
    <string>AIMux</string>
    <key>CFBundleDisplayName</key>
    <string>AIMux</string>
    <key>CFBundleIdentifier</key>
    <string>com.aimux.app</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleExecutable</key>
    <string>aimux-desktop</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Install into /Applications if flag --install is passed
if [ "$1" == "--install" ] || [ "$1" == "-i" ]; then
    echo "4. Installing to /Applications/AIMux.app..."
    rm -rf /Applications/AIMux.app
    cp -R "$APP_BUNDLE" /Applications/AIMux.app
    touch /Applications/AIMux.app
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f /Applications/AIMux.app 2>/dev/null || true
    
    # Also install CLI
    TARGET_BIN="$HOME/.local/bin/aimux"
    mkdir -p "$HOME/.local/bin"
    cp target/release/aimux "$TARGET_BIN"
    chmod +x "$TARGET_BIN"

    echo "✔ Successfully installed AIMux to /Applications/AIMux.app"
    echo "✔ Successfully installed aimux CLI to $TARGET_BIN"
else
    echo "✔ Successfully packaged: $APP_BUNDLE"
    echo "Run with '--install' to automatically install into /Applications."
fi

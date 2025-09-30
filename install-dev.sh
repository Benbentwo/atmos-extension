#!/bin/bash
# Install Atmos extension for development

set -e

echo "🚀 Installing Atmos VS Code Extension for Development"
echo ""

# Compile the extension
echo "📦 Compiling TypeScript..."
pnpm run compile

# Determine the extensions directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    WINDSURF_EXT_DIR="$HOME/.windsurf/extensions"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    WINDSURF_EXT_DIR="$HOME/.windsurf/extensions"
else
    # Windows
    VSCODE_EXT_DIR="$APPDATA/Code/User/extensions"
    WINDSURF_EXT_DIR="$APPDATA/Windsurf/User/extensions"
fi

EXT_NAME="cloudposse-atmos-0.1.0"
CURRENT_DIR="$(pwd)"

echo ""
echo "Choose installation target:"
echo "  1) VS Code"
echo "  2) Windsurf"
echo "  3) Both"
read -p "Enter choice [1-3]: " choice

install_extension() {
    local target_dir=$1
    local target_name=$2
    
    if [ ! -d "$target_dir" ]; then
        echo "⚠️  $target_name extensions directory not found: $target_dir"
        return
    fi
    
    local ext_path="$target_dir/$EXT_NAME"
    
    # Remove existing symlink/directory
    if [ -L "$ext_path" ] || [ -d "$ext_path" ]; then
        echo "🗑️  Removing existing installation..."
        rm -rf "$ext_path"
    fi
    
    # Create symlink
    echo "🔗 Creating symlink for $target_name..."
    ln -s "$CURRENT_DIR" "$ext_path"
    
    echo "✅ Installed for $target_name at: $ext_path"
}

case $choice in
    1)
        install_extension "$VSCODE_EXT_DIR" "VS Code"
        ;;
    2)
        install_extension "$WINDSURF_EXT_DIR" "Windsurf"
        ;;
    3)
        install_extension "$VSCODE_EXT_DIR" "VS Code"
        install_extension "$WINDSURF_EXT_DIR" "Windsurf"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Reload your editor (Cmd/Ctrl+Shift+P → 'Developer: Reload Window')"
echo "  2. Open a workspace with an atmos.yaml file"
echo "  3. Check Output panel (View → Output → 'Atmos') for activation logs"
echo ""
echo "To uninstall, run: rm -rf $VSCODE_EXT_DIR/$EXT_NAME"

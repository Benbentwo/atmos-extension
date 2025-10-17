#!/bin/bash
# Install Atmos extension for development

set -e

# Check if gum is installed
if ! command -v gum &> /dev/null; then
    echo "❌ Gum is not installed. Please install it first:"
    echo ""
    echo "  macOS:   brew install gum"
    echo "  Linux:   See https://github.com/charmbracelet/gum#installation"
    echo "  Windows: See https://github.com/charmbracelet/gum#installation"
    echo ""
    exit 1
fi

gum style \
    --foreground 212 --border-foreground 212 --border double \
    --align center --width 50 --margin "1 2" --padding "2 4" \
    'Atmos VS Code Extension' 'Development Installer'

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    gum style --foreground 196 "❌ pnpm is not installed. Please install it first:"
    echo ""
    echo "  npm install -g pnpm"
    echo "  or visit: https://pnpm.io/installation"
    echo ""
    exit 1
fi

# Install dependencies
gum spin --spinner dot --title "Installing dependencies..." -- pnpm install

# Build the extension
gum spin --spinner dot --title "Building extension..." -- pnpm run compile

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
gum style --foreground 86 "Choose installation target:"
# choice=$(gum choose "VS Code" "Windsurf" "Both")

install_extension() {
    local target_dir=$1
    local target_name=$2
    
    if [ ! -d "$target_dir" ]; then
        gum style --foreground 214 "⚠️  $target_name extensions directory not found: $target_dir"
        return
    fi
    
    local ext_path="$target_dir/$EXT_NAME"
    
    # Remove existing symlink/directory
    if [ -L "$ext_path" ] || [ -d "$ext_path" ]; then
        gum spin --spinner dot --title "Removing existing installation..." -- rm -rf "$ext_path"
    fi
    
    # Create symlink
    gum spin --spinner dot --title "Creating symlink for $target_name..." -- ln -s "$CURRENT_DIR" "$ext_path"
    
    gum style --foreground 42 "✅ Installed for $target_name"
    gum style --foreground 245 "   → $ext_path"
}

# case $choice in
#     "VS Code")
#         install_extension "$VSCODE_EXT_DIR" "VS Code"
#         ;;
#     "Windsurf")
#         install_extension "$WINDSURF_EXT_DIR" "Windsurf"
#         ;;
#     "Both")
#         install_extension "$VSCODE_EXT_DIR" "VS Code"
#         install_extension "$WINDSURF_EXT_DIR" "Windsurf"
#         ;;
#     *)
#         gum style --foreground 196 "❌ Invalid choice"
#         exit 1
#         ;;
# esac

echo "Cleaning $WINDSURF_EXT_DIR/$EXT_NAME"
rm -rf "$WINDSURF_EXT_DIR/$EXT_NAME"
install_extension "$WINDSURF_EXT_DIR" "Windsurf"

echo ""
gum style \
    --foreground 212 --border-foreground 212 --border rounded \
    --align center --width 60 --margin "1 2" --padding "1 2" \
    '✨ Installation Complete! ✨'

echo ""
gum style --foreground 86 --bold "Next steps:"
gum style --foreground 245 "  1. Reload your editor (Cmd/Ctrl+Shift+P → 'Developer: Reload Window')"
gum style --foreground 245 "  2. Open a workspace with an atmos.yaml file"
gum style --foreground 245 "  3. Check Output panel (View → Output → 'Atmos') for activation logs"
echo ""
gum style --foreground 245 --italic "To uninstall: rm -rf $VSCODE_EXT_DIR/$EXT_NAME"
echo ""

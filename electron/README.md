# Deals247 Desktop Application

This directory contains the Electron desktop application for Deals247, providing a native desktop experience across Windows, macOS, and Linux.

## Files

- `main.js` - Main Electron process that creates windows, menus, and handles system integration
- `preload.js` - Secure bridge between main process and renderer process

## Features

### Native Desktop Experience
- **System Tray Integration**: Minimizes to tray instead of closing completely
- **Native Menus**: Platform-specific application menus with keyboard shortcuts
- **Desktop Notifications**: Native OS notifications for deal alerts and price drops
- **Window Management**: Proper window controls and behavior

### Keyboard Shortcuts
- `Cmd/Ctrl + K`: Focus search input
- `Cmd/Ctrl + T`: Navigate to today's deals
- `Cmd/Ctrl + F`: Navigate to favorite stores
- `Cmd/Ctrl + N`: Open new window
- `Cmd/Ctrl + Q`: Quit application

### Cross-Platform Support
- **Windows**: MSI/NSIS installer with auto-updater support
- **macOS**: DMG installer with code signing ready
- **Linux**: AppImage and DEB packages

## Development

### Prerequisites
```bash
npm install
```

### Running in Development
```bash
# Start both React dev server and Electron
npm run electron-dev
```

### Building for Production
```bash
# Build for current platform
npm run electron-pack

# Build for specific platforms
npm run electron-pack-win    # Windows
npm run electron-pack-mac    # macOS
npm run electron-pack-linux  # Linux
```

## Icon Requirements

The desktop app requires platform-specific icons:

### Windows (.ico)
- Place `public/pwa-icon.ico` (256x256 recommended)
- Used for installer and taskbar

### macOS (.icns)
- Place `public/pwa-icon.icns`
- Used for dock and application icon

### Linux (.png)
- Place `public/pwa-icon.png` (512x512 recommended)
- Used for desktop integration

### Generating Icons
You can convert the existing PWA icon using online tools or ImageMagick:

```bash
# Convert SVG to PNG (Linux/macOS)
convert public/pwa-icon.svg -resize 512x512 public/pwa-icon.png

# Convert PNG to ICO (Windows)
# Use online converter or tools like ImageMagick
```

## Security

The application follows Electron security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Secure preload scripts
- No remote module usage

## Distribution

Built applications are output to `dist-electron/` directory with the following structure:
```
dist-electron/
├── Deals247-1.0.0-win.exe  # Windows installer
├── Deals247-1.0.0.dmg      # macOS installer
├── Deals247-1.0.0.AppImage # Linux AppImage
└── Deals247-1.0.0.deb      # Linux DEB package
```

## Integration with Web App

The desktop app loads the same React web application but provides:
- Desktop-specific UI components (title bar, notifications)
- Native system integration
- Enhanced keyboard shortcuts
- Offline capabilities via PWA service worker

Components automatically detect the Electron environment and enable desktop features accordingly.
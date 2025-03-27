# Cookie Consent Manager Extension

A browser extension that automatically handles cookie consent banners according to user preferences while ensuring GDPR compliance.

## Features

- 🍪 **Automatic Consent Handling**: Automatically accepts or declines cookies based on user preference
- ⚖️ **GDPR Compliance Check**: Monitors for non-essential cookies after declining consent
- ⚙️ **Customizable Settings**:
    - Choose between "Accept All", "Decline All", or "Ask Me" modes
    - Whitelist specific websites
- 🔔 **Notifications**: Alerts you about potential GDPR violations
- 📦 **Pre-configured Selectors**: Comes with built-in selectors for common cookie banners

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome/Edge/Brave and navigate to: **chrome://extensions/**
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder

## Usage

After installation:

1. Click the extension icon to open settings
2. Configure your preferences:
- **Consent Mode**: Choose "Accept", "Decline", or "Ask" (manual selection)
- **Whitelist**: Add websites where the extension should be disabled

The extension will automatically handle cookie banners according to your settings.

## How It Works

1. When you visit a website, the extension:
- Checks if the domain is whitelisted
- Looks for known cookie banner selectors
- Performs your preferred action (accept/decline) or waits for manual input

2. In "Decline" mode:
- Monitors for non-essential cookies
- Alerts you about potential GDPR violations

## Technical Details

- **Storage**: Uses `chrome.storage.sync` for settings and `chrome.storage.local` for domain-specific data
- **Content Scripts**: Injects scripts to interact with cookie banners
- **Permissions**:
- `cookies`: For GDPR compliance checking
- `notifications`: To alert users
- `storage`: To save preferences
- `tabs`: To monitor website navigation

## Data Collection

This extension does not collect any personal data. All preferences are stored locally in your browser.

## Limitations

- Works only with pre-configured cookie banners (see `selectorsStore.json`)
- May not detect all GDPR violations perfectly
- Requires refresh after consent action for full effect

## Support

For issues or feature requests, please [open an issue](https://github.com/kochkonbaev/Cookie-Consent.git/issues).
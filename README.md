# SmartLeet — LeetCode Helper Chrome Extension

SmartLeet extracts LeetCode problems from the page and provides hints, multiple approaches (brute-force and optimized), and example code using Gemini (or a configurable AI key). It uses Manifest V3 and plain JavaScript.

Repository: https://github.com/RtKush/SmartLeet

## Features
- Automatically extracts the active LeetCode problem (title, description, examples).
- Generates hints, brute-force approach, and optimized solutions.
- Supports multiple output languages (Java, Python, C++ in the UI).
- Settings page to configure your Gemini API key (stored in extension storage).

## Quick installation
1. Clone this repository:

   git clone https://github.com/RtKush/SmartLeet.git
   cd SmartLeet

2. Load into Chrome
- Open chrome://extensions/
- Enable Developer mode (toggle top-right)
- Click "Load unpacked" and select the `SmartLeet` folder

3. Use the extension
- Open any LeetCode problem (URLs matching https://leetcode.com/problems/*)
- Click the SmartLeet toolbar icon to open the popup
- Configure your API key in Settings (Options) if required

## Files of interest
- `manifest.json` — extension metadata and permissions
- `popup.html`, `popup.css`, `popup.js` — popup UI and logic
- `options.html`, `options.css`, `options.js` — settings page (save API key)
- `content.js` — extracts problem content from LeetCode pages
- `background.js` — service worker for background tasks

## Permissions & host access
- Uses `scripting`, `activeTab`, `storage`, and `webNavigation` permissions
- Host permission: `https://leetcode.com/*`

## Setup notes
- The extension stores your API key in Chrome extension storage; do not commit secrets to the repo.
- If you want to switch from Gemini to another API, update the network calls in `popup.js` or `background.js` accordingly.

## Development tips
- Use the browser console (popup and content script contexts) to debug DOM extraction and messaging.
- When changing `manifest.json`, reload the extension in chrome://extensions/.

## Contributions
- Feel free to open issues or PRs in the repo. If you want `main` as default branch, rename the branch locally and push it, then update the repo settings on GitHub.

## License
- Add your license file (e.g., `LICENSE`) if you want to open source this.

## Contact
- If you want help customizing features (language runners, snippet templates, or adding more languages), open an issue or ask here and I can help.

# LeetCode Helper - Chrome Extension

A Chrome Extension that extracts coding problems from [LeetCode](https://leetcode.com) and provides hints, brute-force, and optimized solutions using **Gemini AI**.

---

## Features
- Extracts the current LeetCode problem automatically.
- Generates hints and multiple approaches (brute-force & optimized).
- Choose multiple languages (Java, Python, C++).

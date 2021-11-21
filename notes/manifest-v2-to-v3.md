
## Changes caused by switching to [manifest v3](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)

### In the `manifest.json`

`permissions` for accessing URLs became `host_permissions`

`browser_action` became `action`

`background.scripts` [became](https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/) `background.service_worker`

### In the source code

1. In the background worker code, `chrome.browerAction` is replaced with `chrome.action`

2. In the "inject global hook" content script, it's no longer allowed to insert script elements with inline content: 
[unsafe-inline CSP is no longer allowed](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/#content-security-policy).
 The script code must be static (in a file within the extension pack), it must be listed in the `web_accessible_resources` (which changed its format too), then it's possible to use script tag with `src` to inject it.


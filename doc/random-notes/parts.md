

## [background worker](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

The purspose of background wokrer is
- to update the state of the extension icon (action icon) in the browser toolbar
- to create the passthrough for passing messages between devtools page and the content script which runs in the page being debugged

## hook

"Hook" is the property created on the window object in the page being debugged.
It has methods and maintains state for communicating between solid code in the browser page
and the devtools. Property name is `__SOLID_DEVTOOLS_GLOBAL_HOOK__`.

Hook comes in 2 variants: `'stub'` and `'full'`. Stub hook is injected into the page when solid devtools panel is not open,
and has all methods as no-ops to avoid slowing down solid js code. Full hook is injected into the page when solid devtools panel
is open, and intercepts component creation and cleanup, so that devtools can show and update the component tree.

## [devtools page](https://developer.chrome.com/docs/extensions/mv3/devtools/#devtools-page)

Creates devtools panel to show component tree if solid is detected on the page, and establishes conneciton with the hook injected into the page.

## [content scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### inject-global-hook

Runs in every page as early as possible, and injects the script to create the hook in the "javascript on the page" [isolated world](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world).

### content-script-passthrough

Creates another passthrough for passing messages between devtools page and solid js code. The script is executed when the message passthrough in the background worker accepts the connection from devools page. The script passes messages to/from the solid js code via `window.postMessage()`. 

### on-panel-deactivated

Executed from the background worker passthrough when devtools page is disconnected. Resets session storage item which is used to detect if solid devtools panel is active or not.

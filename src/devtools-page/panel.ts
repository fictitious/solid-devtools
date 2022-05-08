// copied from React Devtools panel.js
// this is the main script for panel.html

let hasInjectedStyles = false;

// DevTools styles are imported by the javascript executed in the top-level devtools page (which itself is not visible)
// All the scripts, including the ones that render the iframe panels (which use this as their html document) are there, not here
// This setup is specific to browser devtools extension and probably will not be needed when solid devtools would be used as a standalone web page
// To avoid complication of splitting the scripts into the devtools page scripts and panel iframe scripts
// (which would need to communicate and use shared data somehow)
// just obtain all style tags from devtools page and inject them here
Object.assign(window, {injectStyles: (getLinkTags: () => HTMLLinkElement[]) => {
    if (!hasInjectedStyles) {
        hasInjectedStyles = true;

        const linkTags = getLinkTags();

        for (const linkTag of linkTags) {
            document.head.appendChild(linkTag);
        }
    }
}});

export {};

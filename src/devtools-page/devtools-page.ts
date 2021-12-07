// based on main.js from React Devtools

import {createConnectionAndPanelIfSolidRegistered} from './create-connection';

chrome.devtools.network.onNavigated.addListener(checkPageForSolid);

createConnectionAndPanelIfSolidRegistered(cleanupOnSolidFirstDetected);

// keep checking when the user navigates to a new page.
function checkPageForSolid() {
    createConnectionAndPanelIfSolidRegistered(cleanupOnSolidFirstDetected);
}

// check to see if Solid has loaded once per second in case Solid is added after page load
const loadCheckInterval = setInterval(function() {
    createConnectionAndPanelIfSolidRegistered(cleanupOnSolidFirstDetected);
}, 1000);

function cleanupOnSolidFirstDetected() {
    clearInterval(loadCheckInterval);
    chrome.devtools.network.onNavigated.removeListener(checkPageForSolid);
}

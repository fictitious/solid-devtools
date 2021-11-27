// based on main.js from React Devtools

import {createConnectionAndPanelIfSolidDetected} from './create-connection';

chrome.devtools.network.onNavigated.addListener(checkPageForSolid);

createConnectionAndPanelIfSolidDetected(cleanupOnSolidFirstDetected);

// keep checking when the user navigates to a new page.
function checkPageForSolid() {
    createConnectionAndPanelIfSolidDetected(cleanupOnSolidFirstDetected);
}

// check to see if Solid has loaded once per second in case Solid is added after page load
const loadCheckInterval = setInterval(function() {
    createConnectionAndPanelIfSolidDetected(cleanupOnSolidFirstDetected);
}, 1000);

function cleanupOnSolidFirstDetected() {
    clearInterval(loadCheckInterval);
    chrome.devtools.network.onNavigated.removeListener(checkPageForSolid);
}



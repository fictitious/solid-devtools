// based on main.js from React Devtools
// this is the main script for devtools-page.html

import {createConnectionAndPanelsIfSolidRegistered} from './connection/create-connection';

import './ui/index.css';

chrome.devtools.network.onNavigated.addListener(checkPageForSolid);

createConnectionAndPanelsIfSolidRegistered(cleanupOnSolidFirstDetected);

// keep checking when the user navigates to a new page.
function checkPageForSolid() {
    createConnectionAndPanelsIfSolidRegistered(cleanupOnSolidFirstDetected);
}

// check to see if Solid has loaded once per second in case Solid is added after page load
const loadCheckInterval = setInterval(function() {
    createConnectionAndPanelsIfSolidRegistered(cleanupOnSolidFirstDetected);
}, 1000);

function cleanupOnSolidFirstDetected() {
    clearInterval(loadCheckInterval);
    chrome.devtools.network.onNavigated.removeListener(checkPageForSolid);
}

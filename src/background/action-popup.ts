
type PopupType = 'disabled' | 'restricted' | 'production' | 'development';

type IconType = 'normal' | 'gray';

const iconTypes: {[n in PopupType]: IconType} = {
    disabled: 'gray',
    restricted: 'gray',
    production: 'normal',
    development: 'normal'
};

function setIconAndPopup(popupType: PopupType, tabId: number | undefined) {
    const iconType = iconTypes[popupType];
    chrome.action.setIcon({
        tabId: tabId,
        path: {
            '16': `/icons/solid-${iconType}-16.png`,
            '32': `/icons/solid-${iconType}-32.png`,
            '48': `/icons/solid-${iconType}-48.png`,
            '128': `/icons/solid-${iconType}-128.png`
        }
    });
    void chrome.action.setPopup({
        tabId: tabId,
        popup: `pages/popups/${popupType}.html`
    });
}

export {setIconAndPopup};

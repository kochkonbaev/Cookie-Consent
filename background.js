let bannerSelectors = {};
let cookiesStore = {};

fetch(chrome.runtime.getURL('selectorsStore.json'))
    .then(response => response.json())
    .then(data => bannerSelectors = data)
    .catch(error => console.error('Error loading bannerSelectors:', error));

fetch(chrome.runtime.getURL('cookiesStore.json'))
    .then(response => response.json())
    .then(data => cookiesStore = data)
    .catch(error => console.error('Error loading cookiesStore:', error));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
            chrome.storage.sync.get(['whiteList'], (result) => {
                const url = new URL(tab.url);
                const domain = getMainDomain(url.hostname);
                const whiteList = result.whiteList || [];
                const isDisabled = whiteList.includes(domain);

                if (!isDisabled) {
                    const selectors = bannerSelectors[domain];
                    if (!selectors) return;
                    chrome.storage.sync.get(['consentMode'], (result) => {
                        const consentMode = result.consentMode || 'ask';
                        if (consentMode === 'accept' || consentMode === 'decline') {
                            chrome.storage.local.get([`${domain}_LA`], (storage) => {
                                if (storage[`${domain}_LA`]) {
                                    chrome.storage.local.get([`${domain}_checked`], (checked) => {
                                        if (!(domain + "_checked" in result)) sendNotification(`Cookies was already ${storage[`${domain}_LA`]} on ${domain}`);
                                    });

                                    if (storage[`${domain}_LA`] === 'decline') {
                                        chrome.storage.local.get([`${domain}_checked`], (checked) => {
                                            console.log('before checked', checked, !checked);
                                            if (!(domain + "_checked" in result)) {
                                                console.log('if checked', checked);
                                                checkGDPR(domain);
                                            }
                                        });
                                    }
                                } else {
                                    console.log('autoclick')
                                    autoClickOnCookieBanner(selectors, consentMode, domain, tabId);
                                }
                            });
                        } else {
                            setEventListenerOnCookieBanner(selectors, domain, tabId);
                        }
                    });
                } else
                    console.log(`Extension is disabled on tab ${tabId}. Skipping actions.`);
            });
        }
    }
});

function autoClickOnCookieBanner(selectors, consentMode, domain, tabId) {
    chrome.scripting.executeScript({
        target: {tabId},
        function: (selectors, action, domain) => {
            const button = document.querySelector(selectors[action]);
            if (button) {
                button.click();
                sendNotification(`Cookies were ${action} on ${domain}`);
                chrome.storage.local.set({ [`${domain}_LA`]: action });
                console.log('decline clicked');
                location.reload();
            } else {
                console.log(`For ${domain} banner button not found, selector - ${selectors[action]}`);
            }
        },

        args: [selectors, consentMode, domain]
    });
}

function setEventListenerOnCookieBanner(selectors, domain, tabId) {
    chrome.scripting.executeScript({
        target: {tabId},
        function: (selectors, domain) => {
            const acceptBtn = document.querySelector(selectors['accept']);
            const declineBtn = document.querySelector(selectors['decline']);
            if (acceptBtn)
                acceptBtn.addEventListener('click', () => {
                    chrome.storage.local.set({ [`${domain}_LA`]: 'accept' });
                });
            if (declineBtn)
                declineBtn.addEventListener('click', () => {
                    chrome.storage.local.set({ [`${domain}_LA`]: 'decline' });
                    chrome.runtime.sendMessage({command: "checkGDPR", domain: domain});
                });
        },
        args: [selectors, domain]
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "checkGDPR") checkGDPR(message.domain);
});

function checkGDPR(domain) {
    chrome.cookies.getAll({domain: `.${domain}`}, (cookies) => {
        cookies.some((cookie) => {
            if (!cookiesStore.essentialCookiesKeywords.includes(cookie.name)) {
                sendNotification(`This site may be violating GDPR by collecting non-essential cookies: ${cookie.name}`);
                chrome.storage.local.set({ [`${domain}_checked`]: true });
                return true;
            } else {
                console.log('cookie could not be found.');}
        });
    });
}

function getMainDomain(hostname) {
    let hosts = hostname.split('.');
    return hosts.length > 2 ? hosts.slice(1).join('.') : hostname
}

function sendNotification(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cookie Consent',
        message: message
    });
}

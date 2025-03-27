let cookiesStore = {};

fetch(chrome.runtime.getURL('cookiesStore.json'))
    .then(response => response.json())
    .then(data => cookiesStore = data)
    .catch(error => console.error('Error loading cookiesStore:', error));

document.addEventListener('DOMContentLoaded', () => {
    const acceptRadio = document.getElementById('accept');
    const declineRadio = document.getElementById('decline');
    const askRadio = document.getElementById('ask');
    const cookiesInfo = document.getElementById('cookies');
    const disableExtensionButton = document.getElementById('disable-extension');
    const settingsButton = document.getElementById('settings');
    const clearButton = document.getElementById('clear-cookies');
    const reportButton = document.getElementById('report');

    chrome.storage.sync.get(['consentMode'], function (result) {
        const consentMode = result.consentMode || 'ask';
        if (consentMode === 'accept') acceptRadio.checked = true;
        else if (consentMode === 'decline') declineRadio.checked = true;
        else askRadio.checked = true;
    });

    [acceptRadio, declineRadio, askRadio].forEach((radio) => {
        radio.addEventListener('change', () => {
            chrome.storage.sync.set({consentMode: radio.value});
        });
    });

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        let domain = getMainDomain(url.hostname)

        chrome.storage.sync.get(['whiteList'], (result) => {
            const whiteList = result.whiteList || [];
            if (!whiteList.includes(domain)) {
                let htmlContent = '';
                let essentialCookies = [];
                let optionalCookies = [];
                let otherCookies = [];

                chrome.cookies.getAll({domain: `.${domain}`}, function (cookies) {
                    cookies.forEach((cookie) => {
                        if (cookiesStore.essentialCookiesKeywords.some(keyword => cookie.name.includes(keyword)))
                            essentialCookies.push(cookie);
                        else if (cookiesStore.optionalCookieKeywords.some(keyword => cookie.name.includes(keyword)))
                            optionalCookies.push(cookie);
                        else
                            otherCookies.push(cookie);
                    });

                    htmlContent += getCookiesInfoHTML('All', domain, cookies);

                    if (essentialCookies.length)
                        htmlContent += getCookiesInfoHTML('Necessary', domain, essentialCookies);

                    if (optionalCookies.length)
                        htmlContent += getCookiesInfoHTML('Non-Essential', domain, optionalCookies);

                    if (otherCookies.length)
                        htmlContent += getCookiesInfoHTML('Uncategorical', domain, otherCookies);

                    cookiesInfo.insertAdjacentHTML('afterbegin', htmlContent);
                    disableExtensionButton.textContent = "Disable on This Page";
                });
            } else {
                disableExtensionButton.textContent = "Enable on This Page";
            }
        });
    });

    disableExtensionButton.addEventListener('click', async () => {
        try {
            const tabInfo = await getCurrentTabDomain();
            chrome.storage.sync.get(['whiteList'], (result) => {
                let whiteList = result.whiteList || [];
                const isDisabled = whiteList.includes(tabInfo.domain);

                if (isDisabled) {
                    whiteList = whiteList.filter(site => site !== tabInfo.domain);
                    disableExtensionButton.textContent = "Enable on This Page";
                } else {
                    whiteList.push(tabInfo.domain);
                    disableExtensionButton.textContent = "Disable on This Page";
                }

                chrome.storage.sync.set({'whiteList': whiteList}, () => {
                    console.log(`Extension is ${!isDisabled ? "disabled" : "enabled"} on tab ${tabInfo.tabId}`);
                    window.close();
                });
            });
        } catch (error) {
            console.error("Error getting domain:", error);
        }
    });

    clearButton.addEventListener('click', async () => {
        try {
            const tabInfo = await getCurrentTabDomain();
            chrome.cookies.getAll({domain: `.${tabInfo.domain}`}, (cookies) => {
                cookies.forEach((cookie) => {
                    const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
                    chrome.cookies.remove({url: cookieUrl, name: cookie.name}, () => {
                        if (chrome.runtime.lastError) {
                            console.error(`Failed to remove cookie: ${cookie.name}`, chrome.runtime.lastError);
                        } else {
                            console.log(`Removed cookie: ${cookie.name}`);
                        }
                    });
                });

                window.close();
                alert(`All cookies for ${tabInfo.domain} have been removed.`);
            });
        } catch (error) {
            console.error("Error getting domain:", error);
        }
    })

    settingsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    reportButton.addEventListener('click', () => {
        window.open('https://www.edps.europa.eu/data-protection/our-role-supervisor/complaints_en', '_blank');
    });
});

function getCookiesInfoHTML(name, domain, array) {
    return `
    <details>
      <summary>${name} Cookies for <span>${domain}</span> - <span>${array.length} pcs</span></summary>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${getFormattedTableContent(array)}
        </tbody>
      </table>
    </details>
    `;
}

function getFormattedTableContent(array) {
    return array
        .map((cookie) => `<tr><td>${cookie.name}</td><td class="value-cell">${cookie.value}</td></tr>`)
        .join('');
}

function getCurrentTabDomain() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) {
                reject(new Error("No active tab found."));
                return;
            }

            const url = new URL(tabs[0].url);
            resolve({domain: getMainDomain(url.hostname), tabId: tabs[0].id});
        });
    });
}

function getMainDomain(hostname) {
    let hosts = hostname.split('.');
    return hosts.length > 2 ? hosts.slice(1).join('.') : hostname
}

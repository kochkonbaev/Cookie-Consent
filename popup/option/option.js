document.addEventListener('DOMContentLoaded', () => {
    const siteInput = document.getElementById('site-input');
    const addButton = document.getElementById('add-site');
    const whiteList = document.getElementById('white-list');

    let whiteListSites = [];
    fetchWhiteList().then((whiteList) => {
        whiteListSites = whiteList;
        renderWhiteList();
    });

    addButton.addEventListener('click', () => {
        const site = siteInput.value.trim();
        console.log('add', site, whiteListSites);
        if (site && !whiteListSites.includes(site)) {
            whiteListSites.push(site);
            chrome.storage.sync.set({'whiteList': whiteListSites});
            renderWhiteList();
            siteInput.value = '';
        }
    });

    function renderWhiteList() {
        whiteList.innerHTML = whiteListSites.map(site => `<li>${site}<button data-site="${site}">Remove</button></li>`)
            .join('');

        const removeButtons = whiteList.querySelectorAll('button');
        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const site = button.getAttribute('data-site');
                removeFromWhiteList(site);
            });
        });
    }

    function removeFromWhiteList(site) {
        whiteListSites = whiteListSites.filter(s => s !== site);
        chrome.storage.sync.set({'whiteList': whiteListSites});
        renderWhiteList();
    }
});

async function fetchWhiteList() {
    try {
        const whiteList = await getStorageData('whiteList');
        console.log("White List:", whiteList);
        return whiteList || [];
    } catch (error) {
        console.error("Error fetching white list:", error);
        return [];
    }
}

function getStorageData(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get([key], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

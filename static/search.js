(() => {
    const inputEl = document.getElementById('search');
    const searchWrapper = document.getElementById('search-wrapper');
    const listWrapper = document.getElementById('lists');
    let activityListItems;

    const interval = setInterval(() => {
        const activityList = listWrapper.querySelector('ul');

        if (activityList !== null) {
            clearInterval(interval);

            activityListItems = Array.from(activityList.children);
            
            if (activityListItems.length > 4) {
                searchWrapper.style.display = null;
                inputEl.focus();
            }
        }
    }, 250);

    inputEl.addEventListener('input', ev => {
        const searchQuery = ev.target.value.trim().toLowerCase();

        activityListItems.forEach(item => {
            const primaryText = item.querySelector('.mdc-list-item__primary-text').textContent.toLowerCase();
            const secondaryText = item.querySelector('.mdc-list-item__secondary-text').textContent.toLowerCase();

            const displayItem = primaryText.includes(searchQuery) || secondaryText.includes(searchQuery);

            if (displayItem) {
                item.style.display = null;
            } else {
                item.style.display = "none";
            }
        });
    });
})();
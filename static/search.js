(() => {
    const inputEl = document.getElementById('search');
    const searchWrapper = document.getElementById('search-wrapper');
    const listWrapper = document.getElementById('lists');

    const getActivityListItems = () => {
        const activityList = listWrapper.querySelector('ul');
        return activityList ? Array.from(activityList.children) : [];
    };

    const interval = setInterval(() => {
        const activityListItems = getActivityListItems();

        if (activityListItems.length > 0) {
            clearInterval(interval);

            if (activityListItems.length > 4) {
                searchWrapper.style.display = null;
                inputEl.focus();
            }
        }
    }, 250);

    inputEl.addEventListener('input', ev => {
        const searchQuery = ev.target.value.trim().toLowerCase();

        getActivityListItems().forEach(item => {
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

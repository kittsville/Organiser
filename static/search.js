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

    inputEl.addEventListener('input', () => {
        if (typeof window.applyActivityFilters === 'function') {
            window.applyActivityFilters();
        }
    });
})();

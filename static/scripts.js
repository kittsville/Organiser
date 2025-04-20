const listsWrapperEl = document.getElementById('lists');
const listItemTemplateEl = document.getElementById('template');
const makeChecklistEl = document.getElementById('copy-checklist');
const editEl = document.getElementById('edit');
const editWrapperEl = document.getElementById('edit-wrapper');
const editableActivitiesEl = document.getElementById('editable-activities');
const editableActivitiesWrapperEl = document.getElementById('editable-activities-wrapper');
const helpTextEl = document.getElementById('help-text');
const editorButtonsEl = document.getElementById('editor-buttons');
const cancelEl = document.getElementById('cancel');
const saveEl = document.getElementById('save');
const headless = listsWrapperEl.classList.contains("headless");

let userState = null;
let previousActivityText = null;
const selectedListItems = new Set();

const url = new URL(location);
const encryption_key = url.searchParams.get('key');
const user_uuid = url.pathname.substring(url.pathname.indexOf('/') + 1);

const handleServerError = error => alert(`Updating activity list failed: ${error}`);
const handleNewUserState = user => {
    userState = user;
    renderListsSummary(user.activities);
    switchToListMode();
};

const cancelEditWithEscape = e => {
    if(e.key === "Escape") {
        cancelEl.click();
    }
};

const switchToListMode = () => {
    editorButtonsEl.hidden = true;
    editableActivitiesWrapperEl.hidden = true;

    helpTextEl.hidden = false;
    listsWrapperEl.hidden = false;
    editWrapperEl.hidden = false;

    document.body.removeEventListener('keyup', cancelEditWithEscape);
};

const deselectAllActivities = () =>
    Array.from(document.getElementsByClassName('selected')).forEach(onListItemClick);

cancelEl.addEventListener('click', () => {
    const newActivitiesText = editableActivitiesEl.value.trim();
    const confirmDiscard = () => confirm("You have unsaved changes. Are you sure you want to discard them?");

    if (newActivitiesText == previousActivityText || confirmDiscard()) {
        switchToListMode();
    }
});

saveEl.addEventListener('click', () => {
    rawActivities = editableActivitiesEl.value.trim().split('\n\n');

    const activities = rawActivities.map(rawItems => {
        const parsedItems = rawItems.trim().split('\n').map(item => item.trim());
        if (parsedItems.length < 2) {
            const error = `Activity list has too few items: ${rawItems}`;
            alert(error);
            throw error;
        }
        const activity = {
            name: parsedItems[0],
            items: parsedItems.slice(1)
        }

        return activity;
    });

    if (headless) {
        handleNewUserState({
            activities,
            version: 1,
            updatedAt: Date.now() / 1000
        })
    } else {
        const payload = {
            activities,
            previousUpdatedAt: userState.updatedAt
        }
    
        fetch(
            `/api/activities/${user_uuid}?key=${encryption_key}`,
            {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (response.ok) {
                    response.json().then(handleNewUserState);
                } else {
                    response.text().then(handleServerError).catch(handleServerError);
                }
            })
            .catch(handleServerError);
    }
});

editEl.addEventListener('click', () => {
    deselectAllActivities();
    listsWrapperEl.hidden = true;
    editWrapperEl.hidden = true;
    helpTextEl.hidden = true;

    const activitiesAsText = userState.activities.map(item => item.name + '\n' + item.items.join('\n')).join('\n\n');

    previousActivityText = activitiesAsText;
    editorButtonsEl.hidden = false;
    editableActivitiesEl.value = activitiesAsText;
    editableActivitiesWrapperEl.hidden = false;

    document.body.addEventListener('keyup', cancelEditWithEscape);
});

const resolveReferences = checklistItems => {
    try {
        return checklistItems.flatMap(item => {
            if (!item.startsWith('~')) {
                return [item];
            }

            const reference = item.slice(1).toLowerCase();
            const referencedListItems = userState.activities.find(list => list.name.toLowerCase() == reference);

            if (referencedListItems == undefined) {
                return [item];
            } else {
                return resolveReferences(referencedListItems.items);
            }
        });
    } catch {
        alert("Bad girl");
        return [];
    }
}

makeChecklistEl.addEventListener('click', () => {
    const checklistItems = userState.activities.flatMap(list => selectedListItems.has(list.name) ? list.items : []);

    const referencedResolved    = resolveReferences(checklistItems);
    const dedupedChecklistItems = [...new Set(referencedResolved)];

    const nonOptionalItems      = new Set(dedupedChecklistItems.filter(item => !item.endsWith('?')).map(item => item.toLowerCase()));
    const optionalItemsFiltered = dedupedChecklistItems.filter(item => !(item.endsWith('?') && nonOptionalItems.has(item.slice(0, -1).toLowerCase())));

    const itemsToRemove         = new Set(optionalItemsFiltered.filter(item => item.startsWith('-')).map(item => item.slice(1).toLowerCase()));
    const removalListApplied    = optionalItemsFiltered.filter(item =>
        !itemsToRemove.has(item.toLowerCase()) &&
        !(item.endsWith('?') && itemsToRemove.has(item.slice(0, -1).toLowerCase())) &&
        !item.startsWith('-')
    );
    const removedOverrideSuffix = removalListApplied.map(item => item.replace(/(!!)$/, ''));

    const addCheckBoxes = removedOverrideSuffix.map(item => item.replace(/^/, "- [ ] "))

    const checklistText         = addCheckBoxes.join('\n');

    navigator.clipboard.writeText(checklistText);
})

const onListItemClick = listItemEl => {
    const itemId = listItemEl.getAttribute('x-id');

    if (selectedListItems.has(itemId)) {
        listItemEl.classList.remove('selected');
        selectedListItems.delete(itemId);
    } else {
        listItemEl.classList.add('selected');
        selectedListItems.add(itemId);
    }

    makeChecklistEl.hidden = selectedListItems.size < 1;
};

const renderListsSummary = (listItems) => {
    const listItemEls = listItems.map((item, i) => {
        const tabindex = i === 0 ? 'tabindex="0"' :'';

        const listItemEl = listItemTemplateEl.content.cloneNode(true).querySelector('li');
        if (i === 0) {listItemEl.tabIndex = 0;}
        listItemEl.setAttribute('x-id', item.name);

        listItemEl.querySelector('.mdc-list-item__primary-text').textContent = item.name;
        listItemEl.querySelector('.mdc-list-item__secondary-text').textContent = item.items.join(', ');

        return listItemEl;
    });

    const listEl = document.createElement('ul');
    listEl.classList.add('mdc-list', 'mdc-list--two-line');
    listItemEls.forEach(el => listEl.appendChild(el));

    listsWrapperEl.innerHTML = '';
    listsWrapperEl.appendChild(listEl);
    const list = new mdc.list.MDCList(listsWrapperEl.firstElementChild);
    list.listElements.forEach(mdc.ripple.MDCRipple.attachTo);

    Array.from(listsWrapperEl.firstElementChild.children).forEach(listItemEl =>
        listItemEl.addEventListener('click', () => onListItemClick(listItemEl))
    );
}

const renderLoadError = (message) => {
    const metaEl = document.createElement('meta');
    metaEl.name = 'robots';
    metaEl.content = 'noindex';
    document.head.appendChild(metaEl);

    listsWrapperEl.textContent = message;
}

addEventListener('DOMContentLoaded', () => {
    if (headless) {
        handleNewUserState({
            activities: [],
            updatedAt: (Date.now() / 1000),
            version: 1
        });
        editEl.click();
    } else {
        fetch(`/api/activities/${user_uuid}?key=${encryption_key}`)
        .then(response => {
            if (response.status == 200) {
                return response.json();

            }

            if (response.status == 404) {
                renderLoadError('User  not found');
            } else {
                renderLoadError(`HTTP ${response.status} (an error occurred)`);
            }

            throw new Error('No Activities returned by server');
        })
        .then(handleNewUserState);
    }

    // Initialises Material Design Components
    // See: https://github.com/material-components/material-components-web#javascript
    Array.from(document.getElementsByClassName('mdc-text-field')).forEach(mdc.textField.MDCTextField.attachTo);
    Array.from(document.getElementsByTagName('button')).forEach(mdc.iconButton.MDCIconButtonToggle.attachTo);
});

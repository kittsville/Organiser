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

let userState = null;
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
        cancel.click();
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

cancelEl.addEventListener('click', switchToListMode);

saveEl.addEventListener('click', () => {
    rawActivities = editableActivitiesEl.value.trim().split('\n\n');

    const activities = rawActivities.map(rawItems => {
        const parsedItems = rawItems.trim().split('\n');
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
});

editEl.addEventListener('click', () => {
    deselectAllActivities();
    listsWrapperEl.hidden = true;
    editWrapperEl.hidden = true;
    helpTextEl.hidden = true;

    const activitiesAsText = userState.activities.map(item => item.name + '\n' + item.items.join('\n')).join('\n\n');

    editorButtonsEl.hidden = false;
    editableActivitiesEl.value = activitiesAsText;
    editableActivitiesWrapperEl.hidden = false;

    document.body.addEventListener('keyup', cancelEditWithEscape);
});

makeChecklistEl.addEventListener('click', () => {
    const checklistItems        = userState.activities.flatMap(list => selectedListItems.has(list.name) ? list.items : []);
    const dedupedChecklistItems = [...new Set(checklistItems)];
    const checklistText         = dedupedChecklistItems.join('\n');

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

addEventListener('DOMContentLoaded', () => {
    fetch(`/api/activities/${user_uuid}?key=${encryption_key}`)
        .then(response => response.json())
        .then(handleNewUserState);

    // Initialises Material Design Components
    // See: https://github.com/material-components/material-components-web#javascript
    Array.from(document.getElementsByClassName('mdc-text-field')).forEach(mdc.textField.MDCTextField.attachTo);
    Array.from(document.getElementsByTagName('button')).forEach(mdc.iconButton.MDCIconButtonToggle.attachTo);
});

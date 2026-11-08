const listsWrapperEl = document.getElementById('lists');
const listItemTemplateEl = document.getElementById('template');
const makeChecklistEl = document.getElementById('copy-checklist');
const editEl = document.getElementById('edit');
const editWrapperEl = document.getElementById('edit-wrapper');
const editableActivitiesEl = document.getElementById('editable-activities');
const editableActivitiesWrapperEl = document.getElementById('editable-activities-wrapper');
const helpTextEl = document.getElementById('help-text');
const exampleBannerEl = document.getElementById('example-banner');
const editorButtonsEl = document.getElementById('editor-buttons');
const cancelEl = document.getElementById('cancel');
const saveEl = document.getElementById('save');
const combinedChecklistEl = document.getElementById('combined-checklist');
const viewButtonsEl = document.getElementById('view-buttons');
const closeViewEl = document.getElementById('close-view');
const headless = listsWrapperEl.classList.contains("headless");

let userState = null;
let previousActivityText = null;
let combinedList = null;
const selectedListItems = new Set();

const url = new URL(location);
const encryption_key = url.searchParams.get('key');
const user_uuid = url.pathname.substring(url.pathname.indexOf('/') + 1);

const localDebug = ['localhost', '0.0.0.0', '127.0.0.1', '[::]'].includes(url.hostname);
if (localDebug) {
    console.info(`Debugging - host detected as ${url.hostname}`);
}

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

const closeViewWithEscape = e => {
    if (e.key === "Escape") {
        closeViewEl.click();
    }
};

const clearCombinedList = () => {
    if (combinedList) {
        combinedList.destroy();
        combinedList = null;
    }
    combinedChecklistEl.replaceChildren();
};

const switchToListMode = () => {
    editorButtonsEl.hidden = true;
    editableActivitiesWrapperEl.hidden = true;
    viewButtonsEl.hidden = true;
    combinedChecklistEl.hidden = true;
    clearCombinedList();

    helpTextEl.hidden = false;
    if (exampleBannerEl) {
        exampleBannerEl.hidden = !(userState && userState.unedited);
    }
    listsWrapperEl.hidden = false;
    editWrapperEl.hidden = false;
    makeChecklistEl.hidden = selectedListItems.size < 1;
    document.body.classList.remove('edit-mode', 'view-mode');

    document.body.removeEventListener('keyup', cancelEditWithEscape);
    document.body.removeEventListener('keyup', closeViewWithEscape);
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
    if (exampleBannerEl) {
        exampleBannerEl.hidden = true;
    }
    document.body.classList.add('edit-mode');
    document.body.classList.remove('view-mode');

    const activitiesAsText = userState.activities.map(item => item.name + '\n' + item.items.join('\n')).join('\n\n');

    previousActivityText = activitiesAsText;
    editorButtonsEl.hidden = false;
    editableActivitiesEl.value = activitiesAsText;
    editableActivitiesWrapperEl.hidden = false;

    document.body.addEventListener('keyup', cancelEditWithEscape);
});

const CHECKBOX_GRAPHIC = `
<span class="mdc-list-item__ripple"></span>
<span class="mdc-list-item__graphic">
  <div class="mdc-checkbox">
    <input type="checkbox" class="mdc-checkbox__native-control">
    <div class="mdc-checkbox__background">
      <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
        <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"></path>
      </svg>
      <div class="mdc-checkbox__mixedmark"></div>
    </div>
    <div class="mdc-checkbox__ripple"></div>
  </div>
</span>`;

const renderCombinedChecklist = (items) => {
    clearCombinedList();

    if (items.length === 0) {
        const emptyEl = document.createElement('p');
        emptyEl.textContent = 'No items in this checklist.';
        combinedChecklistEl.appendChild(emptyEl);
        return;
    }

    const listEl = document.createElement('ul');
    listEl.className = 'mdc-list';
    listEl.setAttribute('role', 'group');
    listEl.setAttribute('aria-label', 'Combined checklist');

    items.forEach((item, index) => {
        const optional = item.endsWith('?');
        const name = optional ? item.slice(0, -1) : item;
        const listItemEl = document.createElement('li');
        listItemEl.className = 'mdc-list-item';
        listItemEl.setAttribute('role', 'checkbox');
        listItemEl.setAttribute('aria-checked', 'false');
        if (index === 0) {
            listItemEl.tabIndex = 0;
        }
        listItemEl.insertAdjacentHTML('beforeend', CHECKBOX_GRAPHIC);

        const textEl = document.createElement('span');
        textEl.className = 'mdc-list-item__text';
        if (optional) {
            listItemEl.classList.add('checklist-item--optional');
            const primaryEl = document.createElement('span');
            primaryEl.className = 'mdc-list-item__primary-text';
            primaryEl.textContent = name;
            const secondaryEl = document.createElement('span');
            secondaryEl.className = 'mdc-list-item__secondary-text';
            secondaryEl.textContent = 'optional';
            textEl.append(primaryEl, secondaryEl);
        } else {
            textEl.textContent = name;
        }
        listItemEl.appendChild(textEl);
        listEl.appendChild(listItemEl);
    });

    combinedChecklistEl.appendChild(listEl);
    combinedList = new mdc.list.MDCList(listEl);
    combinedList.listElements.forEach(element => mdc.ripple.MDCRipple.attachTo(element));
    listEl.querySelectorAll('.mdc-checkbox').forEach(element => mdc.checkbox.MDCCheckbox.attachTo(element));
};

const switchToViewMode = (items) => {
    listsWrapperEl.hidden = true;
    editWrapperEl.hidden = true;
    helpTextEl.hidden = true;
    if (exampleBannerEl) {
        exampleBannerEl.hidden = true;
    }
    editorButtonsEl.hidden = true;
    editableActivitiesWrapperEl.hidden = true;

    document.body.classList.add('view-mode');
    document.body.classList.remove('edit-mode');
    renderCombinedChecklist(items);
    combinedChecklistEl.hidden = false;
    viewButtonsEl.hidden = false;

    document.body.addEventListener('keyup', closeViewWithEscape);
};

const hideCombineButton = () => {
    if (document.body.classList.contains('view-mode')) {
        makeChecklistEl.hidden = true;
    }
};

makeChecklistEl.addEventListener('click', () => {
    if (document.body.classList.contains('view-mode')) {
        return;
    }

    const removedOverrideSuffix = combineChecklists(userState.activities, [...selectedListItems]);

    let md_check = document.getElementById("md-check");

    const addCheckBoxes = (md_check.checked ? removedOverrideSuffix.map(item => item.replace(/^/, "- [ ] ")) : removedOverrideSuffix);

    const checklistText = addCheckBoxes.join('\n');

    if (localDebug) {
        console.debug(checklistText);
    }

    switchToViewMode(removedOverrideSuffix);

    const copyPromise = navigator.clipboard
        ? navigator.clipboard.writeText(checklistText)
        : Promise.reject();

    copyPromise.then(() => {
        makeChecklistEl.classList.remove('is-copied');
        void makeChecklistEl.offsetWidth;
        makeChecklistEl.classList.add('is-copied');
        makeChecklistEl.addEventListener('animationend', hideCombineButton, { once: true });
        setTimeout(hideCombineButton, 1000);
    }).catch(hideCombineButton);
});

closeViewEl.addEventListener('click', switchToListMode);

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
    Array.from(document.getElementsByClassName('mdc-switch')).forEach(mdc.switchControl.MDCSwitch.attachTo);
});

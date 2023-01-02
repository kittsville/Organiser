const listsWrapperEl = document.getElementById('lists');
const makeChecklistEl = document.getElementById('copy-checklist');

let userState = null;
const selectedListItems = new Set();

const path = new URL(location).pathname;
const user_uuid = path.substring(path.indexOf('/') + 1);

makeChecklistEl.addEventListener('click', () => {
    const checklistItems = userState.lists.flatMap(list => selectedListItems.has(list.id) ? list.items : []);
    const checklistText = checklistItems.join('\n');

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
        
        // FIXME: HTML injection, oh no
        return `<li class="mdc-list-item" ${tabindex} x-id="${item.id}">
            <span class="mdc-list-item__ripple"></span>
            <span class="mdc-list-item__text">
                <span class="mdc-list-item__primary-text">${item.name}</span>
                <span class="mdc-list-item__secondary-text">${item.items.join(', ')}</span>
            </span>
        </li>`
    }).join('');

    const listEl = `<ul class="mdc-list mdc-list--two-line">${listItemEls}</ul>`;

    listsWrapperEl.innerHTML = listEl;

    const list = new mdc.list.MDCList(listsWrapperEl.firstElementChild);
    list.listElements.forEach(mdc.ripple.MDCRipple.attachTo);

    Array.from(listsWrapperEl.firstElementChild.children).forEach(listItemEl =>
        listItemEl.addEventListener('click', () => onListItemClick(listItemEl))
    );
}

fetch(`/lists/${user_uuid}`)
    .then(response => response.json())
    .then(user => {
        userState = user;
        renderListsSummary(user.lists);
    });


// Initialises Material Design Components
// See: https://github.com/material-components/material-components-web#javascript
Array.from(document.getElementsByClassName('mdc-text-field')).forEach(mdc.textField.MDCTextField.attachTo);
Array.from(document.getElementsByTagName('button')).forEach(mdc.iconButton.MDCIconButtonToggle.attachTo);

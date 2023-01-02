const listsWrapperEl = document.getElementById('lists');

const path = new URL(location).pathname;
const user_uuid = path.substring(path.indexOf('/') + 1);

const renderListsSummary = (listItems) => {
    const listItemEls = listItems.map((item, i) => {
        const tabindex = i === 0 ? 'tabindex="0"' :'';
        
        // FIXME: HTML injection, oh no
        return `<li class="mdc-list-item" ${tabindex}>
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
}

fetch(`/lists/${user_uuid}`)
    .then(response => response.json())
    .then(user => {
        renderListsSummary(user.lists);
    });


// Initialises Material Design Components
// See: https://github.com/material-components/material-components-web#javascript
Array.from(document.getElementsByClassName('mdc-text-field')).forEach(mdc.textField.MDCTextField.attachTo);
Array.from(document.getElementsByTagName('button')).forEach(mdc.iconButton.MDCIconButtonToggle.attachTo);

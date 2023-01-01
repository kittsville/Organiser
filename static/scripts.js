const output = document.getElementById('test');

const path = new URL(location).pathname;
const user_uuid = path.substring(path.indexOf('/') + 1);

fetch(`/lists/${user_uuid}`)
    .then(response => response.text())
    .then(body => {
        output.textContent = body;
    });


// Initialises Material Design Components
// See: https://github.com/material-components/material-components-web#javascript
Array.from(document.getElementsByClassName('mdc-text-field')).forEach(mdc.textField.MDCTextField.attachTo);
Array.from(document.getElementsByTagName('button')).forEach(mdc.iconButton.MDCIconButtonToggle.attachTo);

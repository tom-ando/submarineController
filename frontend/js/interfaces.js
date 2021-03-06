// Global variable for the parent div
let domInterface = document.getElementById("interface");

// Current item for the main menu (index 1, 0th item is heading)
let currentMenuItem = 1;

// Holds the callback functions for all of the menu buttons on screen
let currentMenuCallbacks = []

// Used as a callback when a button won't do anything
function noClick() {
    return;
}

// Makes and returns a button
function makeButton(id, classList, innerHTML) {
    // New button
    let newButton = document.createElement("button");

    // Do the attributes
    if (id) {
        newButton.id = id;
    }

    if (innerHTML) {
        newButton.innerHTML = innerHTML;
    }

    if (classList) {
        for (newClass of classList) {
            newButton.classList.add(newClass);
        }
    }

    return newButton;
}

// Makes and returns a heading
function makeHeading(size, id, classList, innerHTML) {
    // New button
    let newHeading = document.createElement("h" + size);

    // Do the attributes
    if (id) {
        newHeading.id = id;
    }

    if (innerHTML) {
        newHeading.innerHTML = innerHTML;
    }

    if (classList) {
        for (newClass of classList) {
            newHeading.classList.add(newClass);
        }
    }

    return newHeading;
}

// Catches the joystick moving on a menu
function menuNavigate(joystick) {
    if (buttonNotHeld("axesMiniUpDown")) { // Prevent spamming
        let domMenuChildren = document.getElementById("interface").children[0].children;
        let menuLength = domMenuChildren.length - 1;
        if (domMenuChildren.length > 1) {
            if (joystick.axes[5] > 0) {
                // Move menu selection down one
                domMenuChildren[currentMenuItem].classList.remove("buttonSelected");
                // Make sure it doesn't go past the last element
                currentMenuItem = currentMenuItem < menuLength ? currentMenuItem + 1 : menuLength;
                domMenuChildren[currentMenuItem].classList.add("buttonSelected");
            } else if (joystick.axes[5] < 0) {
                // Move menu selection up one
                domMenuChildren[currentMenuItem].classList.remove("buttonSelected");
                // Make sure it doesn't go past the last element
                currentMenuItem = currentMenuItem > 1 ? currentMenuItem - 1 : 1;
                domMenuChildren[currentMenuItem].classList.add("buttonSelected");
            }
        }
    }
}

// Runs when a menu item is selected
function menuSelect() {
    if (buttonNotHeld("trigger")) {
        currentMenuCallbacks[currentMenuItem]();
    }
}

// Makes a menu with 3 buttons and a heading
function makeMenu(heading, button1, button2, button3) {
    // Container
    let domMenu = document.createElement("div");
    domMenu.id = "menu";

    // Heading
    if (heading != "" && heading != undefined) {
        let domMenuHeading = makeHeading(1, undefined, ["menuHeading"], heading);
        domMenu.appendChild(domMenuHeading);
    }

    // Buttons
    let buttons = [button1, button2, button3];
    for (i=0; i<buttons.length; i++) {
        // Make sure that there's a button
        if (buttons[i] != undefined) {
            // If it's the first button then select it
            let buttonClass = i == 0 ? ["buttonSelected"] : undefined;
            let domButton = makeButton(undefined, buttonClass, buttons[i]);
            domMenu.appendChild(domButton);
        }
    }

    return domMenu
}

function setMenu(heading, button1, button2, button3) {
    // If there's something there delete it
    if (domInterface.children.length > 0) {
        domInterface.removeChild(domInterface.children[0]);
    }

    // Make sure that there are buttons there
    button1 = button1 == undefined ? {label: undefined, callback: undefined} : button1
    button2 = button2 == undefined ? {label: undefined, callback: undefined} : button2
    button3 = button3 == undefined ? {label: undefined, callback: undefined} : button3

    // Make and append the menu
    let menu = makeMenu(heading, button1.label, button2.label, button3.label);
    domInterface.appendChild(menu);

    // Padding to match up with everything else
    let buttons = [undefined, button1, button2, button3]
    for (i=0; i<buttons.length; i++) {
        if (buttons[i] != undefined && buttons[i].callback != undefined) {
            currentMenuCallbacks[i] = buttons[i].callback;
        } else {
            // If there is no button then make the callback do nothing
            currentMenuCallbacks[i] = noClick;
        }
    }

    // Reset the selected item
    currentMenuItem = 1;

    joystickEvent.axesMiniUpDown = menuNavigate;
    joystickEvent.trigger = menuSelect;
}

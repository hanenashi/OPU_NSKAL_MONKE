// ==UserScript==
// @name         Edit Image
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add an Edit button to select and display an image
// @author       You
// @match        file:///E:/pokus.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Add a debug message to indicate the script is running
    const debugMessage = document.createElement('div');
    debugMessage.textContent = 'UserScript is running...';
    debugMessage.style.fontSize = '24px';
    debugMessage.style.color = 'red';
    debugMessage.style.textAlign = 'center';
    debugMessage.style.marginTop = '20px';
    document.body.prepend(debugMessage);

    console.log('UserScript is running...');

    // Create the Edit button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.style.display = 'block';
    editButton.style.marginTop = '20px';

    // Add the Edit button under the Hello, World! heading
    const heading = document.querySelector('h1');
    if (heading) {
        heading.insertAdjacentElement('afterend', editButton);
        console.log('Edit button added.');
    } else {
        console.log('Heading not found.');
    }

    // Add event listener to the Edit button
    editButton.addEventListener('click', () => {
        console.log('Edit button clicked.');

        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        // Add event listener to the file input element
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log('File selected:', file.name);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgSrc = e.target.result;
                    const imgWindow = window.open('', '_blank');
                    imgWindow.document.write(`
                        <html>
                        <head>
                            <title>Image Preview</title>
                            <style>
                                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #000; }
                                img { max-width: 100%; max-height: 100%; }
                            </style>
                        </head>
                        <body>
                            <img src="${imgSrc}">
                        </body>
                        </html>
                    `);
                    imgWindow.document.close();
                };
                reader.readAsDataURL(file);
            } else {
                console.log('No file selected.');
            }
        });

        // Trigger the file input click event
        fileInput.click();
    });
})();
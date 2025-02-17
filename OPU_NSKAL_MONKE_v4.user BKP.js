// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      3
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
// @author       You
// @match        https://opu.peklo.biz/*
// @match        https://www.okoun.cz/boards/*
// @match        https://www.okoun.cz/postArticle.do
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      opu.peklo.biz
// ==/UserScript==

(function() {
    'use strict';

    // Inject CSS
    GM_addStyle(`
        #opuNskalButton {
            background-color: #e74c3c; /* Red by default */
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            display: inline-block;
        }
        #opuNskalButton:hover {
            background-color: #c0392b;
        }
        #opuNskalSettingsButton {
            background-color: #3498db; /* Blue by default */
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            display: inline-block;
        }
        #opuNskalSettingsButton:hover {
            background-color: #2980b9;
        }
        #opuNskalSaveButton {
            background-color: #2ecc71; /* Green by default */
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            display: inline-block;
        }
        #opuNskalSaveButton:hover {
            background-color: #27ae60;
        }
        #opuNskalResetButton {
            background-color: #e74c3c; /* Red by default */
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            display: inline-block;
        }
        #opuNskalResetButton:hover {
            background-color: #c0392b;
        }
        #opuNskalPreviewContainer {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            background-color: #f9f9f9;
        }
        .tools {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .tools > div, .tools > span {
            margin-right: 10px;
        }
        .tools .right-align {
            margin-left: auto;
            display: flex;
            align-items: center;
        }
        .nskal-input {
            margin-right: 10px;
            padding: 5px;
            font-size: 14px;
            width: auto;
        }
        #customTagInput {
            width: 50px;
        }
        #resizePercentageInput {
            width: 50px;
        }
        #progressBarContainer {
            width: 100%;
            background-color: #f3f3f3;
            border: 1px solid #ccc;
            margin-top: 10px;
            display: none;
        }
        #progressBar {
            width: 0%;
            height: 5px;
            background-color: #4CAF50;
            text-align: center;
            line-height: 5px;
            color: white;
        }
        .tools .right-align button {
            margin-left: 10px;
        }
        #nskalSettingsContainer {
            display: none;
            flex-direction: column;
            margin-top: 10px;
        }
        .nskal-toggle {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        .nskal-toggle input[type="checkbox"] {
            margin-right: 5px;
        }
        .nskal-toggle input[type="text"] {
            margin-left: 5px;
            width: 100px;
        }
    `);

    // Function to resize the image based on the specified percentage
    async function resizeImage(file, percentage) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const width = img.width * (percentage / 100);
                const height = img.height * (percentage / 100);

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const resizedFile = new File([blob], file.name, { type: file.type });
                    resolve(resizedFile);
                }, file.type);
            };

            img.onerror = (err) => {
                reject(err);
            };
        });
    }

    async function fetchNewlyUploadedFiles(count) {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://opu.peklo.biz/?page=userpanel',
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error('Failed to fetch gallery'));
                        }
                    },
                    onerror: (error) => {
                        reject(error);
                    }
                });
            });

            const parser = new DOMParser();
            const doc = parser.parseFromString(response, 'text/html');

            const galleryItems = doc.querySelectorAll('div.box a.swipebox');
            const links = [];

            for (let i = 0; i < count && i < galleryItems.length; i++) {
                const fullImageLink = galleryItems[i].href;
                const thumbnailImage = galleryItems[i].querySelector('img');
                const thumbnailLink = thumbnailImage ? thumbnailImage.src : '';

                links.push({ full: fullImageLink, thumb: thumbnailLink });
            }

            return links;
        } catch (error) {
            console.error('Error fetching gallery:', error);
            return [];
        }
    }

    function insertLinksIntoTextField(links, customTag, textField) {
        if (textField) {
            const imgTags = links.map(link => `<img src="${link.full}">${customTag}\n\n`).join('');
            textField.value += imgTags;
        } else {
            alert('Text field not found.');
        }
    }

    // Check if the user is logged in by accessing the gallery page
    async function checkLoginStatus() {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://opu.peklo.biz/?page=userpanel',
                    onload: (response) => {
                        if (response.finalUrl.includes('page=prihlaseni')) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    },
                    onerror: (error) => {
                        resolve(false);
                    }
                });
            });

            return response;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }

    // Function to generate the desired output format based on the selected toggles
    function generateOutputFormat(link, toggles) {
        let output = link.full;

        if (toggles.imgSrc) {
            output = `<img src="${link.full}"`;
            if (toggles.alt) {
                output += ` alt="${toggles.altText}"`;
            }
            if (toggles.width) {
                output += ` width="${toggles.widthValue}"`;
            }
            if (toggles.height) {
                output += ` height="${toggles.heightValue}"`;
            }
            output += '>';
        }

        if (toggles.aHref) {
            output = `<a href="${link.full}" target="${toggles.newTab ? '_blank' : '_self'}">${toggles.imgSrc ? output : link.full}</a>`;
        }

        if (toggles.url) {
            output = link.full;
        }

        if (toggles.aHrefImg) {
            const thumbLink = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)(\d+-\w+\.jpg)$/, '/p/$1thumbs/$2');
            output = `<a href="${link.full}" target="${toggles.newTab ? '_blank' : '_self'}"><img src="${thumbLink}"`;
            if (toggles.alt) {
                output += ` alt="${toggles.altText}"`;
            }
            if (toggles.width) {
                output += ` width="${toggles.widthValue}"`;
            }
            if (toggles.height) {
                output += ` height="${toggles.heightValue}"`;
            }
            output += '></a>';
        }

        return output;
    }
    
    // Function to add NSKAL button and inputs to a form
    async function addButtonToForm(toolsDiv) {
        if (toolsDiv) {
            console.log('Tools div found, adding NSKAL button.');

            // Create input fields for custom tag and resize percentage
            const customTagInput = document.createElement('input');
            customTagInput.id = 'customTagInput';
            customTagInput.className = 'nskal-input';
            customTagInput.type = 'text';
            customTagInput.placeholder = 'Custom Tag';
            customTagInput.value = GM_getValue('customTag', '<p>');

            const resizePercentageInput = document.createElement('input');
            resizePercentageInput.id = 'resizePercentageInput';
            resizePercentageInput.className = 'nskal-input';
            resizePercentageInput.type = 'number';
            resizePercentageInput.placeholder = 'Resize %';
            resizePercentageInput.value = GM_getValue('resizePercentage', 100);

            // Create progress bar elements
            const progressBarContainer = document.createElement('div');
            progressBarContainer.id = 'progressBarContainer';
            const progressBar = document.createElement('div');
            progressBar.id = 'progressBar';
            progressBarContainer.appendChild(progressBar);

            // Create and add the NSKAL button
            const button = document.createElement('button');
            button.id = 'opuNskalButton';
            button.textContent = 'NSKAL';
            button.type = 'button';

            // Create and add the settings toggle button
            const settingsButton = document.createElement('button');
            settingsButton.id = 'opuNskalSettingsButton';
            settingsButton.textContent = 'Settings';
            settingsButton.type = 'button';

            // Create and add the save button
            const saveButton = document.createElement('button');
            saveButton.id = 'opuNskalSaveButton';
            saveButton.textContent = 'Save';
            saveButton.type = 'button';

            // Create and add the reset button
            const resetButton = document.createElement('button');
            resetButton.id = 'opuNskalResetButton';
            resetButton.textContent = 'Reset';
            resetButton.type = 'button';

            // Create and add the Edit button
            const editButton = document.createElement('button');
            editButton.id = 'opuNskalEditButton';
            editButton.textContent = 'Edit';
            editButton.type = 'button';

            // Add event listener to the Edit button
            editButton.addEventListener('click', async (event) => {
                event.preventDefault();
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.multiple = true;
                fileInput.style.display = 'none';

                fileInput.addEventListener('change', async () => {
                    const files = fileInput.files;
                    if (!files.length) {
                        alert('Please select files to edit.');
                        return;
                    }

                    // Open a new tab with file previews, an Upload button, and a file list
                    const editWindow = window.open('', '_blank');
                    editWindow.document.write(`
                        <html>
                          <head>
                            <title>Edit Files</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; }
                              #fileList li { margin-bottom: 10px; }
                              #uploadCroppedButton { margin-bottom: 20px; padding: 8px; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <h1>Edit Files</h1>
                            <button id="uploadCroppedButton">Upload Cropped</button>
                            <ul id="fileList"></ul>
                          </body>
                        </html>
                    `);
                    editWindow.document.close();

                    // Add upload functionality in the edit window using an injected script
                    editWindow.eval(`(function(){
                        async function uploadCroppedImages() {
                            const listItems = document.querySelectorAll('#fileList li');
                            for (const li of listItems) {
                                if (li.croppedFile) {
                                    const file = li.croppedFile;
                                    const formData = new FormData();
                                    formData.append('obrazek[0]', file);
                                    formData.append('sizep', '0');
                                    formData.append('outputf', 'auto');
                                    formData.append('tl_odeslat', 'Odeslat');
                                    await new Promise((resolve, reject) => {
                                        // Use main window's GM_xmlhttpRequest so Tampermonkey privileges persist
                                        window.opener.GM_xmlhttpRequest({
                                            method: 'POST',
                                            url: 'https://opu.peklo.biz/opupload.php',
                                            data: formData,
                                            headers: { 'Accept': 'text/html,application/xhtml+xml' },
                                            onload: async function(response) {
                                                if (response.status === 200) {
                                                    // Get the new file link from the main window
                                                    const newLinks = await window.opener.fetchNewlyUploadedFiles(1);
                                                    if (newLinks.length) {
                                                        // Retrieve settings from the main window
                                                        const toggles = {
                                                            url: window.opener.GM_getValue('toggleUrl', false),
                                                            imgSrc: window.opener.GM_getValue('toggleImgSrc', false),
                                                            aHref: window.opener.GM_getValue('toggleAHref', false),
                                                            alt: window.opener.GM_getValue('toggleAlt', false),
                                                            width: window.opener.GM_getValue('toggleWidth', false),
                                                            height: window.opener.GM_getValue('toggleHeight', false),
                                                            aHrefImg: window.opener.GM_getValue('toggleAHrefImg', false),
                                                            altText: window.opener.GM_getValue('altText', ''),
                                                            widthValue: window.opener.GM_getValue('widthValue', ''),
                                                            heightValue: window.opener.GM_getValue('heightValue', ''),
                                                            newTab: window.opener.GM_getValue('toggleNewTab', false)
                                                        };
                                                        // Generate formatted output using main window function
                                                        const output = window.opener.generateOutputFormat(newLinks[0], toggles);
                                                        const textField = window.opener.document.querySelector('textarea[name="body"]');
                                                        if (textField) {
                                                            textField.value += output;
                                                        }
                                                        li.appendChild(document.createTextNode(' Upload successful for ' + file.name));
                                                    } else {
                                                        li.appendChild(document.createTextNode(' No link found for ' + file.name));
                                                    }
                                                    resolve();
                                                } else {
                                                    li.appendChild(document.createTextNode(' Upload failed for ' + file.name));
                                                    reject(new Error('Upload failed'));
                                                }
                                            },
                                            onerror: function(error) {
                                                li.appendChild(document.createTextNode(' Upload error for ' + file.name));
                                                reject(error);
                                            }
                                        });
                                    }).catch(err => console.error(err));
                                }
                            }
                        }
                        document.getElementById('uploadCroppedButton').addEventListener('click', function(){
                            uploadCroppedImages().catch(err => console.error(err));
                        });
                    })();`);

                    const fileList = editWindow.document.getElementById('fileList');
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const listItem = editWindow.document.createElement('li');
                        const img = editWindow.document.createElement('img');
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            img.src = e.target.result;
                            img.style.maxWidth = '100px';
                            img.style.maxHeight = '100px';

                            const image = new Image();
                            image.src = e.target.result;
                            image.onload = () => {
                                const dimensions = `${image.width} x ${image.height} pixels`;
                                const size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
                                const dimensionsText = editWindow.document.createElement('div');
                                dimensionsText.textContent = dimensions;
                                const sizeText = editWindow.document.createElement('div');
                                sizeText.textContent = size;
                                const cropButton = editWindow.document.createElement('button');
                                cropButton.textContent = 'Crop';
                                cropButton.addEventListener('click', () => openCropWindow(file, img.src, listItem));
                                listItem.appendChild(dimensionsText);
                                listItem.appendChild(sizeText);
                                listItem.appendChild(cropButton);
                            };
                        };
                        reader.readAsDataURL(file);
                        listItem.appendChild(img);
                        listItem.appendChild(editWindow.document.createTextNode(` ${file.name}`));
                        fileList.appendChild(listItem);
                    }
                });
                fileInput.click();
            });

            // Function to open the crop window in a new tab
            function openCropWindow(file, imgSrc, listItem) {
                const cropWindow = window.open('', '_blank');
                if (!cropWindow) {
                    alert('New tab failed to open. Please disable popup blockers.');
                    return;
                }
                cropWindow.document.open();
                cropWindow.document.write(`
                    <html>
                      <head>
                         <title>Crop Image</title>
                         <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            #cropImage { max-width: 100%; max-height: 80vh; }
                         </style>
                      </head>
                      <body>
                         <h1>Crop Image</h1>
                         <img id="cropImage" src="${imgSrc}">
                         <br><br>
                         <button id="cropConfirmButton">Confirm Crop</button>
                      </body>
                    </html>
                `);
                cropWindow.document.close();
                cropWindow.onload = () => {
                    const cropImage = cropWindow.document.getElementById('cropImage');
                    const cropConfirmButton = cropWindow.document.getElementById('cropConfirmButton');
                    let cropper;
                    const initCropper = () => {
                        if (!cropper) {
                            cropper = new cropWindow.Cropper(cropImage, {
                                aspectRatio: NaN,
                                viewMode: 1,
                                autoCropArea: 1,
                                movable: true,
                                zoomable: true,
                                rotatable: true,
                                scalable: true,
                            });
                        }
                    };
                    if (cropWindow.Cropper) {
                        if (cropImage.complete) {
                            initCropper();
                        } else {
                            cropImage.onload = initCropper;
                        }
                    } else {
                        const script = cropWindow.document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js';
                        script.onload = () => {
                            if (cropImage.complete) {
                                initCropper();
                            } else {
                                cropImage.onload = initCropper;
                            }
                        };
                        cropWindow.document.head.appendChild(script);
                        const link = cropWindow.document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css';
                        cropWindow.document.head.appendChild(link);
                    }
                    cropConfirmButton.addEventListener('click', () => {
                        if (!cropper) {
                            alert("Cropper not initialized.");
                            return;
                        }
                        const canvas = cropper.getCroppedCanvas();
                        if (!canvas) {
                            alert("Failed to get cropped canvas.");
                            return;
                        }
                        canvas.toBlob((blob) => {
                            const croppedFile = new File([blob], file.name, { type: file.type });
                            const croppedImg = new Image();
                            croppedImg.src = URL.createObjectURL(blob);
                            croppedImg.style.maxWidth = '100px';
                            croppedImg.style.maxHeight = '100px';
                            const dimensions = `${canvas.width} x ${canvas.height} pixels`;
                            const size = `${(blob.size / (1024 * 1024)).toFixed(2)} MB`;
                            const dimensionsText = cropWindow.document.createElement('div');
                            dimensionsText.textContent = dimensions;
                            const sizeText = cropWindow.document.createElement('div');
                            sizeText.textContent = size;
                            const croppedListItem = document.createElement('li');
                            croppedListItem.appendChild(croppedImg);
                            croppedListItem.appendChild(document.createTextNode(` ${file.name} (Cropped)`));
                            croppedListItem.appendChild(dimensionsText);
                            croppedListItem.appendChild(sizeText);
                            // Store cropped file for upload
                            listItem.croppedFile = croppedFile;
                            listItem.classList.add('cropped');
                            listItem.parentNode.insertBefore(croppedListItem, listItem.nextSibling);
                            cropWindow.close();
                        });
                    });
                };
            }

            // Create the settings container
            const settingsContainer = document.createElement('div');
            settingsContainer.id = 'nskalSettingsContainer';

            // Create the preview container
            const previewContainer = document.createElement('div');
            previewContainer.id = 'opuNskalPreviewContainer';
            previewContainer.innerHTML = '<div id="opuNskalPreview"></div>';

            // Create toggles and text fields for output format
            const toggles = {
                url: document.createElement('input'),
                imgSrc: document.createElement('input'),
                aHref: document.createElement('input'),
                alt: document.createElement('input'),
                width: document.createElement('input'),
                height: document.createElement('input'),
                aHrefImg: document.createElement('input'),
                altText: document.createElement('input'),
                widthValue: document.createElement('input'),
                heightValue: document.createElement('input'),
                newTab: document.createElement('input'),
                customTag: document.createElement('input')
            };

            toggles.url.type = 'checkbox';
            toggles.imgSrc.type = 'checkbox';
            toggles.aHref.type = 'checkbox';
            toggles.alt.type = 'checkbox';
            toggles.width.type = 'checkbox';
            toggles.height.type = 'checkbox';
            toggles.aHrefImg.type = 'checkbox';
            toggles.newTab.type = 'checkbox';

            toggles.altText.type = 'text';
            toggles.widthValue.type = 'text';
            toggles.heightValue.type = 'text';
            toggles.customTag.type = 'text';

            toggles.altText.placeholder = 'Alt text';
            toggles.widthValue.placeholder = 'Width';
            toggles.heightValue.placeholder = 'Height';
            toggles.customTag.placeholder = 'Custom Tag';
            toggles.customTag.value = GM_getValue('customTag', '<p>');

            settingsContainer.appendChild(previewContainer);
            settingsContainer.appendChild(createToggle('URL', toggles.url));
            settingsContainer.appendChild(createToggle('IMG SRC', toggles.imgSrc));
            settingsContainer.appendChild(createToggle('A HREF', toggles.aHref));
            settingsContainer.appendChild(createToggle('ALT', toggles.alt, toggles.altText));
            settingsContainer.appendChild(createToggle('WIDTH', toggles.width, toggles.widthValue));
            settingsContainer.appendChild(createToggle('HEIGHT', toggles.height, toggles.heightValue));
            settingsContainer.appendChild(createToggle('A HREF IMG', toggles.aHrefImg));
            settingsContainer.appendChild(createToggle('Open in new tab', toggles.newTab));
            settingsContainer.appendChild(createToggle('Resize %', resizePercentageInput));
            settingsContainer.appendChild(createToggle('TAG', toggles.customTag));
            settingsContainer.appendChild(saveButton);
            settingsContainer.appendChild(resetButton);

            // Load saved toggle states
            toggles.url.checked = GM_getValue('toggleUrl', false);
            toggles.imgSrc.checked = GM_getValue('toggleImgSrc', false);
            toggles.aHref.checked = GM_getValue('toggleAHref', false);
            toggles.alt.checked = GM_getValue('toggleAlt', false);
            toggles.width.checked = GM_getValue('toggleWidth', false);
            toggles.height.checked = GM_getValue('toggleHeight', false);
            toggles.aHrefImg.checked = GM_getValue('toggleAHrefImg', false);
            toggles.newTab.checked = GM_getValue('toggleNewTab', false);
            toggles.altText.value = GM_getValue('altText', '');
            toggles.widthValue.value = GM_getValue('widthValue', '');
            toggles.heightValue.value = GM_getValue('heightValue', '');

            // Toggle settings visibility
            settingsButton.addEventListener('click', () => {
                if (settingsContainer.style.display === 'none') {
                    settingsContainer.style.display = 'flex';
                } else {
                    settingsContainer.style.display = 'none';
                }
            });

            // Save settings
            saveButton.addEventListener('click', () => {
                GM_setValue('customTag', customTagInput.value);
                GM_setValue('resizePercentage', resizePercentageInput.value);
                GM_setValue('toggleUrl', toggles.url.checked);
                GM_setValue('toggleImgSrc', toggles.imgSrc.checked);
                GM_setValue('toggleAHref', toggles.aHref.checked);
                GM_setValue('toggleAlt', toggles.alt.checked);
                GM_setValue('toggleWidth', toggles.width.checked);
                GM_setValue('toggleHeight', toggles.height.checked);
                GM_setValue('toggleAHrefImg', toggles.aHrefImg.checked);
                GM_setValue('toggleNewTab', toggles.newTab.checked);
                GM_setValue('altText', toggles.altText.value);
                GM_setValue('widthValue', toggles.widthValue.value);
                GM_setValue('heightValue', toggles.heightValue.value);
                alert('Settings saved.');
            });

            // Reset settings
            resetButton.addEventListener('click', () => {
                toggles.url.checked = false;
                toggles.imgSrc.checked = true;
                toggles.aHref.checked = false;
                toggles.alt.checked = false;
                toggles.width.checked = false;
                toggles.height.checked = false;
                toggles.aHrefImg.checked = false;
                toggles.newTab.checked = false;
                toggles.altText.value = '';
                toggles.widthValue.value = '';
                toggles.heightValue.value = '';
                toggles.customTag.value = '<p>';
                resizePercentageInput.value = 100;
                updatePreview([]);
            });

            // Function to update the live preview
            function updatePreview(links) {
                const selectedToggles = {
                    url: toggles.url.checked,
                    imgSrc: toggles.imgSrc.checked,
                    aHref: toggles.aHref.checked,
                    alt: toggles.alt.checked,
                    width: toggles.width.checked,
                    height: toggles.height.checked,
                    aHrefImg: toggles.aHrefImg.checked,
                    altText: toggles.altText.value,
                    widthValue: toggles.widthValue.value,
                    heightValue: toggles.heightValue.value,
                    newTab: toggles.newTab.checked
                };
                const customTag = toggles.customTag.value || '<p>';
                const imgTags = links.map(link => generateOutputFormat(link, selectedToggles)).join(`\n\n${customTag}\n\n`);
                document.getElementById('opuNskalPreview').innerHTML = imgTags;
            }

            const isLoggedIn = await checkLoginStatus();
            if (!isLoggedIn) {
                button.style.backgroundColor = '#e74c3c';
                button.textContent = 'Please Log In';
                button.addEventListener('click', () => {
                    alert('Please log in to OPU to use this feature.');
                });
            } else {
                button.style.backgroundColor = '#4CAF50';
                button.textContent = 'NSKAL';
                button.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.multiple = true;
                    fileInput.style.display = 'none';

                    fileInput.addEventListener('change', async () => {
                        const files = fileInput.files;
                        if (!files.length) {
                            alert('Please select files to upload.');
                            return;
                        }

                        const uploadedFileCount = files.length;
                        progressBarContainer.style.display = 'block';
                        progressBar.style.width = '0%';

                        try {
                            const links = [];
                            const customTag = toggles.customTag.value || '<p>';
                            const resizePercentage = parseInt(resizePercentageInput.value) || 100;

                            for (let i = 0; i < files.length; i++) {
                                let fileToUpload = files[i];

                                if (resizePercentage !== 100) {
                                    fileToUpload = await resizeImage(fileToUpload, resizePercentage);
                                }

                                const formData = new FormData();
                                formData.append('obrazek[0]', fileToUpload);
                                formData.append('sizep', '0');
                                formData.append('outputf', 'auto');
                                formData.append('tl_odeslat', 'Odeslat');

                                await new Promise((resolve, reject) => {
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: 'https://opu.peklo.biz/opupload.php',
                                        data: formData,
                                        headers: {
                                            'Accept': 'text/html,application/xhtml+xml'
                                        },
                                        onload: (response) => {
                                            if (response.status === 200) {
                                                resolve();
                                            } else {
                                                reject(new Error(`Failed to upload ${fileToUpload.name}`));
                                            }
                                        },
                                        onerror: (error) => {
                                            reject(error);
                                        }
                                    });
                                });

                                const newLinks = await fetchNewlyUploadedFiles(1);
                                links.push(...newLinks);

                                const progress = ((i + 1) / files.length) * 100;
                                progressBar.style.width = `${progress}%`;
                            }

                            if (links.length > 0) {
                                const textField = toolsDiv.closest('form').querySelector('textarea[name="body"]');
                                const selectedToggles = {
                                    url: toggles.url.checked,
                                    imgSrc: toggles.imgSrc.checked,
                                    aHref: toggles.aHref.checked,
                                    alt: toggles.alt.checked,
                                    width: toggles.width.checked,
                                    height: toggles.height.checked,
                                    aHrefImg: toggles.aHrefImg.checked,
                                    altText: toggles.altText.value,
                                    widthValue: toggles.widthValue.value,
                                    heightValue: toggles.heightValue.value,
                                    newTab: toggles.newTab.checked
                                };
                                const imgTags = links.map(link => generateOutputFormat(link, selectedToggles)).join(`\n\n${customTag}\n\n`);
                                textField.value += imgTags;
                                updatePreview(links);
                            } else {
                                alert("No newly uploaded files found.");
                            }
                        } catch (error) {
                            console.error('Error during upload:', error);
                            alert('An error occurred during file upload.');
                        } finally {
                            progressBarContainer.style.display = 'none';
                        }
                    });

                    fileInput.click();
                });
            }

            toolsDiv.insertBefore(settingsButton, toolsDiv.firstChild);
            toolsDiv.insertBefore(button, toolsDiv.firstChild);
            toolsDiv.insertBefore(editButton, toolsDiv.firstChild);
            toolsDiv.parentNode.insertBefore(settingsContainer, toolsDiv.nextSibling);
            toolsDiv.parentNode.insertBefore(progressBarContainer, toolsDiv.nextSibling);
        } else {
            console.log('Tools div not found.');
        }
    }

    function createToggle(labelText, checkbox, textField) {
        const container = document.createElement('div');
        container.className = 'nskal-toggle';

        const label = document.createElement('label');
        label.textContent = labelText;

        container.appendChild(checkbox);
        container.appendChild(label);

        if (textField) {
            container.appendChild(textField);
        }

        return container;
    }

    async function addButtonToPage() {
        const toolsDiv = document.querySelector('div.tools');
        await addButtonToForm(toolsDiv);
    }

    async function addButtonToReplyForm(replyForm) {
        const toolsDiv = replyForm.querySelector('div.tools');
        setTimeout(async () => {
            await addButtonToForm(toolsDiv);
        }, 500);
    }

    function changeButtonText() {
        const observer = new MutationObserver(() => {
            const submitButton = document.querySelector('form#article-form-main button.submit[type="submit"]');
            if (submitButton) {
                console.log('Submit button found:', submitButton.textContent);
                if (submitButton.textContent === 'Odeslat příspěvek') {
                    submitButton.textContent = 'Odeslat';
                    console.log('Submit button text changed to:', submitButton.textContent);
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function waitForElements() {
        const textArea = document.querySelector('textarea[name="body"]');
        const submitButton = document.querySelector('form#article-form-main button.submit[type="submit"]');
        if (textArea && textArea.offsetParent !== null && submitButton) {
            console.log('Text area and submit button are visible, adding button and changing text.');
            addButtonToPage();
            changeButtonText();
        } else {
            console.log('Text area or submit button not visible yet, waiting...');
            setTimeout(waitForElements, 500);
        }
    }

    if (window.location.hostname === 'www.okoun.cz') {
        console.log('Running on okoun.cz, waiting for elements.');
        waitForElements();
    }

    if (window.location.pathname === '/postArticle.do') {
        console.log('Post submitted, reloading board page.');
        const boardId = new URLSearchParams(window.location.search).get('boardId');
        if (boardId) {
            window.location.href = `/boards/${boardId}`;
        }
    }

    GM_registerMenuCommand('Open OPU NSKAL', () => {
        document.getElementById('popup').style.display = 'block';
    });

    const replyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.post.content')) {
                        console.log('Reply form detected, adding NSKAL button.');
                        addButtonToReplyForm(node);
                    }
                });
            }
        });
    });

    replyObserver.observe(document.body, { childList: true, subtree: true });

    // Note: The previously used loadCropperJs block that reinserted editButton has been removed.
})();

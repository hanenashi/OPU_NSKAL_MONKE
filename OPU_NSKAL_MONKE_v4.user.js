// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      4
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
// @require      https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js
// @resource     CROPPER_CSS https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css
// ==/UserScript==

(function() {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. Configuration & Constants
    // ------------------------------------------------------------------------

    const CONFIG = {
        urls: {
            opu: {
                base: 'https://opu.peklo.biz',
                upload: 'https://opu.peklo.biz/opupload.php',
                gallery: 'https://opu.peklo.biz/?page=userpanel',
                login: 'https://opu.peklo.biz/?page=prihlaseni'
            }
        },
        defaults: {
            customTag: '<p>',
            resizePercentage: 100,
            toggleStates: {
                url: false,
                imgSrc: true,
                aHref: false,
                alt: false,
                width: false,
                height: false,
                aHrefImg: false,
                newTab: false,
                altText: '',
                widthValue: '',
                heightValue: ''
            }
        },
        selectors: {
            textArea: 'textarea[name="body"]',
            submitButton: 'form#article-form-main button.submit[type="submit"]',
            toolsDiv: 'div.tools'
        },
        cropperOptions: {
            aspectRatio: NaN,
            viewMode: 1,
            autoCropArea: 1,
            movable: true,
            zoomable: true,
            rotatable: true,
            scalable: true
        }
    };

    // ------------------------------------------------------------------------
    // 2. Core Utilities
    // ------------------------------------------------------------------------

    const Utils = {
        createButton: (id, text, className = 'nskal-button', type = 'button') => {
            const button = document.createElement('button');
            button.id = id;
            button.textContent = text;
            button.type = type;
            button.className = className;
            return button;
        },

        createInput: (type, placeholder, className = 'nskal-input', defaultValue = '') => {
            const input = document.createElement('input');
            input.type = type;
            input.placeholder = placeholder;
            input.className = className;
            input.value = defaultValue;
            return input;
        },

        createToggle: (labelText, checkbox, textField) => {
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
    };
        // ------------------------------------------------------------------------
    // 3. Storage Manager
    // ------------------------------------------------------------------------

    const Storage = {
        get: (key, defaultValue) => GM_getValue(key, defaultValue),
        set: (key, value) => GM_setValue(key, value),

        loadSettings: () => {
            const defaults = CONFIG.defaults.toggleStates;
            return {
                customTag: Storage.get('customTag', CONFIG.defaults.customTag),
                resizePercentage: parseInt(Storage.get('resizePercentage', CONFIG.defaults.resizePercentage), 10),
                toggles: {
                    url: Storage.get('toggleUrl', defaults.url),
                    imgSrc: Storage.get('toggleImgSrc', defaults.imgSrc),
                    aHref: Storage.get('toggleAHref', defaults.aHref),
                    alt: Storage.get('toggleAlt', defaults.alt),
                    width: Storage.get('toggleWidth', defaults.width),
                    height: Storage.get('toggleHeight', defaults.height),
                    aHrefImg: Storage.get('toggleAHrefImg', defaults.aHrefImg),
                    newTab: Storage.get('toggleNewTab', defaults.newTab),
                    altText: Storage.get('altText', defaults.altText),
                    widthValue: Storage.get('widthValue', defaults.widthValue),
                    heightValue: Storage.get('heightValue', defaults.heightValue)
                }
            };
        },

        saveSettings: (settings) => {
            Storage.set('customTag', settings.customTag);
            Storage.set('resizePercentage', settings.resizePercentage);
            Storage.set('toggleUrl', settings.toggles.url);
            Storage.set('toggleImgSrc', settings.toggles.imgSrc);
            Storage.set('toggleAHref', settings.toggles.aHref);
            Storage.set('toggleAlt', settings.toggles.alt);
            Storage.set('toggleWidth', settings.toggles.width);
            Storage.set('toggleHeight', settings.toggles.height);
            Storage.set('toggleAHrefImg', settings.toggles.aHrefImg);
            Storage.set('toggleNewTab', settings.toggles.newTab);
            Storage.set('altText', settings.altText);
            Storage.set('widthValue', settings.widthValue);
            Storage.set('heightValue', settings.heightValue);
        }
    };

    // ------------------------------------------------------------------------
    // 4. API Handler
    // ------------------------------------------------------------------------

    const API = {
        checkLoginStatus: async () => {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: CONFIG.urls.opu.gallery,
                        onload: (response) => resolve(response),
                        onerror: (error) => reject(error)
                    });
                });
                return !response.finalUrl.includes('page=prihlaseni');
            } catch (error) {
                console.error('Login check failed:', error);
                return false;
            }
        },

        uploadFile: async (file, progressCallback) => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('obrazek[0]', file);
                formData.append('sizep', '0');
                formData.append('outputf', 'auto');
                formData.append('tl_odeslat', 'Odeslat');

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: CONFIG.urls.opu.upload,
                    data: formData,
                    upload: {
                        onprogress: progressCallback
                    },
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response);
                        } else {
                            reject(new Error(`Upload failed with status: ${response.status}`));
                        }
                    },
                    onerror: (error) => {
                        reject(new Error(`Upload failed: ${error}`));
                    }
                });
            });
        },

        fetchGalleryLinks: async (count = 1) => {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: CONFIG.urls.opu.gallery,
                        onload: (response) => {
                            if (response.status === 200) {
                                resolve(response.responseText);
                            } else {
                                reject(new Error(`Failed to fetch gallery: ${response.status}`));
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
                    const item = galleryItems[i];
                    links.push({
                        full: item.href,
                        thumb: item.querySelector('img')?.src || ''
                    });
                }

                return links;
            } catch (error) {
                console.error('Gallery fetch failed:', error);
                return [];
            }
        }
    };
        // ------------------------------------------------------------------------
    // 5. Image Processor
    // ------------------------------------------------------------------------

    const ImageProcessor = {
        resize: async (file, percentage) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const width = img.width * (percentage / 100);
                    const height = img.height * (percentage / 100);

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            URL.revokeObjectURL(url);
                            resolve(new File([blob], file.name, { type: file.type }));
                        },
                        file.type
                    );
                };

                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Image load failed'));
                };

                img.src = url;
            });
        },

        crop: (file, imgSrc, cropData) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = cropData.width;
                    canvas.height = cropData.height;

                    ctx.drawImage(
                        img,
                        cropData.x, cropData.y, cropData.width, cropData.height,
                        0, 0, cropData.width, cropData.height
                    );

                    canvas.toBlob((blob) => {
                        const croppedFile = new File([blob], file.name, { type: file.type });
                        resolve(croppedFile);
                    }, file.type);
                };
                img.onerror = reject;
                img.src = imgSrc;
            });
        }
    };
    // ------------------------------------------------------------------------
    // 6. UI Components
    // ------------------------------------------------------------------------

    const UI = {
        createSettingsPanel: (settings, saveCallback) => {
            const settingsContainer = document.createElement('div');
            settingsContainer.id = 'nskalSettingsContainer';
            settingsContainer.style.display = 'none';

            const previewContainer = document.createElement('div');
            previewContainer.id = 'opuNskalPreviewContainer';
            previewContainer.innerHTML = '<div id="opuNskalPreview"></div>';
            settingsContainer.appendChild(previewContainer);

            const toggles = {};
            for (const key in CONFIG.defaults.toggleStates) {
                if (['altText', 'widthValue', 'heightValue'].includes(key)) {
                    toggles[key] = Utils.createInput('text', key, 'nskal-input', settings.toggles[key]);
                } else {
                    toggles[key] = document.createElement('input');
                    toggles[key].type = 'checkbox';
                    toggles[key].checked = settings.toggles[key];
                }
            }

            settingsContainer.appendChild(Utils.createToggle('URL', toggles.url));
            settingsContainer.appendChild(Utils.createToggle('IMG SRC', toggles.imgSrc));
            settingsContainer.appendChild(Utils.createToggle('A HREF', toggles.aHref));
            settingsContainer.appendChild(Utils.createToggle('ALT', toggles.alt, toggles.altText));
            settingsContainer.appendChild(Utils.createToggle('WIDTH', toggles.width, toggles.widthValue));
            settingsContainer.appendChild(Utils.createToggle('HEIGHT', toggles.height, toggles.heightValue));
            settingsContainer.appendChild(Utils.createToggle('A HREF IMG', toggles.aHrefImg));
            settingsContainer.appendChild(Utils.createToggle('Open in new tab', toggles.newTab));

            const customTagInput = Utils.createInput('text', 'Custom Tag', 'nskal-input', settings.customTag);
            const resizePercentageInput = Utils.createInput('number', 'Resize %', 'nskal-input', settings.resizePercentage);
            settingsContainer.appendChild(Utils.createToggle('Resize %', resizePercentageInput));
            settingsContainer.appendChild(Utils.createToggle('Custom Tag', customTagInput));

            const saveButton = Utils.createButton('opuNskalSaveButton', 'Save');
            saveButton.addEventListener('click', () => {
                const newSettings = {
                    customTag: customTagInput.value,
                    resizePercentage: parseInt(resizePercentageInput.value, 10),
                    toggles: {
                        url: toggles.url.checked,
                        imgSrc: toggles.imgSrc.checked,
                        aHref: toggles.aHref.checked,
                        alt: toggles.alt.checked,
                        width: toggles.width.checked,
                        height: toggles.height.checked,
                        aHrefImg: toggles.aHrefImg.checked,
                        newTab: toggles.newTab.checked,
                        altText: toggles.altText.value,
                        widthValue: toggles.widthValue.value,
                        heightValue: toggles.heightValue.value
                    }
                };
                saveCallback(newSettings);
                alert('Settings saved!');
            });
            settingsContainer.appendChild(saveButton);

            return settingsContainer;
        },

        createEditWindow: () => {
            const editWindow = window.open('', '_blank');
            editWindow.document.write(`
                <html>
                <head>
                    <title>Edit Files</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .edit-file-list { list-style: none; padding: 0; margin: 0; }
                        .edit-file-item { display: flex; align-items: center; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                        .edit-file-item img { margin-right: 10px; max-width: 100px; max-height: 100px; }
                        .edit-file-info { flex: 1; }
                        .edit-file-actions { display: flex; gap: 8px; }
                        .nskal-button {
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            cursor: pointer;
                            font-size: 14px;
                            margin-right: 10px;
                            border-radius: 4px;
                            transition: background-color 0.2s;
                        }
                        .upload-cropped-button { background-color: #4CAF50; }
                        .upload-cropped-button:hover { background-color: #45a049; }
                        .crop-button { background-color: #008CBA; }
                        .crop-button:hover { background-color: #0077B3; }
                    </style>
                </head>
                <body>
                    <h1>Edit Files</h1>
                    <button id="uploadCroppedButton" class="nskal-button upload-cropped-button">Upload Cropped</button>
                    <ul id="fileList" class="edit-file-list"></ul>
                    <script>
                        document.getElementById('uploadCroppedButton').addEventListener('click', () => {
                            window.uploadCroppedImages();
                        });
                    </script>
                </body>
                </html>
            `);
            editWindow.document.close();
            return editWindow;
        },

        addFileToList: (editWindow, file, index) => { // Added index parameter
            const fileList = editWindow.document.getElementById('fileList');
            const editFileItem = document.createElement('li');
            editFileItem.className = 'edit-file-item';
            editFileItem.dataset.index = index; // Add a data attribute to store the index

            const img = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
            };
            reader.readAsDataURL(file);

            const fileInfo = document.createElement('div');
            fileInfo.className = 'edit-file-info';
            fileInfo.innerHTML = `<strong>${file.name}</strong><br>
                                  ${file.type}<br>
                                  ${(file.size / 1024).toFixed(2)} KB`;

            const actions = document.createElement('div');
            actions.className = 'edit-file-actions';

            const cropButton = Utils.createButton('cropButton', 'Crop', 'nskal-button crop-button');
            cropButton.addEventListener('click', () => {
                UI.openCropWindow(file, img.src, editFileItem, index); // Pass the index to openCropWindow
            });
            actions.appendChild(cropButton);

            editFileItem.appendChild(img);
            editFileItem.appendChild(fileInfo);
            editFileItem.appendChild(actions);
            fileList.appendChild(editFileItem);
        },

        openCropWindow: (file, imgSrc, editFileItem, index) => { // Added index parameter
            const cropWindow = window.open('', '_blank');
            cropWindow.document.write(`
                <html>
                <head>
                    <title>Crop Image</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        #cropImage { max-width: 100%; max-height: 80vh; }
                    </style>
                </head>
                <body>
                    <h1>Crop Image</h1>
                    <img id="cropImage" src="${imgSrc}">
                    <br><br>
                    <button id="cropConfirmButton" class="nskal-button">Confirm Crop</button>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
                    <script>
                        const cropImage = document.getElementById('cropImage');
                        const cropConfirmButton = document.getElementById('cropConfirmButton');
                        let cropper;

                        cropImage.onload = () => {
                            console.log('cropImage.onload called'); // Debugging
                            cropper = new Cropper(cropImage, {
                                aspectRatio: NaN,
                                viewMode: 1,
                                autoCropArea: 1,
                                movable: true,
                                zoomable: true,
                                rotatable: true,
                                scalable: true
                            });

                            cropConfirmButton.addEventListener('click', () => {
                                console.log('cropConfirmButton.addEventListener click called'); // Debugging
                                const canvas = cropper.getCroppedCanvas();
                                console.log('canvas:', canvas); // Debugging
                                canvas.toBlob((blob) => {
                                    console.log('canvas.toBlob called'); // Debugging
                                    const croppedFile = new File([blob], '${file.name}', { type: '${file.type}' });
                                    console.log('croppedFile:', croppedFile); // Debugging
                                    window.opener.postMessage({
                                        type: 'croppedFile',
                                        file: croppedFile,
                                        index: ${index} // Send the index
                                    }, '*');
                                    window.close();
                                }, '${file.type}');
                            });
                        };

                        cropImage.src = "${imgSrc}"; // Set the src after defining onload
                    </script>
                </body>
                </html>
            `);
            cropWindow.document.close();
        },

        updatePreview: (links, settings) => {
            const previewContainer = document.getElementById('opuNskalPreview');
            if (!previewContainer) return;

            const customTag = settings.customTag || '<p>';
            const imgTags = links.map(link => UI.generateOutputFormat(link, settings.toggles)).join(`\n\n${customTag}\n\n`);
            previewContainer.innerHTML = imgTags;
        },

        generateOutputFormat: (link, toggles) => {
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
    };
        // ------------------------------------------------------------------------
    // 7. Event Handlers
    // ------------------------------------------------------------------------

    const EventHandlers = {
        setupGlobalEvents: (settings, uploadFiles, openEditWindow) => {
            window.addEventListener('message', (event) => {
                if (event.data.type === 'croppedFile') {
                    const { file, index } = event.data;
                    // Access the edit window's document
                    const editWindow = document.querySelector('iframe[srcdoc*="Edit Files"]').contentWindow;
                    if (editWindow) {
                        const fileList = editWindow.document.querySelectorAll('.edit-file-item');
                        const editFileItem = fileList[index]; // Retrieve the editFileItem using the index
                        if (editFileItem) {
                            editFileItem.croppedFile = file;
                            editFileItem.classList.add('cropped');
                        }
                    }
                }
            });

            window.uploadCroppedImages = async () => {
                const fileList = document.querySelectorAll('.edit-file-item');
                for (const item of fileList) {
                    if (item.croppedFile) {
                        await uploadFiles([item.croppedFile]);
                    }
                }
            };

            window.openEditWindow = openEditWindow;
        },

        setupOkounEvents: (settings, insertNskalButtons, uploadFiles, openEditWindow) => {
            const observer = new MutationObserver(() => {
                const toolsDiv = document.querySelector(CONFIG.selectors.toolsDiv);
                if (toolsDiv) {
                    observer.disconnect();
                    insertNskalButtons(toolsDiv);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            EventHandlers.setupGlobalEvents(settings, uploadFiles, openEditWindow);
        }
    };
        // ------------------------------------------------------------------------
    // 8. Main Application Logic
    // ------------------------------------------------------------------------

    const STYLES = `
        /* Base button styles */
        .nskal-button {
            color: white;
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        #opuNskalButton { background-color: #4CAF50; }
        #opuNskalButton:hover { background-color: #45a049; }
        #opuNskalSettingsButton { background-color: #2196F3; }
        #opuNskalSettingsButton:hover { background-color: #1976D2; }
        #opuNskalEditButton { background-color: #FF9800; }
        #opuNskalEditButton:hover { background-color: #F57C00; }

        /* Settings panel */
        #nskalSettingsContainer {
            display: none;
            flex-direction: column;
            margin-top: 10px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #fff;
        }

        .nskal-toggle {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding: 4px;
        }

        .nskal-input {
            margin: 0 8px;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 14px;
        }

        /* Progress bar */
        #progressBarContainer {
            width: 100%;
            height: 4px;
            background-color: #f5f5f5;
            margin-top: 10px;
            display: none;
            border-radius: 2px;
            overflow: hidden;
        }

        #progressBar {
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease;
        }

        /* Preview container */
        #opuNskalPreviewContainer {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }

        /* Edit window styles */
        .edit-file-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .edit-file-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .edit-file-item img {
            margin-right: 10px;
            max-width: 100px;
            max-height: 100px;
        }

        .edit-file-info {
            flex: 1;
        }

        .edit-file-actions {
            display: flex;
            gap: 8px;
        }
    `;

    GM_addStyle(STYLES);

    const insertNskalButtons = (toolsDiv) => {
        const uploadButton = Utils.createButton('opuNskalButton', 'NSKAL');
        const settingsButton = Utils.createButton('opuNskalSettingsButton', 'Settings');
        const editButton = Utils.createButton('opuNskalEditButton', 'Edit');

        toolsDiv.prepend(editButton, settingsButton, uploadButton);

        const settingsPanel = UI.createSettingsPanel(settings, (newSettings) => {
            Storage.saveSettings(newSettings);
            settings = newSettings;
            UI.updatePreview(galleryLinks, settings);
        });
        toolsDiv.parentNode.insertBefore(settingsPanel, toolsDiv.nextSibling);

        const progressBarContainer = document.createElement('div');
        progressBarContainer.id = 'progressBarContainer';
        const progressBar = document.createElement('div');
        progressBar.id = 'progressBar';
        progressBarContainer.appendChild(progressBar);
        toolsDiv.parentNode.insertBefore(progressBarContainer, toolsDiv.nextSibling);

        settingsButton.addEventListener('click', () => {
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'flex' : 'none';
        });

        uploadButton.addEventListener('click', async () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.style.display = 'none';

            fileInput.addEventListener('change', async () => {
                const files = Array.from(fileInput.files);
                await uploadFiles(files);
            });

            fileInput.click();
        });

        editButton.addEventListener('click', () => {
            openEditWindow();
        });
    };

    const uploadFiles = async (files) => {
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';

        const textArea = document.querySelector(CONFIG.selectors.textArea);
        if (!textArea) {
            alert('Text area not found!');
            return;
        }

        let uploadedLinks = [];

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (settings.resizePercentage !== 100) {
                file = await ImageProcessor.resize(file, settings.resizePercentage);
            }

            try {
                const response = await API.uploadFile(file, (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        progressBar.style.width = `${progress}%`;
                    }
                });

                const newLinks = await API.fetchGalleryLinks(1);
                uploadedLinks = uploadedLinks.concat(newLinks);
                galleryLinks = galleryLinks.concat(newLinks);

                const progress = ((i + 1) / files.length) * 100;
                progressBar.style.width = `${progress}%`;
            } catch (error) {
                console.error('Upload failed:', error);
                alert(`Upload failed for ${file.name}: ${error.message}`);
            }
        }

        progressBarContainer.style.display = 'none';

        if (uploadedLinks.length > 0) {
            const customTag = settings.customTag || '<p>';
            const imgTags = uploadedLinks.map(link => UI.generateOutputFormat(link, settings.toggles)).join(`\n\n${customTag}\n\n`);
            textArea.value += imgTags;
            UI.updatePreview(galleryLinks, settings);
        }
    };

    const openEditWindow = () => {
        // Create file input in the main window
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files);
            if (files.length > 0) {
                // Open the edit window and pass the files
                const editWindow = UI.createEditWindow();

                // Add files to the edit window
                files.forEach((file, index) => {
                    UI.addFileToList(editWindow, file, index);
                });

                editWindow.uploadCroppedImages = async () => {
                    const fileList = editWindow.document.querySelectorAll('.edit-file-item');
                    for (const item of fileList) {
                        if (item.croppedFile) {
                            await uploadFiles([item.croppedFile]);
                        }
                    }
                };
            }
        });

        // Trigger the file input
        fileInput.click();
    };

    let settings = Storage.loadSettings();
    let galleryLinks = [];

    const initialize = async () => {
        const isLoggedIn = await API.checkLoginStatus();
        if (!isLoggedIn) {
            alert('Please log in to OPU to use this feature.');
            return;
        }

        const toolsDiv = document.querySelector(CONFIG.selectors.toolsDiv);
        if (toolsDiv) {
            insertNskalButtons(toolsDiv);
        }
    };

    if (window.location.hostname === 'www.okoun.cz') {
        const observer = new MutationObserver(() => {
            const toolsDiv = document.querySelector(CONFIG.selectors.toolsDiv);
            if (toolsDiv) {
                observer.disconnect();
                initialize();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    GM_registerMenuCommand('Open OPU NSKAL', () => {
        const settingsPanel = document.getElementById('nskalSettingsContainer');
        if (settingsPanel) {
            settingsPanel.style.display = 'flex';
        }
    });
})();
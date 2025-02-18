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
            customTemplate: '[url]',  // Simplified default template
            toggleStates: {
                url: false,
                imgSrc: true,
                aHref: false,
                aHrefImg: false,  // Add new toggle state
                customCode: false  // Add new toggle state
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
        createButton: (id, text, className = 'nskal-button yui-button', type = 'button') => {
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

        createToggle: (labelText, isActive = false, onClick = null) => {
            const button = document.createElement('button');
            button.textContent = labelText;
            button.className = `nskal-toggle-button${isActive ? ' active' : ''}`;
            button.type = 'button'; // Prevent form submission
            if (onClick) {
                button.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent any default button behavior
                    e.stopPropagation(); // Stop event bubbling
                    onClick(e);
                });
            }
            return button;
        }
    };
        // ------------------------------------------------------------------------
    // 3. Storage Manager
    // ------------------------------------------------------------------------

    const Storage = {
        get: (key, defaultValue) => GM_getValue(key, defaultValue),
        set: (key, value) => GM_setValue(key, value),

        loadSettings: () => {
            return {
                customTag: Storage.get('customTag', CONFIG.defaults.customTag),
                resizePercentage: parseInt(Storage.get('resizePercentage', CONFIG.defaults.resizePercentage), 10),
                customTemplate: Storage.get('customTemplate', CONFIG.defaults.customTemplate),  // Add template storage
                toggles: {
                    url: Storage.get('toggleUrl', false),
                    imgSrc: Storage.get('toggleImgSrc', true),
                    aHref: Storage.get('toggleAHref', false),
                    aHrefImg: Storage.get('toggleAHrefImg', false),  // Add new toggle
                    customCode: Storage.get('toggleCustomCode', false)  // Add new toggle
                }
            };
        },

        saveSettings: (settings) => {
            Storage.set('customTag', settings.customTag);
            Storage.set('resizePercentage', settings.resizePercentage);
            Storage.set('customTemplate', settings.customTemplate);  // Add template storage
            Storage.set('toggleUrl', settings.toggles.url);
            Storage.set('toggleImgSrc', settings.toggles.imgSrc);
            Storage.set('toggleAHref', settings.toggles.aHref);
            Storage.set('toggleAHrefImg', settings.toggles.aHrefImg);  // Add new toggle
            Storage.set('toggleCustomCode', settings.toggles.customCode);  // Add new toggle
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

        // Create toggle buttons row
        const toggleRow = document.createElement('div');
        toggleRow.className = 'settings-row';

        const toggles = {};
        let activeButton = null;

        const createToggleButton = (key, label) => {
            const button = Utils.createToggle(label, settings.toggles[key], (e) => {
                e.preventDefault();
                
                // If clicking already active button, do nothing
                if (button === activeButton) return;

                // Deactivate previous button
                if (activeButton) {
                    activeButton.classList.remove('active');
                    toggles[activeButton.dataset.key] = false;
                }

                // Activate new button
                button.classList.add('active');
                toggles[key] = true;
                activeButton = button;
            });
            
            // Store key reference on button element
            button.dataset.key = key;
            
            // Set initial active state
            if (settings.toggles[key]) {
                activeButton = button;
                button.classList.add('active');
            }
            
            toggles[key] = settings.toggles[key];
            return button;
        };

        toggleRow.appendChild(createToggleButton('url', 'URL'));
        toggleRow.appendChild(createToggleButton('imgSrc', 'IMG SRC'));
        toggleRow.appendChild(createToggleButton('aHref', 'A HREF'));
        toggleRow.appendChild(createToggleButton('aHrefImg', 'A HREF IMG'));  // Add new toggle button
        
        // Create custom code group (button + input field)
        const customGroup = document.createElement('div');
        customGroup.className = 'custom-code-group';
        
        // Add custom toggle button
        customGroup.appendChild(createToggleButton('customCode', 'Custom'));
        
        // Add template input directly after custom button
        const templateInput = Utils.createInput('text', '[url]', 'nskal-input custom-template', settings.customTemplate);
        templateInput.value = settings.customTemplate;
        customGroup.appendChild(templateInput);
        
        toggleRow.appendChild(customGroup);
        settingsContainer.appendChild(toggleRow);

        // Create inputs row
        const inputRow = document.createElement('div');
        inputRow.className = 'input-row';

        const resizeGroup = document.createElement('div');
        resizeGroup.className = 'input-group';
        const resizeLabel = document.createElement('label');
        resizeLabel.textContent = 'Size %:';
        const resizeInput = Utils.createInput('number', 'Resize %', 'nskal-input', settings.resizePercentage);
        resizeInput.min = "1";
        resizeInput.max = "100";
        resizeGroup.appendChild(resizeLabel);
        resizeGroup.appendChild(resizeInput);

        const tagGroup = document.createElement('div');
        tagGroup.className = 'input-group';
        const tagLabel = document.createElement('label');
        tagLabel.textContent = '> ? <:';
        const tagInput = Utils.createInput('text', 'Custom Tag', 'nskal-input', settings.customTag);
        tagGroup.appendChild(tagLabel);
        tagGroup.appendChild(tagInput);

        inputRow.appendChild(resizeGroup);
        inputRow.appendChild(tagGroup);
        settingsContainer.appendChild(inputRow);

        // Save button
        const saveButton = Utils.createButton('opuNskalSaveButton', 'Save');
        saveButton.addEventListener('click', () => {
            const newSettings = {
                customTag: tagInput.value,
                resizePercentage: parseInt(resizeInput.value, 10),
                customTemplate: templateInput.value,  // Save template
                toggles: toggles
            };
            saveCallback(newSettings);
            alert('Settings saved!');
        });
        settingsContainer.appendChild(saveButton);

        return settingsContainer;
    },

    updatePreview: (links, settings) => {
        const previewContainer = document.getElementById('opuNskalPreview');
        if (!previewContainer) return;

        const customTag = settings.customTag || '<p>';
        const imgTags = links.map(link => UI.generateOutputFormat(link, settings.toggles, settings.customTemplate)).join(`\n\n${customTag}\n\n`);
        previewContainer.innerHTML = imgTags;
    },

    generateOutputFormat: (link, toggles, customTemplate) => {
        // Handle custom code template first
        if (toggles.customCode) {
            return customTemplate.replace(/\[url\]/g, link.full);
        }

        // Handle A HREF IMG output first (highest priority)
        if (toggles.aHrefImg) {
            const thumbUrl = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)([^/]+)$/, '/p/$1thumbs/$2');
            return `<a href="${link.full}"><img src="${thumbUrl}"></a>`;
        }

        // Handle other formats
        if (toggles.url) {
            return link.full;
        }

        let output = toggles.imgSrc ? `<img src="${link.full}">` : link.full;

        if (toggles.aHref) {
            output = `<a href="${link.full}">${output}</a>`;
        }

        return output;
    }
};
    // ------------------------------------------------------------------------
    // 7. Main Application Logic
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
            background-color:rgb(255, 213, 169);
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

        /* Toggle buttons */
        .nskal-toggle-button {
            color: white;
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            border-radius: 4px;
            background-color: #FF9800;
            transition: background-color 0.2s;
        }

        .nskal-toggle-button:hover {
            opacity: 0.9;
        }

        .nskal-toggle-button.active {
            background-color: #4CAF50;
        }

        .settings-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }

        .input-row {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .input-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Override button styles to match okoun.cz */
        .nskal-button,
        .nskal-toggle-button {
            display: block;
            border: none;
            margin: 0;
            padding: 0 10px;
            font-size: 93%;
            line-height: 2;
            min-height: 2em;
            color: #000;
            font-weight: bold;
            background-color: transparent;
            cursor: pointer;
            position: relative;
            text-align: center;
            overflow: visible;
        }

        /* Keep our color states but adjust to okoun style */
        #opuNskalButton,
        #opuNskalSettingsButton,
        #opuNskalEditButton,
        #opuNskalSaveButton,
        .nskal-toggle-button {
            border: 2px solid #ccc;
            border-radius: 3px;
            background: linear-gradient(to bottom, #fff 0%, #eee 100%);
        }

        /* Active states */
        .nskal-toggle-button.active {
            background: linear-gradient(to bottom, #4CAF50 0%, #45a049 100%);
            border-color: #45a049;
            color: white;
        }

        /* Hover states */
        #opuNskalButton:hover,
        #opuNskalSettingsButton:hover,
        #opuNskalEditButton:hover,
        #opuNskalSaveButton:hover,
        .nskal-toggle-button:hover {
            border-color: #999;
        }

        /* Remove old button styles */
        .nskal-button { background-color: transparent !important; }
        #opuNskalButton:hover { background-color: transparent !important; }
        #opuNskalSettingsButton:hover { background-color: transparent !important; }
        #opuNskalEditButton:hover { background-color: transparent !important; }

        /* Tools div layout */
        .tools {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            justify-content: space-between;  /* Changed from flex-end */
            gap: 10px;
            position: relative;
        }

        .nskal-button-group {
            display: flex;
            gap: 5px;
            margin-right: auto;  /* Changed from margin-left */
            order: -1;  /* Places our buttons before other elements */
        }

        /* Responsive button text */
        @media (max-width: 768px) {
            .nskal-button {
                min-width: auto;
                white-space: nowrap;
                padding: 0 5px;
            }
            .nskal-button-group {
                width: auto;  /* Changed from 100% */
                justify-content: flex-start;  /* Changed from flex-end */
                margin-bottom: 10px;
            }
        }

        /* Add style for wide input */
        .template-group {
            display: none;
        }
        
        .nskal-input.wide {
            width: 100%;
            max-width: 500px;
        }

        /* Custom code group styling */
        .custom-code-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nskal-input.custom-template {
            width: 200px;
            margin: 0;
            height: 2em;
        }
    `;

    GM_addStyle(STYLES);

    const insertNskalButtons = (toolsDiv) => {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'nskal-button-group';

        // Create buttons in desired order: NSKAL Edit Settings
        const uploadButton = Utils.createButton('opuNskalButton', 'NSKAL');
        const editButton = Utils.createButton('opuNskalEditButton', 'EDIT');
        const settingsButton = Utils.createButton('opuNskalSettingsButton', 'Settings');

        // Add buttons in the new order
        buttonGroup.appendChild(uploadButton);
        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(settingsButton);

        // Insert at the beginning of tools div
        toolsDiv.insertBefore(buttonGroup, toolsDiv.firstChild);

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
            const customTag = settings.customTag?.trim() || '<p>';
            const separator = `\n\n${customTag}\n\n`;
            const imgTags = uploadedLinks
                .map(link => UI.generateOutputFormat(link, settings.toggles, settings.customTemplate))
                .join(separator);
            
            if (textArea.value) {
                textArea.value += separator;
            }
            textArea.value += imgTags;
            UI.updatePreview(galleryLinks, settings);
        }
    };

    const openEditWindow = () => {
        // Use Utils.createInput instead of createFileInput
        const fileInput = Utils.createInput('file', '', 'nskal-input');
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        
        fileInput.onchange = event => {
            const files = Array.from(event.target.files);
            if (files.length) {
                const imgWindow = window.open('', '_blank');
                if (imgWindow) {
                    // Rest of the code remains the same
                    imgWindow.document.write(`
                        <html>
                        <head>
                            <title>Image List</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 20px; }
                                table { width: 100%; border-collapse: collapse; }
                                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
                                th { background-color: #f4f4f4; }
                                img { max-width: 100px; max-height: 100px; }
                                button { margin-top: 10px; }
                                .crop-button { 
                                    background-color: #4CAF50; 
                                    color: white;
                                    border: none;
                                    padding: 5px 10px;
                                    cursor: pointer;
                                    border-radius: 3px;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>Selected Images</h1>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Name</th>
                                        <th>Dimensions</th>
                                        <th>Size (MB)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="imageTableBody"></tbody>
                            </table>
                        </body>
                    </html>
                    `);
                    imgWindow.document.close();
                    
                    const tableBody = imgWindow.document.getElementById('imageTableBody');

                    // Handle cropped images - same as in pokus.user.js
                    window.addEventListener('message', event => {
                        if (event.data.type === 'croppedImage') {
                            const originalRow = Array.from(tableBody.querySelectorAll('tr'))
                                .find(row => row.querySelector('td:nth-child(2)').textContent === event.data.originalName);
                            
                            const croppedRow = imgWindow.document.createElement('tr');
                            croppedRow.innerHTML = `
                                <td><img src="${event.data.imgSrc}"></td>
                                <td>${event.data.name}</td>
                                <td>${event.data.width} x ${event.data.height}</td>
                                <td>${(event.data.size / (1024 * 1024)).toFixed(2)}</td>
                                <td></td>
                            `;
                            
                            originalRow?.insertAdjacentElement('afterend', croppedRow);
                        }
                    });

                    // Process selected files
                    files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const img = new Image();
                            img.onload = () => handleImageLoad(imgWindow, tableBody, file, e.target.result, img);
                            img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }
        };
        
        fileInput.click();
    };

    // Add the handleImageLoad function if not already defined
    const handleImageLoad = (imgWindow, tableBody, file, imgSrc, img) => {
        const row = imgWindow.document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imgSrc}"></td>
            <td>${file.name}</td>
            <td>${img.width} x ${img.height}</td>
            <td>${(file.size / (1024 * 1024)).toFixed(2)}</td>
            <td><button class="crop-button">Crop</button></td>
        `;
        
        row.querySelector('.crop-button').onclick = () => {
            const cropWindow = window.open('', '_blank');
            if (cropWindow) {
                cropWindow.document.write(createCropWindow(imgSrc, file));
                cropWindow.document.close();
            }
        };
        
        tableBody.appendChild(row);
    };

    // Add this function before handleImageLoad
const createCropWindow = (imgSrc, file) => {
    return `
        <html>
        <head>
            <title>Crop Image</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                #cropImage { max-width: 100%; max-height: 80vh; }
                .crop-button {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    cursor: pointer;
                    border-radius: 4px;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Crop Image</h1>
            <img id="cropImage" src="${imgSrc}">
            <br><br>
            <button id="cropConfirmButton" class="crop-button">Confirm Crop</button>

            <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
            <script>
                const image = document.getElementById('cropImage');
                const cropper = new Cropper(image, {
                    aspectRatio: NaN,
                    viewMode: 1,
                    autoCropArea: 1,
                    movable: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true
                });

                document.getElementById('cropConfirmButton').addEventListener('click', () => {
                    const canvas = cropper.getCroppedCanvas();
                    canvas.toBlob((blob) => {
                        const croppedFile = new File([blob], 'cropped_${file.name}', { type: '${file.type}' });
                        window.opener.postMessage({
                            type: 'croppedImage',
                            imgSrc: URL.createObjectURL(blob),
                            name: croppedFile.name,
                            width: canvas.width,
                            height: canvas.height,
                            size: blob.size,
                            originalName: '${file.name}'
                        }, '*');
                        setTimeout(() => window.close(), 500);
                    }, '${file.type}');
                });
            </script>
        </body>
        </html>
    `;
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
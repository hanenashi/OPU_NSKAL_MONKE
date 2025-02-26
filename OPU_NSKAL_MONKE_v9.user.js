// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      9
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
// @author       Blasnik
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
            customTemplate: '[url]',
            toggleStates: {
                url: false,
                imgSrc: true,
                aHref: false,
                aHrefImg: false,
                customCode: false
            }
        },
        selectors: {
            textArea: 'textarea[name="body"]',
            toolsDiv: 'div.tools',
            mainPostForm: 'div.content.post',
            replyForm: 'div.actions.replyForm'
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

        createToggle: (labelText, isActive = false, onClick = null) => {
            const button = document.createElement('button');
            button.textContent = labelText;
            button.className = `nskal-toggle-button${isActive ? ' active' : ''}`;
            button.type = 'button';
            if (onClick) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                customTemplate: Storage.get('customTemplate', CONFIG.defaults.customTemplate),
                toggles: {
                    url: Storage.get('toggleUrl', false),
                    imgSrc: Storage.get('toggleImgSrc', true),
                    aHref: Storage.get('toggleAHref', false),
                    aHrefImg: Storage.get('toggleAHrefImg', false),
                    customCode: Storage.get('toggleCustomCode', false)
                }
            };
        },

        saveSettings: (settings) => {
            Storage.set('customTag', settings.customTag);
            Storage.set('resizePercentage', settings.resizePercentage);
            Storage.set('customTemplate', settings.customTemplate);
            Storage.set('toggleUrl', settings.toggles.url);
            Storage.set('toggleImgSrc', settings.toggles.imgSrc);
            Storage.set('toggleAHref', settings.toggles.aHref);
            Storage.set('toggleAHrefImg', settings.toggles.aHrefImg);
            Storage.set('toggleCustomCode', settings.toggles.customCode);
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
        createSettingsPanel: (settings, saveCallback, textAreaElement) => {
            const settingsContainer = document.createElement('div');
            settingsContainer.id = 'nskalSettingsContainer_' + Date.now();
            settingsContainer.style.display = 'none';

            const previewContainer = document.createElement('div');
            previewContainer.id = 'opuNskalPreviewContainer_' + Date.now();
            const previewElement = document.createElement('div');
            previewElement.id = 'opuNskalPreview_' + Date.now();
            previewContainer.appendChild(previewElement);
            settingsContainer.appendChild(previewContainer);

            const toggleRow = document.createElement('div');
            toggleRow.className = 'settings-row';

            const toggles = { ...settings.toggles };
            let activeButton = null;

            const createToggleButton = (key, label) => {
                const button = Utils.createToggle(label, toggles[key], (e) => {
                    e.preventDefault();
                    if (button === activeButton) return;
                    if (activeButton) {
                        activeButton.classList.remove('active');
                        toggles[activeButton.dataset.key] = false;
                    }
                    button.classList.add('active');
                    toggles[key] = true;
                    activeButton = button;
                });
                button.dataset.key = key;
                if (toggles[key]) {
                    activeButton = button;
                    button.classList.add('active');
                }
                return button;
            };

            toggleRow.appendChild(createToggleButton('url', 'URL'));
            toggleRow.appendChild(createToggleButton('imgSrc', 'IMG'));
            toggleRow.appendChild(createToggleButton('aHref', 'AHR'));
            toggleRow.appendChild(createToggleButton('aHrefImg', 'AHRI'));

            const customGroup = document.createElement('div');
            customGroup.className = 'custom-code-group';
            customGroup.appendChild(createToggleButton('customCode', 'Custom'));
            const templateInput = Utils.createInput('text', '[url]', 'nskal-input custom-template', settings.customTemplate);
            templateInput.value = settings.customTemplate;
            customGroup.appendChild(templateInput);
            toggleRow.appendChild(customGroup);
            settingsContainer.appendChild(toggleRow);

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

            const supdateButton = Utils.createButton('opuNskalSupdateButton_' + Date.now(), 'Supdate');
            supdateButton.addEventListener('click', () => {
                settings.customTag = tagInput.value?.trim() || '<p>';
                settings.resizePercentage = parseInt(resizeInput.value, 10) || 100;
                settings.customTemplate = templateInput.value;
                Object.assign(settings.toggles, toggles);

                if (textAreaElement && galleryLinks.length > 0) {
                    const separator = `\n\n${settings.customTag}\n\n`;
                    const imgTags = galleryLinks
                        .map(link => UI.generateOutputFormat(link, settings.toggles, settings.customTemplate))
                        .join(separator);

                    textAreaElement.value = imgTags;
                    console.log('Supdate button - Setting textarea to:', imgTags);
                    UI.updatePreview(galleryLinks, settings, previewElement);
                } else {
                    console.log('No textarea or gallery links, saving settings only');
                    UI.updatePreview(galleryLinks, settings, previewElement);
                }

                saveCallback(settings);

                const originalText = supdateButton.textContent;
                supdateButton.textContent = 'Supdated!';
                supdateButton.disabled = true;
                setTimeout(() => {
                    supdateButton.textContent = originalText;
                    supdateButton.disabled = false;
                }, 1000);
            });
            settingsContainer.appendChild(supdateButton);

            return settingsContainer;
        },

        updatePreview: (links, settings, previewElement) => {
            if (!previewElement) {
                console.error('No preview element provided');
                return;
            }
            const customTag = settings.customTag || '<p>';
            const imgTags = links.length > 0
                ? links.map(link => UI.generateOutputFormat(link, settings.toggles, settings.customTemplate)).join(`\n\n${customTag}\n\n`)
                : 'No images uploaded';
            previewElement.innerHTML = imgTags;
            console.log('Preview updated with:', imgTags, 'in element:', previewElement);
        },

        generateOutputFormat: (link, toggles, customTemplate) => {
            if (toggles.customCode) {
                return customTemplate.replace(/\[url\]/g, link.full);
            }
            if (toggles.aHrefImg) {
                const thumbUrl = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)([^/]+)$/, '/p/$1thumbs/$2');
                return `<a href="${link.full}"><img src="${thumbUrl}"></a>`;
            }
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
        .nskal-button,
        .nskal-toggle-button {
            color: #000;
            border: 2px solid #ccc;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-right: 10px;
            border-radius: 4px;
            background: linear-gradient(to bottom, #fff 0%, #eee 100%);
            transition: border-color 0.2s;
        }

        .nskal-button:hover,
        .nskal-toggle-button:hover {
            border-color: #999;
        }

        .nskal-toggle-button.active {
            background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
            border-color: #999;
        }

        [id^="nskalSettingsContainer"] {
            display: none;
            flex-direction: column;
            margin: 10px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: rgb(255, 213, 169);
            width: calc(100% - 20px);
            box-sizing: border-box;
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

        .progressBarContainer {
            width: 100%;
            height: 4px;
            background-color: #f5f5f5;
            margin-bottom: 5px;
            border-radius: 2px;
            overflow: hidden;
            display: none;
        }

        .progressBar {
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease;
        }

        [id^="opuNskalPreviewContainer"] {
            margin-top: 2px;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }

        .edit-file-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .edit-file-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: middle;
        }

        .edit-file-table img {
            max-width: 100px;
            max-height: 100px;
        }

        .edit-file-table .file-info div {
            margin-bottom: 2px;
        }

        .upload-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .upload-overlay span {
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
        }

        .upload-overlay .progressBarContainer {
            width: 50%;
            height: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
            overflow: hidden;
            display: block;
        }

        .upload-overlay .progressBar {
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease;
        }

        .settings-row {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            gap: 8px;
        }

        .input-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 20px;
        }

        .input-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tools {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            position: relative;
        }

        .nskal-button-group {
            display: flex;
            gap: 5px;
            margin-right: auto;
            order: -1;
        }

        @media (max-width: 768px) {
            .nskal-button,
            .nskal-toggle-button {
                min-width: auto;
                white-space: nowrap;
                padding: 0 5px;
            }
            .nskal-button-group {
                width: auto;
                justify-content: flex-start;
                margin-bottom: 10px;
            }
        }

        .nskal-input.wide {
            width: 100%;
            max-width: 500px;
        }

        .custom-code-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .nskal-input.custom-template {
            flex: 1;
            min-width: 100px;
            height: 2em;
            margin: 0;
        }
    `;

    GM_addStyle(STYLES);

    const insertNskalButtons = async (toolsDiv, parentWindow, textAreaElement) => {
        if (toolsDiv.dataset.nskalInjected) return;
        toolsDiv.dataset.nskalInjected = 'true';

        const isLoggedIn = await API.checkLoginStatus();
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'nskal-button-group';

        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progressBarContainer';
        const progressBar = document.createElement('div');
        progressBar.className = 'progressBar';
        progressBarContainer.appendChild(progressBar);
        toolsDiv.parentNode.insertBefore(progressBarContainer, toolsDiv);

        if (isLoggedIn) {
            const uploadButton = Utils.createButton('opuNskalButton_' + Date.now(), 'NSKAL');
            const editButton = Utils.createButton('opuNskalEditButton_' + Date.now(), 'EDIT');
            const settingsButton = Utils.createButton('opuNskalSettingsButton_' + Date.now(), 'Settings');

            buttonGroup.appendChild(uploadButton);
            buttonGroup.appendChild(editButton);
            buttonGroup.appendChild(settingsButton);

            toolsDiv.insertBefore(buttonGroup, toolsDiv.firstChild);

            const settingsPanel = UI.createSettingsPanel(settings, (newSettings) => {
                Storage.saveSettings(newSettings);
                settings = newSettings;
                const previewElement = settingsPanel.querySelector('div[id^="opuNskalPreview"]');
                UI.updatePreview(galleryLinks, settings, previewElement);
            }, textAreaElement);
            toolsDiv.parentNode.insertBefore(settingsPanel, toolsDiv.nextSibling);

            const previewElement = settingsPanel.querySelector('div[id^="opuNskalPreview"]');

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
                    await uploadFiles(files, textAreaElement, progressBarContainer, progressBar, previewElement);
                });

                fileInput.click();
            });

            editButton.addEventListener('click', () => {
                openEditWindow(parentWindow, textAreaElement, progressBarContainer, progressBar, previewElement);
            });
        } else {
            const loginButton = document.createElement('a');
            loginButton.id = 'opuLoginButton_' + Date.now();
            loginButton.href = CONFIG.urls.opu.login;
            loginButton.target = "_blank";
            loginButton.textContent = 'OPU LOGIN';
            loginButton.className = 'nskal-button';
            buttonGroup.appendChild(loginButton);
            toolsDiv.insertBefore(buttonGroup, toolsDiv.firstChild);
        }
    };

    const uploadFiles = async (files, textAreaElement, progressBarContainer, progressBar, previewElement) => {
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';

        if (!textAreaElement) {
            alert('Text area not found!');
            progressBarContainer.style.display = 'none';
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

            if (textAreaElement.value) {
                textAreaElement.value += separator;
            }
            textAreaElement.value += imgTags;
            UI.updatePreview(galleryLinks, settings, previewElement);
        }
    };

    const uploadFilesToOPU = async (files, progressBarContainer, progressBar) => {
        const uploadedLinks = [];
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            if (file.original) {
                file = file.cropped?.blob || file.original;
            }

            if (file instanceof Blob) {
                const fileName = file.name || `cropped_${i}_${Date.now()}.jpg`;
                file = new File([file], fileName, { type: file.type || 'image/jpeg' });
            }

            if (settings.resizePercentage !== 100) {
                file = await ImageProcessor.resize(file, settings.resizePercentage);
            }

            try {
                await API.uploadFile(file, (event) => {
                    if (event.lengthComputable) {
                        const fileProgress = (event.loaded / event.total) * 100;
                        const totalProgress = ((i / files.length) * fileProgress / 100) + (i / files.length * 100);
                        progressBar.style.width = `${totalProgress}%`;
                    }
                });

                const newLinks = await API.fetchGalleryLinks(1);
                uploadedLinks.push(...newLinks);
                galleryLinks.push(...newLinks);

                const progress = ((i + 1) / files.length) * 100;
                progressBar.style.width = `${progress}%`;
            } catch (error) {
                console.error('Upload failed:', error);
                alert(`Upload failed for ${file.name}: ${error.message}`);
            }
        }

        progressBarContainer.style.display = 'none';
        return uploadedLinks;
    };

    const openEditWindow = (parentWindow, textAreaElement, progressBarContainer, progressBar, previewElement) => {
        const fileInput = Utils.createInput('file', '', 'nskal-input');
        fileInput.multiple = true;
        fileInput.accept = 'image/*';

        fileInput.onchange = event => {
            const files = Array.from(event.target.files);
            if (files.length) {
                const imgWindow = window.open('', '_blank');
                if (!imgWindow) {
                    alert('Please allow popups for this feature to work');
                    return;
                }

                const fileMap = new Map(files.map(file => [file.name, {
                    original: file,
                    originalImgSrc: null,
                    originalWidth: null,
                    originalHeight: null,
                    cropped: null
                }]));

                imgWindow.document.write(`
                    <html>
                    <head>
                        <title>Image List</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            .edit-file-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            .edit-file-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: middle; }
                            .edit-file-table img { max-width: 100px; max-height: 100px; }
                            .edit-file-table .file-info div { margin-bottom: 2px; }
                            .upload-overlay {
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0, 0, 0, 0.7);
                                display: none;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                                z-index: 1000;
                            }
                            .upload-overlay span {
                                color: white;
                                font-size: 24px;
                                font-weight: bold;
                                text-align: center;
                                margin-bottom: 10px;
                            }
                            .upload-overlay .progressBarContainer {
                                width: 50%;
                                height: 10px;
                                background-color: #f5f5f5;
                                border-radius: 5px;
                                overflow: hidden;
                                display: block;
                            }
                            .upload-overlay .progressBar {
                                width: 0%;
                                height: 100%;
                                background-color: #4CAF50;
                                transition: width 0.3s ease;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="upload-overlay" id="uploadOverlay">
                            <span>Uploading, please wait...</span>
                            <div class="progressBarContainer" id="uploadProgressBarContainer">
                                <div class="progressBar" id="uploadProgressBar"></div>
                            </div>
                        </div>
                        <button id="uploadAllButton" class="nskal-button">Upload</button>
                        <table class="edit-file-table">
                            <tbody id="fileList"></tbody>
                        </table>
                    </body>
                    </html>
                `);
                imgWindow.document.close();

                const fileList = imgWindow.document.getElementById('fileList');
                const uploadButton = imgWindow.document.getElementById('uploadAllButton');
                const uploadOverlay = imgWindow.document.getElementById('uploadOverlay');
                const uploadProgressBarContainer = imgWindow.document.getElementById('uploadProgressBarContainer');
                const uploadProgressBar = imgWindow.document.getElementById('uploadProgressBar');

                uploadProgressBarContainer.innerHTML = '';
                uploadProgressBarContainer.appendChild(progressBarContainer);
                progressBarContainer.appendChild(progressBar);

                window.addEventListener('message', event => {
                    if (event.data.type === 'croppedImage') {
                        const fileData = fileMap.get(event.data.originalName);
                        if (fileData) {
                            fileData.cropped = {
                                blob: event.data.blob,
                                name: event.data.name,
                                width: event.data.width,
                                height: event.data.height,
                                size: event.data.size
                            };
                            updateFileList();
                        }
                    }
                });

                function updateFileList() {
                    fileList.innerHTML = '';
                    fileMap.forEach((fileData, originalName) => {
                        const row = imgWindow.document.createElement('tr');

                        const cropCell = imgWindow.document.createElement('td');
                        const cropButton = Utils.createButton('crop_' + originalName + '_' + Date.now(), 'CROP');
                        cropButton.onclick = () => {
                            const cropWindow = window.open('', '_blank');
                            if (cropWindow) {
                                cropWindow.document.write(createCropWindow(fileData.originalImgSrc, fileData.original));
                                cropWindow.document.close();
                            }
                        };
                        cropCell.appendChild(cropButton);

                        const origImgCell = imgWindow.document.createElement('td');
                        const origImg = imgWindow.document.createElement('img');
                        origImg.src = fileData.originalImgSrc;
                        origImgCell.appendChild(origImg);

                        const origInfoCell = imgWindow.document.createElement('td');
                        const origInfo = imgWindow.document.createElement('div');
                        origInfo.className = 'file-info';
                        origInfo.innerHTML = `
                            <div>${fileData.original.name}</div>
                            <div>${fileData.originalWidth}x${fileData.originalHeight}</div>
                            <div>${(fileData.original.size / (1024 * 1024)).toFixed(1)} MB</div>
                        `;
                        origInfoCell.appendChild(origInfo);

                        const cropImgCell = imgWindow.document.createElement('td');
                        const cropInfoCell = imgWindow.document.createElement('td');

                        if (fileData.cropped) {
                            const cropImg = imgWindow.document.createElement('img');
                            cropImg.src = URL.createObjectURL(fileData.cropped.blob);
                            cropImgCell.appendChild(cropImg);

                            const cropInfo = imgWindow.document.createElement('div');
                            cropInfo.className = 'file-info';
                            cropInfo.innerHTML = `
                                <div>${fileData.cropped.name}</div>
                                <div>${fileData.cropped.width}x${fileData.cropped.height}</div>
                                <div>${(fileData.cropped.size / (1024 * 1024)).toFixed(1)} MB</div>
                            `;
                            cropInfoCell.appendChild(cropInfo);
                        } else {
                            cropImgCell.textContent = '-';
                            cropInfoCell.textContent = '-';
                        }

                        row.appendChild(cropCell);
                        row.appendChild(origImgCell);
                        row.appendChild(origInfoCell);
                        row.appendChild(cropImgCell);
                        row.appendChild(cropInfoCell);

                        fileList.appendChild(row);
                    });
                }

                uploadButton.onclick = async () => {
                    uploadButton.disabled = true;
                    uploadOverlay.style.display = 'flex';
                    const filesToUpload = Array.from(fileMap.values());
                    const uploadedLinks = await uploadFilesToOPU(filesToUpload, progressBarContainer, progressBar);

                    if (uploadedLinks.length) {
                        try {
                            if (textAreaElement) {
                                const customTag = settings.customTag?.trim() || '<p>';
                                const separator = `\n\n${customTag}\n\n`;
                                const imgTags = uploadedLinks
                                    .map(link => UI.generateOutputFormat(link, settings.toggles, settings.customTemplate))
                                    .join(separator);

                                if (textAreaElement.value) {
                                    textAreaElement.value += separator + imgTags;
                                } else {
                                    textAreaElement.value = imgTags;
                                }
                                UI.updatePreview(galleryLinks, settings, previewElement);
                            } else {
                                console.error('Textarea not found in parent window');
                                alert('Could not find text area to update.');
                            }
                        } catch (error) {
                            console.error('Error updating textarea:', error);
                            alert('Failed to update text area: ' + error.message);
                        }
                        imgWindow.close();
                    }
                    uploadButton.disabled = false;
                    uploadOverlay.style.display = 'none';
                };

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = e => {
                        const img = new Image();
                        img.onload = () => {
                            fileMap.set(file.name, {
                                original: file,
                                originalImgSrc: e.target.result,
                                originalWidth: img.width,
                                originalHeight: img.height,
                                cropped: null
                            });
                            updateFileList();
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            }
        };

        fileInput.click();
    };

    const handleImageLoad = (imgWindow, tableBody, file, imgSrc, img, fileMap) => {
        const row = imgWindow.document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imgSrc}"></td>
            <td>${file.name}</td>
            <td>${img.width} x ${img.height}</td>
            <td>${(file.size / (1024 * 1024)).toFixed(2)}</td>
            <td><button class="nskal-button">Crop</button></td>
        `;

        row.querySelector('.nskal-button').onclick = () => {
            const cropWindow = window.open('', '_blank');
            if (cropWindow) {
                cropWindow.document.write(createCropWindow(imgSrc, file));
                cropWindow.document.close();
            }
        };

        tableBody.appendChild(row);
    };

    const createCropWindow = (imgSrc, file) => {
        return `
            <html>
            <head>
                <title>Crop Image</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    #cropImage { max-width: 100%; max-height: 80vh; }
                    .nskal-button {
                        color: #000;
                        border: 2px solid #ccc;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        margin-right: 10px;
                        border-radius: 4px;
                        background: linear-gradient(to bottom, #fff 0%, #eee 100%);
                        transition: border-color 0.2s;
                    }
                    .nskal-button:hover {
                        border-color: #999;
                    }
                </style>
            </head>
            <body>
                <button id="cropConfirmButton" class="nskal-button">Done</button>
                <br><br>
                <img id="cropImage" src="${imgSrc}">
                <br><br>
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
                                name: croppedFile.name,
                                width: canvas.width,
                                height: canvas.height,
                                size: blob.size,
                                originalName: '${file.name}',
                                blob: blob
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
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const mainPostForms = document.querySelectorAll(CONFIG.selectors.mainPostForm);
                const replyForms = document.querySelectorAll(CONFIG.selectors.replyForm);

                mainPostForms.forEach((form) => {
                    const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
                    const textArea = form.querySelector(CONFIG.selectors.textArea);
                    if (toolsDiv && textArea && !toolsDiv.dataset.nskalInjected) {
                        insertNskalButtons(toolsDiv, window, textArea);
                    }
                });

                replyForms.forEach((form) => {
                    const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
                    const textArea = form.querySelector(CONFIG.selectors.textArea);
                    if (toolsDiv && textArea && !toolsDiv.dataset.nskalInjected) {
                        insertNskalButtons(toolsDiv, window, textArea);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const mainPostForms = document.querySelectorAll(CONFIG.selectors.mainPostForm);
        const replyForms = document.querySelectorAll(CONFIG.selectors.replyForm);

        mainPostForms.forEach((form) => {
            const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
            const textArea = form.querySelector(CONFIG.selectors.textArea);
            if (toolsDiv && textArea && !toolsDiv.dataset.nskalInjected) {
                insertNskalButtons(toolsDiv, window, textArea);
            }
        });

        replyForms.forEach((form) => {
            const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
            const textArea = form.querySelector(CONFIG.selectors.textArea);
            if (toolsDiv && textArea && !toolsDiv.dataset.nskalInjected) {
                insertNskalButtons(toolsDiv, window, textArea);
            }
        });
    };

    if (window.location.hostname === 'www.okoun.cz') {
        initialize();
    }

    GM_registerMenuCommand('Open OPU NSKAL', () => {
        const settingsPanel = document.querySelector('[id^="nskalSettingsContainer"]');
        if (settingsPanel) {
            settingsPanel.style.display = 'flex';
        }
    });
})();
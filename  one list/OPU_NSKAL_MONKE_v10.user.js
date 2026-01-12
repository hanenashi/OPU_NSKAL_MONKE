// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      10.17CHEMICALXXX
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
// @author       Blasnik
// @match        https://opu.peklo.biz/*
// @match        https://www.okoun.cz/boards/*
// @match        https://www.okoun.cz/postArticle.do
// @grant        GM_setValue
// @grant        GM_getValue
//a href="https://www.okoun.cz/postArticle.do
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      opu.peklo.biz
// @require      https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js
// @resource     CROPPER_CSS https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css
// ==/UserScript==

(function() {
    'use strict';

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
                customCode: false,
                width: false,
                widthValue: '',
                height: false,
                heightValue: ''
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

    const Storage = {
        get: (key, defaultValue) => GM_getValue(key, defaultValue),
        set: (key, value) => GM_setValue(key, value),

        loadSettings: () => {
            return {
                customTag: Storage.get('customTag', CONFIG.defaults.customTag),
                resizePercentage: parseInt(Storage.get('resizePercentage', CONFIG.defaults.resizePercentage), 10),
                customTemplate: Storage.get('customTemplate', CONFIG.defaults.customTemplate),
                toggles: {
                    url: Storage.get('toggleUrl', CONFIG.defaults.toggleStates.url),
                    imgSrc: Storage.get('toggleImgSrc', CONFIG.defaults.toggleStates.imgSrc),
                    aHref: Storage.get('toggleAHref', CONFIG.defaults.toggleStates.aHref),
                    aHrefImg: Storage.get('toggleAHrefImg', CONFIG.defaults.toggleStates.aHrefImg),
                    customCode: Storage.get('toggleCustomCode', CONFIG.defaults.toggleStates.customCode),
                    width: Storage.get('toggleWidth', CONFIG.defaults.toggleStates.width),
                    widthValue: Storage.get('widthValue', CONFIG.defaults.toggleStates.widthValue),
                    height: Storage.get('toggleHeight', CONFIG.defaults.toggleStates.height),
                    heightValue: Storage.get('heightValue', CONFIG.defaults.toggleStates.heightValue)
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
            Storage.set('toggleWidth', settings.toggles.width);
            Storage.set('widthValue', settings.widthValue);
            Storage.set('toggleHeight', settings.toggles.height);
            Storage.set('heightValue', settings.heightValue);
        }
    };

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
        }
    };

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
                    if (key === 'url' || key === 'imgSrc' || key === 'aHref' || key === 'aHrefImg' || key === 'customCode') {
                        if (button === activeButton) return;
                        if (activeButton) {
                            activeButton.classList.remove('active');
                            toggles[activeButton.dataset.key] = false;
                        }
                        button.classList.add('active');
                        toggles[key] = true;
                        activeButton = button;
                    } else {
                        button.classList.toggle('active');
                        toggles[key] = !toggles[key];
                    }
                });
                button.dataset.key = key;
                if (toggles[key]) {
                    button.classList.add('active');
                    if (key === 'url' || key === 'imgSrc' || key === 'aHref' || key === 'aHrefImg' || key === 'customCode') {
                        activeButton = button;
                    }
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

            const dimensionRow = document.createElement('div');
            dimensionRow.className = 'dimension-row';

            const widthGroup = document.createElement('div');
            widthGroup.className = 'input-group';
            widthGroup.appendChild(createToggleButton('width', 'WIDTH'));
            const widthInput = Utils.createInput('number', 'Width (px)', 'nskal-input', settings.toggles.widthValue);
            widthInput.min = "1";
            widthGroup.appendChild(widthInput);
            dimensionRow.appendChild(widthGroup);

            const heightGroup = document.createElement('div');
            heightGroup.className = 'input-group';
            heightGroup.appendChild(createToggleButton('height', 'HEIGHT'));
            const heightInput = Utils.createInput('number', 'Height (px)', 'nskal-input', settings.toggles.heightValue);
            heightInput.min = "1";
            heightGroup.appendChild(heightInput);
            dimensionRow.appendChild(heightGroup);

            settingsContainer.appendChild(dimensionRow);

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
                toggles.widthValue = widthInput.value.trim();
                toggles.heightValue = heightInput.value.trim();
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
                let imgTag = `<img src="${thumbUrl}"`;
                if (toggles.width && toggles.widthValue) imgTag += ` width="${toggles.widthValue}"`;
                if (toggles.height && toggles.heightValue) imgTag += ` height="${toggles.heightValue}"`;
                imgTag += '>';
                return `<a href="${link.full}">${imgTag}</a>`;
            }
            if (toggles.url) {
                return link.full;
            }
            let output = toggles.imgSrc ? `<img src="${link.full}"` : link.full;
            if (toggles.imgSrc) {
                if (toggles.width && toggles.widthValue) output += ` width="${toggles.widthValue}"`;
                if (toggles.height && toggles.heightValue) output += ` height="${toggles.heightValue}"`;
                output += '>';
            } else {
                output = link.full;
            }
            if (toggles.aHref) {
                output = `<a href="${link.full}">${output}</a>`;
            }
            return output;
        }
    };

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
            display: inline-block;
            box-sizing: border-box;
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

        .nskal-input {
            margin: 0 8px;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 14px;
        }

        .nskal-input[type="number"] {
            min-width: 80px;
            max-width: 100px;
            box-sizing: border-box;
        }

        .nskal-input.custom-template {
            flex: 1;
            min-width: 80px;
            max-width: 100px;
            height: 2em;
            margin: 0;
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
            border: 1px solid #555;
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
            width: 300px;
            height: 10px;
            background-color: #555;
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
            margin-bottom: 15px;
            gap: 8px;
        }

        .dimension-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 20px;
        }

        .input-row {
            display: flex;
and align-items: center;
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

        .crop-container {
            display: none;
            padding: 10px;
            background-color: #333;
            border: 1px solid #555;
            border-radius: 4px;
            margin-top: 5px;
        }

        .crop-container img {
            max-width: 100%;
            max-height: 60vh;
            object-fit: contain;
        }

        @media (max-width: 768px) {
            /* Unified button styling for both NSKAL and Okoun buttons */
            .nskal-button,
            .nskal-toggle-button,
            div.content.post button[type="submit"],
            div.actions.replyForm input[type="submit"][value="Odeslat"],
            div.actions.replyForm input[type="submit"][value="Náhled"],
            div.content.post .yui-button button {
                /* Reset all button properties */
                all: initial;
                
                /* Base styling */
                display: inline-block !important;
                min-width: 0 !important;
                width: auto !important;
                height: 32px !important;
                line-height: 32px !important;
                padding: 0 12px !important;
                margin: 0 5px 5px 0 !important;
                
                /* Text styling */
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto !important;
                font-size: 14px !important;
                font-weight: normal !important;
                text-align: center !important;
                white-space: nowrap !important;
                color: #000000 !important;
                
                /* Visual styling */
                background: #ffffff !important;
                border: 1px solid #cccccc !important;
                border-radius: 4px !important;
                box-shadow: none !important;
                
                /* Mobile optimizations */
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: transparent !important;
                -webkit-appearance: none !important;
                appearance: none !important;
                
                /* Box model */
                box-sizing: border-box !important;
                vertical-align: middle !important;
            }
        
            /* Force buttons to stay on same row */
            .tools {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                padding-bottom: 5px !important;
                gap: 5px !important;
                align-items: center !important;
            }
        
            .nskal-button-group {
                display: flex !important;
                flex: 0 0 auto !important;
                gap: 5px !important;
                margin: 0 !important;
                align-items: center !important;
            }
        
            /* Override any Okoun.cz specific button styles */
            div.content.post .yui-button,
            div.content.post .yui-button .first-child {
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: none !important;
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
            flex: 0 1 auto;
        }

        .resized-info {
            color: #228B22;
        }

        .nskal-button.delete {
            color: #fff;
            border: 2px solid #ff4444;
            background: linear-gradient(to bottom, #ff6666 0%, #ff4444 100%);
            padding: 4px 8px;
            font-size: 12px;
        }

        .nskal-button.delete:hover {
            border-color: #cc0000;
        }

        /* Okoun.cz button overrides */
        div.content.post .yui-button,
        div.content.post .yui-button .first-child {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: inline-block;
        }

        div.content.post button[type="submit"] {
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
            display: inline-block;
            box-sizing: border-box;
        }

        div.content.post button[type="submit"]:hover {
            border-color: #999;
        }

        div.actions.replyForm input[type="submit"][value="Odeslat"],
        div.actions.replyForm input[type="submit"][value="Náhled"] {
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
            box-sizing: border-box;
        }

        div.actions.replyForm input[type="submit"][value="Odeslat"]:hover,
        div.actions.replyForm input[type="submit"][value="Náhled"]:hover {
            border-color: #999;
        }

        @media (max-width: 768px) {
            /* Force consistent button styling across all browsers */
            .nskal-button,
            .nskal-toggle-button,
            div.content.post button[type="submit"],
            div.actions.replyForm input[type="submit"][value="Odeslat"],
            div.actions.replyForm input[type="submit"][value="Náhled"] {
                min-width: auto !important;
                width: auto !important;
                max-width: none !important;
                white-space: nowrap !important;
                padding: 6px 10px !important;
                font-size: 12px !important;
                margin-right: 5px !important;
                margin-bottom: 5px !important;
                background: #ffffff !important;
                border: 1px solid #cccccc !important;
                border-radius: 4px !important;
                color: #000000 !important;
                height: auto !important;
                line-height: normal !important;
                display: inline-block !important;
                vertical-align: middle !important;
                -webkit-appearance: none !important;
                appearance: none !important;
                box-sizing: border-box !important;
                font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto !important;
            }

            /* Force buttons to stay on same row */
            .tools {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                padding-bottom: 5px !important;
                gap: 5px !important;
            }

            .nskal-button-group {
                display: flex !important;
                flex: 0 0 auto !important;
                gap: 5px !important;
                margin-right: 5px !important;
            }
        }

        @media (max-width: 768px) {
            /* Common button base styles */
            .nskal-button,
            .nskal-toggle-button,
            div.content.post button[type="submit"],
            div.actions.replyForm input[type="submit"][value="Odeslat"],
            div.actions.replyForm input[type="submit"][value="Náhled"],
            div.content.post .yui-button button {
                /* Strict reset */
                all: unset !important;
                
                /* Fixed dimensions */
                min-height: 28px !important;
                height: 28px !important;
                line-height: 28px !important;
                padding: 0 8px !important;
                margin: 0 4px 4px 0 !important;
                
                /* Text styling */
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto !important;
                font-size: 13px !important;
                font-weight: normal !important;
                text-align: center !important;
                white-space: nowrap !important;
                
                /* Visual styling - Making submit/preview buttons red for testing */
                background: #ffffff !important;
                border: 1px solid #cccccc !important;
                border-radius: 4px !important;
                box-shadow: none !important;
                
                /* Layout */
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex: 0 0 auto !important;
                box-sizing: border-box !important;
                min-width: 0 !important;
                width: auto !important;
            }
        
            /* Make Odeslat and Náhled buttons red for testing */
            div.actions.replyForm input[type="submit"][value="Odeslat"],
            div.actions.replyForm input[type="submit"][value="Náhled"],
            div.content.post button[type="submit"] {
                background: #ff0000 !important;
                color: #ffffff !important;
            }
        
            /* Remove any inherited styles from parent elements */
            div.content.post .yui-button,
            div.content.post .yui-button .first-child,
            div.actions.replyForm {
                all: unset !important;
                display: inline-flex !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        
            /* Container adjustments */
            .tools {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                padding-bottom: 5px !important;
                gap: 4px !important;
                align-items: center !important;
            }
        }

        @media (max-width: 768px) {
            /* Base button styles - removed */
            
            /* Super specific selectors for Odeslat/Náhled buttons */
            div.actions.replyForm input[type="submit"][value="Odeslat"],
            div.actions.replyForm input[type="submit"][value="Náhled"],
            div.content.post button[type="submit"],
            div.content.post .yui-button button[type="submit"] {
                background-color: #ff0000 !important;
                background-image: none !important;
                background: #ff0000 !important;
                color: #ffffff !important;
                border: 1px solid #cc0000 !important;
                
                /* Match NSKAL button size */
                height: 28px !important;
                line-height: 28px !important;
                padding: 0 8px !important;
                margin: 0 4px 4px 0 !important;
                font-size: 13px !important;
                
                /* Force element properties */
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 0 !important;
                width: auto !important;
                box-sizing: border-box !important;
                border-radius: 4px !important;
                -webkit-appearance: none !important;
                appearance: none !important;
            }
        
            /* Container fixes */
            .tools {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                padding-bottom: 5px !important;
                gap: 4px !important;
                align-items: center !important;
            }
        
            /* Override any container styles */
            div.content.post .yui-button,
            div.content.post .yui-button .first-child,
            div.actions.replyForm {
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: none !important;
                display: inline-flex !important;
            }
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
                await API.uploadFile(file, (event) => {
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

        const totalFiles = files.length;
        let completedFiles = 0;

        for (let i = 0; i < totalFiles; i++) {
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
                        const overallProgress = (completedFiles / totalFiles) * 100 + (fileProgress / totalFiles);
                        progressBar.style.width = `${overallProgress}%`;
                        console.log(`File ${i + 1}: ${fileProgress}% -> Overall: ${overallProgress}%`);
                    }
                });

                const newLinks = await API.fetchGalleryLinks(1);
                uploadedLinks.push(...newLinks);
                galleryLinks.push(...newLinks);

                completedFiles++;
                const progress = (completedFiles / totalFiles) * 100;
                progressBar.style.width = `${progress}%`;
                console.log(`Completed ${completedFiles}/${totalFiles}: ${progress}%`);
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

                const fileMap = new Map(files.map((file, index) => [file.name, {
                    original: file,
                    originalImgSrc: null,
                    originalWidth: null,
                    originalHeight: null,
                    cropped: null,
                    cropper: null,
                    order: null,
                    originalIndex: index
                }]));

                let nextOrder = 1;

                imgWindow.document.write(`
                    <html>
                    <head>
                        <title>Image List</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                background-color: #222;
                                color: #ddd;
                            }
                            .edit-file-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                            }
                            .edit-file-table td {
                                border: 1px solid #555;
                                padding: 8px;
                                text-align: left;
                                vertical-align: middle;
                            }
                            .edit-file-table td.image-cell {
                                position: relative;
                            }
                            .edit-file-table img {
                                max-width: 100px;
                                max-height: 100px;
                                cursor: pointer;
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
                                color: #fff;
                                font-size: 24px;
                                font-weight: bold;
                                text-align: center;
                                margin-bottom: 10px;
                            }
                            .upload-overlay .progressBarContainer {
                                width: 300px;
                                height: 10px;
                                background-color: #555;
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
                            .crop-container {
                                display: none;
                                padding: 10px;
                                background-color: #333;
                                border: 1px solid #555;
                                border-radius: 4px;
                                margin-top: 5px;
                            }
                            .crop-container img {
                                max-width: 100%;
                                max-height: 60vh;
                                object-fit: contain;
                            }
                            .nskal-button {
                                color: #ddd;
                                border: 2px solid #555;
                                padding: 8px 16px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: bold;
                                margin-right: 10px;
                                border-radius: 4px;
                                background: linear-gradient(to bottom, #444 0%, #333 100%);
                                transition: border-color 0.2s;
                            }
                            .nskal-button:hover {
                                border-color: #888;
                            }
                            .resized-info {
                                color: #228B22;
                            }
                            .order-badge {
                                position: absolute;
                                top: 0;
                                left: 0;
                                background-color: yellow;
                                color: black;
                                font-size: 12px;
                                font-weight: bold;
                                padding: 2px 5px;
                                border-radius: 3px;
                                z-index: 10;
                            }
                            .nskal-button.delete {
                                color: #fff;
                                border: 2px solid #ff4444;
                                background: linear-gradient(to bottom, #ff6666 0%, #ff4444 100%);
                                padding: 4px 8px;
                                font-size: 12px;
                            }
                            .nskal-button.delete:hover {
                                border-color: #cc0000;
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

                function updateFileList() {
                    fileList.innerHTML = '';
                    fileMap.forEach((fileData, originalName) => {
                        const row = imgWindow.document.createElement('tr');

                        const cropCell = imgWindow.document.createElement('td');
                        const cropButton = Utils.createButton('crop_' + originalName + '_' + Date.now(), 'Crop');
                        cropCell.appendChild(cropButton);

                        const origImgCell = imgWindow.document.createElement('td');
                        origImgCell.className = 'image-cell';
                        const origImg = imgWindow.document.createElement('img');
                        origImg.src = fileData.originalImgSrc;
                        origImgCell.appendChild(origImg);
                        if (fileData.order !== null) {
                            const badge = imgWindow.document.createElement('span');
                            badge.className = 'order-badge';
                            badge.textContent = fileData.order;
                            origImgCell.appendChild(badge);
                        }

                        const origInfoCell = imgWindow.document.createElement('td');
                        const origInfo = imgWindow.document.createElement('div');
                        origInfo.className = 'file-info';
                        let origInfoHTML = `
                            <div>${fileData.original.name}</div>
                            <div>${fileData.originalWidth}x${fileData.originalHeight}</div>
                            <div>${(fileData.original.size / (1024 * 1024)).toFixed(1)} MB</div>
                        `;
                        if (settings.resizePercentage !== 100) {
                            const resizeFactor = settings.resizePercentage / 100;
                            const resizedWidth = Math.round(fileData.originalWidth * resizeFactor);
                            const resizedHeight = Math.round(fileData.originalHeight * resizeFactor);
                            const resizedSize = fileData.original.size * resizeFactor * resizeFactor;
                            origInfoHTML += `
                                <div class="resized-info">${resizedWidth}x${resizedHeight}</div>
                                <div class="resized-info">${(resizedSize / (1024 * 1024)).toFixed(1)} MB</div>
                            `;
                        }
                        origInfo.innerHTML = origInfoHTML;
                        origInfoCell.appendChild(origInfo);

                        const cropImgCell = imgWindow.document.createElement('td');
                        const cropInfoCell = imgWindow.document.createElement('td');

                        if (fileData.cropped) {
                            const cropImg = imgWindow.document.createElement('img');
                            cropImg.src = URL.createObjectURL(fileData.cropped.blob);
                            cropImgCell.appendChild(cropImg);

                            const cropInfo = imgWindow.document.createElement('div');
                            cropInfo.className = 'file-info';
                            let cropInfoHTML = `
                                <div>${fileData.cropped.name}</div>
                                <div>${fileData.cropped.width}x${fileData.cropped.height}</div>
                                <div>${(fileData.cropped.size / (1024 * 1024)).toFixed(1)} MB</div>
                            `;
                            if (settings.resizePercentage !== 100) {
                                const resizeFactor = settings.resizePercentage / 100;
                                const resizedWidth = Math.round(fileData.cropped.width * resizeFactor);
                                const resizedHeight = Math.round(fileData.cropped.height * resizeFactor);
                                const resizedSize = fileData.cropped.size * resizeFactor * resizeFactor;
                                cropInfoHTML += `
                                    <div class="resized-info">${resizedWidth}x${resizedHeight}</div>
                                    <div class="resized-info">${(resizedSize / (1024 * 1024)).toFixed(1)} MB</div>
                                `;
                            }
                            cropInfo.innerHTML = cropInfoHTML;
                            cropInfoCell.appendChild(cropInfo);
                        } else {
                            cropImgCell.textContent = '-';
                            cropInfoCell.textContent = '-';
                        }

                        const deleteCell = imgWindow.document.createElement('td');
                        const deleteButton = Utils.createButton('delete_' + originalName + '_' + Date.now(), 'DEL', 'nskal-button delete');
                        deleteCell.appendChild(deleteButton);

                        row.appendChild(cropCell);
                        row.appendChild(origImgCell);
                        row.appendChild(origInfoCell);
                        row.appendChild(cropImgCell);
                        row.appendChild(cropInfoCell);
                        row.appendChild(deleteCell);

                        const cropRow = imgWindow.document.createElement('tr');
                        const cropContainerCell = imgWindow.document.createElement('td');
                        cropContainerCell.colSpan = 6;
                        const cropContainer = imgWindow.document.createElement('div');
                        cropContainer.className = 'crop-container';
                        cropContainer.id = 'crop_container_' + originalName;

                        const cropImg = imgWindow.document.createElement('img');
                        cropImg.id = 'crop_img_' + originalName;
                        cropImg.src = fileData.originalImgSrc;

                        const doneButton = Utils.createButton('crop_done_' + originalName + '_' + Date.now(), 'Done');
                        cropContainer.appendChild(doneButton);
                        cropContainer.appendChild(imgWindow.document.createElement('br'));
                        cropContainer.appendChild(imgWindow.document.createElement('br'));
                        cropContainer.appendChild(cropImg);

                        cropContainerCell.appendChild(cropContainer);
                        cropRow.appendChild(cropContainerCell);

                        fileList.appendChild(row);
                        fileList.appendChild(cropRow);

                        cropButton.onclick = () => {
                            console.log('Toggling crop for', originalName);
                            if (cropContainer.style.display === 'block') {
                                if (fileData.cropper) {
                                    fileData.cropper.destroy();
                                    fileData.cropper = null;
                                }
                                cropContainer.style.display = 'none';
                                cropButton.textContent = 'Crop';
                            } else {
                                cropContainer.innerHTML = '';
                                cropContainer.appendChild(doneButton);
                                cropContainer.appendChild(imgWindow.document.createElement('br'));
                                cropContainer.appendChild(imgWindow.document.createElement('br'));
                                cropContainer.appendChild(cropImg);

                                cropContainer.style.display = 'block';
                                cropButton.textContent = 'Cancel';
                                fileData.cropper = new Cropper(cropImg, CONFIG.cropperOptions);
                                console.log('Cropper initialized:', fileData.cropper);
                            }
                        };

                        doneButton.onclick = () => {
                            if (fileData.cropper) {
                                const canvas = fileData.cropper.getCroppedCanvas();
                                canvas.toBlob((blob) => {
                                    fileData.cropped = {
                                        blob: blob,
                                        name: `cropped_${originalName}`,
                                        width: canvas.width,
                                        height: canvas.height,
                                        size: blob.size
                                    };
                                    fileData.cropper.destroy();
                                    fileData.cropper = null;
                                    cropContainer.style.display = 'none';
                                    cropButton.textContent = 'Crop';
                                    updateFileList();
                                }, fileData.original.type);
                            }
                        };

                        origImg.onclick = () => {
                            if (fileData.order === null) {
                                fileData.order = nextOrder++;
                                updateFileList();
                            } else {
                                const removedOrder = fileData.order;
                                fileData.order = null;
                                fileMap.forEach((data) => {
                                    if (data.order !== null && data.order > removedOrder) {
                                        data.order--;
                                    }
                                });
                                nextOrder--;
                                updateFileList();
                            }
                        };

                        deleteButton.onclick = () => {
                            const removedOrder = fileData.order;
                            fileMap.delete(originalName);
                            if (removedOrder !== null) {
                                fileMap.forEach((data) => {
                                    if (data.order !== null && data.order > removedOrder) {
                                        data.order--;
                                    }
                                });
                                nextOrder = Math.max(1, fileMap.size + 1);
                            }
                            updateFileList();
                        };
                    });
                }

                uploadButton.onclick = async () => {
                    uploadButton.disabled = true;
                    uploadOverlay.style.display = 'flex';
                    const filesToUpload = Array.from(fileMap.values()).sort((a, b) => {
                        if (a.order !== null && b.order !== null) return a.order - b.order;
                        if (a.order !== null) return -1;
                        if (b.order !== null) return 1;
                        return a.originalIndex - b.originalIndex;
                    });
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
                                cropped: null,
                                cropper: null,
                                order: null,
                                originalIndex: files.indexOf(file)
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

    let settings = Storage.loadSettings();
    let galleryLinks = [];

    const initialize = async () => {
        const tweakOdeslatButton = () => {
            const applyStyles = () => {
                const submitButton = document.querySelector('div.content.post button[type="submit"]');
                if (submitButton && submitButton.textContent === 'Odeslat příspěvek') {
                    submitButton.textContent = 'Odeslat';
                    console.log('NSKAL MONKE: Tweaked Odeslat text');
                }

                // Force mobile styles if needed
                if (window.innerWidth <= 768) {
                    const styleSheet = document.createElement('style');
                    styleSheet.textContent = `
                        @media (max-width: 768px) {
                            html body div.content.post button[type="submit"],
                            html body div.content.post .yui-button button[type="submit"] {
                                background: #ff0000 !important;
                                background-color: #ff0000 !important;
                                color: #ffffff !important;
                                border: 1px solid #cc0000 !important;
                            }
                        }
                    `;
                    document.head.appendChild(styleSheet);
                    console.log('NSKAL MONKE: Forced mobile styles injected');
                }
            };

            // Initial application
            applyStyles();

            // Watch for changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        applyStyles();
                    }
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
            console.log('NSKAL MONKE: Button tweak observer started');
        };

        const injectButtons = (form, type) => {
            const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
            const textArea = form.querySelector(CONFIG.selectors.textArea);
            if (toolsDiv && textArea) {
                if (!toolsDiv.dataset.nskalInjected) {
                    console.log(`Injecting NSKAL buttons into ${type} form`);
                    insertNskalButtons(toolsDiv, window, textArea);
                } else {
                    console.log(`${type} form already injected`);
                }
            } else {
                console.warn(`${type} form missing toolsDiv or textArea`, { toolsDiv, textArea });
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (!mutation.addedNodes.length) return;

                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;

                    const mainPostForms = node.matches(CONFIG.selectors.mainPostForm)
                        ? [node]
                        : node.querySelectorAll(CONFIG.selectors.mainPostForm);
                    const replyForms = node.matches(CONFIG.selectors.replyForm)
                        ? [node]
                        : node.querySelectorAll(CONFIG.selectors.replyForm);

                    mainPostForms.forEach((form) => injectButtons(form, 'main post'));
                    replyForms.forEach((form) => injectButtons(form, 'reply'));
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        tweakOdeslatButton();

        document.querySelectorAll(CONFIG.selectors.mainPostForm).forEach((form) => injectButtons(form, 'main post'));
        document.querySelectorAll(CONFIG.selectors.replyForm).forEach((form) => injectButtons(form, 'reply'));
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
// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      10
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
            Storage.set('widthValue', settings.toggles.widthValue);
            Storage.set('toggleHeight', settings.toggles.height);
            Storage.set('heightValue', settings.toggles.heightValue);
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

            const widthGroup = document.createElement('div');
            widthGroup.className = 'custom-code-group';
            widthGroup.appendChild(createToggleButton('width', 'WIDTH'));
            const widthInput = Utils.createInput('number', 'Width (px)', 'nskal-input custom-template', settings.toggles.widthValue);
            widthInput.min = "1";
            widthGroup.appendChild(widthInput);
            toggleRow.appendChild(widthGroup);

            const heightGroup = document.createElement('div');
            heightGroup.className = 'custom-code-group';
            heightGroup.appendChild(createToggleButton('height', 'HEIGHT'));
            const heightInput = Utils.createInput('number', 'Height (px)', 'nskal-input custom-template', settings.toggles.heightValue);
            heightInput.min = "1";
            heightGroup.appendChild(heightInput);
            toggleRow.appendChild(heightGroup);

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
            border-radius: 4

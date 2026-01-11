// ==UserScript==
// @name         OPU NSKAL MONKE (Final Fix)
// @namespace    http://tampermonkey.net/
// @version      10.20
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

    // ==========================================
    // MODULE 1: CONFIGURATION & CONSTANTS
    // ==========================================
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
                url: false, imgSrc: true, aHref: false, aHrefImg: false,
                customCode: false, width: false, widthValue: '', height: false, heightValue: ''
            }
        },
        selectors: {
            textArea: 'textarea[name="body"]',
            toolsDiv: 'div.tools',
            mainPostForm: 'div.content.post',
            replyForm: 'div.actions.replyForm'
        },
        cropperOptions: {
            aspectRatio: NaN, viewMode: 1, autoCropArea: 1,
            movable: true, zoomable: true, rotatable: true, scalable: true
        }
    };

    const STYLES = `
        /* General Styles */
        .nskal-button {
            padding: 2px 10px; font-size: 11px; cursor: pointer; margin-right: 5px;
            border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 3px;
        }
        .nskal-button:hover { background-color: #e0e0e0; }

        /* Progress Bar */
        .nskal-progress-container {
            width: 100%; background-color: #f3f3f3; border: 1px solid #ccc;
            margin-top: 5px; height: 10px; display: none; border-radius: 3px; overflow: hidden;
        }
        .nskal-progress-bar {
            height: 100%; width: 0%; background-color: #4caf50; transition: width 0.3s;
        }

        /* Settings Modal */
        .nskal-settings-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: none; justify-content: center; align-items: center;
        }
        .nskal-settings-modal {
            background: white; padding: 20px; border-radius: 8px;
            width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .nskal-settings-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;
        }
        .nskal-settings-title { font-size: 18px; font-weight: bold; }
        .nskal-close-btn { background: none; border: none; font-size: 20px; cursor: pointer; }

        /* Inputs & Toggles */
        .input-row { display: flex; align-items: center; margin-bottom: 15px; gap: 20px; }
        .nskal-input { padding: 5px; border: 1px solid #ccc; border-radius: 4px; }
        .nskal-toggle-button {
            padding: 5px 10px; border: 1px solid #ccc; background: #f0f0f0;
            cursor: pointer; border-radius: 4px;
        }
        .nskal-toggle-button.active { background: #4caf50; color: white; border-color: #45a049; }

        /* Preview Area */
        .preview-box {
            background: #f8f9fa; padding: 10px; border: 1px solid #eee;
            border-radius: 4px; margin-top: 20px; font-family: monospace;
            white-space: pre-wrap; word-break: break-all;
        }

        @media (max-width: 768px) {
            html body div.content.post button[type="submit"] {
                width: 100% !important; height: 5em !important; font-size: 150% !important;
            }
            html body div.content.post textarea { height: 15em !important; }
        }
    `;

    // ==========================================
    // MODULE 2: UTILS & STORAGE
    // ==========================================
    const Utils = {
        createButton: (id, text, className = 'nskal-button', type = 'button') => {
            const btn = document.createElement('button');
            btn.id = id; btn.textContent = text; btn.type = type; btn.className = className;
            return btn;
        },
        createInput: (type, placeholder, className = 'nskal-input', defaultValue = '') => {
            const input = document.createElement('input');
            input.type = type; input.placeholder = placeholder;
            input.className = className; input.value = defaultValue;
            return input;
        },
        createToggle: (labelText, isActive = false, onClick = null) => {
            const btn = document.createElement('button');
            btn.textContent = labelText;
            btn.className = `nskal-toggle-button${isActive ? ' active' : ''}`;
            btn.type = 'button';
            if (onClick) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(e); });
            return btn;
        }
    };

    const Storage = {
        get: (key, defaultValue) => GM_getValue(key, defaultValue),
        set: (key, value) => GM_setValue(key, value),

        loadSettings: () => ({
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
        }),

        saveSettings: (s) => {
            Storage.set('customTag', s.customTag);
            Storage.set('resizePercentage', s.resizePercentage);
            Storage.set('customTemplate', s.customTemplate);
            for (const [k, v] of Object.entries(s.toggles)) {
                Storage.set(`toggle${k.charAt(0).toUpperCase() + k.slice(1)}`, v);
            }
            Storage.set('widthValue', s.toggles.widthValue);
            Storage.set('heightValue', s.toggles.heightValue);
        }
    };

    // ==========================================
    // MODULE 3: API & NETWORK (FIXED UPLOAD)
    // ==========================================
    const API = {
        checkLoginStatus: async () => {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET', url: CONFIG.urls.opu.gallery,
                        onload: resolve, onerror: reject
                    });
                });
                return !response.finalUrl.includes('page=prihlaseni');
            } catch (error) { return false; }
        },

        // FIXED: Accepted explicit filename argument
        uploadFile: (file, onProgress, fileName) => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();

                // CRITICAL FIX: Ensure 3rd argument (filename) is passed if 'file' is a Blob
                const nameToSend = fileName || file.name || 'image.jpg';
                formData.append('obrazek[0]', file, nameToSend);

                formData.append('sizep', '0');
                formData.append('outputf', 'auto');
                formData.append('tl_odeslat', 'Odeslat');

                GM_xmlhttpRequest({
                    method: 'POST', url: CONFIG.urls.opu.upload, data: formData,
                    upload: { onprogress: onProgress },
                    onload: (response) => {
                        if (response.status === 200) resolve(response);
                        else reject(new Error(`Upload failed with status ${response.status}`));
                    },
                    onerror: reject
                });
            });
        },

        fetchGalleryLinks: async (count = 1) => {
            try {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET', url: CONFIG.urls.opu.gallery,
                        onload: resolve, onerror: reject
                    });
                });

                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');
                const links = [];
                const items = doc.querySelectorAll('div.box a.swipebox');
                for (let i = 0; i < Math.min(items.length, count); i++) {
                    const item = items[i];
                    const img = item.querySelector('img');
                    links.push({ full: item.href, thumb: img ? img.src : '' });
                }
                return links;
            } catch (error) { return []; }
        }
    };

    // ==========================================
    // MODULE 4: IMAGE PROCESSING & FORMATTING
    // ==========================================
    const ImageProcessor = {
        resize: async (file, percentage) => {
            if (percentage === 100) return file;
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const newWidth = img.width * (percentage / 100);
                    const newHeight = img.height * (percentage / 100);
                    canvas.width = newWidth; canvas.height = newHeight;
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        resolve(new File([blob], file.name, { type: file.type }));
                    }, file.type);
                };
                img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
                img.src = url;
            });
        }
    };

    const Formatter = {
        generateOutput: (link, toggles, template) => {
            if (toggles.customCode) return template.replace(/\[url\]/g, link.full);
            if (toggles.aHrefImg) {
                const thumbUrl = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)([^/]+)$/, '/p/$1thumbs/$2');
                let imgTag = `<img src="${thumbUrl}"`;
                if (toggles.width && toggles.widthValue) imgTag += ` width="${toggles.widthValue}"`;
                if (toggles.height && toggles.heightValue) imgTag += ` height="${toggles.heightValue}"`;
                return `<a href="${link.full}">${imgTag}></a>`;
            }
            if (toggles.url) return link.full;
            let output = '';
            if (toggles.imgSrc) {
                output = `<img src="${link.full}"`;
                if (toggles.width && toggles.widthValue) output += ` width="${toggles.widthValue}"`;
                if (toggles.height && toggles.heightValue) output += ` height="${toggles.heightValue}"`;
                output += '>';
            } else { output = link.full; }
            if (toggles.aHref) return `<a href="${link.full}">${output}</a>`;
            return output;
        }
    };

    // ==========================================
    // MODULE 5: EDITOR & POPUP LOGIC (FIXED)
    // ==========================================
    const Editor = {
        getEditorHTML: () => `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Image Editor</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
                <style>
                    body { font-family: -apple-system, sans-serif; margin: 0; display: flex; height: 100vh; background: #222; color: #ddd; }
                    .sidebar { width: 260px; background: #1e1e1e; border-right: 1px solid #333; display: flex; flex-direction: column; }
                    .sidebar-header { padding: 15px; border-bottom: 1px solid #333; background: #252526; }
                    .sidebar-content { flex: 1; overflow-y: auto; padding: 10px; }
                    .sidebar-footer { padding: 15px; border-top: 1px solid #333; background: #252526; }
                    .main-area { flex: 1; display: flex; flex-direction: column; background: #111; }
                    .editor-container { flex: 1; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; }
                    .controls { height: 60px; background: #1e1e1e; border-top: 1px solid #333; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 10px; }
                    .file-item { background: #2d2d2d; padding: 10px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid transparent; }
                    .file-item:hover { background: #383838; }
                    .file-item.active { background: #37373d; border-left-color: #0e639c; }
                    .file-item.edited .file-status { color: #4CAF50; font-weight: bold; margin-right: 5px; }
                    .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; font-size: 13px; }
                    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; color: white; background: #444; font-weight: 500; }
                    .btn:hover { background: #555; }
                    .btn-primary { background: #007acc; } .btn-primary:hover { background: #0062a3; }
                    .btn-success { background: #2da042; } .btn-success:hover { background: #217a30; }
                    .btn-danger { background: #ce3838; padding: 4px 8px; font-size: 12px; margin-left: 5px; }
                    .loader { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    img { max-width: 100%; max-height: 100%; display: block; }
                </style>
            </head>
            <body>
                <div class="sidebar">
                    <div class="sidebar-header"><h3 style="margin:0; font-size: 16px;">Queue</h3></div>
                    <div class="sidebar-content" id="fileList"></div>
                    <div class="sidebar-footer"><button id="doneBtn" class="btn btn-success" style="width: 100%">Upload All</button></div>
                </div>
                <div class="main-area">
                    <div class="editor-container"><div class="loader" id="loader"></div><img id="image" src="" style="display:none"></div>
                    <div class="controls">
                        <button class="btn" onclick="rotate(-90)">↺</button>
                        <button class="btn" onclick="rotate(90)">↻</button>
                        <button class="btn" onclick="flip('h')">↔</button>
                        <button class="btn" onclick="flip('v')">↕</button>
                        <button class="btn" onclick="reset()">Reset</button>
                        <div style="width: 20px;"></div>
                        <button class="btn btn-primary" id="saveBtn">Save Changes</button>
                    </div>
                </div>
                <script>
                    // Safe Script Loading
                    var s = document.createElement('script');
                    s.src = "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js";
                    s.onload = initApp;
                    document.head.appendChild(s);

                    let cropper = null;
                    let currentFileIndex = -1;
                    const image = document.getElementById('image');
                    const fileList = document.getElementById('fileList');
                    const saveBtn = document.getElementById('saveBtn');

                    window.rotate = (d) => { if(cropper) cropper.rotate(d); };
                    window.flip = (d) => { if(!cropper) return; if(d==='h') cropper.scaleX(-cropper.getData().scaleX||-1); if(d==='v') cropper.scaleY(-cropper.getData().scaleY||-1); };
                    window.reset = () => { if(cropper) cropper.reset(); };

                    function initApp() {
                        window.addEventListener('message', (e) => {
                            if (e.data.type === 'INIT') {
                                window.files = e.data.files;
                                renderFileList();
                                if (window.files.length > 0) loadFile(0);
                            }
                        });
                        if(window.opener) window.opener.postMessage({ type: 'READY' }, '*');
                    }

                    function renderFileList() {
                        fileList.innerHTML = '';
                        window.files.forEach((file, index) => {
                            const div = document.createElement('div');
                            div.className = \`file-item \${index === currentFileIndex ? 'active' : ''} \${file.cropped ? 'edited' : ''}\`;
                            let status = file.cropped ? '<span class="file-status">✓</span>' : '';
                            div.innerHTML = \`<div class="file-info">\${status}<span class="file-name">\${file.name}</span></div><button class="btn btn-danger">×</button>\`;
                            div.onclick = (e) => { if (e.target.tagName !== 'BUTTON') loadFile(index); };
                            div.querySelector('button').onclick = (e) => {
                                e.stopPropagation();
                                window.files.splice(index, 1);
                                if (window.files.length === 0) { window.close(); return; }
                                loadFile(Math.max(0, currentFileIndex >= index ? currentFileIndex - 1 : currentFileIndex));
                            };
                            fileList.appendChild(div);
                        });
                    }

                    function loadFile(index) {
                        if (cropper) cropper.destroy();
                        currentFileIndex = index;
                        renderFileList();

                        image.style.display = 'none';
                        const file = window.files[index];
                        const blob = file.cropped ? file.cropped.blob : file.original;
                        image.src = URL.createObjectURL(blob);

                        saveBtn.textContent = "Save Changes";
                        saveBtn.className = "btn btn-primary";
                        image.style.display = 'block';

                        cropper = new Cropper(image, { viewMode: 1, autoCropArea: 1 });
                    }

                    saveBtn.onclick = () => {
                        if (!cropper) return;
                        saveBtn.textContent = "Saving...";
                        cropper.getCroppedCanvas().toBlob((blob) => {
                            window.files[currentFileIndex].cropped = { blob: blob, data: cropper.getData() };
                            renderFileList();
                            saveBtn.textContent = "Saved!";
                            saveBtn.className = "btn btn-success";
                            setTimeout(() => { saveBtn.textContent = "Save Changes"; saveBtn.className = "btn btn-primary"; }, 1000);
                        });
                    };

                    document.getElementById('doneBtn').onclick = () => {
                        const btn = document.getElementById('doneBtn');
                        btn.textContent = "Processing..."; btn.disabled = true;
                        window.opener.postMessage({ type: 'DONE', files: window.files }, '*');
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `,

        openEditWindow: (parentWindow, textArea, progressBarContainer, progressBar) => {
            const fileInput = Utils.createInput('file', '', 'nskal-input');
            fileInput.multiple = true; fileInput.accept = 'image/*'; fileInput.style.display = 'none';

            fileInput.onchange = async (e) => {
                const rawFiles = Array.from(e.target.files);
                if (!rawFiles.length) return;

                const filesForEditor = rawFiles.map(f => ({ name: f.name, type: f.type, original: f, cropped: null }));
                const imgWindow = window.open('', '_blank', 'width=1100,height=800');

                imgWindow.document.open();
                imgWindow.document.write(Editor.getEditorHTML());
                imgWindow.document.close();

                setTimeout(() => imgWindow.postMessage({ type: 'INIT', files: filesForEditor }, '*'), 500);

                const messageHandler = async (event) => {
                    if (event.source !== imgWindow) return;
                    if (event.data.type === 'READY') imgWindow.postMessage({ type: 'INIT', files: filesForEditor }, '*');

                    if (event.data.type === 'DONE') {
                        window.removeEventListener('message', messageHandler);
                        const processedFiles = event.data.files;
                        const settings = Storage.loadSettings();
                        const links = await Editor.uploadFilesToOPU(processedFiles, progressBarContainer, progressBar, settings);

                        let insertText = '';
                        links.forEach(link => {
                            let txt = Formatter.generateOutput(link, settings.toggles, settings.customTemplate);
                            if (!settings.toggles.customCode && settings.customTag) {
                                const tag = settings.customTag.replace(/[<>]/g, '');
                                txt = `<${tag}>` + txt + `</${tag}>`;
                            }
                            insertText += txt + '\n';
                        });

                        if (textArea.selectionStart || textArea.selectionStart == '0') {
                            const startPos = textArea.selectionStart;
                            const endPos = textArea.selectionEnd;
                            textArea.value = textArea.value.substring(0, startPos) + insertText + textArea.value.substring(endPos, textArea.value.length);
                        } else { textArea.value += insertText; }
                    }
                };
                window.addEventListener('message', messageHandler);
            };
            fileInput.click();
        },

        uploadFilesToOPU: async (files, progressBarContainer, progressBar, settings) => {
            const uploadedLinks = [];
            progressBarContainer.style.display = 'block';
            const total = files.length;

            for (let i = 0; i < total; i++) {
                let fileToUpload;

                // CRITICAL FIX: Ensure Cropped Blob is wrapped in a File object with a name
                if (files[i].cropped && files[i].cropped.blob) {
                    fileToUpload = new File([files[i].cropped.blob], files[i].name, { type: 'image/jpeg' });
                } else {
                    fileToUpload = files[i].original;
                }

                if (settings.resizePercentage !== 100) {
                    fileToUpload = await ImageProcessor.resize(fileToUpload, settings.resizePercentage);
                }

                try {
                    // Pass the filename explicitly
                    await API.uploadFile(fileToUpload, (event) => {
                        if (event.lengthComputable) {
                            const singleProgress = (event.loaded / event.total) * 100;
                            const totalProgress = ((i * 100) + singleProgress) / total;
                            progressBar.style.width = `${totalProgress}%`;
                        }
                    }, fileToUpload.name); // Pass name here

                    const links = await API.fetchGalleryLinks(1);
                    if (links.length > 0) uploadedLinks.push(links[0]);

                } catch (err) { console.error('Upload error for file ' + i, err); }
            }

            progressBarContainer.style.display = 'none';
            progressBar.style.width = '0%';
            return uploadedLinks;
        }
    };

    // ==========================================
    // MODULE 6: UI GENERATION
    // ==========================================
    const UI = {
        createSettingsPanel: () => {
            const container = document.createElement('div');
            container.id = 'nskalSettingsContainer'; container.className = 'nskal-settings-overlay';
            const modal = document.createElement('div'); modal.className = 'nskal-settings-modal';

            const header = document.createElement('div'); header.className = 'nskal-settings-header';
            header.innerHTML = `<div class="nskal-settings-title">OPU NSKAL Settings</div>`;
            const closeBtn = document.createElement('button'); closeBtn.className = 'nskal-close-btn';
            closeBtn.innerHTML = '&times;'; closeBtn.onclick = () => container.style.display = 'none';
            header.appendChild(closeBtn); modal.appendChild(header);

            const content = document.createElement('div');
            let currentSettings = Storage.loadSettings();

            // Resize Input
            const resizeRow = document.createElement('div'); resizeRow.className = 'input-row';
            resizeRow.innerHTML = `<label style="width:120px">Resize (%):</label>`;
            const resizeInput = Utils.createInput('number', '100', 'nskal-input', currentSettings.resizePercentage);
            resizeInput.style.width = '60px';
            resizeInput.onchange = (e) => { currentSettings.resizePercentage = e.target.value; Storage.saveSettings(currentSettings); };
            resizeRow.appendChild(resizeInput); content.appendChild(resizeRow);

            // Custom Tag Input
            const tagRow = document.createElement('div'); tagRow.className = 'input-row';
            tagRow.innerHTML = `<label style="width:120px">Wrapper Tag:</label>`;
            const tagInput = Utils.createInput('text', '<p>', 'nskal-input', currentSettings.customTag);
            tagInput.onchange = (e) => { currentSettings.customTag = e.target.value; Storage.saveSettings(currentSettings); };
            tagRow.appendChild(tagInput); content.appendChild(tagRow);

            // Output Formats
            const formatsDiv = document.createElement('div'); formatsDiv.style.marginBottom = '20px';
            formatsDiv.innerHTML = `<div style="font-weight:bold; margin-bottom:10px">Output Format</div>`;

            const formatOptions = [
                { key: 'url', label: 'URL Only' }, { key: 'imgSrc', label: '<img> Tag' },
                { key: 'aHref', label: 'Linked Image' }, { key: 'aHrefImg', label: 'Thumb -> Full' },
                { key: 'customCode', label: 'Custom Code' }
            ];

            const previewBox = document.createElement('div'); previewBox.className = 'preview-box';
            const updatePreview = () => {
                const dummyLink = { full: 'https://opu.peklo.biz/p/23/10/18/1234.jpg' };
                let txt = Formatter.generateOutput(dummyLink, currentSettings.toggles, currentSettings.customTemplate);
                if (!currentSettings.toggles.customCode && currentSettings.customTag) {
                    const tag = currentSettings.customTag.replace(/[<>]/g, '');
                    txt = `<${tag}>` + txt + `</${tag}>`;
                }
                previewBox.textContent = txt;
            };

            const toggleContainer = document.createElement('div');
            toggleContainer.style.display = 'flex'; toggleContainer.style.flexWrap = 'wrap'; toggleContainer.style.gap = '10px';

            formatOptions.forEach(opt => {
                const btn = Utils.createToggle(opt.label, currentSettings.toggles[opt.key], (e) => {
                    Object.keys(currentSettings.toggles).forEach(k => {
                        if (['width','height','widthValue','heightValue'].indexOf(k) === -1) currentSettings.toggles[k] = false;
                    });
                    currentSettings.toggles[opt.key] = true;
                    Array.from(toggleContainer.children).forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    Storage.saveSettings(currentSettings);
                    updatePreview();
                });
                toggleContainer.appendChild(btn);
            });
            formatsDiv.appendChild(toggleContainer); content.appendChild(formatsDiv);

            // Custom Code Template
            const customCodeRow = document.createElement('div'); customCodeRow.className = 'input-row';
            customCodeRow.innerHTML = `<label style="width:120px">Custom Tpl:</label>`;
            const customInput = Utils.createInput('text', '[url]', 'nskal-input', currentSettings.customTemplate);
            customInput.style.flex = '1';
            customInput.onchange = (e) => { currentSettings.customTemplate = e.target.value; Storage.saveSettings(currentSettings); updatePreview(); };
            customCodeRow.appendChild(customInput); content.appendChild(customCodeRow);

            // Dimensions
            const dimRow = document.createElement('div'); dimRow.className = 'input-row';
            const wCheck = document.createElement('input'); wCheck.type = 'checkbox'; wCheck.checked = currentSettings.toggles.width;
            const wVal = Utils.createInput('text', 'width', 'nskal-input', currentSettings.toggles.widthValue);
            wVal.style.width = '50px'; wVal.style.marginRight = '15px';
            const hCheck = document.createElement('input'); hCheck.type = 'checkbox'; hCheck.checked = currentSettings.toggles.height;
            const hVal = Utils.createInput('text', 'height', 'nskal-input', currentSettings.toggles.heightValue);
            hVal.style.width = '50px';

            const saveDims = () => {
                currentSettings.toggles.width = wCheck.checked; currentSettings.toggles.widthValue = wVal.value;
                currentSettings.toggles.height = hCheck.checked; currentSettings.toggles.heightValue = hVal.value;
                Storage.saveSettings(currentSettings); updatePreview();
            };
            wCheck.onchange = wVal.onchange = hCheck.onchange = hVal.onchange = saveDims;
            dimRow.append(wCheck, ' W: ', wVal, hCheck, ' H: ', hVal); content.appendChild(dimRow);

            content.appendChild(previewBox); modal.appendChild(content);
            container.appendChild(modal); document.body.appendChild(container);
            updatePreview();
        },

        injectButtons: (form, type) => {
            const toolsDiv = form.querySelector(CONFIG.selectors.toolsDiv);
            const textArea = form.querySelector(CONFIG.selectors.textArea);
            if (!toolsDiv || !textArea || toolsDiv.dataset.nskalInjected) return;
            toolsDiv.dataset.nskalInjected = 'true';

            const progContainer = document.createElement('div'); progContainer.className = 'nskal-progress-container';
            const progBar = document.createElement('div'); progBar.className = 'nskal-progress-bar';
            progContainer.appendChild(progBar);
            toolsDiv.parentNode.insertBefore(progContainer, toolsDiv);

            const btnWrapper = document.createElement('div');
            btnWrapper.style.display = 'inline-block'; btnWrapper.style.marginLeft = '10px';

            const upBtn = Utils.createButton(`nskal-up-${type}`, 'OPU Upload');
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'file'; hiddenInput.multiple = true; hiddenInput.accept = 'image/*'; hiddenInput.style.display = 'none';

            upBtn.onclick = async (e) => {
                e.preventDefault();
                const isLoggedIn = await API.checkLoginStatus();
                if (!isLoggedIn) { window.open(CONFIG.urls.opu.login, '_blank'); alert('Please log in to OPU first.'); return; }
                hiddenInput.click();
            };

            hiddenInput.onchange = async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                const settings = Storage.loadSettings();
                const fileObjs = files.map(f => ({ name: f.name, original: f, cropped: null }));
                const links = await Editor.uploadFilesToOPU(fileObjs, progContainer, progBar, settings);

                let insertText = '';
                links.forEach(link => {
                    let txt = Formatter.generateOutput(link, settings.toggles, settings.customTemplate);
                     if (!settings.toggles.customCode && settings.customTag) {
                        const tag = settings.customTag.replace(/[<>]/g, '');
                        txt = `<${tag}>` + txt + `</${tag}>`;
                    }
                    insertText += txt + '\n';
                });

                if (textArea.selectionStart || textArea.selectionStart == '0') {
                    const startPos = textArea.selectionStart; const endPos = textArea.selectionEnd;
                    textArea.value = textArea.value.substring(0, startPos) + insertText + textArea.value.substring(endPos, textArea.value.length);
                } else { textArea.value += insertText; }
            };

            const editBtn = Utils.createButton(`nskal-edit-${type}`, 'Edit & Upload');
            editBtn.onclick = async (e) => {
                e.preventDefault();
                const isLoggedIn = await API.checkLoginStatus();
                if (!isLoggedIn) { window.open(CONFIG.urls.opu.login, '_blank'); alert('Please log in to OPU first.'); return; }
                Editor.openEditWindow(window, textArea, progContainer, progBar);
            };

            const setBtn = Utils.createButton(`nskal-set-${type}`, '⚙');
            setBtn.onclick = (e) => {
                e.preventDefault();
                const panel = document.getElementById('nskalSettingsContainer');
                if (panel) panel.style.display = 'flex'; else UI.createSettingsPanel();
            };

            btnWrapper.append(upBtn, editBtn, setBtn, hiddenInput);
            toolsDiv.appendChild(btnWrapper);
        }
    };

    // ==========================================
    // MODULE 7: MAIN INITIALIZATION
    // ==========================================
    const Main = {
        init: () => {
            GM_addStyle(STYLES);
            UI.createSettingsPanel();

            const tweakOdeslatButton = () => {}; // Tweak hook if needed
            tweakOdeslatButton(); window.addEventListener('resize', tweakOdeslatButton);

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (!mutation.addedNodes.length) return;
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches(CONFIG.selectors.mainPostForm)) UI.injectButtons(node, 'main');
                        else if (node.querySelectorAll) node.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));

                        if (node.matches && node.matches(CONFIG.selectors.replyForm)) UI.injectButtons(node, 'reply');
                        else if (node.querySelectorAll) node.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });

            document.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));
            document.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));
        }
    };

    if (window.location.hostname === 'www.okoun.cz') Main.init();
    GM_registerMenuCommand('Open OPU NSKAL Settings', () => {
        const panel = document.getElementById('nskalSettingsContainer');
        if (panel) panel.style.display = 'flex';
    });
})();

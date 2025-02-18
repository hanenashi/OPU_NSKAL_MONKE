import { createFileInput, createImageList, createCropWindow, handleImageLoad } from './helpers.js';

export const createSettingsPanel = (settings, saveCallback) => {
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
};

export const createEditWindow = () => {
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
};

export const addFileToList = (editWindow, file, index) => {
    const fileList = editWindow.document.getElementById('fileList');
    const editFileItem = document.createElement('li');
    editFileItem.className = 'edit-file-item';
    editFileItem.dataset.index = index;

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
        openCropWindow(file, img.src, editFileItem, index);
    });
    actions.appendChild(cropButton);

    editFileItem.appendChild(img);
    editFileItem.appendChild(fileInfo);
    editFileItem.appendChild(actions);
    fileList.appendChild(editFileItem);
};

export const openCropWindow = (file, imgSrc, editFileItem, index) => {
    const cropWindow = window.open('', '_blank');
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
            <button id="cropConfirmButton" class="nskal-button">Confirm Crop</button>
            <script>
                const cropImage = document.getElementById('cropImage');
                const cropConfirmButton = document.getElementById('cropConfirmButton');
                let cropper;

                function loadCropperJs() {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js';
                    script.onload = () => {
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
                            const canvas = cropper.getCroppedCanvas();
                            canvas.toBlob((blob) => {
                                const croppedFile = new File([blob], '${file.name}', { type: '${file.type}' });
                                window.opener.postMessage({
                                    type: 'croppedFile',
                                    file: croppedFile,
                                    index: ${index}
                                }, '*');
                            }, '${file.type}');
                        });
                    };
                    document.head.appendChild(script);
                }

                function loadCropperCss() {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css';
                    document.head.appendChild(link);
                }

                loadCropperCss();
                loadCropperJs();

                window.addEventListener('message', (event) => {
                    if (event.data.type === 'croppedFile') {
                        setTimeout(() => {
                            window.close();
                        }, 1000);
                    }
                });
            </script>
        </body>
        </html>
    `);
    cropWindow.document.close();
};

export const updatePreview = (links, settings) => {
    const previewContainer = document.getElementById('opuNskalPreview');
    if (!previewContainer) return;

    const customTag = settings.customTag || '<p>';
    const imgTags = links.map(link => generateOutputFormat(link, settings.toggles)).join(`\n\n${customTag}\n\n`);
    previewContainer.innerHTML = imgTags;
};

export const generateOutputFormat = (link, toggles) => {
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
};

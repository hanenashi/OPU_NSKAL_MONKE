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
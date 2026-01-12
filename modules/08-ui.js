window.UI = {
    createSettingsPanel: () => {
        if (document.getElementById('nskalSettingsContainer')) return;
        
        const container = document.createElement('div');
        container.id = 'nskalSettingsContainer'; 
        container.className = 'nskal-settings-overlay';

        const modal = document.createElement('div'); 
        modal.className = 'nskal-settings-modal';

        // Header
        const header = document.createElement('div');
        header.style.cssText = "display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #e69138; padding-bottom:10px";
        header.innerHTML = `<b style="font-size:16px; color:#b45f06">NSKAL CONFIGURATION</b>`;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖';
        closeBtn.style.cssText = "border:none; background:none; cursor:pointer; font-size:18px";
        closeBtn.onclick = () => container.style.display = 'none';
        
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Content
        const content = document.createElement('div');
        let currentSettings = window.Storage.loadSettings();

        // 1. Resize
        const resizeRow = document.createElement('div'); resizeRow.className = 'input-row';
        resizeRow.innerHTML = `<label style="width:100px">Resize (%):</label>`;
        const resizeInput = window.Utils.createInput('number', '100', 'nskal-input', currentSettings.resizePercentage);
        resizeInput.style.width = '60px';
        resizeInput.onchange = (e) => { currentSettings.resizePercentage = e.target.value; window.Storage.saveSettings(currentSettings); };
        resizeRow.appendChild(resizeInput);
        content.appendChild(resizeRow);

        // 2. Custom Tag (Append)
        const tagRow = document.createElement('div'); tagRow.className = 'input-row';
        tagRow.innerHTML = `<label style="width:100px">Append Tag:</label>`;
        const tagInput = window.Utils.createInput('text', '<br>', 'nskal-input', currentSettings.customTag);
        tagInput.style.width = '100px';
        tagInput.onchange = (e) => { currentSettings.customTag = e.target.value; window.Storage.saveSettings(currentSettings); updatePreview(); };
        tagRow.appendChild(tagInput);
        content.appendChild(tagRow);

        // 3. Output Formats
        const formatsDiv = document.createElement('div'); 
        formatsDiv.style.marginBottom = '20px';
        formatsDiv.innerHTML = `<div style="font-weight:bold; margin:15px 0 10px 0; color:#b45f06">Output Format</div>`;

        const formatOptions = [
            { key: 'url', label: 'URL Only' }, { key: 'imgSrc', label: '<img> Tag' },
            { key: 'aHref', label: 'Linked Image' }, { key: 'aHrefImg', label: 'Thumb -> Full' },
            { key: 'customCode', label: 'Custom Code' }
        ];

        // Preview Box
        const previewBox = document.createElement('div'); 
        previewBox.className = 'preview-box';
        
        const updatePreview = () => {
            const dummyLink = { full: 'https://opu.peklo.biz/p/23/10/18/1234.jpg' };
            let txt = window.Formatter.generateOutput(dummyLink, currentSettings.toggles, currentSettings.customTemplate);
            
            // FIXED TAG LOGIC: Appends tag after image instead of wrapping
            if (!currentSettings.toggles.customCode && currentSettings.customTag) {
                txt = txt + currentSettings.customTag;
            }
            previewBox.textContent = txt;
        };

        const toggleContainer = document.createElement('div');
        toggleContainer.style.display = 'flex'; toggleContainer.style.flexWrap = 'wrap';
        
        formatOptions.forEach(opt => {
            const btn = window.Utils.createToggle(opt.label, currentSettings.toggles[opt.key], (e) => {
                Object.keys(currentSettings.toggles).forEach(k => {
                    if (['width','height','widthValue','heightValue'].indexOf(k) === -1) currentSettings.toggles[k] = false;
                });
                currentSettings.toggles[opt.key] = true;
                Array.from(toggleContainer.children).forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                window.Storage.saveSettings(currentSettings);
                updatePreview();
            });
            toggleContainer.appendChild(btn);
        });
        formatsDiv.appendChild(toggleContainer); 
        content.appendChild(formatsDiv);

        // 4. Custom Code Template
        const customCodeRow = document.createElement('div'); customCodeRow.className = 'input-row';
        customCodeRow.innerHTML = `<label style="width:100px">Custom Tpl:</label>`;
        const customInput = window.Utils.createInput('text', '[url]', 'nskal-input', currentSettings.customTemplate);
        customInput.style.flex = '1';
        customInput.onchange = (e) => { currentSettings.customTemplate = e.target.value; window.Storage.saveSettings(currentSettings); updatePreview(); };
        customCodeRow.appendChild(customInput); 
        content.appendChild(customCodeRow);

        // 5. Dimensions
        const dimRow = document.createElement('div'); dimRow.className = 'input-row';
        const wCheck = document.createElement('input'); wCheck.type = 'checkbox'; wCheck.checked = currentSettings.toggles.width;
        const wVal = window.Utils.createInput('text', 'width', 'nskal-input', currentSettings.toggles.widthValue);
        wVal.style.width = '50px'; wVal.style.marginRight = '15px';
        
        const hCheck = document.createElement('input'); hCheck.type = 'checkbox'; hCheck.checked = currentSettings.toggles.height;
        const hVal = window.Utils.createInput('text', 'height', 'nskal-input', currentSettings.toggles.heightValue);
        hVal.style.width = '50px';

        const saveDims = () => {
            currentSettings.toggles.width = wCheck.checked; currentSettings.toggles.widthValue = wVal.value;
            currentSettings.toggles.height = hCheck.checked; currentSettings.toggles.heightValue = hVal.value;
            window.Storage.saveSettings(currentSettings); updatePreview();
        };
        wCheck.onchange = wVal.onchange = hCheck.onchange = hVal.onchange = saveDims;
        dimRow.append(wCheck, ' Width: ', wVal, hCheck, ' Height: ', hVal); 
        content.appendChild(dimRow);

        content.appendChild(previewBox); 
        modal.appendChild(content);
        container.appendChild(modal); 
        document.body.appendChild(container);
        
        updatePreview();
    },

    injectButtons: (form, type) => {
        const tools = form.querySelector(window.CONFIG.selectors.toolsDiv);
        const textArea = form.querySelector(window.CONFIG.selectors.textArea);
        if (!tools || !textArea || tools.dataset.nskal) return; tools.dataset.nskal = '1';

        const pc = document.createElement('div'); pc.className = 'nskal-progress-container';
        const pb = document.createElement('div'); pb.className = 'nskal-progress-bar';
        pc.appendChild(pb); tools.parentNode.insertBefore(pc, tools);

        const wrap = document.createElement('div'); wrap.style.display = 'inline-block'; wrap.style.marginLeft = '10px';

        // 1. OPU Upload (Quick)
        const upBtn = window.Utils.createButton(`nskal-up-${type}`, 'OPU Upload');
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file'; hiddenInput.multiple = true; hiddenInput.accept = 'image/*'; hiddenInput.style.display = 'none';

        upBtn.onclick = async (e) => {
            e.preventDefault();
            const isLoggedIn = await window.API.checkLoginStatus();
            if (!isLoggedIn) { window.open(window.CONFIG.urls.opu.login, '_blank'); alert('Please log in to OPU first.'); return; }
            hiddenInput.click();
        };

        hiddenInput.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const settings = window.Storage.loadSettings();
            const fileObjs = files.map(f => ({ name: f.name, original: f, cropped: null }));
            const links = await window.Editor.uploadFilesToOPU(fileObjs, pc, pb, settings);

            let insertText = '';
            links.forEach(link => {
                let txt = window.Formatter.generateOutput(link, settings.toggles, settings.customTemplate);
                // Fix: Append tag
                if (!settings.toggles.customCode && settings.customTag) {
                    txt += settings.customTag;
                }
                insertText += txt + '\n';
            });
            if (textArea.selectionStart || textArea.selectionStart == '0') {
                const startPos = textArea.selectionStart; const endPos = textArea.selectionEnd;
                textArea.value = textArea.value.substring(0, startPos) + insertText + textArea.value.substring(endPos, textArea.value.length);
            } else { textArea.value += insertText; }
        };

        // 2. Edit & Upload
        const editBtn = window.Utils.createButton(`nskal-edit-${type}`, 'Edit & Upload');
        editBtn.onclick = async (e) => {
            e.preventDefault();
            const isLoggedIn = await window.API.checkLoginStatus();
            if (!isLoggedIn) { window.open(window.CONFIG.urls.opu.login, '_blank'); alert('Please log in to OPU first.'); return; }
            window.Editor.openEditWindow(window, textArea, pc, pb);
        };

        // 3. Settings
        const setBtn = window.Utils.createButton(`nskal-set-${type}`, '⚙');
        setBtn.onclick = (e) => {
            e.preventDefault();
            const panel = document.getElementById('nskalSettingsContainer');
            if (panel) panel.style.display = 'flex'; else window.UI.createSettingsPanel();
        };

        wrap.append(upBtn, editBtn, setBtn, hiddenInput);
        tools.appendChild(wrap);
    }
};
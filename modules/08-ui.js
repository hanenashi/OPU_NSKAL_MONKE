window.UI = {
    createSettingsPanel: () => {
        if (document.getElementById('nskalSettingsContainer')) return;
        const panel = document.createElement('div');
        panel.id = 'nskalSettingsContainer';
        panel.className = 'nskal-settings-overlay';
        panel.innerHTML = `
            <div class="nskal-settings-modal">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #e69138; padding-bottom:5px">
                    <b style="color:#b45f06">NSKAL CONFIGURATION</b><button id="nskalClose" style="border:none; background:none; cursor:pointer;">✖</button>
                </div>
                <div id="nskalBody"></div>
            </div>`;
        document.body.appendChild(panel);
        panel.querySelector('#nskalClose').onclick = () => panel.style.display = 'none';
        window.UI.renderSettingsBody();
    },
    renderSettingsBody: () => {
        const s = window.Storage.loadSettings();
        const body = document.getElementById('nskalBody');
        body.innerHTML = `
            <div class="settings-row">Resize: <input type="number" id="n_res" class="nskal-input" value="${s.resizePercentage}" style="width:50px">%</div>
            <div class="settings-row">Tag: <input type="text" id="n_tag" class="nskal-input" value="${s.customTag}" style="width:80px"></div>
            <div id="n_formats" style="display:flex; gap:5px; flex-wrap:wrap; margin:10px 0;"></div>
            <div class="settings-row"><label><input type="checkbox" id="n_width_t" ${s.toggles.width?'checked':''}> Width:</label> <input type="text" id="n_width_v" class="nskal-input" value="${s.toggles.widthValue}" style="width:60px">px</div>
        `;
        const formats = [{k:'url', l:'LINK'}, {k:'imgSrc', l:'IMG'}, {k:'aHref', l:'LINKED IMG'}, {k:'aHrefImg', l:'THUMB'}, {k:'customCode', l:'CUSTOM'}];
        formats.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'nskal-toggle-btn' + (s.toggles[f.k] ? ' active' : '');
            btn.textContent = f.l;
            btn.onclick = () => {
                Object.keys(s.toggles).forEach(k => { if(k!=='width') s.toggles[k]=false; });
                s.toggles[f.k] = true; window.Storage.saveSettings(s); window.UI.renderSettingsBody();
            };
            body.querySelector('#n_formats').appendChild(btn);
        });
        body.querySelector('#n_res').onchange = (e) => { s.resizePercentage = e.target.value; window.Storage.saveSettings(s); };
        body.querySelector('#n_tag').onchange = (e) => { s.customTag = e.target.value; window.Storage.saveSettings(s); };
        body.querySelector('#n_width_t').onclick = (e) => { s.toggles.width = e.target.checked; window.Storage.saveSettings(s); };
        body.querySelector('#n_width_v').onchange = (e) => { s.toggles.widthValue = e.target.value; window.Storage.saveSettings(s); };
    },
    injectButtons: (form, type) => {
        const tools = form.querySelector(window.CONFIG.selectors.toolsDiv), textArea = form.querySelector(window.CONFIG.selectors.textArea);
        if (!tools || !textArea || tools.dataset.nskal) return; tools.dataset.nskal = '1';

        const pc = document.createElement('div'); pc.className = 'nskal-progress-container';
        const pb = document.createElement('div'); pb.className = 'nskal-progress-bar';
        pc.appendChild(pb); tools.parentNode.insertBefore(pc, tools);

        const wrap = document.createElement('div'); wrap.style.display = 'inline-block'; wrap.style.marginLeft = '10px';
        const qBtn = window.Utils.createButton('q-btn', 'NSKAL');
        const hIn = document.createElement('input'); hIn.type = 'file'; hIn.multiple = true; hIn.style.display = 'none';
        hIn.onchange = async (e) => {
            const s = window.Storage.loadSettings();
            const links = await window.Editor.uploadFilesToOPU(Array.from(e.target.files).map(f=>({original:f})), pc, pb, s);
            links.forEach(l => { textArea.value += window.Formatter.generateOutput(l, s.toggles, s.customTemplate) + '\n'; });
        };
        qBtn.onclick = (e) => { e.preventDefault(); hIn.click(); };

        const eBtn = window.Utils.createButton('e-btn', 'NSKAL Edit');
        eBtn.onclick = (e) => { e.preventDefault(); window.Editor.openEditWindow(window, textArea, pc, pb); };

        const sBtn = window.Utils.createButton('s-btn', '⚙');
        sBtn.onclick = (e) => { e.preventDefault(); document.getElementById('nskalSettingsContainer').style.display = 'flex'; };

        wrap.append(qBtn, eBtn, sBtn, hIn); tools.appendChild(wrap);
    }
};
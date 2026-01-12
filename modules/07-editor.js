window.Editor = {
    getEditorHTML: () => `
        <!DOCTYPE html>
        <html>
        <head>
            <title>NSKAL Mega Editor</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
            <style>
                body { font-family: -apple-system, sans-serif; margin:0; display:flex; height:100vh; background:#1e1e1e; color:#eee; overflow:hidden; }
                .sidebar { width:300px; background:#252526; border-right:1px solid #333; display:flex; flex-direction:column; }
                .sidebar-header { padding:15px; background:#333; font-weight:bold; font-size:13px; border-bottom:1px solid #444; }
                .sidebar-content { flex:1; overflow-y:auto; padding:10px; }
                .main-area { flex:1; display:flex; flex-direction:column; background:#111; }
                .file-item { background:#333; padding:10px; margin-bottom:8px; border-radius:6px; cursor:move; border:1px solid transparent; transition:0.2s; }
                .file-item.active { border-color:#e69138; background:#3d3d3d; box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
                .file-meta { font-size:10px; color:#999; margin-top:5px; }
                .controls { height:70px; background:#252526; border-top:1px solid #333; display:flex; align-items:center; justify-content:center; gap:8px; }
                .btn { padding:8px 14px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; color:white; background:#444; }
                .btn:hover { background:#555; }
                .btn-success { background:#2da042; }
                .btn-primary { background:#007acc; }
                img { max-width:100%; max-height:100%; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="sidebar-header">UPLOAD QUEUE (Reorder via Drag)</div>
                <div class="sidebar-content" id="fileList"></div>
                <div style="padding:15px; border-top:1px solid #333"><button id="doneBtn" class="btn btn-success" style="width:100%">UPLOAD ALL</button></div>
            </div>
            <div class="main-area">
                <div style="flex:1; display:flex; justify-content:center; align-items:center; padding:20px;"><img id="image" src=""></div>
                <div class="controls">
                    <button class="btn" onclick="cropper.rotate(-90)">↺</button>
                    <button class="btn" onclick="cropper.rotate(90)">↻</button>
                    <button class="btn" onclick="cropper.scaleX(-cropper.getData().scaleX||-1)">↔</button>
                    <button class="btn" onclick="cropper.scaleY(-cropper.getData().scaleY||-1)">↕</button>
                    <button class="btn" onclick="cropper.reset()">Reset</button>
                    <div style="width:2px; height:30px; background:#444; margin:0 10px;"></div>
                    <button class="btn btn-primary" id="saveBtn">Save Changes</button>
                </div>
            </div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
            <script>
                let cropper = null, currentIdx = -1, draggedIdx = null;
                const fileList = document.getElementById('fileList');

                function formatSize(b) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }

                function render() {
                    fileList.innerHTML = '';
                    window.files.forEach((f, i) => {
                        const div = document.createElement('div');
                        div.className = 'file-item ' + (i === currentIdx ? 'active' : '');
                        div.draggable = true;
                        div.innerHTML = '<div>' + (f.cropped ? '⭐ ' : '') + '<b>' + (i+1) + '.</b> ' + f.name + '</div>' +
                                         '<div class="file-meta">' + f.w + 'x' + f.h + 'px | ' + formatSize(f.size) + '</div>';
                        
                        div.onclick = () => load(i);
                        div.ondragstart = () => { draggedIdx = i; div.style.opacity = '0.5'; };
                        div.ondragend = () => { div.style.opacity = '1'; };
                        div.ondragover = (e) => { e.preventDefault(); div.style.borderTop = "3px solid #e69138"; };
                        div.ondragleave = () => { div.style.borderTop = "none"; };
                        div.ondrop = (e) => {
                            e.preventDefault();
                            const item = window.files.splice(draggedIdx, 1)[0];
                            window.files.splice(i, 0, item);
                            render();
                        };
                        fileList.appendChild(div);
                    });
                }

                function load(i) {
                    if(cropper) cropper.destroy();
                    currentIdx = i; render();
                    const f = window.files[i];
                    const img = document.getElementById('image');
                    img.src = URL.createObjectURL(f.cropped ? f.cropped.blob : f.original);
                    cropper = new Cropper(img, { viewMode: 1, autoCropArea: 1 });
                }

                document.getElementById('saveBtn').onclick = () => {
                    cropper.getCroppedCanvas().toBlob(b => { 
                        window.files[currentIdx].cropped = {blob: b}; 
                        render(); 
                    }, 'image/jpeg', 0.9);
                };

                document.getElementById('doneBtn').onclick = () => {
                    window.opener.postMessage({ type: 'DONE', files: window.files }, '*');
                    window.close();
                };

                window.addEventListener('message', e => { 
                    if(e.data.type === 'INIT') { window.files = e.data.files; render(); if(window.files.length) load(0); }
                });
                window.opener.postMessage({ type: 'READY' }, '*');
            </script>
        </body>
        </html>
    `,

    openEditWindow: (parentWindow, textArea, progCont, progBar) => {
        const input = document.createElement('input');
        input.type = 'file'; input.multiple = true; input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const raw = Array.from(e.target.files);
            const filesForEditor = await Promise.all(raw.map(f => new Promise(res => {
                const img = new Image();
                img.onload = () => { 
                    res({ name: f.name, size: f.size, w: img.width, h: img.height, original: f, cropped: null }); 
                    URL.revokeObjectURL(img.src); 
                };
                img.src = URL.createObjectURL(f);
            })));

            const win = window.open('', '_blank', 'width=1200,height=850');
            win.document.write(window.Editor.getEditorHTML());
            win.document.close();

            const handler = async (ev) => {
                if (ev.source !== win) return;
                if (ev.data.type === 'READY') win.postMessage({ type: 'INIT', files: filesForEditor }, '*');
                if (ev.data.type === 'DONE') {
                    window.removeEventListener('message', handler);
                    const settings = window.Storage.loadSettings();
                    const links = await window.Editor.uploadFilesToOPU(ev.data.files, progCont, progBar, settings);
                    
                    let insertText = '';
                    links.forEach(link => {
                        let txt = window.Formatter.generateOutput(link, settings.toggles, settings.customTemplate);
                        // FIXED TAG LOGIC: Append tag (e.g. <br>) instead of wrapping
                        if (!settings.toggles.customCode && settings.customTag) {
                            txt = txt + settings.customTag;
                        }
                        insertText += txt + '\n';
                    });
                    textArea.value += insertText;
                }
            };
            window.addEventListener('message', handler);
        };
        input.click();
    },

    uploadFilesToOPU: async (files, progCont, progBar, settings) => {
        const uploadedLinks = [];
        progCont.style.display = 'block';
        for (let i = 0; i < files.length; i++) {
            let f = files[i].cropped ? new File([files[i].cropped.blob], files[i].name) : files[i].original;
            if (settings.resizePercentage !== 100) f = await window.ImageProcessor.resize(f, settings.resizePercentage);
            await window.API.uploadFile(f, (ev) => {
                if (ev.lengthComputable) progBar.style.width = `${((i * 100) + (ev.loaded/ev.total*100)) / files.length}%`;
            });
            const links = await window.API.fetchGalleryLinks(1);
            if (links.length) uploadedLinks.push(links[0]);
        }
        progCont.style.display = 'none';
        progBar.style.width = '0%';
        return uploadedLinks;
    }
};
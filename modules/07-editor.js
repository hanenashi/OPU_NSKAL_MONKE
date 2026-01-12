const Editor = {
    getEditorHTML: () => `
        <!DOCTYPE html>
        <html>
        <head>
            <title>NSKAL Editor</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
            <style>
                body { font-family: sans-serif; margin: 0; display: flex; height: 100vh; background: #222; color: #ddd; }
                .sidebar { width: 280px; background: #1e1e1e; border-right: 1px solid #333; display: flex; flex-direction: column; }
                .sidebar-content { flex: 1; overflow-y: auto; padding: 10px; }
                .main-area { flex: 1; display: flex; flex-direction: column; background: #111; }
                .file-item { background: #2d2d2d; padding: 10px; margin-bottom: 8px; border-radius: 4px; cursor: move; }
                .file-item.active { border-left: 3px solid #007acc; background: #333; }
                .file-meta { font-size: 10px; color: #888; }
                .btn { padding: 8px; border: none; border-radius: 4px; cursor: pointer; color: white; background: #444; }
                .btn-success { background: #2da042; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="sidebar-content" id="fileList"></div>
                <div style="padding:10px"><button id="doneBtn" class="btn btn-success" style="width:100%">Upload All</button></div>
            </div>
            <div class="main-area">
                <div style="flex:1; display:flex; justify-content:center; align-items:center"><img id="image" src=""></div>
                <div style="height:60px; background:#1e1e1e; display:flex; align-items:center; justify-content:center; gap:10px">
                    <button class="btn" onclick="cropper.rotate(90)">↻</button>
                    <button class="btn" style="background:#007acc" id="saveBtn">Save Crop</button>
                </div>
            </div>
            <script>
                let cropper = null, currentIdx = -1, draggedIdx = null;
                const fileList = document.getElementById('fileList');

                function formatSize(b) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }

                function render() {
                    fileList.innerHTML = '';
                    window.files.forEach((f, i) => {
                        const div = document.createElement('div');
                        div.className = \`file-item \${i === currentIdx ? 'active' : ''}\`;
                        div.draggable = true;
                        div.innerHTML = \`<div>\${f.cropped ? '✓ ' : ''}\${f.name}</div>
                                         <div class="file-meta">\${f.w}x\${f.h} px | \${formatSize(f.size)}</div>\`;
                        div.onclick = () => load(i);
                        div.ondragstart = () => draggedIdx = i;
                        div.ondragover = (e) => { e.preventDefault(); div.style.borderTop = "2px solid #007acc"; };
                        div.ondragleave = () => div.style.borderTop = "none";
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
                    cropper = new Cropper(img, { viewMode: 1 });
                }

                document.getElementById('saveBtn').onclick = () => {
                    cropper.getCroppedCanvas().toBlob(b => { window.files[currentIdx].cropped = {blob: b}; render(); }, 'image/jpeg');
                };

                document.getElementById('doneBtn').onclick = () => {
                    window.opener.postMessage({ type: 'DONE', files: window.files }, '*');
                };

                window.addEventListener('message', e => { if(e.data.type === 'INIT') { window.files = e.data.files; render(); load(0); }});
                window.opener.postMessage({ type: 'READY' }, '*');
            </script>
        </body>
        </html>
    `,

    openEditWindow: (parentWindow, textArea, progCont, progBar) => {
        const input = document.createElement('input');
        input.type = 'file'; input.multiple = true; input.accept = 'image/*';
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            // Pre-scan metadata
            const filesForEditor = await Promise.all(files.map(f => new Promise(res => {
                const img = new Image();
                img.onload = () => { res({ name: f.name, size: f.size, w: img.width, h: img.height, original: f, cropped: null }); URL.revokeObjectURL(img.src); };
                img.src = URL.createObjectURL(f);
            })));

            const win = window.open('', '_blank', 'width=1100,height=800');
            win.document.write(Editor.getEditorHTML());
            win.document.close();

            window.addEventListener('message', async function handler(ev) {
                if (ev.source !== win) return;
                if (ev.data.type === 'READY') win.postMessage({ type: 'INIT', files: filesForEditor }, '*');
                if (ev.data.type === 'DONE') {
                    window.removeEventListener('message', handler);
                    const settings = Storage.loadSettings();
                    const links = await Editor.uploadFilesToOPU(ev.data.files, progCont, progBar, settings);
                    // Formatting logic as per original modules [cite: 324, 375]
                }
            });
        };
        input.click();
    },

    uploadFilesToOPU: async (files, progCont, progBar, settings) => {
        const uploadedLinks = [];
        progCont.style.display = 'block';
        for (let i = 0; i < files.length; i++) {
            let fileToUpload = files[i].cropped ? new File([files[i].cropped.blob], files[i].name) : files[i].original;
            await API.uploadFile(fileToUpload, (ev) => {
                if (ev.lengthComputable) progBar.style.width = `${((i * 100) + (ev.loaded/ev.total*100)) / files.length}%`;
            });
            const links = await API.fetchGalleryLinks(1);
            if (links.length) uploadedLinks.push(links[0]);
        }
        progCont.style.display = 'none';
        return uploadedLinks;
    }
};
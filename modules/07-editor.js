window.Editor = {
  getEditorHTML: () => `
<!DOCTYPE html>
<html>
<head>
  <title>NSKAL Mega Editor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
  <style>
    :root{
      --sidebar-w: 300px;
      --toolbar-h: 72px;
      --bg: #1e1e1e;
      --panel: #252526;
      --border: #333;
      --accent: #e69138;
    }

    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: #eee;
      overflow: hidden;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }

    body {
      height: 100dvh; /* dynamic viewport height for mobile */
      display: flex;
    }

    .sidebar {
      width: var(--sidebar-w);
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      min-width: 240px;
    }

    .sidebar-header {
      padding: 14px;
      background: #2e2e2e;
      font-weight: 700;
      font-size: 13px;
      border-bottom: 1px solid #444;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .sidebar-content {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 10px;
      -webkit-overflow-scrolling: touch;
    }

    .sidebar-footer {
      padding: 14px;
      border-top: 1px solid var(--border);
      background: rgba(0,0,0,0.12);
    }

    .main-area {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      background: #111;
      min-width: 0;
      position: relative;
    }

    .topbar {
      height: 48px;
      flex: 0 0 auto;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(0,0,0,0.35);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .topbar .title {
      font-weight: 700;
      font-size: 13px;
      opacity: 0.95;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage {
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      touch-action: none; /* we control pointer gestures */
    }

    #image {
      max-width: 100%;
      max-height: 100%;
      display: block;
      user-select: none;
      -webkit-user-drag: none;
      touch-action: none;
    }

    .controls {
      flex: 0 0 auto;
      height: var(--toolbar-h);
      background: rgba(20,20,20,0.96);
      border-top: 1px solid rgba(255,255,255,0.10);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px)) 10px;
      z-index: 99999; /* above cropper */
    }

    .controls .left, .controls .right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .controls .left { flex: 1 1 auto; min-width: 0; }
    .controls .right { flex: 0 0 auto; }

    .divider {
      width: 2px;
      height: 34px;
      background: rgba(255,255,255,0.15);
      margin: 0 6px;
      border-radius: 999px;
    }

    .file-item {
      background: #333;
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 10px;
      cursor: move;
      border: 1px solid transparent;
      transition: 0.15s;
      user-select: none;
      touch-action: manipulation;
    }

    .file-item.active {
      border-color: var(--accent);
      background: #3d3d3d;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.5);
    }

    .file-meta { font-size: 11px; color: #aaa; margin-top: 6px; }

    .btn {
      height: 46px;
      min-width: 46px;
      padding: 0 14px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      cursor: pointer;
      font-weight: 800;
      font-size: 16px;
      color: #fff;
      background: rgba(255,255,255,0.08);
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: translateY(1px); }
    .btn:hover { background: rgba(255,255,255,0.12); }

    .btn-success {
      background: rgba(45,160,66,0.95);
      border-color: rgba(45,160,66,0.95);
    }
    .btn-primary {
      background: rgba(0,122,204,0.95);
      border-color: rgba(0,122,204,0.95);
    }
    .btn-ghost {
      background: transparent;
      border-color: rgba(255,255,255,0.18);
    }

    .btn-mode {
      padding: 0 10px;
      font-size: 18px;
      letter-spacing: 0;
    }

    /* ===== Mobile layout ===== */
    @media (max-width: 820px) {
      body { display: block; }

      .topbar { display: flex; }

      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100dvh;
        width: min(88vw, 340px);
        transform: translateX(-105%);
        transition: transform 0.18s ease;
        z-index: 99998;
        box-shadow: 6px 0 30px rgba(0,0,0,0.55);
      }

      body.queue-open .sidebar { transform: translateX(0); }

      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 99997;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease;
      }
      body.queue-open .backdrop {
        opacity: 1;
        pointer-events: auto;
      }
    }
  </style>
</head>
<body>
  <div class="backdrop" id="backdrop"></div>

  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <span>UPLOAD QUEUE</span>
      <button class="btn btn-ghost" id="closeQueueBtn" style="height:38px; min-width:auto; padding:0 10px; font-size:14px; display:none;">Close</button>
    </div>
    <div class="sidebar-content" id="fileList"></div>
    <div class="sidebar-footer">
      <button id="doneBtn" class="btn btn-success" style="width:100%">UPLOAD ALL</button>
    </div>
  </div>

  <div class="main-area">
    <div class="topbar">
      <button class="btn btn-ghost" id="openQueueBtn" style="height:38px; min-width:auto; padding:0 10px; font-size:14px;">Queue</button>
      <div class="title" id="topTitle">NSKAL Mega Editor</div>
      <button class="btn btn-ghost" id="resetBtnTop" style="height:38px; min-width:auto; padding:0 10px; font-size:14px;">Reset</button>
    </div>

    <div class="stage" id="stage">
      <img id="image" src="">
    </div>

    <div class="controls">
      <div class="left">
        <button class="btn" id="btnRotateL" title="Rotate left">↺</button>
        <button class="btn" id="btnRotateR" title="Rotate right">↻</button>
        <button class="btn" id="btnFlipH" title="Flip horizontal">↔</button>
        <button class="btn" id="btnFlipV" title="Flip vertical">↕</button>
        <button class="btn" id="btnReset" title="Reset">Reset</button>

        <!-- One-thumb mode cycler: MOVE -> CROP -> ZOOM -->
        <button class="btn btn-mode" id="btnMode" title="Mode (Move/Crop/Zoom)">✋</button>

        <div class="divider"></div>
        <button class="btn btn-primary" id="saveBtn" title="Save crop">💾</button>
      </div>
      <div class="right">
        <button class="btn btn-success" id="nextBtn" title="Next image">➡️</button>
      </div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
  <script>
    let cropper = null, currentIdx = -1, draggedIdx = null;
    const fileList = document.getElementById('fileList');
    const img = document.getElementById('image');
    const topTitle = document.getElementById('topTitle');
    const stage = document.getElementById('stage');

    // ===== Mode handling =====
    // MOVE: drag image
    // CROP: drag crop box / create crop area
    // ZOOM: drag up/down to zoom (pinch still works)
    let uiMode = 'MOVE'; // MOVE | CROP | ZOOM
    let zoomPointerId = null;
    let zoomStartY = 0;
    let zoomStartRatio = 1;

    const MODE_ICONS = {
      MOVE: "✋",
      CROP: "▢",
      ZOOM: "🔍"
    };

    function setMode(mode) {
      uiMode = mode;
      const btn = document.getElementById('btnMode');
      btn.textContent = MODE_ICONS[mode] || mode;

      zoomPointerId = null;

      if (!cropper) return;

      if (mode === 'MOVE') {
        cropper.setDragMode('move');
      } else if (mode === 'CROP') {
        cropper.setDragMode('crop');
      } else if (mode === 'ZOOM') {
        cropper.setDragMode('none'); // we'll hijack drag for zoom
      }
    }

    function cycleMode() {
      if (uiMode === 'MOVE') setMode('CROP');
      else if (uiMode === 'CROP') setMode('ZOOM');
      else setMode('MOVE');
    }

    function formatSize(b) {
      return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
    }

    function setQueueOpen(open) {
      if (open) document.body.classList.add('queue-open');
      else document.body.classList.remove('queue-open');
    }

    function isMobile() {
      return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
    }

    function updateMobileButtons() {
      const closeBtn = document.getElementById('closeQueueBtn');
      closeBtn.style.display = isMobile() ? 'inline-flex' : 'none';
    }

    function render() {
      fileList.innerHTML = '';
      window.files.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = 'file-item ' + (i === currentIdx ? 'active' : '');
        div.draggable = true;

        const star = f.cropped ? '⭐ ' : '';
        div.innerHTML =
          '<div>' + star + '<b>' + (i+1) + '.</b> ' + escapeHtml(f.name) + '</div>' +
          '<div class="file-meta">' + f.w + 'x' + f.h + 'px | ' + formatSize(f.size) + '</div>';

        div.onclick = () => load(i);

        div.ondragstart = () => { draggedIdx = i; div.style.opacity = '0.5'; };
        div.ondragend = () => { div.style.opacity = '1'; };
        div.ondragover = (e) => { e.preventDefault(); div.style.borderTop = "3px solid var(--accent)"; };
        div.ondragleave = () => { div.style.borderTop = "none"; };
        div.ondrop = (e) => {
          e.preventDefault();
          div.style.borderTop = "none";
          const item = window.files.splice(draggedIdx, 1)[0];
          window.files.splice(i, 0, item);
          render();
        };

        fileList.appendChild(div);
      });

      if (currentIdx >= 0 && window.files[currentIdx]) {
        topTitle.textContent = (currentIdx+1) + '/' + window.files.length + ' - ' + window.files[currentIdx].name;
      } else {
        topTitle.textContent = 'NSKAL Mega Editor';
      }
    }

    function destroyCropper() {
      if (cropper) {
        try { cropper.destroy(); } catch (e) {}
        cropper = null;
      }
    }

    function makeCropper() {
      destroyCropper();
      cropper = new Cropper(img, {
        viewMode: 1,
        autoCropArea: 0.95,
        responsive: true,
        background: false,
        guides: false,
        center: true,
        dragMode: 'move',
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
      });

      setMode(uiMode);

      setTimeout(() => { try { cropper.resize(); } catch(e) {} }, 80);
    }

    function load(i) {
      currentIdx = i;
      render();

      const f = window.files[i];
      const srcBlob = (f.cropped && f.cropped.blob) ? f.cropped.blob : f.original;
      img.src = URL.createObjectURL(srcBlob);

      img.onload = () => {
        makeCropper();
        if (isMobile()) setQueueOpen(false);
      };
    }

    function flipX() {
      if (!cropper) return;
      const d = cropper.getData();
      const cur = (typeof d.scaleX === 'number') ? d.scaleX : 1;
      cropper.scaleX(cur === 1 ? -1 : 1);
    }

    function flipY() {
      if (!cropper) return;
      const d = cropper.getData();
      const cur = (typeof d.scaleY === 'number') ? d.scaleY : 1;
      cropper.scaleY(cur === 1 ? -1 : 1);
    }

    function saveCurrent() {
      if (!cropper || currentIdx < 0) return;
      cropper.getCroppedCanvas().toBlob(b => {
        window.files[currentIdx].cropped = { blob: b };
        render();
      }, 'image/jpeg', 0.9);
    }

    function nextImage() {
      if (!window.files || !window.files.length) return;
      const n = window.files.length;
      const next = (currentIdx + 1) % n;
      load(next);
    }

    // ===== Drag-to-zoom when in ZOOM mode =====
    stage.addEventListener('pointerdown', (e) => {
      if (!cropper || uiMode !== 'ZOOM') return;
      zoomPointerId = e.pointerId;
      zoomStartY = e.clientY;
      zoomStartRatio = cropper.getImageData().ratio || 1;
      try { stage.setPointerCapture(zoomPointerId); } catch (_) {}
      e.preventDefault();
    });

    stage.addEventListener('pointermove', (e) => {
      if (!cropper || uiMode !== 'ZOOM') return;
      if (zoomPointerId !== e.pointerId) return;

      const dy = e.clientY - zoomStartY;
      const factor = 1 + (-dy * 0.005); // up = zoom in
      const target = Math.max(0.08, Math.min(12, zoomStartRatio * factor));

      try { cropper.zoomTo(target); } catch (err) {}
      e.preventDefault();
    });

    function endZoomDrag(e) {
      if (zoomPointerId === null) return;
      if (e.pointerId !== zoomPointerId) return;
      zoomPointerId = null;
    }
    stage.addEventListener('pointerup', endZoomDrag);
    stage.addEventListener('pointercancel', endZoomDrag);

    // Buttons
    document.getElementById('btnRotateL').onclick = () => { if (cropper) cropper.rotate(-90); };
    document.getElementById('btnRotateR').onclick = () => { if (cropper) cropper.rotate(90); };
    document.getElementById('btnFlipH').onclick = flipX;
    document.getElementById('btnFlipV').onclick = flipY;
    document.getElementById('btnReset').onclick = () => { if (cropper) cropper.reset(); };
    document.getElementById('resetBtnTop').onclick = () => { if (cropper) cropper.reset(); };
    document.getElementById('saveBtn').onclick = saveCurrent;
    document.getElementById('nextBtn').onclick = nextImage;
    document.getElementById('btnMode').onclick = cycleMode;

    // Mobile queue toggle
    document.getElementById('openQueueBtn').onclick = () => setQueueOpen(true);
    document.getElementById('closeQueueBtn').onclick = () => setQueueOpen(false);
    document.getElementById('backdrop').onclick = () => setQueueOpen(false);

    document.getElementById('doneBtn').onclick = () => {
      window.opener.postMessage({ type: 'DONE', files: window.files }, '*');
      window.close();
    };

    // Keep cropper happy on viewport changes
    function scheduleResize() {
      if (!cropper) return;
      clearTimeout(window.__rT);
      window.__rT = setTimeout(() => {
        try { cropper.resize(); } catch(e) {}
      }, 160);
    }
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 250));

    // Helper: prevent HTML injection via filenames
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }

    // INIT handshake
    window.addEventListener('message', e => {
      if (e.data && e.data.type === 'INIT') {
        window.files = e.data.files || [];
        updateMobileButtons();
        render();
        if (window.files.length) load(0);

        // Default mode on load:
        setMode('MOVE');
      }
    });

    updateMobileButtons();
    window.opener.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>
  `,

  openEditWindow: (parentWindow, textArea, progCont, progBar) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const raw = Array.from(e.target.files || []);
      if (!raw.length) return;

      const filesForEditor = await Promise.all(raw.map(f => new Promise(res => {
        const im = new Image();
        im.onload = () => {
          res({ name: f.name, size: f.size, w: im.width, h: im.height, original: f, cropped: null });
          URL.revokeObjectURL(im.src);
        };
        im.onerror = () => {
          res({ name: f.name, size: f.size, w: 0, h: 0, original: f, cropped: null });
        };
        im.src = URL.createObjectURL(f);
      })));

      const win = window.open('', '_blank', 'width=1200,height=850');
      win.document.write(window.Editor.getEditorHTML());
      win.document.close();

      const handler = async (ev) => {
        if (ev.source !== win) return;

        if (ev.data && ev.data.type === 'READY') {
          win.postMessage({ type: 'INIT', files: filesForEditor }, '*');
          return;
        }

        if (ev.data && ev.data.type === 'DONE') {
          window.removeEventListener('message', handler);

          const settings = window.Storage.loadSettings();
          const links = await window.Editor.uploadFilesToOPU(ev.data.files, progCont, progBar, settings);

          let insertText = '';
          links.forEach(link => {
            let txt = window.Formatter.generateOutput(link, settings.toggles, settings.customTemplate);
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
      let f = files[i].cropped
        ? new File([files[i].cropped.blob], files[i].name, { type: 'image/jpeg' })
        : files[i].original;

      if (settings.resizePercentage !== 100) {
        f = await window.ImageProcessor.resize(f, settings.resizePercentage);
      }

      await window.API.uploadFile(f, (ev) => {
        if (ev.lengthComputable) {
          progBar.style.width = `${((i * 100) + (ev.loaded / ev.total * 100)) / files.length}%`;
        }
      });

      const links = await window.API.fetchGalleryLinks(1);
      if (links.length) uploadedLinks.push(links[0]);
    }

    progCont.style.display = 'none';
    progBar.style.width = '0%';
    return uploadedLinks;
  }
};

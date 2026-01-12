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
    }
};

const STYLES = `
    .nskal-button { padding: 2px 10px; font-size: 11px; cursor: pointer; margin-right: 5px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 3px; }
    .nskal-progress-container { width: 100%; background-color: #f3f3f3; border: 1px solid #ccc; margin-top: 5px; height: 10px; display: none; border-radius: 3px; overflow: hidden; }
    .nskal-progress-bar { height: 100%; width: 0%; background-color: #4caf50; transition: width 0.3s; }
    .nskal-settings-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: none; justify-content: center; align-items: center; }
    .nskal-settings-modal { background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    /* Drag & Drop Visuals */
    .file-item { background: #2d2d2d; padding: 10px; margin-bottom: 8px; border-radius: 4px; cursor: move; border: 1px solid transparent; }
    .file-item.dragging { opacity: 0.4; border: 1px dashed #777; }
    .file-item.drag-over { border-top: 2px solid #007acc; }
    .file-meta { font-size: 10px; color: #888; margin-top: 4px; }
`;
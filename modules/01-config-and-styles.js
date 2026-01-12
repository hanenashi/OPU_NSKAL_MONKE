window.CONFIG = {
    urls: {
        opu: {
            base: 'https://opu.peklo.biz',
            upload: 'https://opu.peklo.biz/opupload.php',
            gallery: 'https://opu.peklo.biz/?page=userpanel',
            login: 'https://opu.peklo.biz/?page=prihlaseni'
        }
    },
    defaults: {
        customTag: '<br>', 
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

window.STYLES = `
    .nskal-button { padding: 4px 10px; font-size: 11px; cursor: pointer; margin-right: 5px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 3px; font-weight: bold; color: #333; }
    .nskal-button:hover { background-color: #e0e0e0; }
    
    .nskal-progress-container { width: 100%; background: #eee; border: 1px solid #ccc; margin-top: 5px; height: 12px; display: none; border-radius: 6px; overflow: hidden; }
    .nskal-progress-bar { height: 100%; width: 0%; background: #4caf50; transition: width 0.3s; }
    
    .nskal-settings-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: none; justify-content: center; align-items: center; }
    .nskal-settings-modal { background: #ffd5a9; padding: 20px; border-radius: 12px; width: 95%; max-width: 500px; color: #333; border: 2px solid #e69138; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    
    .input-row { display: flex; align-items: center; margin-bottom: 12px; gap: 10px; }
    .nskal-input { padding: 5px; border: 1px solid #c0a080; border-radius: 4px; background: #fff; }
    
    .nskal-toggle-button { padding: 6px 12px; border: 1px solid #c0a080; background: #fdfdfd; cursor: pointer; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right:5px; margin-bottom:5px; }
    .nskal-toggle-button.active { background: #e69138; color: white; border-color: #b45f06; }
    
    .preview-box { background: #fff; border: 1px solid #c0a080; padding: 10px; border-radius: 4px; margin-top: 15px; font-family: monospace; white-space: pre-wrap; word-break: break-all; min-height: 40px; font-size: 12px; color: #444; }
`;
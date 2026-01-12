// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      10.28
// @description  Full modular uploader with Drag&Drop, Metadata, and v10.20 Tools
// @author       Blasnik
// @match        https://opu.peklo.biz/*
// @match        https://www.okoun.cz/boards/*
// @match        https://www.okoun.cz/postArticle.do
// @updateURL    https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/opu-nskal.user.js
// @downloadURL  https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/opu-nskal.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      opu.peklo.biz
// @require      https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js
// @resource     CROPPER_CSS https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/01-config-and-styles.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/02-utils.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/03-storage.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/04-api.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/05-image-processor.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/06-formatter.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/07-editor.js
// @require      https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/modules/08-ui.js
// ==/UserScript==

(function () {
    'use strict';
    if (window.location.hostname === 'www.okoun.cz') {
        GM_addStyle(window.STYLES);
        window.UI.createSettingsPanel();
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches(window.CONFIG.selectors.mainPostForm)) window.UI.injectButtons(node, 'main');
                    else if (node.querySelectorAll) node.querySelectorAll(window.CONFIG.selectors.mainPostForm).forEach(f => window.UI.injectButtons(f, 'main'));
                    if (node.matches && node.matches(window.CONFIG.selectors.replyForm)) window.UI.injectButtons(node, 'reply');
                    else if (node.querySelectorAll) node.querySelectorAll(window.CONFIG.selectors.replyForm).forEach(f => window.UI.injectButtons(f, 'reply'));
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll(window.CONFIG.selectors.mainPostForm).forEach(f => window.UI.injectButtons(f, 'main'));
        document.querySelectorAll(window.CONFIG.selectors.replyForm).forEach(f => window.UI.injectButtons(f, 'reply'));
    }

    GM_registerMenuCommand('Open OPU NSKAL Settings', () => {
        const panel = document.getElementById('nskalSettingsContainer');
        if (panel) panel.style.display = 'flex';
    });
})();

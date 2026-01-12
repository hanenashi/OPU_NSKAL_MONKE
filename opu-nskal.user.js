// ==UserScript==
// @name         OPU NSKAL MONKE (Final Fix)
// @namespace    http://tampermonkey.net/
// @version      10.20
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
// @author       Blasnik
// @match        https://opu.peklo.biz/*
// @match        https://www.okoun.cz/boards/*
// @match        https://www.okoun.cz/postArticle.do
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      opu.peklo.biz
// @require      https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js
// @resource     CROPPER_CSS https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css
// @require      ./modules/01-config-and-styles.js
// @require      ./modules/02-utils.js
// @require      ./modules/03-storage.js
// @require      ./modules/04-api.js
// @require      ./modules/05-image-processor.js
// @require      ./modules/06-formatter.js
// @require      ./modules/07-editor.js
// @require      ./modules/08-ui.js
// ==/UserScript==

(function () {
    'use strict';
    GM_addStyle(STYLES);
    UI.createSettingsPanel();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!mutation.addedNodes.length) return;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                if (node.matches && node.matches(CONFIG.selectors.mainPostForm)) UI.injectButtons(node, 'main');
                else if (node.querySelectorAll) node.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));
                if (node.matches && node.matches(CONFIG.selectors.replyForm)) UI.injectButtons(node, 'reply');
                else if (node.querySelectorAll) node.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));
    document.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));

    GM_registerMenuCommand('Open OPU NSKAL Settings', () => {
        const panel = document.getElementById('nskalSettingsContainer');
        if (panel) panel.style.display = 'flex';
    });
})();
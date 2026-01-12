// ==UserScript==
// @name         OPU NSKAL MONKE (Final Fix)
// @namespace    http://tampermonkey.net/
// @version      10.21
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
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

/* global CONFIG, STYLES, Utils, Storage, API, ImageProcessor, Formatter, Editor, UI */

(function () {
    'use strict';

    // Apply styles from the first module
    GM_addStyle(STYLES);

    // Initialize the settings panel
    UI.createSettingsPanel();

    // Helper for potential future mobile optimizations
    const tweakOdeslatButton = () => {
        // Placeholder for mobile UI adjustments if needed
    };
    tweakOdeslatButton();
    window.addEventListener('resize', tweakOdeslatButton);

    // Observer to handle dynamically loaded content (like reply forms)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!mutation.addedNodes.length) return;
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                
                // Inject buttons into main posts
                if (node.matches && node.matches(CONFIG.selectors.mainPostForm)) {
                    UI.injectButtons(node, 'main');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));
                }

                // Inject buttons into reply forms
                if (node.matches && node.matches(CONFIG.selectors.replyForm)) {
                    UI.injectButtons(node, 'reply');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial injection for already present elements
    document.querySelectorAll(CONFIG.selectors.mainPostForm).forEach(f => UI.injectButtons(f, 'main'));
    document.querySelectorAll(CONFIG.selectors.replyForm).forEach(f => UI.injectButtons(f, 'reply'));

    // Register Menu Command for easy settings access
    GM_registerMenuCommand('Open OPU NSKAL Settings', () => {
        const panel = document.getElementById('nskalSettingsContainer');
        if (panel) panel.style.display = 'flex';
    });
})();
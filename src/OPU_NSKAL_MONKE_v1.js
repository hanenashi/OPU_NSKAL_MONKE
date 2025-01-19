// ==UserScript==
// @name         OPU NSKAL MONKE
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Upload files and fetch gallery links from OPU and integrate with okoun.cz
// @author       You
// @match        https://opu.peklo.biz/*
// @match        https://www.okoun.cz/boards/*
// @match        https://www.okoun.cz/postArticle.do
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      opu.peklo.biz
// ==/UserScript==

(function() {
    'use strict';

    // Inject CSS
    GM_addStyle(`
        #opuNskalButton {
            background-color: #e74c3c; /* Red by default */
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            display: inline-block;
        }
        #opuNskalButton:hover {
            background-color: #c0392b;
        }
        .tools {
            display: flex;
            align-items: center;
        }
    `);

    // Additional functionality will be added here
})();
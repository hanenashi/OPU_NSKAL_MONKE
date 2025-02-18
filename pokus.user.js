// ==UserScript==
// @name         Edit Image
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Add an Edit button to select and display an image list with details and crop functionality
// @author       You
// @match        https://hanenashi.github.io/*
// @grant        none
// ==/UserScript==

import { createFileInput, createImageList, createCropWindow, handleImageLoad } from './helpers.js';

(function() {
    'use strict';

    // Main functionality
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.style = 'display: block; margin-top: 20px;';
    document.querySelector('h1')?.insertAdjacentElement('afterend', editButton);

    editButton.onclick = () => {
        const fileInput = createFileInput();
        
        fileInput.onchange = event => {
            const files = Array.from(event.target.files);
            if (files.length) {
                const imgWindow = window.open('', '_blank');
                if (imgWindow) {
                    imgWindow.document.write(createImageList());
                    const tableBody = imgWindow.document.getElementById('imageTableBody');

                    window.addEventListener('message', event => {
                        if (event.data.type === 'croppedImage') {
                            const originalRow = Array.from(tableBody.querySelectorAll('tr'))
                                .find(row => row.querySelector('td:nth-child(2)').textContent === event.data.originalName);

                            const croppedRow = imgWindow.document.createElement('tr');
                            croppedRow.innerHTML = `
                                <td><img src="${event.data.imgSrc}"></td>
                                <td>${event.data.name}</td>
                                <td>${event.data.width} x ${event.data.height}</td>
                                <td>${(event.data.size / (1024 * 1024)).toFixed(2)}</td>
                                <td></td>
                            `;

                            originalRow?.insertAdjacentElement('afterend', croppedRow);
                        }
                    });

                    files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const img = new Image();
                            img.onload = () => handleImageLoad(imgWindow, tableBody, file, e.target.result, img);
                            img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }
        };
        
        fileInput.click();
    };
})();
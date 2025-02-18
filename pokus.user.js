// ==UserScript==
// @name         Edit Image
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Add an Edit button to select and display an image list with details and crop functionality
// @author       You
// @match        https://hanenashi.github.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Helper functions
    const createFileInput = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.style.display = 'none';
        return input;
    };

    const createImageList = () => `
        <html>
        <head>
            <title>Image List</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #f4f4f4; }
                img { max-width: 100px; max-height: 100px; }
                button { margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Selected Images</h1>
            <table>
                <thead>
                    <tr>
                        <th>Image</th><th>Name</th><th>Dimensions</th>
                        <th>Size (MB)</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody id="imageTableBody"></tbody>
            </table>
        </body>
        </html>
    `;

    const createCropWindow = (imgSrc, file) => `
        <html>
        <head>
            <title>Crop Image</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                #cropImage { max-width: 100%; max-height: 80vh; }
                button { margin-top: 10px; }
            </style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css">
        </head>
        <body>
            <h1>Crop Image</h1>
            <img id="cropImage" src="${imgSrc}">
            <br><br>
            <button id="cropDoneButton">Done</button>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
            <script>
                const cropImage = document.getElementById('cropImage');
                const cropper = new Cropper(cropImage, {
                    viewMode: 1,
                    autoCropArea: 1,
                    movable: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true
                });

                document.getElementById('cropDoneButton').onclick = () => {
                    const canvas = cropper.getCroppedCanvas();
                    canvas?.toBlob(blob => {
                        const timestamp = Date.now();
                        const croppedFile = new File([blob], 
                            'cropped_' + timestamp + '_${file.name}', 
                            { type: '${file.type}' }
                        );
                        window.opener.postMessage({
                            type: 'croppedImage',
                            imgSrc: URL.createObjectURL(blob),
                            name: croppedFile.name,
                            width: canvas.width,
                            height: canvas.height,
                            size: blob.size,
                            originalName: '${file.name}'
                        }, '*');
                        window.close();
                    }, '${file.type}');
                };
            </script>
        </body>
        </html>
    `;

    const handleImageLoad = (imgWindow, tableBody, file, imgSrc, img) => {
        const row = imgWindow.document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imgSrc}"></td>
            <td>${file.name}</td>
            <td>${img.width} x ${img.height}</td>
            <td>${(file.size / (1024 * 1024)).toFixed(2)}</td>
            <td><button class="crop-button">Crop</button></td>
        `;
        
        row.querySelector('.crop-button').onclick = () => {
            const cropWindow = window.open('', '_blank');
            if (cropWindow) {
                cropWindow.document.write(createCropWindow(imgSrc, file));
                cropWindow.document.close();
            }
        };
        
        tableBody.appendChild(row);
    };

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

                    // Handle cropped images
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

                    // Process selected files
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
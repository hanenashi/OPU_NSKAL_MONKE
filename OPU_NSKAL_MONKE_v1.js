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
        .tools > div, .tools > span {
            margin-right: 10px;
        }
        .nskal-input {
            margin-right: 10px;
            padding: 5px;
            font-size: 14px;
            width: auto;
        }
        #customTagInput {
            width: 50px;
        }
        #resizePercentageInput {
            width: 50px;
        }
        #progressBarContainer {
            width: 100%;
            background-color: #f3f3f3;
            border: 1px solid #ccc;
            margin-top: 10px;
            display: none;
        }
        #progressBar {
            width: 0%;
            height: 20px;
            background-color: #4CAF50;
            text-align: center;
            line-height: 20px;
            color: white;
        }
    `);

    // Function to resize the image based on the specified percentage
    async function resizeImage(file, percentage) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const width = img.width * (percentage / 100);
                const height = img.height * (percentage / 100);

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const resizedFile = new File([blob], file.name, { type: file.type });
                    resolve(resizedFile);
                }, file.type);
            };

            img.onerror = (err) => {
                reject(err);
            };
        });
    }

    async function fetchNewlyUploadedFiles(count) {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://opu.peklo.biz/?page=userpanel',
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error('Failed to fetch gallery'));
                        }
                    },
                    onerror: (error) => {
                        reject(error);
                    }
                });
            });

            const parser = new DOMParser();
            const doc = parser.parseFromString(response, 'text/html');

            const galleryItems = doc.querySelectorAll('div.box a.swipebox');
            const links = [];

            for (let i = 0; i < count && i < galleryItems.length; i++) {
                const fullImageLink = galleryItems[i].href;
                const thumbnailImage = galleryItems[i].querySelector('img');
                const thumbnailLink = thumbnailImage ? thumbnailImage.src : '';

                links.push({ full: fullImageLink, thumb: thumbnailLink });
            }

            return links;
        } catch (error) {
            console.error('Error fetching gallery:', error);
            return [];
        }
    }

    function insertLinksIntoTextField(links, customTag) {
        const textField = document.querySelector('textarea[name="body"]');
        if (textField) {
            const imgTags = links.map(link => `<img src="${link.full}">${customTag}\n\n`).join('');
            textField.value += imgTags;
        } else {
            alert('Text field not found.');
        }
    }

    // Check if the user is logged in by accessing the gallery page
    async function checkLoginStatus() {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://opu.peklo.biz/?page=userpanel',
                    onload: (response) => {
                        if (response.finalUrl.includes('page=prihlaseni')) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    },
                    onerror: (error) => {
                        resolve(false);
                    }
                });
            });

            return response;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }

    // Add button to the page
    async function addButtonToPage() {
        const toolsDiv = document.querySelector('div.tools');
        if (toolsDiv) {
            console.log('Tools div found, adding NSKAL button.');

            // Create input fields for custom tag and resize percentage
            const customTagInput = document.createElement('input');
            customTagInput.id = 'customTagInput';
            customTagInput.className = 'nskal-input';
            customTagInput.type = 'text';
            customTagInput.placeholder = 'Custom Tag';
            customTagInput.value = '<p>';

            const resizePercentageInput = document.createElement('input');
            resizePercentageInput.id = 'resizePercentageInput';
            resizePercentageInput.className = 'nskal-input';
            resizePercentageInput.type = 'number';
            resizePercentageInput.placeholder = 'Resize %';
            resizePercentageInput.value = 100;

            // Create progress bar elements
            const progressBarContainer = document.createElement('div');
            progressBarContainer.id = 'progressBarContainer';
            const progressBar = document.createElement('div');
            progressBar.id = 'progressBar';
            progressBarContainer.appendChild(progressBar);

            // Create and add the NSKAL button
            const button = document.createElement('button');
            button.id = 'opuNskalButton';
            button.textContent = 'NSKAL';
            button.type = 'button'; // Ensure the button does not submit the form

            const isLoggedIn = await checkLoginStatus();
            if (!isLoggedIn) {
                button.style.backgroundColor = '#e74c3c'; // Red
                button.textContent = 'Please Log In';
                button.addEventListener('click', () => {
                    alert('Please log in to OPU to use this feature.');
                });
            } else {
                button.style.backgroundColor = '#4CAF50'; // Green
                button.textContent = 'NSKAL';
                button.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent form submission
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.multiple = true;
                    fileInput.style.display = 'none';

                    fileInput.addEventListener('change', async () => {
                        const files = fileInput.files;
                        if (!files.length) {
                            alert('Please select files to upload.');
                            return;
                        }

                        const uploadedFileCount = files.length;
                        progressBarContainer.style.display = 'block';
                        progressBar.style.width = '0%';

                        try {
                            const links = [];
                            const customTag = customTagInput.value || '<p>';
                            const resizePercentage = parseInt(resizePercentageInput.value) || 100;

                            for (let i = 0; i < files.length; i++) {
                                let fileToUpload = files[i];

                                // Resize image if percentage is not 100
                                if (resizePercentage !== 100) {
                                    fileToUpload = await resizeImage(fileToUpload, resizePercentage);
                                }

                                const formData = new FormData();
                                formData.append('obrazek[0]', fileToUpload);
                                formData.append('sizep', '0');
                                formData.append('outputf', 'auto');
                                formData.append('tl_odeslat', 'Odeslat');

                                await new Promise((resolve, reject) => {
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: 'https://opu.peklo.biz/opupload.php',
                                        data: formData,
                                        headers: {
                                            'Accept': 'text/html,application/xhtml+xml'
                                        },
                                        onload: (response) => {
                                            if (response.status === 200) {
                                                resolve();
                                            } else {
                                                reject(new Error(`Failed to upload ${fileToUpload.name}`));
                                            }
                                        },
                                        onerror: (error) => {
                                            reject(error);
                                        }
                                    });
                                });

                                const newLinks = await fetchNewlyUploadedFiles(1);
                                links.push(...newLinks);

                                // Update progress bar
                                const progress = ((i + 1) / files.length) * 100;
                                progressBar.style.width = `${progress}%`;
                                progressBar.textContent = `${Math.round(progress)}%`;
                            }

                            if (links.length > 0) {
                                insertLinksIntoTextField(links, customTag);
                            } else {
                                alert("No newly uploaded files found.");
                            }
                        } catch (error) {
                            console.error('Error during upload:', error);
                            alert('An error occurred during file upload.');
                        } finally {
                            progressBarContainer.style.display = 'none';
                        }
                    });

                    fileInput.click();
                });
            }

            // Insert the inputs, progress bar, and button into the tools div
            toolsDiv.insertBefore(customTagInput, toolsDiv.firstChild);
            toolsDiv.insertBefore(resizePercentageInput, toolsDiv.firstChild);
            toolsDiv.insertBefore(progressBarContainer, toolsDiv.firstChild);
            toolsDiv.insertBefore(button, toolsDiv.firstChild);
        } else {
            console.log('Tools div not found.');
        }
    }

    // Wait for the text area to become visible before adding the button
    function waitForTextArea() {
        const textArea = document.querySelector('textarea[name="body"]');
        if (textArea && textArea.offsetParent !== null) {
            console.log('Text area is visible, adding button.');
            addButtonToPage();
        } else {
            console.log('Text area not visible yet, waiting...');
            setTimeout(waitForTextArea, 500);
        }
    }

    // Run the script on okoun.cz
    if (window.location.hostname === 'www.okoun.cz') {
        console.log('Running on okoun.cz, waiting for text area.');
        waitForTextArea();
    }

    // Reload the board page after the post is submitted
    if (window.location.pathname === '/postArticle.do') {
        console.log('Post submitted, reloading board page.');
        const boardId = new URLSearchParams(window.location.search).get('boardId');
        if (boardId) {
            window.location.href = `/boards/${boardId}`;
        }
    }

    // Register menu command to open the popup
    GM_registerMenuCommand('Open OPU NSKAL', () => {
        document.getElementById('popup').style.display = 'block';
    });
})();

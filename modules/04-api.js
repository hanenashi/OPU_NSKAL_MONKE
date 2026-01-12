const API = {
    checkLoginStatus: async () => {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET', url: CONFIG.urls.opu.gallery,
                    onload: resolve, onerror: reject
                });
            });
            return !response.finalUrl.includes('page=prihlaseni');
        } catch (error) { return false; }
    },

    uploadFile: (file, onProgress, fileName) => {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            const nameToSend = fileName || file.name || 'image.jpg';
            formData.append('obrazek[0]', file, nameToSend);
            formData.append('sizep', '0');
            formData.append('outputf', 'auto');
            formData.append('tl_odeslat', 'Odeslat');
            GM_xmlhttpRequest({
                method: 'POST', url: CONFIG.urls.opu.upload, data: formData,
                upload: { onprogress: onProgress },
                onload: (response) => {
                    if (response.status === 200) resolve(response);
                    else reject(new Error(`Upload failed with status ${response.status}`));
                },
                onerror: reject
            });
        });
    },

    fetchGalleryLinks: async (count = 1) => {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET', url: CONFIG.urls.opu.gallery,
                    onload: resolve, onerror: reject
                });
            });
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, 'text/html');
            const links = [];
            const items = doc.querySelectorAll('div.box a.swipebox');
            for (let i = 0; i < Math.min(items.length, count); i++) {
                const item = items[i];
                const img = item.querySelector('img');
                links.push({ full: item.href, thumb: img ? img.src : '' });
            }
            return links;
        } catch (error) { return []; }
    }
};
window.API = {
    checkLoginStatus: async () => {
        try {
            const res = await new Promise((r, j) => {
                GM_xmlhttpRequest({ method: 'GET', url: window.CONFIG.urls.opu.gallery, onload: r, onerror: j });
            });
            return !res.finalUrl.includes('page=prihlaseni');
        } catch { return false; }
    },
    uploadFile: (file, onProgress) => {
        return new Promise((r, j) => {
            const fd = new FormData();
            fd.append('obrazek[0]', file);
            fd.append('sizep', '0'); fd.append('outputf', 'auto'); fd.append('tl_odeslat', 'Odeslat');
            GM_xmlhttpRequest({
                method: 'POST',
                url: window.CONFIG.urls.opu.upload,
                data: fd,
                upload: { onprogress: onProgress },
                onload: (res) => r(res),
                onerror: j
            });
        });
    },
    fetchGalleryLinks: async (count) => {
        const res = await new Promise((r, j) => {
            GM_xmlhttpRequest({ method: 'GET', url: window.CONFIG.urls.opu.gallery, onload: r, onerror: j });
        });
        const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
        const items = Array.from(doc.querySelectorAll('div.box a.swipebox')).slice(0, count);
        return items.map(a => ({ full: a.href }));
    }
};
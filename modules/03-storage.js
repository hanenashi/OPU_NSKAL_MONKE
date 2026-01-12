window.Storage = {
    get: (k, d) => GM_getValue(k, d),
    set: (k, v) => GM_setValue(k, v),
    loadSettings: () => ({
        customTag: window.Storage.get('customTag', window.CONFIG.defaults.customTag),
        resizePercentage: parseInt(window.Storage.get('resizePercentage', window.CONFIG.defaults.resizePercentage)),
        customTemplate: window.Storage.get('customTemplate', window.CONFIG.defaults.customTemplate),
        toggles: {
            url: window.Storage.get('toggleUrl', false),
            imgSrc: window.Storage.get('toggleImgSrc', true),
            aHref: window.Storage.get('toggleAHref', false),
            aHrefImg: window.Storage.get('toggleAHrefImg', false),
            customCode: window.Storage.get('toggleCustomCode', false),
            width: window.Storage.get('toggleWidth', false),
            widthValue: window.Storage.get('widthValue', '')
        }
    }),
    saveSettings: (s) => {
        window.Storage.set('customTag', s.customTag);
        window.Storage.set('resizePercentage', s.resizePercentage);
        window.Storage.set('customTemplate', s.customTemplate);
        for (let [k, v] of Object.entries(s.toggles)) {
            window.Storage.set('toggle' + k.charAt(0).toUpperCase() + k.slice(1), v);
        }
        window.Storage.set('widthValue', s.toggles.widthValue);
    }
};
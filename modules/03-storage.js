const Storage = {
    get: (key, defaultValue) => GM_getValue(key, defaultValue),
    set: (key, value) => GM_setValue(key, value),
    loadSettings: () => ({
        customTag: Storage.get('customTag', CONFIG.defaults.customTag),
        resizePercentage: parseInt(Storage.get('resizePercentage', CONFIG.defaults.resizePercentage), 10),
        customTemplate: Storage.get('customTemplate', CONFIG.defaults.customTemplate),
        toggles: {
            url: Storage.get('toggleUrl', CONFIG.defaults.toggleStates.url),
            imgSrc: Storage.get('toggleImgSrc', CONFIG.defaults.toggleStates.imgSrc),
            aHref: Storage.get('toggleAHref', CONFIG.defaults.toggleStates.aHref),
            aHrefImg: Storage.get('toggleAHrefImg', CONFIG.defaults.toggleStates.aHrefImg),
            customCode: Storage.get('toggleCustomCode', CONFIG.defaults.toggleStates.customCode),
            width: Storage.get('toggleWidth', CONFIG.defaults.toggleStates.width),
            widthValue: Storage.get('widthValue', CONFIG.defaults.toggleStates.widthValue),
            height: Storage.get('toggleHeight', CONFIG.defaults.toggleStates.height),
            heightValue: Storage.get('heightValue', CONFIG.defaults.toggleStates.heightValue)
        }
    }),
    saveSettings: (s) => {
        Storage.set('customTag', s.customTag);
        Storage.set('resizePercentage', s.resizePercentage);
        Storage.set('customTemplate', s.customTemplate);
        for (const [k, v] of Object.entries(s.toggles)) {
            Storage.set(`toggle${k.charAt(0).toUpperCase() + k.slice(1)}`, v);
        }
        Storage.set('widthValue', s.toggles.widthValue);
        Storage.set('heightValue', s.toggles.heightValue);
    }
};
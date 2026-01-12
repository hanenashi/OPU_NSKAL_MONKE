window.Formatter = {
    generateOutput: (link, toggles, template) => {
        if (toggles.customCode) return template.replace(/\[url\]/g, link.full);
        if (toggles.aHrefImg) {
            const thumb = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)([^/]+)$/, '/p/$1thumbs/$2');
            let tag = `<img src="${thumb}"`;
            if (toggles.width && toggles.widthValue) tag += ` width="${toggles.widthValue}"`;
            if (toggles.height && toggles.heightValue) tag += ` height="${toggles.heightValue}"`;
            return `<a href="${link.full}">${tag}></a>`;
        }
        if (toggles.url) return link.full;
        let out = toggles.imgSrc ? `<img src="${link.full}"` : link.full;
        if (toggles.imgSrc) {
            if (toggles.width && toggles.widthValue) out += ` width="${toggles.widthValue}"`;
            if (toggles.height && toggles.heightValue) out += ` height="${toggles.heightValue}"`;
            out += '>';
        }
        return toggles.aHref ? `<a href="${link.full}">${out}</a>` : out;
    }
};
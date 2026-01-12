const Formatter = {
    generateOutput: (link, toggles, template) => {
        if (toggles.customCode) return template.replace(/\[url\]/g, link.full);
        if (toggles.aHrefImg) {
            const thumbUrl = link.full.replace(/\/p\/(\d+\/\d+\/\d+\/)([^/]+)$/, '/p/$1thumbs/$2');
            let imgTag = `<img src="${thumbUrl}"`;
            if (toggles.width && toggles.widthValue) imgTag += ` width="${toggles.widthValue}"`;
            if (toggles.height && toggles.heightValue) imgTag += ` height="${toggles.heightValue}"`;
            return `<a href="${link.full}">${imgTag}></a>`;
        }
        if (toggles.url) return link.full;
        let output = '';
        if (toggles.imgSrc) {
            output = `<img src="${link.full}"`;
            if (toggles.width && toggles.widthValue) output += ` width="${toggles.widthValue}"`;
            if (toggles.height && toggles.heightValue) output += ` height="${toggles.heightValue}"`;
            output += '>';
        } else { output = link.full; }
        if (toggles.aHref) return `<a href="${link.full}">${output}</a>`;
        return output;
    }
};
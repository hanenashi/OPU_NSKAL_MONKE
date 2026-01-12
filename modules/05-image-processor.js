const ImageProcessor = {
    resize: async (file, percentage) => {
        if (percentage === 100) return file;
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const newWidth = img.width * (percentage / 100);
                const newHeight = img.height * (percentage / 100);
                canvas.width = newWidth; canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(new File([blob], file.name, { type: file.type }));
                }, file.type);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
            img.src = url;
        });
    }
};
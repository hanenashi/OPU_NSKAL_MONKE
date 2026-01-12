window.Utils = {
    createButton: (className, text) => {
        const btn = document.createElement('button');
        btn.className = `nskal-button ${className}`;
        btn.textContent = text;
        return btn;
    }
};
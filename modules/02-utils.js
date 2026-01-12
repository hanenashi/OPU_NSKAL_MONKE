const Utils = {
    createButton: (id, text, className = 'nskal-button', type = 'button') => {
        const btn = document.createElement('button');
        btn.id = id; btn.textContent = text; btn.type = type; btn.className = className;
        return btn;
    },
    createInput: (type, placeholder, className = 'nskal-input', defaultValue = '') => {
        const input = document.createElement('input');
        input.type = type; input.placeholder = placeholder;
        input.className = className; input.value = defaultValue;
        return input;
    },
    createToggle: (labelText, isActive = false, onClick = null) => {
        const btn = document.createElement('button');
        btn.textContent = labelText;
        btn.className = `nskal-toggle-button${isActive ? ' active' : ''}`;
        btn.type = 'button';
        if (onClick) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(e); });
        return btn;
    }
};
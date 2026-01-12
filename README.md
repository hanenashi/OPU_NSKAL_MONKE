# 🐒 OPU NSKAL MONKE

Professional upload, edit, and reordering tool for OPU.peklo.biz and Okoun.cz.

### 🚀 [Install Userscript (Click Here)](https://github.com/hanenashi/OPU_NSKAL_MONKE/raw/main/opu-nskal.user.js)

---

## 🔥 Killer Features
- **Drag & Drop Queue**: Change the order of your uploads by dragging items in the sidebar.
- **Detailed Metadata**: See image dimensions (WxH px) and file sizes (KB/MB) before uploading.
- **Pro Editor**: Built-in Cropper.js for rotating, scaling, and cropping images.
- **Auto-Formatting**: Supports `<img>` tags, linked thumbnails, and custom templates.
- **Modular Design**: Clean code split into logical modules for easier maintenance.

## 🛠️ Installation & Setup
1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click the **Install Userscript** link above.
3. Tampermonkey will prompt you to install. Click **Install**.
4. Visit [OPU.peklo.biz](https://opu.peklo.biz) and log in (required for the script to fetch links).
5. Open any post or reply form on [Okoun.cz](https://www.okoun.cz) to see the NSKAL buttons.

## 📂 Repository Structure
This script is modular. The main loader calls the following components:
- `01-config-and-styles`: Global settings and CSS.
- `04-api`: Communication with OPU servers.
- `07-editor`: The heavy lifting (Drag & Drop, Cropping, Metadata).
- `08-ui`: Button injection and settings panel.

## 🔄 Automatic Updates
The script includes `@updateURL`. When you update the version number in `opu-nskal.user.js` on GitHub, Tampermonkey will automatically notify users and update their local copy and cached modules.

---
*Created by Blasnik.*
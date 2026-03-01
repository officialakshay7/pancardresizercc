(function () {
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', (e) => { e.stopPropagation(); mobileMenu.classList.toggle('hidden'); });
        document.addEventListener('click', (event) => { if (!menuBtn.contains(event.target) && !mobileMenu.contains(event.target)) mobileMenu.classList.add('hidden'); });
    }

    const photoWidthInp = document.getElementById('photoWidth');
    const photoHeightInp = document.getElementById('photoHeight');
    const photoDpiInp = document.getElementById('photoDpi');
    const photoResW = document.getElementById('photoResultWidth');
    const photoResH = document.getElementById('photoResultHeight');
    const photoResDpi = document.getElementById('photoResultDpi');
    function updatePhotoResult() { photoResW.innerText = photoWidthInp.value; photoResH.innerText = photoHeightInp.value; photoResDpi.innerText = photoDpiInp.value; }
    [photoWidthInp, photoHeightInp, photoDpiInp].forEach(el => el.addEventListener('input', updatePhotoResult));
    updatePhotoResult();

    const sigWidth = document.getElementById('signatureWidth');
    const sigHeight = document.getElementById('signatureHeight');
    const sigDpi = document.getElementById('signatureDpi');
    const sigResW = document.getElementById('signatureResultWidth');
    const sigResH = document.getElementById('signatureResultHeight');
    const sigResDpi = document.getElementById('signatureResultDpi');
    function updateSignatureResult() { sigResW.innerText = sigWidth.value; sigResH.innerText = sigHeight.value; sigResDpi.innerText = sigDpi.value; }
    [sigWidth, sigHeight, sigDpi].forEach(el => el.addEventListener('input', updateSignatureResult));
    updateSignatureResult();

    function resizeImage(file, targetWidth, targetHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth; canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                canvas.toBlob((blob) => { if (!blob) return reject('Canvas to blob failed'); const url = URL.createObjectURL(blob); resolve({ blob, url, width: targetWidth, height: targetHeight }); }, 'image/png');
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    function setupDownload(btnId, fileInputId, widthInput, heightInput, dpiInput, baseFilename) {
        const btn = document.getElementById(btnId);
        const fileInput = document.getElementById(fileInputId);
        const chooseBtn = document.getElementById(btnId === 'downloadPhotoBtn' ? 'photoChooseBtn' : 'signatureChooseBtn');
        const fileNameSpan = document.getElementById(btnId === 'downloadPhotoBtn' ? 'photoFileName' : 'signatureFileName');

        if (chooseBtn) chooseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => { fileNameSpan.innerText = fileInput.files.length ? fileInput.files[0].name : 'None chosen'; });

        btn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) { alert('Please select an image first.'); return; }
            const w = parseInt(widthInput.value, 10);
            const h = parseInt(heightInput.value, 10);
            const dpi = parseInt(dpiInput.value, 10);
            if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) { alert('Width and height must be positive numbers'); return; }

            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="loader mr-2"></span>Resizing...';
            btn.disabled = true;

            try {
                const { url, width, height } = await resizeImage(file, w, h);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${baseFilename}_${width}x${height}_${dpi}dpi.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } catch (err) { alert('Resize failed: ' + err.message); }
            finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }

    setupDownload('downloadPhotoBtn', 'photoInput', photoWidthInp, photoHeightInp, photoDpiInp, 'PAN_photo');
    setupDownload('downloadSignatureBtn', 'signatureInput', sigWidth, sigHeight, sigDpi, 'PAN_signature');
})();
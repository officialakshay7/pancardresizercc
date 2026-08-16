(function () {
  // ---- Field wiring: works for any page that has these element IDs ----
  const photoWidthInp = document.getElementById('photoWidth');
  const photoHeightInp = document.getElementById('photoHeight');
  const photoDpiInp = document.getElementById('photoDpi');
  const photoMaxKbInp = document.getElementById('photoMaxKb');
  const photoResW = document.getElementById('photoResultWidth');
  const photoResH = document.getElementById('photoResultHeight');
  const photoResDpi = document.getElementById('photoResultDpi');

  const sigWidth = document.getElementById('signatureWidth');
  const sigHeight = document.getElementById('signatureHeight');
  const sigDpi = document.getElementById('signatureDpi');
  const sigMaxKbInp = document.getElementById('signatureMaxKb');
  const sigResW = document.getElementById('signatureResultWidth');
  const sigResH = document.getElementById('signatureResultHeight');
  const sigResDpi = document.getElementById('signatureResultDpi');

  function updatePhotoResult() {
    if (!photoResW) return;
    photoResW.innerText = photoWidthInp.value;
    photoResH.innerText = photoHeightInp.value;
    if (photoResDpi) photoResDpi.innerText = photoDpiInp.value;
  }
  function updateSignatureResult() {
    if (!sigResW) return;
    sigResW.innerText = sigWidth.value;
    sigResH.innerText = sigHeight.value;
    if (sigResDpi) sigResDpi.innerText = sigDpi.value;
  }
  if (photoWidthInp) [photoWidthInp, photoHeightInp, photoDpiInp, photoMaxKbInp].forEach(el => el && el.addEventListener('input', updatePhotoResult));
  if (sigWidth) [sigWidth, sigHeight, sigDpi, sigMaxKbInp].forEach(el => el && el.addEventListener('input', updateSignatureResult));
  updatePhotoResult();
  updateSignatureResult();

  // ---- NSDL / UTI preset toggle (only present on the homepage) ----
  const PRESETS = {
    nsdl: { photo: { w: 197, h: 276, dpi: 200, kb: 50 }, signature: { w: 354, h: 157, dpi: 200, kb: 50 } },
    uti: { photo: { w: 213, h: 213, dpi: 300, kb: 30 }, signature: { w: 400, h: 200, dpi: 600, kb: 60 } }
  };
  const presetNsdlBtn = document.getElementById('presetNsdl');
  const presetUtiBtn = document.getElementById('presetUti');
  function applyPreset(name) {
    const p = PRESETS[name];
    if (photoWidthInp) {
      photoWidthInp.value = p.photo.w;
      photoHeightInp.value = p.photo.h;
      if (photoDpiInp) photoDpiInp.value = p.photo.dpi;
      if (photoMaxKbInp) photoMaxKbInp.value = p.photo.kb;
      updatePhotoResult();
    }
    if (sigWidth) {
      sigWidth.value = p.signature.w;
      sigHeight.value = p.signature.h;
      if (sigDpi) sigDpi.value = p.signature.dpi;
      if (sigMaxKbInp) sigMaxKbInp.value = p.signature.kb;
      updateSignatureResult();
    }
    if (presetNsdlBtn && presetUtiBtn) {
      const active = ['border-ink', 'bg-ink', 'text-white'];
      const inactive = ['border-line', 'text-ink-soft', 'bg-white'];
      [presetNsdlBtn, presetUtiBtn].forEach(btn => btn.classList.remove(...active, ...inactive));
      const selectedBtn = name === 'nsdl' ? presetNsdlBtn : presetUtiBtn;
      const otherBtn = name === 'nsdl' ? presetUtiBtn : presetNsdlBtn;
      selectedBtn.classList.add(...active);
      otherBtn.classList.add(...inactive);
    }
  }
  if (presetNsdlBtn && presetUtiBtn) {
    presetNsdlBtn.addEventListener('click', () => applyPreset('nsdl'));
    presetUtiBtn.addEventListener('click', () => applyPreset('uti'));
  }

  // ---- Resize + compress (Canvas API, entirely client-side) ----
  function resizeToBlob(file, targetWidth, targetHeight, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        // JPEG has no transparency, so fill white first to avoid a black background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas to blob failed'));
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Could not read that image file'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Steps JPEG quality down until the file fits the target KB, or hits a quality floor
  async function resizeToTarget(file, w, h, maxKb) {
    let quality = 0.92;
    let blob = await resizeToBlob(file, w, h, quality);
    if (!maxKb) return blob;
    while (blob.size / 1024 > maxKb && quality > 0.35) {
      quality -= 0.07;
      blob = await resizeToBlob(file, w, h, quality);
    }
    return blob;
  }

  function setupDownload(btnId, fileInputId, widthInput, heightInput, dpiInput, maxKbInput, baseFilename, infoId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const fileInput = document.getElementById(fileInputId);
    const chooseBtn = document.getElementById(btnId === 'downloadPhotoBtn' ? 'photoChooseBtn' : 'signatureChooseBtn');
    const fileNameSpan = document.getElementById(btnId === 'downloadPhotoBtn' ? 'photoFileName' : 'signatureFileName');
    const infoEl = infoId ? document.getElementById(infoId) : null;

    if (chooseBtn) chooseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileNameSpan) fileNameSpan.innerText = fileInput.files.length ? fileInput.files[0].name : 'None chosen';
    });

    btn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) { alert('Please select an image first.'); return; }
      const w = parseInt(widthInput.value, 10);
      const h = parseInt(heightInput.value, 10);
      const dpi = dpiInput ? parseInt(dpiInput.value, 10) : null;
      const maxKb = maxKbInput ? parseInt(maxKbInput.value, 10) : null;
      if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) { alert('Width and height must be positive numbers'); return; }

      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="loader mr-2"></span>Resizing...';
      btn.disabled = true;
      if (infoEl) infoEl.classList.add('hidden');

      try {
        const blob = await resizeToTarget(file, w, h, maxKb);
        const sizeKb = Math.round(blob.size / 1024);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dpiPart = dpi ? `_${dpi}dpi` : '';
        a.download = `${baseFilename}_${w}x${h}${dpiPart}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        if (infoEl) {
          infoEl.classList.remove('hidden');
          if (maxKb && sizeKb > maxKb) {
            infoEl.innerHTML = `Downloaded at ${sizeKb}KB \u2014 above your ${maxKb}KB target. Try a simpler source photo, or raise the max size if the portal allows it.`;
            infoEl.classList.add('text-stamp');
          } else {
            infoEl.innerHTML = `Downloaded at ${sizeKb}KB${maxKb ? ` (target \u2264${maxKb}KB)` : ''}.`;
            infoEl.classList.remove('text-stamp');
          }
        }
      } catch (err) {
        alert('Resize failed: ' + err.message);
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }

  setupDownload('downloadPhotoBtn', 'photoInput', photoWidthInp, photoHeightInp, photoDpiInp, photoMaxKbInp, 'PAN_photo', 'photoOutputInfo');
  setupDownload('downloadSignatureBtn', 'signatureInput', sigWidth, sigHeight, sigDpi, sigMaxKbInp, 'PAN_signature', 'signatureOutputInfo');

  // ---- Mobile menu ----
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); mobileMenu.classList.toggle('hidden'); });
    document.addEventListener('click', (event) => { if (!menuBtn.contains(event.target) && !mobileMenu.contains(event.target)) mobileMenu.classList.add('hidden'); });
  }

  // Default preset on load, if the toggle exists (homepage only)
  if (presetNsdlBtn && presetUtiBtn) applyPreset('nsdl');
})();

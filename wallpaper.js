(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#wallpaper-dialog');
  const layer = $('.wallpaper-layer');
  const status = $('#wallpaper-status');
  const motion = $('#wallpaper-motion');
  let currentUrl = null;
  let currentMedia = null;
  let currentFile = null;
  let revision = 0;
  const defaultPoster = '1.jpg';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function storage(action, value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('permutation-local-wallpaper', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('settings');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('settings', action === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('settings');
        const operation = action === 'get' ? store.get('wallpaper') : action === 'put' ? store.put(value, 'wallpaper') : store.delete('wallpaper');
        tx.oncomplete = () => { db.close(); resolve(operation.result); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }
  function setShade(value) {
    const shade = Math.min(90, Math.max(0, Number(value) || 0));
    document.body.style.setProperty('--wallpaper-shade', String(shade / 100));
    $('#wallpaper-shade').value = shade;
    $('#wallpaper-shade-value').textContent = `${shade}%`;
  }
  async function persist() {
    if (!currentFile) return;
    try {
      await storage('put', { file: currentFile, shade: Number($('#wallpaper-shade').value) });
      status.textContent = `${currentFile.name} · 已保存在此浏览器，刷新后恢复。`;
    } catch {
      status.textContent = `${currentFile.name} · 当前已应用；浏览器无法保存，刷新后请重新选择。`;
    }
  }
  async function applyFile(file, shade = 32) {
    const version = ++revision;
    const isVideo = /\.(mp4|webm)$/i.test(file.name);
    if (!isVideo && !/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(file.name)) throw new Error('请选择支持的图片、GIF、MP4 或 WebM 文件。');
    if (file.size > 200 * 1024 * 1024) throw new Error('请选择小于 200 MB 的文件，建议压缩大型视频后再使用。');
    const url = URL.createObjectURL(file);
    const media = document.createElement(isVideo ? 'video' : 'img');
    if (isVideo) { media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; }
    else media.alt = '';
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { cleanup(); reject(new Error('读取背景超时，请选择较小的文件。')); }, 15000);
        const event = isVideo ? 'loadeddata' : 'load';
        function cleanup() { clearTimeout(timeout); media.removeEventListener(event, loaded); media.removeEventListener('error', failed); }
        function loaded() { cleanup(); resolve(); }
        function failed() { cleanup(); reject(new Error('浏览器无法解码这个文件，请尝试 JPG、PNG 或 H.264 编码的 MP4。')); }
        media.addEventListener(event, loaded); media.addEventListener('error', failed); media.src = url;
      });
    } catch (error) { URL.revokeObjectURL(url); throw error; }
    if (version !== revision) { URL.revokeObjectURL(url); return false; }
    if (currentMedia?.tagName === 'VIDEO') currentMedia.pause();
    layer.replaceChildren(media);
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = url; currentMedia = media; currentFile = file;
    setShade(shade);
    document.body.classList.add('has-wallpaper');
    motion.disabled = !isVideo;
    if (isVideo && !reducedMotion.matches) await media.play().catch(() => {});
    motion.textContent = isVideo && media.paused ? '播放动态背景' : '暂停动态背景';
    return true;
  }
  $('#wallpaper-open').addEventListener('click', () => dialog.showModal());
  $('#wallpaper-close').addEventListener('click', () => dialog.close());
  // Keep algorithm shortcuts from firing while operating the settings dialog.
  dialog.addEventListener('keydown', (event) => event.stopPropagation());
  $('#wallpaper-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    status.textContent = '正在读取本地文件…';
    try { if (await applyFile(file, $('#wallpaper-shade').value)) await persist(); }
    catch (error) { status.textContent = error.message; }
    event.target.value = '';
  });
  $('#wallpaper-shade').addEventListener('input', (event) => setShade(event.target.value));
  $('#wallpaper-shade').addEventListener('change', persist);
  motion.addEventListener('click', async () => {
    if (currentMedia?.tagName !== 'VIDEO') return;
    if (currentMedia.paused) await currentMedia.play().catch(() => { status.textContent = '视频暂时无法播放，请换一个文件。'; });
    else currentMedia.pause();
    motion.textContent = currentMedia.paused ? '播放动态背景' : '暂停动态背景';
  });
  $('#wallpaper-reset').addEventListener('click', async () => {
    ++revision;
    if (currentMedia?.tagName === 'VIDEO') currentMedia.pause();
    layer.replaceChildren();
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = currentMedia = currentFile = null;
    document.body.classList.remove('has-wallpaper'); motion.disabled = true; setShade(32);
    try { await storage('delete'); status.textContent = '已恢复原背景。'; }
    catch { status.textContent = '本次已恢复原背景；浏览器中的旧背景记录未能清除。'; }
  });
  function showDefault() {
    if (revision) return;
    const media = document.createElement('img');
    media.alt = ''; media.src = defaultPoster;
    layer.replaceChildren(media); currentMedia = media;
    document.body.classList.add('has-wallpaper'); setShade(22); motion.disabled = true;
    motion.textContent = '静态图片背景';
    status.textContent = '默认背景：1.jpg；也可以选择本机照片或视频。';
    media.addEventListener('error', () => { status.textContent = '默认图片背景无法读取，可选择本机图片或视频。'; });
  }
  // Start with the bundled static background; a locally selected file can replace it.
  showDefault();
  storage('get').then(async (saved) => {
    if (!saved?.file || revision) return;
    if (await applyFile(saved.file, saved.shade)) status.textContent = `${saved.file.name} · 已恢复保存的背景。`;
  }).catch(() => {});
}());

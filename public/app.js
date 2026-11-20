// Unduh Video — frontend (vanilla JS, tanpa framework).
//
// Alur: tempel tautan -> GET /api/download?url=... -> render hasil ke
// pemutar (video 9:16 + rel aksi, atau slider foto).
// Mode contoh: GET /api/demo?type=video|photo — hasil berlabel "Contoh".
// Unduhan paksa: fetch blob dengan referrerPolicy no-referrer (menghindari
// 403 dari CDN), fallback buka tab baru bila fetch diblokir.
// Validasi host HANYA di server (worker/_worker.js): frontend tidak
// menyimpan daftar host, supaya tidak ada nama platform di aset yang
// disajikan; tautan yang tidak didukung ditolak server dengan error 400.

const $ = (id) => document.getElementById(id);
const form = $('dlForm');
const urlInput = $('urlInput');
const dlBtn = $('dlBtn');
const dlBtnText = $('dlBtnText');
const errorBox = $('errorBox');
const playerMedia = $('playerMedia');
const downloadBar = $('downloadBar');
const sliderBar = $('sliderBar');

let current = null; // data hasil terakhir {username, ..., type, downloads, mp3, slides}
let slides = [];
let slideIndex = 0;

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = '';
  errorBox.hidden = true;
}

function setLoading(on) {
  dlBtn.disabled = on;
  dlBtnText.textContent = on ? 'Mengambil tautan…' : 'Unduh';
  dlBtn.querySelector('.spinner')?.remove();
  dlBtn.querySelector('svg')?.remove();
  if (on) {
    const s = document.createElement('span');
    s.className = 'spinner';
    s.setAttribute('aria-hidden', 'true');
    dlBtn.prepend(s);
  } else {
    dlBtn.insertAdjacentHTML('afterbegin',
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>');
  }
}

function renderResult(data) {
  current = data;
  clearError();

  $('resUsername').textContent = `@${data.username || '—'}`;
  $('railLikes').textContent = data.likes || '0';
  $('railComments').textContent = data.comments || '0';
  $('railShares').textContent = data.shares || '0';
  $('resViews').textContent = data.views || '0';
  $('resDuration').textContent = data.duration || '–';
  $('resDurationWrap').style.display = data.duration ? '' : 'none';
  $('demoBadge').hidden = !data.demo;
  $('playerCaption').textContent = data.demo
    ? 'Pratinjau di atas adalah hasil contoh — tempel tautan video untuk melihat hasil aslinya.'
    : 'Hasil dari tautanmu — klik tombol di atas untuk menyimpan filenya.';

  // Media
  playerMedia.innerHTML = '';
  sliderBar.hidden = true;
  slides = [];
  slideIndex = 0;
  const playerEl = document.querySelector('.player');
  const hasVideo = data.type !== 'photo' && !!(data.downloads?.nowm?.[0] || data.downloads?.wm?.[0]);
  playerEl.classList.toggle('has-video', hasVideo);

  if (data.type === 'photo' && data.slides && data.slides.length > 0) {
    slides = data.slides;
    const track = document.createElement('div');
    track.className = 'slider-track';
    for (const s of slides) {
      const img = document.createElement('img');
      img.src = s.url;
      img.alt = `Slide ${s.index} dari @${data.username}`;
      img.loading = 'lazy';
      track.appendChild(img);
    }
    playerMedia.appendChild(track);
    sliderBar.hidden = false;
    updateSlideUI();
  } else {
    const videoUrl = data.downloads?.nowm?.[0] || data.downloads?.wm?.[0];
    if (videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (data.poster) video.poster = data.poster;
      video.setAttribute('aria-label', `Pratinjau video dari @${data.username}`);
      playerMedia.appendChild(video);
    } else {
      const empty = document.createElement('div');
      empty.className = 'player-empty';
      empty.textContent = 'Tidak ada pratinjau video untuk konten ini.';
      playerMedia.appendChild(empty);
    }
  }

  // Tombol unduh — hanya muncul bila URL-nya benar-benar ada.
  const videoUrl = data.downloads?.nowm?.[0];
  const wmUrl = data.downloads?.wm?.[0];
  const audioUrl = data.mp3?.[0];
  downloadBar.hidden = false;

  const btnVideo = $('btnVideo');
  const dlIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>';
  if (data.type === 'video' && videoUrl) {
    btnVideo.hidden = false;
    btnVideo.innerHTML = `${dlIcon} Unduh video tanpa watermark`;
    btnVideo.onclick = () => forceDownload(videoUrl, `${data.username}_video.mp4`, btnVideo);
  } else if (data.type === 'video' && wmUrl) {
    btnVideo.hidden = false;
    btnVideo.innerHTML = `${dlIcon} Unduh video (dengan watermark)`;
    btnVideo.onclick = () => forceDownload(wmUrl, `${data.username}_video.mp4`, btnVideo);
  } else {
    btnVideo.hidden = true;
  }

  const btnWm = $('btnVideoWm');
  btnWm.hidden = !(data.type === 'video' && videoUrl && wmUrl);
  if (!btnWm.hidden) btnWm.onclick = () => forceDownload(wmUrl, `${data.username}_video_wm.mp4`, btnWm);

  const btnAudio = $('btnAudio');
  btnAudio.hidden = !(data.type === 'video' && audioUrl);
  if (!btnAudio.hidden) btnAudio.onclick = () => forceDownload(audioUrl, `${data.username}_audio.mp3`, btnAudio);

  const btnSlide = $('btnSlide');
  btnSlide.hidden = !(data.type === 'photo' && slides.length > 0);
  if (!btnSlide.hidden) {
    btnSlide.onclick = () => {
      const s = slides[slideIndex];
      forceDownload(s.url, `${data.username}_slide_${s.index}.jpg`, btnSlide);
    };
  }

  const btnAll = $('btnSlidesAll');
  btnAll.hidden = !(data.type === 'photo' && slides.length > 1);
  if (!btnAll.hidden) {
    btnAll.onclick = async () => {
      const original = btnAll.textContent;
      btnAll.textContent = 'Mengunduh semua foto…';
      btnAll.disabled = true;
      for (let i = 0; i < slides.length; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await forceDownload(slides[i].url, `${data.username}_slide_${slides[i].index}.jpg`);
      }
      btnAll.textContent = original;
      btnAll.disabled = false;
    };
  }
}

function updateSlideUI() {
  const track = playerMedia.querySelector('.slider-track');
  if (track) track.style.transform = `translateX(-${slideIndex * 100}%)`;
  $('slideCounter').textContent = `${slideIndex + 1} / ${slides.length}`;
}

function moveSlide(dir) {
  if (!slides.length) return;
  slideIndex = (slideIndex + dir + slides.length) % slides.length;
  updateSlideUI();
}

$('prevSlide').addEventListener('click', () => moveSlide(-1));
$('nextSlide').addEventListener('click', () => moveSlide(1));

/** Unduh paksa via blob; fallback buka tab baru bila fetch diblokir. */
async function forceDownload(url, filename, btn = null) {
  let original = '';
  if (btn) {
    original = btn.innerHTML;
    btn.textContent = 'Mengunduh…';
    btn.disabled = true;
  }
  try {
    const res = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.error('Download gagal, membuka tab baru:', e);
    window.open(url, '_blank', 'noopener');
  } finally {
    if (btn) {
      btn.innerHTML = original;
      btn.disabled = false;
    }
  }
}

async function loadDemo(type) {
  clearError();
  setLoading(true);
  try {
    const res = await fetch(`/api/demo?type=${type}`);
    const data = await res.json();
    renderResult(data);
    document.getElementById('phoneFrame').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    showError('Contoh tidak dapat dimuat. Periksa koneksi, lalu coba lagi.');
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = urlInput.value.trim();
  if (!raw) {
    showError('Tempel dulu tautan videonya.');
    urlInput.focus();
    return;
  }
  clearError();
  setLoading(true);
  try {
    const res = await fetch(`/api/download?url=${encodeURIComponent(raw)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Gagal mengambil tautan (HTTP ${res.status}).`);
    renderResult(data);
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan. Coba lagi sebentar lagi.');
  } finally {
    setLoading(false);
  }
});

$('pasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text.trim();
      urlInput.focus();
      clearError();
    } else {
      showError('Clipboard kosong — salin dulu tautan videonya.');
    }
  } catch {
    showError('Browser tidak mengizinkan baca clipboard — tempel manual dengan Ctrl+V.');
    urlInput.focus();
  }
});

$('demoVideoBtn').addEventListener('click', () => loadDemo('video'));
$('demoPhotoBtn').addEventListener('click', () => loadDemo('photo'));

// Pratinjau awal: hasil contoh video, supaya hero langsung menunjukkan produk.
loadDemo('video');

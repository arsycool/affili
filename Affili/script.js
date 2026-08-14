// API Configuration - Masukkan Gemini API Key Kamu di Sini
const apiKey = "masukkan apikey disini!";
const TEXT_MODEL = "gemini-3.6-flash"; // Model terbaru & aktif untuk text & vision

// Global state storage for scripts
let currentGeneratedScripts = [];

// DOM Elements
const brandNameInput = document.getElementById('brandName');
const productUrlInput = document.getElementById('productUrl');
const toneSelect = document.getElementById('toneSelect');
const lengthSelect = document.getElementById('lengthSelect');
const countSelect = document.getElementById('countSelect');
const btnGenerate = document.getElementById('btnGenerate');

const placeholderState = document.getElementById('placeholderState');
const loadingState = document.getElementById('loadingState');
const cardsContainer = document.getElementById('cardsContainer');
const resultsCountBadge = document.getElementById('resultsCountBadge');

// Modal & Camera Elements
const scanModal = document.getElementById('scanModal');
const btnOpenScanModal = document.getElementById('btnOpenScanModal');
const btnCloseScanModal = document.getElementById('btnCloseScanModal');
const webcamVideo = document.getElementById('webcamVideo');
const imagePreview = document.getElementById('imagePreview');
const canvasCapture = document.getElementById('canvasCapture');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const btnStartCamera = document.getElementById('btnStartCamera');
const btnCapturePhoto = document.getElementById('btnCapturePhoto');
const fileInput = document.getElementById('fileInput');
const scanningOverlay = document.getElementById('scanningOverlay');
const scanStatusBadge = document.getElementById('scanStatusBadge');

let videoStream = null;
let selectedBase64Image = null;

// --- CAMERA & SCANNER FUNCTIONS --- //

btnOpenScanModal.addEventListener('click', () => {
    scanModal.classList.remove('hidden');
});

btnCloseScanModal.addEventListener('click', closeScanModal);

function closeScanModal() {
    scanModal.classList.add('hidden');
    stopCameraStream();
}

btnStartCamera.addEventListener('click', async () => {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        webcamVideo.srcObject = videoStream;
        webcamVideo.classList.remove('hidden');
        imagePreview.classList.add('hidden');
        cameraPlaceholder.classList.add('hidden');
        btnCapturePhoto.classList.remove('hidden');
    } catch (err) {
        showToast("Tidak dapat mengakses kamera. Gunakan upload file.", "error");
    }
});

function stopCameraStream() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    webcamVideo.classList.add('hidden');
    btnCapturePhoto.classList.add('hidden');
}

// Handle File Input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        stopCameraStream();
        const reader = new FileReader();
        reader.onload = (evt) => {
            selectedBase64Image = evt.target.result;
            imagePreview.src = selectedBase64Image;
            imagePreview.classList.remove('hidden');
            cameraPlaceholder.classList.add('hidden');
            analyzeProductImage(selectedBase64Image);
        };
        reader.readAsDataURL(file);
    }
});

// Capture from Video Stream
btnCapturePhoto.addEventListener('click', () => {
    if (!videoStream) return;
    canvasCapture.width = webcamVideo.videoWidth;
    canvasCapture.height = webcamVideo.videoHeight;
    const ctx = canvasCapture.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, canvasCapture.width, canvasCapture.height);
    selectedBase64Image = canvasCapture.toDataURL('image/jpeg');

    imagePreview.src = selectedBase64Image;
    imagePreview.classList.remove('hidden');
    webcamVideo.classList.add('hidden');
    stopCameraStream();

    analyzeProductImage(selectedBase64Image);
});

// Vision API call to identify product
async function analyzeProductImage(base64Data) {
    if (!apiKey || apiKey === "MASUKKAN_API_KEY_GEMINI_DI_SINI") {
        showToast("Mohon masukkan API Key Gemini kamu di bagian script kodingan!", "error");
        return;
    }

    scanningOverlay.classList.remove('hidden');
    try {
        const pureBase64 = base64Data.split(',')[1];
        const mimeType = base64Data.split(';')[0].split(':')[1];

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Sebutkan nama brand dan nama produk spesifik yang tampak dalam gambar ini secara jelas dan singkat (contoh: 'Wardah Colorfit Velvet Matte Lip Mousse'). Hanya sebutkan nama produknya tanpa kalimat tambahan." },
                        { inlineData: { mimeType: mimeType, data: pureBase64 } }
                    ]
                }
            ]
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (text) {
            brandNameInput.value = text;
            scanStatusBadge.classList.remove('hidden');
            showToast(`Produk terdeteksi: "${text}"`, "success");
            closeScanModal();
        } else {
            showToast("Gagal mengenali produk dari foto.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Terjadi kesalahan saat memproses gambar.", "error");
    } finally {
        scanningOverlay.classList.add('hidden');
    }
}

// --- SCRIPT GENERATION FUNCTIONS --- //

btnGenerate.addEventListener('click', generateScripts);

async function generateScripts() {
    if (!apiKey || apiKey === "MASUKKAN_API_KEY_GEMINI_DI_SINI") {
        showToast("Mohon isi API Key Gemini kamu di file kodingan terlebih dahulu!", "error");
        return;
    }

    const brand = brandNameInput.value.trim();
    const url = productUrlInput.value.trim();
    const tone = toneSelect.value;
    const length = lengthSelect.value;
    const count = parseInt(countSelect.value, 10);

    if (!brand) {
        showToast("Mohon masukkan Nama Brand atau scan foto produk terlebih dahulu!", "error");
        brandNameInput.focus();
        return;
    }

    // UI State updates
    placeholderState.classList.add('hidden');
    cardsContainer.innerHTML = '';
    loadingState.classList.remove('hidden');
    btnGenerate.disabled = true;
    btnGenerate.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        const promptText = `Kamu adalah seorang Copywriter Affiliate Marketing profesional.
Tugasmu adalah meracik ${count} variasi script video pendek affiliate (TikTok, Instagram Reels, Shopee Video) yang berkonversi tinggi.

Detail Produk:
- Nama Produk/Brand: ${brand}
${url ? `- Link Produk: ${url}` : ''}
- Gaya Bahasa (Tone): ${tone}
- Durasi / Panjang Script: ${length}

PENTING:
Kembalikan respon HANYA berupa array JSON murni (tanpa tanda markdown \`\`\`json ...) dengan format objek seperti berikut:
[
  {
    "judul": "Judul Hook Penasaran",
    "angle": "Sudut Pandang Penjualan (Misal: Solusi Flek Hitam)",
    "konten": "Isi script lengkap dengan arahan aksi/visual di dalam kurung siku [contoh: Tunjukkan ekspresi kaget].",
    "cta": "Kalimat ajakan bertindak yang kuat (misal: Klik keranjang kuning sekarang mumpung lagi diskon!)"
  }
]`;

        const payload = {
            contents: [{ parts: [{ text: promptText }] }]
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        let jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonText) {
            // Membersihkan karakter markdown jika ada
            jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            const scriptList = JSON.parse(jsonText);

            currentGeneratedScripts = scriptList;
            renderScriptCards(scriptList);
            resultsCountBadge.textContent = `${scriptList.length} Script berhasil diracik`;
            showToast("Script berhasil dibuat!", "success");
        } else {
            showToast("Gagal menghasilkan script. Silakan coba lagi.", "error");
        }

    } catch (err) {
        console.error(err);
        showToast("Terjadi kendala saat meracik script. Periksa API Key dan koneksi Anda.", "error");
    } finally {
        loadingState.classList.add('hidden');
        btnGenerate.disabled = false;
        btnGenerate.classList.remove('opacity-70', 'cursor-not-allowed');
    }
}

// --- UI RENDERING & ACTION FUNCTIONS --- //

function renderScriptCards(scripts) {
    cardsContainer.innerHTML = '';

    scripts.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = "glass-card rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4 hover:border-blue-500/30 transition-all duration-300";

        // Formatted script content with visual cues highlight
        const formattedContent = escapeHtml(item.konten).replace(/\[(.*?)\]/g, '<span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 my-1 inline-block">🎬 $1</span>');

        card.innerHTML = `
            <div class="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-3">
                <div>
                    <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Variasi ${index + 1} • ${escapeHtml(item.angle || 'Konten Viral')}
                    </span>
                    <h3 class="font-bold text-base text-white mt-2">${escapeHtml(item.judul)}</h3>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="copyCardContent(${index})" title="Salin Script" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all flex items-center gap-1">
                        <i class="fa-regular fa-copy"></i> <span class="hidden sm:inline">Salin</span>
                    </button>
                    <button onclick="exportCardToWord(${index})" title="Export ke Word" class="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs transition-all flex items-center gap-1">
                        <i class="fa-regular fa-file-word"></i> <span class="hidden sm:inline">Word</span>
                    </button>
                </div>
            </div>

            <!-- Script Content Area -->
            <div class="bg-slate-900/90 rounded-xl p-4 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
${formattedContent}
            </div>

            <!-- Call To Action Box -->
            <div class="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-3.5 rounded-xl border border-emerald-500/20 flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 text-xs mt-0.5">
                    <i class="fa-solid fa-bullhorn"></i>
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Call To Action (CTA)</span>
                    <p class="text-xs font-semibold text-slate-100 mt-0.5">${escapeHtml(item.cta)}</p>
                </div>
            </div>
        `;

        cardsContainer.appendChild(card);
    });
}

// --- HELPER FUNCTIONS --- //

function copyCardContent(index) {
    const item = currentGeneratedScripts[index];
    if (!item) return;

    const textToCopy = `[${item.judul}]\nAngle: ${item.angle}\n\nSCRIPT:\n${item.konten}\n\nCTA:\n${item.cta}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Script berhasil disalin ke clipboard!", "success");
    }).catch(() => {
        showToast("Gagal menyalin script.", "error");
    });
}

function exportCardToWord(index) {
    const item = currentGeneratedScripts[index];
    if (!item) return;

    const contentHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${escapeHtml(item.judul)}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #1e3a8a;">${escapeHtml(item.judul)}</h2>
            <p><b>Angle Konten:</b> ${escapeHtml(item.angle)}</p>
            <hr/>
            <h3>Isi Script:</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(item.konten)}</p>
            <hr/>
            <p style="color: #047857;"><b>Call To Action (CTA):</b> ${escapeHtml(item.cta)}</p>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', contentHtml], {
        type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Script_${item.judul.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("File Word berhasil didownload!", "success");
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    const bgColor = type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-200'
                   : type === 'error' ? 'bg-rose-900/90 border-rose-500/50 text-rose-200'
                   : 'bg-blue-900/90 border-blue-500/50 text-blue-200';

    const icon = type === 'success' ? 'fa-circle-check'
               : type === 'error' ? 'fa-triangle-exclamation'
               : 'fa-circle-info';

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColor}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

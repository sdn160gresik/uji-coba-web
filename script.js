
(() => {
  "use strict";

  const STORAGE_KEY = "komikAkuYangUnikJawabanV1";

  // ==========================================
  // 1. DATA NARATOR, DIALOG, DAN TANTANGAN
  // ==========================================
  const audioData = {
    narrator: {
      title: "🎙️ Narator",
      status: "🎙️ Narator sedang berbicara",
      text: "Selamat datang di Negeri Benda Unik! Hari ini kita akan menjelajahi keunikan, cerita, dan keindahan bahasa.",
      rate: 0.9,
      pitch: 0.92,
      icon: "🎙️",
      chunks: [
        "Selamat datang di Negeri Benda Unik!",
        "Hari ini kita akan menjelajahi keunikan, cerita, dan keindahan bahasa."
      ]
    },

    kamusi: {
      title: "📘 Dialog Kamusi",
      status: "📘 Kamusi sedang berbicara",
      text: "Ayo, kita mulai petualangan belajar!",
      rate: 0.94,
      pitch: 0.98,
      icon: "📘"
    },

    pensi: {
      title: "✏️ Dialog Pensi",
      status: "✏️ Pensi sedang berbicara",
      text: "Aku siap menghadapi tantangan!",
      rate: 1.02,
      pitch: 1.18,
      icon: "✏️"
    },

    challenge: {
      title: "🌟 Tantangan Siswa",
      status: "🌟 Tantangan sedang dibacakan",
      text: "Apa yang dimaksud dengan keunikan? Tuliskan satu contoh keunikan yang kamu miliki.",
      rate: 0.82,
      pitch: 1.0,
      icon: "🌟",
      chunks: [
        "Apa yang dimaksud dengan keunikan?",
        "Tuliskan satu contoh keunikan yang kamu miliki."
      ]
    }
  };

  // ==========================================
  // 2. MENGHUBUNGKAN ELEMEN HTML
  // ==========================================
  const $ = (id) => document.getElementById(id);

  const menuToggle = $("menuToggle");
  const audioMenu = $("audioMenu");
  const menuChevron = $("menuChevron");

  const audioStatus = $("audioStatus");
  const audioDetail = $("audioDetail");
  const statusIcon = $("statusIcon");

  const transcriptTitle = $("transcriptTitle");
  const transcriptText = $("transcriptText");

  const studentAnswer = $("studentAnswer");
  const saveStatus = $("saveStatus");

  const comicImage = $("comicImage");
  const imageLoading = $("imageLoading");
  const imageError = $("imageError");

  let lastSelection = null;
  let queueToken = 0;
  let activeUtterances = [];
  let queueRunning = false;
  let selectedVoice = null;

  // ==========================================
  // 3. STATUS GAMBAR KOMIK
  // ==========================================
  comicImage.addEventListener("load", () => {
    imageLoading.hidden = true;
    imageError.hidden = true;
  });

  comicImage.addEventListener("error", () => {
    imageLoading.hidden = true;
    imageError.hidden = false;
  });

  if (comicImage.complete && comicImage.naturalWidth > 0) {
    imageLoading.hidden = true;
  }

  // ==========================================
  // 4. MEMBUKA DAN MENUTUP MENU SUARA
  // ==========================================
  menuToggle.addEventListener("click", () => {
    const willOpen = audioMenu.hidden;

    audioMenu.hidden = !willOpen;

    menuToggle.setAttribute(
      "aria-expanded",
      String(willOpen)
    );

    menuChevron.textContent = willOpen ? "▴" : "▾";
  });

  // ==========================================
  // 5. MEMPERBARUI STATUS AUDIO
  // ==========================================
  function setStatus(title, detail, icon = "🔈") {
    audioStatus.textContent = title;
    audioDetail.textContent = detail;
    statusIcon.textContent = icon;
  }

  // ==========================================
  // 6. MENAMPILKAN TEKS AUDIO
  // ==========================================
  function setTranscript(key) {
    const item = audioData[key];

    transcriptTitle.textContent = item.title;
    transcriptText.textContent = item.text;

    document.querySelectorAll("[data-audio]").forEach((button) => {
      const isActive = button.dataset.audio === key;

      button.classList.toggle("active", isActive);

      button.setAttribute(
        "aria-pressed",
        String(isActive)
      );
    });
  }

  // ==========================================
  // 7. MEMERIKSA DUKUNGAN WEB SPEECH API
  // ==========================================
  function getSpeechApi() {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setStatus(
        "Suara tidak tersedia",
        "Browser ini tidak mendukung Web Speech API. Coba Google Chrome versi terbaru.",
        "⚠️"
      );

      return false;
    }

    return true;
  }

  // ==========================================
  // 8. MEMILIH SUARA BAHASA INDONESIA
  // ==========================================
  function chooseVoice() {
    if (!getSpeechApi()) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();

    selectedVoice =
      voices.find((voice) =>
        /^id(-|_)?ID$/i.test(voice.lang)
      ) ||
      voices.find((voice) =>
        /^id/i.test(voice.lang)
      ) ||
      null;

    return selectedVoice;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener?.(
      "voiceschanged",
      chooseVoice
    );

    chooseVoice();
  }

  // ==========================================
  // 9. MENGHENTIKAN AUDIO DAN ANTREAN
  // ==========================================
  function stopCurrentAudio(updateStatus = false) {
    // Token berubah agar antrean sebelumnya dibatalkan.
    queueToken++;

    queueRunning = false;
    activeUtterances = [];

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (updateStatus) {
      setStatus(
        "Audio dihentikan",
        "Antrean audio telah dibatalkan.",
        "⏹️"
      );
    }
  }

  // ==========================================
  // 10. MEMBUAT SATU UCAPAN
  // ==========================================
  function makeUtterance(text, key, token, resolve) {
    const config = audioData[key];

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "id-ID";
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 1;

    const voice = chooseVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (token !== queueToken) {
        return;
      }

      resolve();
    };

    utterance.onerror = (event) => {
      if (token !== queueToken) {
        return;
      }

      if (
        event.error !== "canceled" &&
        event.error !== "interrupted"
      ) {
        setStatus(
          "Audio mengalami kendala",
          "Coba pilih suara kembali atau periksa dukungan suara pada perangkat.",
          "⚠️"
        );
      }

      resolve();
    };

    return utterance;
  }

  // ==========================================
  // 11. MEMBACA TEKS DENGAN JEDA ALAMI
  // ==========================================
  function speakParts(key, token) {
    const config = audioData[key];

    const parts = config.chunks || [config.text];

    return parts.reduce(
      (promise, part, index) =>
        promise.then(
          () =>
            new Promise((resolve) => {
              if (token !== queueToken) {
                resolve();
                return;
              }

              const utterance = makeUtterance(
                part,
                key,
                token,
                resolve
              );

              activeUtterances.push(utterance);

              // Jeda alami di antara bagian narasi.
              if (index < parts.length - 1) {
                const originalEnd = utterance.onend;

                utterance.onend = () => {
                  if (token !== queueToken) {
                    resolve();
                    return;
                  }

                  setTimeout(() => {
                    if (token === queueToken) {
                      originalEnd();
                    } else {
                      resolve();
                    }
                  }, 650);
                };
              }

              window.speechSynthesis.speak(utterance);
            })
        ),
      Promise.resolve()
    );
  }

  // ==========================================
  // 12. MEMUTAR SATU BAGIAN AUDIO
  // ==========================================
  async function playOne(
    key,
    isFromQueue = false,
    tokenOverride = null
  ) {
    if (!getSpeechApi()) {
      return;
    }

    if (!isFromQueue) {
      stopCurrentAudio(false);
    }

    const token = tokenOverride ?? queueToken;

    lastSelection = key;

    setTranscript(key);

    setStatus(
      audioData[key].status,
      "Sedang membacakan teks pilihan.",
      audioData[key].icon
    );

    try {
      await speakParts(key, token);

      if (token === queueToken && !queueRunning) {
        setStatus(
          "Audio selesai",
          "Bagian suara selesai dibacakan.",
          "✅"
        );
      }
    } catch {
      if (token === queueToken) {
        setStatus(
          "Audio mengalami kendala",
          "Silakan coba lagi.",
          "⚠️"
        );
      }
    }
  }

  // ==========================================
  // 13. MEMUTAR SEMUA AUDIO SECARA BERURUTAN
  // ==========================================
  async function playAll() {
    if (!getSpeechApi()) {
      return;
    }

    stopCurrentAudio(false);

    const token = queueToken;

    queueRunning = true;

    const keys = [
      "narrator",
      "kamusi",
      "pensi",
      "challenge"
    ];

    for (let i = 0; i < keys.length; i++) {
      if (token !== queueToken) {
        return;
      }

      const key = keys[i];

      lastSelection = key;

      setTranscript(key);

      setStatus(
        "Memutar semua audio",
        `Bagian ${i + 1} dari ${keys.length}: ${audioData[key].title}`,
        audioData[key].icon
      );

      await speakParts(key, token);

      if (token !== queueToken) {
        return;
      }

      // Jeda antar pembicara.
      if (i < keys.length - 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, 700);
        });
      }
    }

    if (token === queueToken) {
      queueRunning = false;

      setStatus(
        "Semua audio selesai",
        "Empat bagian audio telah selesai diputar.",
        "✅"
      );
    }
  }

  // ==========================================
  // 14. TOMBOL PILIHAN AUDIO
  // ==========================================
  document.querySelectorAll("[data-audio]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.audio;

      if (key === "all") {
        playAll();
      } else {
        playOne(key);
      }
    });
  });

  // ==========================================
  // 15. JEDA AUDIO
  // ==========================================
  $("pauseButton").addEventListener("click", () => {
    if (!getSpeechApi()) {
      return;
    }

    if (
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    ) {
      window.speechSynthesis.pause();

      setStatus(
        "Audio dijeda",
        "Tekan Lanjutkan Audio untuk meneruskan dari posisi jeda.",
        "⏸️"
      );
    } else {
      setStatus(
        "Tidak ada audio untuk dijeda",
        "Pilih bagian suara terlebih dahulu.",
        "ℹ️"
      );
    }
  });

  // ==========================================
  // 16. MELANJUTKAN AUDIO
  // ==========================================
  $("resumeButton").addEventListener("click", () => {
    if (!getSpeechApi()) {
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();

      setStatus(
        queueRunning
          ? "Melanjutkan semua audio"
          : lastSelection
            ? audioData[lastSelection].status
            : "Audio dilanjutkan",
        "Melanjutkan audio dari posisi jeda.",
        "▶️"
      );
    } else {
      setStatus(
        "Audio tidak sedang dijeda",
        "Putar audio terlebih dahulu, lalu gunakan tombol jeda.",
        "ℹ️"
      );
    }
  });

  // ==========================================
  // 17. MENGHENTIKAN AUDIO
  // ==========================================
  $("stopButton").addEventListener("click", () => {
    stopCurrentAudio(true);
  });

  // ==========================================
  // 18. MENGULANGI AUDIO TERAKHIR
  // ==========================================
  $("repeatButton").addEventListener("click", () => {
    if (!lastSelection) {
      setStatus(
        "Pilih audio terlebih dahulu",
        "Belum ada bagian audio yang diputar.",
        "ℹ️"
      );

      return;
    }

    const repeatKey = lastSelection;

    if (repeatKey === "all") {
      playAll();
    } else {
      playOne(repeatKey);
    }
  });

  // ==========================================
  // 19. MEMUAT JAWABAN YANG TERSIMPAN
  // ==========================================
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      studentAnswer.value = saved;
    }
  } catch {
    saveStatus.textContent =
      "Penyimpanan lokal tidak tersedia pada browser ini. Jawaban mungkin tidak dapat disimpan.";

    saveStatus.classList.add("error");
  }

  // ==========================================
  // 20. MENYIMPAN JAWABAN SISWA
  // ==========================================
  $("saveAnswer").addEventListener("click", () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        studentAnswer.value
      );

      saveStatus.textContent =
        "✅ Jawaban berhasil disimpan di perangkat ini. Jawaban tidak otomatis dikirim kepada guru.";

      saveStatus.className = "save-status success";
    } catch {
      saveStatus.textContent =
        "❌ Jawaban belum dapat disimpan. Periksa pengaturan penyimpanan browser.";

      saveStatus.className = "save-status error";
    }
  });

  // ==========================================
  // 21. MENGHAPUS JAWABAN SISWA
  // ==========================================
  $("deleteAnswer").addEventListener("click", () => {
    studentAnswer.value = "";

    try {
      localStorage.removeItem(STORAGE_KEY);

      saveStatus.textContent =
        "Jawaban pada perangkat ini telah dihapus.";

      saveStatus.className = "save-status";
    } catch {
      saveStatus.textContent =
        "Kolom jawaban telah dikosongkan, tetapi penyimpanan browser tidak dapat diakses.";

      saveStatus.className = "save-status error";
    }
  });

})();

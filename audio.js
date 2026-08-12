(function () {
  const audio = document.getElementById("bgAudio");
  const toggleBtn = document.getElementById("musicToggle");
  const iconOn = document.getElementById("musicOnIcon");
  const iconOff = document.getElementById("musicOffIcon");

  if (!audio) return;

  const FADE_DURATION = 4000; // 4 seconds fade-in
  const TARGET_VOLUME = 0.6;  // Final volume (0-1)
  const FADE_STEPS = 60;      // Smoothness

  let isMuted = false;
  let hasStarted = false;

  // Smooth fade-in function
  function fadeIn() {
    audio.volume = 0;
    let step = 0;
    const interval = FADE_DURATION / FADE_STEPS;

    const fadeTimer = setInterval(() => {
      step++;
      // Ease-in curve for natural volume increase
      const progress = step / FADE_STEPS;
      const easedProgress = progress * progress; // quadratic ease-in
      audio.volume = Math.min(easedProgress * TARGET_VOLUME, TARGET_VOLUME);

      if (step >= FADE_STEPS) {
        audio.volume = TARGET_VOLUME;
        clearInterval(fadeTimer);
      }
    }, interval);
  }

  // Start audio on first user interaction (required by browsers)
  function startAudio() {
    if (hasStarted) return;
    hasStarted = true;

    audio.play().then(() => {
      fadeIn();
    }).catch((err) => {
      console.warn("Audio autoplay blocked:", err);
      hasStarted = false; // Allow retry
    });

    // Remove listeners after first successful start
    if (hasStarted) {
      document.removeEventListener("click", startAudio);
      document.removeEventListener("wheel", startAudio);
      document.removeEventListener("touchstart", startAudio);
      document.removeEventListener("keydown", startAudio);
    }
  }

  // Listen for first user interaction
  document.addEventListener("click", startAudio, { once: false });
  document.addEventListener("wheel", startAudio, { once: false });
  document.addEventListener("touchstart", startAudio, { once: false });
  document.addEventListener("keydown", startAudio, { once: false });

  // Toggle button
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!hasStarted) {
      // First click — start audio
      startAudio();
      return;
    }

    isMuted = !isMuted;
    audio.muted = isMuted;

    iconOn.style.display = isMuted ? "none" : "block";
    iconOff.style.display = isMuted ? "block" : "none";
  });
})();

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Populate counter-3 with extra digit loops for smooth scrolling
    var counter3 = document.querySelector(".counter-3");
    if (!counter3) return;

    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 10; j++) {
        var div = document.createElement("div");
        div.className = "num";
        div.textContent = j;
        counter3.appendChild(div);
      }
    }
    var finalDiv = document.createElement("div");
    finalDiv.className = "num";
    finalDiv.textContent = "0";
    counter3.appendChild(finalDiv);

    // Helper to animate digit reels
    function animateCounter(counter, duration, delay) {
      delay = delay || 0;
      var numHeight = counter.querySelector(".num").clientHeight;
      var totalDistance =
        (counter.querySelectorAll(".num").length - 1) * numHeight;
      gsap.to(counter, {
        y: -totalDistance,
        duration: duration,
        delay: delay,
        ease: "power2.inOut",
      });
    }

    // Counter reel animations
    animateCounter(counter3, 5);
    animateCounter(document.querySelector(".counter-2"), 6);
    animateCounter(document.querySelector(".counter-1"), 2, 4);

    // Digits slide up and out
    gsap.to(".digit", {
      top: "-150px",
      stagger: { amount: 0.25 },
      delay: 6,
      duration: 1,
      ease: "power4.inOut",
    });

    // Progress bar fill
    gsap.from(".loader-1", { width: 0, duration: 6, ease: "power2.inOut" });
    gsap.from(".loader-2", {
      width: 0,
      delay: 1.9,
      duration: 2,
      ease: "power2.inOut",
    });

    // Loader bar morph & transition
    gsap.to(".loader", { background: "none", delay: 6, duration: 0.1 });
    gsap.to(".loader-1", { rotate: 90, y: -50, duration: 0.5, delay: 6 });
    gsap.to(".loader-2", { x: -75, y: 75, duration: 0.5, delay: 6 });

    // Loader zoom & fly off
    gsap.to(".loader", {
      scale: 40,
      duration: 1,
      delay: 7,
      ease: "power2.inOut",
    });
    gsap.to(".loader", {
      rotate: 45,
      y: 800,
      x: 2000,
      duration: 1,
      delay: 7,
      ease: "power2.inOut",
    });

    // Loading screen fade out → Phase 2
    gsap.to(".loading-screen", {
      opacity: 0,
      duration: 0.5,
      delay: 7.5,
      ease: "power1.inOut",
      onComplete: function () {
        document.querySelector(".loading-screen").style.display = "none";
        revealWebsite();
      },
    });

    // ─── Reveal Full Website (After Loading Screen) ───
    function revealWebsite() {
      // Start background audio with fade-in
      if (window.startBgAudio) window.startBgAudio();

      // Show sakura background canvas
      var sakuraCanvas = document.getElementById("sakura");
      if (sakuraCanvas) {
        sakuraCanvas.style.transition = "opacity 0.8s ease";
        sakuraCanvas.style.opacity = "1";
      }

      // Show sakura foreground canvas
      var sakuraFront = document.getElementById("sakuraFront");
      if (sakuraFront) {
        sakuraFront.style.transition = "opacity 0.8s ease";
        sakuraFront.style.opacity = "1";
      }

      // Show scroll photos
      var sliderWrapper = document.querySelector(".slider-wrapper");
      if (sliderWrapper) {
        sliderWrapper.style.transition = "opacity 1s ease 0.3s";
        sliderWrapper.style.opacity = "1";
        sliderWrapper.style.pointerEvents = "auto";
      }

      // Show overlay vignette
      var overlay = document.querySelector(".overlay");
      if (overlay) {
        overlay.style.transition = "opacity 0.8s ease";
        overlay.style.opacity = "1";
      }

      // Initialize scroll effect
      if (window.initScrollEffect) window.initScrollEffect();
    }
  });
})();

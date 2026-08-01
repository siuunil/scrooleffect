window.addEventListener("load", () => {
  const lenis = new Lenis();
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  const images = [];
  let loadedImageCount = 0;
  const totalSlides = 17;

  function loadImages() {
    for (let i = 1; i <= totalSlides; i++) {
      const img = new Image();
      img.onload = function () {
        images[i - 1] = img;
        loadedImageCount++;

        if (loadedImageCount === totalSlides) {
          initializeScene();
        }
      };
      img.onerror = function () {
        loadedImageCount++;
        if (loadedImageCount === totalSlides) {
          initializeScene();
        }
      };
      img.src = `./assets/${i}.jpeg`;
    }
  }

  function initializeScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector("canvas"),
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a);

    const parentWidth = 20;
    const parentHeight = 180;
    const curvature = 35;
    const segmentsX = 200;
    const segmentsY = 200;

    const parentGeometry = new THREE.PlaneGeometry(
      parentWidth,
      parentHeight,
      segmentsX,
      segmentsY
    );

    const positions = parentGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const distanceFromCenter = Math.abs(y / (parentHeight / 2));
      positions[i + 2] = Math.pow(distanceFromCenter, 2) * curvature;
    }
    parentGeometry.computeVertexNormals();

    const slideHeight = 15;
    const gap = 0.5;
    const cycleHeight = totalSlides * (slideHeight + gap);

    const textureCanvas = document.createElement("canvas");
    const ctx = textureCanvas.getContext("2d", {
      alpha: false,
      willReadFrequently: false,
    });
    textureCanvas.width = 2048;
    textureCanvas.height = 16384;

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const parentMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const parentMesh = new THREE.Mesh(parentGeometry, parentMaterial);
    parentMesh.position.set(0, 0, 0);
    parentMesh.rotation.x = THREE.MathUtils.degToRad(-20);
    parentMesh.rotation.y = THREE.MathUtils.degToRad(20);
    scene.add(parentMesh);

    const distance = 17.5;
    const heightOffset = 5;
    const offsetX = distance * Math.sin(THREE.MathUtils.degToRad(20));
    const offsetZ = distance * Math.cos(THREE.MathUtils.degToRad(20));

    camera.position.set(offsetX, heightOffset, offsetZ);
    camera.lookAt(0, -2, 0);
    camera.rotation.z = THREE.MathUtils.degToRad(-5);

    // Romantic captions — 3–4 words each, one per picture
    const slideTitles = [
      "Our Pizza Nights 🍕",        // 1  – Dominos date
      "Late Night Drives ✨",        // 2  – car ride smiling
      "Exploring Together Always",   // 3  – colorful prayer flags
      "You & Me 💕",                 // 4  – elevator mirror selfie
      "My Handsome Boy",             // 5  – Sunil close-up purple light
      "Park Days Forever 🌿",       // 6  – coconut in park
      "Cutest Moments Ever",         // 7  – Prachi with baby
      "Night Out Vibes ✨",          // 8  – mall night standing
      "Cozy Lazy Mornings",          // 9  – playful on bed
      "My Pretty Girl 🌺",          // 10 – outdoor garden pose
      "That Beautiful Smile 😊",    // 11 – selfie with glasses
      "Candid & Gorgeous ☕",        // 12 – café with phone
      "Us Against World 💫",        // 13 – couple selfie together
      "Peace & Love ✌️",            // 14 – peace sign selfie
      "Forever My Sunshine ☀️",     // 15 – pretty smiling selfie
      "Missing Your Face 🥺",       // 16 – close-up cute
      "Foodie Adventures 🍴",       // 17 – street food together
    ];

    function updateTexture(offset = 0) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

      const extraSlides = 3;

      for (let i = -extraSlides; i < totalSlides + extraSlides; i++) {
        let slideY = -i * (slideHeight + gap);
        slideY += offset * cycleHeight;

        const textureY = (slideY / cycleHeight) * textureCanvas.height;
        let wrappedY = textureY % textureCanvas.height;
        if (wrappedY < 0) wrappedY += textureCanvas.height;

        let slideIndex = ((-i % totalSlides) + totalSlides) % totalSlides;

        const slideRect = {
          x: textureCanvas.width * 0.05,
          y: wrappedY,
          width: textureCanvas.width * 0.9,
          height: (slideHeight / cycleHeight) * textureCanvas.height,
        };

        const img = images[slideIndex];
        if (img) {
          const imgAspect = img.width / img.height;
          const rectAspect = slideRect.width / slideRect.height;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > rectAspect) {
            drawHeight = slideRect.height;
            drawWidth = drawHeight * imgAspect;
            drawX = slideRect.x + (slideRect.width - drawWidth) / 2;
            drawY = slideRect.y;
          } else {
            drawWidth = slideRect.width;
            drawHeight = drawWidth / imgAspect;
            drawX = slideRect.x;
            drawY = slideRect.y + (slideRect.height - drawHeight) / 2;
          }

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            slideRect.x,
            slideRect.y,
            slideRect.width,
            slideRect.height
          );
          ctx.clip();
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

          // Dark gradient overlay at bottom of each slide for text readability
          const gradientHeight = slideRect.height * 0.45;
          const gradient = ctx.createLinearGradient(
            0,
            slideRect.y + slideRect.height - gradientHeight,
            0,
            slideRect.y + slideRect.height
          );
          gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
          gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.5)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.85)");
          ctx.fillStyle = gradient;
          ctx.fillRect(
            slideRect.x,
            slideRect.y + slideRect.height - gradientHeight,
            slideRect.width,
            gradientHeight
          );

          ctx.restore();

          // Draw caption text with glow effect at bottom of slide
          const fontSize = 110;
          ctx.save();
          ctx.font = `italic 700 ${fontSize}px "Playfair Display", Georgia, serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";

          const textX = textureCanvas.width / 2;
          const textY = wrappedY + slideRect.height - 50;

          // Glow effect
          ctx.shadowColor = "rgba(255, 107, 157, 0.7)";
          ctx.shadowBlur = 30;
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.fillText(slideTitles[slideIndex], textX, textY);

          // Second pass for crispness
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(slideTitles[slideIndex], textX, textY);

          ctx.restore();
        }
      }

      texture.needsUpdate = true;
    }

    let currentScroll = 0;
    lenis.on("scroll", ({ scroll, limit, velocity, direction, progress }) => {
      currentScroll = scroll / limit;
      updateTexture(-currentScroll);
      renderer.render(scene, camera);
    });

    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 250);
    });

    updateTexture(0);
    renderer.render(scene, camera);
  }

  loadImages();
});

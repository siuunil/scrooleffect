window.addEventListener("load", () => {
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
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("scrollCanvas"),
      antialias: false,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const parentWidth = 20;
    const parentHeight = 180;
    const curvature = 55;
    const segmentsX = 60;
    const segmentsY = 120;

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
      alpha: true,
      willReadFrequently: false,
    });
    textureCanvas.width = 1024;
    textureCanvas.height = 8192;

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(2, renderer.capabilities.getMaxAnisotropy());

    const parentMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const parentMesh = new THREE.Mesh(parentGeometry, parentMaterial);
    parentMesh.position.set(0, 0, 0);
    parentMesh.rotation.x = THREE.MathUtils.degToRad(-28);
    parentMesh.rotation.y = THREE.MathUtils.degToRad(20);
    scene.add(parentMesh);

    const distance = 9.5;
    const heightOffset = 4.5;
    const offsetX = distance * Math.sin(THREE.MathUtils.degToRad(20));
    const offsetZ = distance * Math.cos(THREE.MathUtils.degToRad(20));

    camera.position.set(offsetX, heightOffset, offsetZ);
    camera.lookAt(-0.7, -2.5, 0);
    camera.rotation.z = THREE.MathUtils.degToRad(-5);

    const slideTitle = "Love";

    // Pre-render slides to offscreen canvases
    const slideCanvases = [];
    const slideRectHeight = (slideHeight / cycleHeight) * textureCanvas.height;
    const slideRectWidth = textureCanvas.width * 0.9;

    for (let s = 0; s < totalSlides; s++) {
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.round(slideRectWidth);
      offscreen.height = Math.round(slideRectHeight);
      const offCtx = offscreen.getContext("2d");

      const img = images[s];
      if (img) {
        // Clip to squircle (rounded rectangle)
        const radius = 30;
        offCtx.beginPath();
        offCtx.roundRect(0, 0, offscreen.width, offscreen.height, radius);
        offCtx.clip();

        const imgAspect = img.width / img.height;
        const rectAspect = offscreen.width / offscreen.height;

        let drawWidth, drawHeight, drawX, drawY;
        if (imgAspect > rectAspect) {
          drawHeight = offscreen.height;
          drawWidth = drawHeight * imgAspect;
          drawX = (offscreen.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = offscreen.width;
          drawHeight = drawWidth / imgAspect;
          drawX = 0;
          drawY = (offscreen.height - drawHeight) / 2;
        }

        offCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        const gradientHeight = offscreen.height * 0.4;
        const gradient = offCtx.createLinearGradient(
          0, offscreen.height - gradientHeight,
          0, offscreen.height
        );
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.5)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.85)");
        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, offscreen.height - gradientHeight, offscreen.width, gradientHeight);

        const fontSize = 18;
        offCtx.font = `400 ${fontSize}px "Inter", sans-serif`;
        offCtx.textAlign = "left";
        offCtx.textBaseline = "bottom";
        offCtx.shadowBlur = 0;
        offCtx.fillStyle = "#4169E1";
        offCtx.fillText("Was Once Mine ~", 20, offscreen.height - 15);
      }

      slideCanvases.push(offscreen);
    }

    function updateTexture(offset = 0) {
      ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

      const extraSlides = 2;
      const slideXOffset = textureCanvas.width * 0.05;

      for (let i = -extraSlides; i < totalSlides + extraSlides; i++) {
        let slideY = -i * (slideHeight + gap);
        slideY += offset * cycleHeight;

        const textureY = (slideY / cycleHeight) * textureCanvas.height;
        let wrappedY = textureY % textureCanvas.height;
        if (wrappedY < 0) wrappedY += textureCanvas.height;

        let slideIndex = ((-i % totalSlides) + totalSlides) % totalSlides;

        const cached = slideCanvases[slideIndex];
        if (cached) {
          ctx.drawImage(cached, slideXOffset, wrappedY, slideRectWidth, slideRectHeight);
        }
      }

      texture.needsUpdate = true;
    }

    // Infinite smooth scroll — no page scroll needed
    let targetScroll = 0;
    let currentSmooth = 0;
    const scrollSpeed = 0.00008;
    const smoothness = 0.075;

    // Mouse wheel
    window.addEventListener("wheel", (e) => {
      targetScroll += e.deltaY * scrollSpeed;
    }, { passive: true });

    // Touch support for mobile
    let touchStartY = 0;
    let lastTouchY = 0;

    window.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      const touchY = e.touches[0].clientY;
      const delta = lastTouchY - touchY;
      lastTouchY = touchY;
      targetScroll += delta * scrollSpeed * 2.5;
    }, { passive: true });

    // Animation loop with smooth lerp
    function animate() {
      const prev = currentSmooth;
      currentSmooth += (targetScroll - currentSmooth) * smoothness;

      // Only re-render when there's actual movement
      if (Math.abs(currentSmooth - prev) > 0.000001) {
        updateTexture(-currentSmooth);
        renderer.render(scene, camera);
      }

      requestAnimationFrame(animate);
    }

    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        updateTexture(-currentSmooth);
        renderer.render(scene, camera);
      }, 250);
    });

    updateTexture(0);
    renderer.render(scene, camera);
    animate();
  }

  loadImages();
});

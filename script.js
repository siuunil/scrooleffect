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
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x0a0a0a);

    const parentWidth = 20;
    const parentHeight = 180;
    const curvature = 35;
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
      alpha: false,
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

    const slideTitle = "Love";

    // Pre-render slide images to offscreen canvases so we don't re-process them each frame
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

        // Dark gradient overlay at bottom
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

        // "Love" text
        const fontSize = 55;
        offCtx.font = `italic 700 ${fontSize}px "Playfair Display", Georgia, serif`;
        offCtx.textAlign = "center";
        offCtx.textBaseline = "bottom";

        const textX = offscreen.width / 2;
        const textY = offscreen.height - 25;

        offCtx.shadowColor = "rgba(255, 107, 157, 0.7)";
        offCtx.shadowBlur = 20;
        offCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
        offCtx.fillText(slideTitle, textX, textY);

        offCtx.shadowBlur = 0;
        offCtx.fillStyle = "#ffffff";
        offCtx.fillText(slideTitle, textX, textY);
      }

      slideCanvases.push(offscreen);
    }

    function updateTexture(offset = 0) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

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

    // Use rAF-batched scroll updates instead of updating on every scroll tick
    let currentScroll = 0;
    let lastRenderedScroll = -1;
    let renderQueued = false;

    function renderFrame() {
      renderQueued = false;
      if (currentScroll === lastRenderedScroll) return;
      lastRenderedScroll = currentScroll;
      updateTexture(-currentScroll);
      renderer.render(scene, camera);
    }

    lenis.on("scroll", ({ scroll, limit }) => {
      currentScroll = scroll / limit;
      if (!renderQueued) {
        renderQueued = true;
        requestAnimationFrame(renderFrame);
      }
    });

    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
      }, 250);
    });

    updateTexture(0);
    renderer.render(scene, camera);
  }

  loadImages();
});

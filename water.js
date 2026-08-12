(function () {
  var renderer, scene, simScene, camera;
  var simMaterial, renderMaterial;
  var rtA, rtB;
  var animationId = null;
  var waterCanvas;
  var initialized = false;
  var mouseVec;

  var simulationVertexShader =
    "varying vec2 vUv;\nvoid main() {\n    vUv = uv;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}";

  var simulationFragmentShader = [
    "uniform sampler2D textureA;",
    "uniform vec2 mouse;",
    "uniform vec2 resolution;",
    "uniform float time;",
    "uniform int frame;",
    "varying vec2 vUv;",
    "const float delta = 1.4;",
    "void main() {",
    "    vec2 uv = vUv;",
    "    if (frame == 0) { gl_FragColor = vec4(0.0); return; }",
    "    vec4 data = texture2D(textureA, uv);",
    "    float pressure = data.x;",
    "    float pVel = data.y;",
    "    vec2 texelSize = 1.0 / resolution;",
    "    float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;",
    "    float p_left = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;",
    "    float p_up = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;",
    "    float p_down = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;",
    "    if (uv.x <= texelSize.x) p_left = p_right;",
    "    if (uv.x >= 1.0 - texelSize.x) p_right = p_left;",
    "    if (uv.y <= texelSize.y) p_down = p_up;",
    "    if (uv.y >= 1.0 - texelSize.y) p_up = p_down;",
    "    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;",
    "    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;",
    "    pressure += delta * pVel;",
    "    pVel -= 0.005 * delta * pressure;",
    "    pVel *= 1.0 - 0.002 * delta;",
    "    pressure *= 0.999;",
    "    vec2 mouseUV = mouse / resolution;",
    "    if(mouse.x > 0.0) {",
    "        float dist = distance(uv, mouseUV);",
    "        if(dist <= 0.02) {",
    "            pressure += 2.0 * (1.0 - dist / 0.02);",
    "        }",
    "    }",
    "    gl_FragColor = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);",
    "}",
  ].join("\n");

  var renderVertexShader =
    "varying vec2 vUv;\nvoid main() {\n    vUv = uv;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}";

  var renderFragmentShader = [
    "uniform sampler2D textureA;",
    "uniform sampler2D textureB;",
    "varying vec2 vUv;",
    "void main() {",
    "    vec4 data = texture2D(textureA, vUv);",
    "    vec2 distortion = 0.09 * data.zw;",
    "    vec4 color = texture2D(textureB, vUv + distortion);",
    "    vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));",
    "    vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));",
    "    float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 0.45;",
    "    gl_FragColor = color + vec4(specular);",
    "}",
  ].join("\n");

  var frame = 0;

  window.initWaterEffect = function () {
    if (initialized) return;
    initialized = true;

    waterCanvas = document.getElementById("waterCanvas");
    if (!waterCanvas) return;

    scene = new THREE.Scene();
    simScene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    renderer = new THREE.WebGLRenderer({
      canvas: waterCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    mouseVec = new THREE.Vector2();

    var width = window.innerWidth * window.devicePixelRatio;
    var height = window.innerHeight * window.devicePixelRatio;
    var options = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: false,
    };
    rtA = new THREE.WebGLRenderTarget(width, height, options);
    rtB = new THREE.WebGLRenderTarget(width, height, options);

    simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        mouse: { value: mouseVec },
        resolution: { value: new THREE.Vector2(width, height) },
        time: { value: 0 },
        frame: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    });

    renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        textureB: { value: null },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
    });

    var plane = new THREE.PlaneGeometry(2, 2);
    simScene.add(new THREE.Mesh(plane.clone(), simMaterial));
    scene.add(new THREE.Mesh(plane.clone(), renderMaterial));

    // Load p.png as background texture
    var textureLoader = new THREE.TextureLoader();
    var bgTexture = textureLoader.load("./p.png");
    bgTexture.minFilter = THREE.LinearFilter;
    bgTexture.magFilter = THREE.LinearFilter;
    renderMaterial.uniforms.textureB.value = bgTexture;

    // Mouse events for ripple
    window.addEventListener("mousemove", function (e) {
      if (waterCanvas.style.display === "none") return;
      mouseVec.x = e.clientX * window.devicePixelRatio;
      mouseVec.y =
        (window.innerHeight - e.clientY) * window.devicePixelRatio;
    });

    window.addEventListener("mouseleave", function () {
      mouseVec.set(0, 0);
    });

    // Touch events for mobile
    window.addEventListener("touchmove", function (e) {
      if (waterCanvas.style.display === "none") return;
      if (e.touches.length > 0) {
        mouseVec.x = e.touches[0].clientX * window.devicePixelRatio;
        mouseVec.y =
          (window.innerHeight - e.touches[0].clientY) *
          window.devicePixelRatio;
      }
    });

    window.addEventListener("touchend", function () {
      mouseVec.set(0, 0);
    });

    // Resize
    window.addEventListener("resize", function () {
      if (!renderer) return;
      var nw = window.innerWidth * window.devicePixelRatio;
      var nh = window.innerHeight * window.devicePixelRatio;
      renderer.setSize(window.innerWidth, window.innerHeight);
      rtA.setSize(nw, nh);
      rtB.setSize(nw, nh);
      simMaterial.uniforms.resolution.value.set(nw, nh);
    });
  };

  window.startWaterEffect = function () {
    if (!initialized) window.initWaterEffect();
    if (!renderer) return;

    waterCanvas.style.display = "block";
    waterCanvas.style.opacity = "1";
    frame = 0;

    function animate() {
      simMaterial.uniforms.frame.value = frame++;
      simMaterial.uniforms.time.value = performance.now() / 1000;

      simMaterial.uniforms.textureA.value = rtA.texture;
      renderer.setRenderTarget(rtB);
      renderer.render(simScene, camera);

      renderMaterial.uniforms.textureA.value = rtB.texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      var temp = rtA;
      rtA = rtB;
      rtB = temp;

      animationId = requestAnimationFrame(animate);
    }
    animate();
  };

  window.stopWaterEffect = function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (waterCanvas) {
      waterCanvas.style.transition = "opacity 0.8s ease";
      waterCanvas.style.opacity = "0";
      setTimeout(function () {
        waterCanvas.style.display = "none";
        waterCanvas.style.pointerEvents = "none";
      }, 800);
    }
  };
})();

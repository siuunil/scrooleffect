// Foreground large sakura petals only (background handled by sakura-bg.js)

(function () {
  // ── Petal class ──
  function Petal(canvas) {
    this.canvas = canvas;
    this.reset(true);
  }

  Petal.prototype.reset = function (initial) {
    var w = this.canvas.width;
    var h = this.canvas.height;

    this.size = 60 + Math.random() * 90;
    this.opacity = 0.70;
    this.speedY = 1.5 + Math.random() * 1.5;
    this.speedX = 1.0 + Math.random() * 1.0;

    this.x = Math.random() * w;
    this.y = initial ? Math.random() * h : -this.size - Math.random() * 60;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.03;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.008 + Math.random() * 0.015;
    this.wobbleAmp = 0.3 + Math.random() * 1.0;
    this.scaleX = 0.5 + Math.random() * 0.5;
    this.scaleY = 0.7 + Math.random() * 0.5;
  };

  Petal.prototype.update = function () {
    this.wobblePhase += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobblePhase) * this.wobbleAmp;
    this.y += this.speedY;
    this.rotation += this.rotSpeed;

    var w = this.canvas.width;
    var h = this.canvas.height;
    if (this.y > h + this.size * 2) this.reset(false);
    if (this.x > w + this.size) this.x = -this.size;
    else if (this.x < -this.size) this.x = w + this.size;
  };

  // Pre-render a blurred petal to an offscreen canvas for performance
  var blurredPetal = null;
  var blurSize = 140;

  function createBlurredPetal() {
    var off = document.createElement('canvas');
    off.width = blurSize;
    off.height = blurSize;
    var c = off.getContext('2d');
    var cx = blurSize / 2;
    var cy = blurSize / 2;
    var s = blurSize * 0.35;

    var grad = c.createRadialGradient(cx, cy, 0, cx, cy, s);
    grad.addColorStop(0, 'rgba(255, 210, 200, 0.7)');
    grad.addColorStop(0.4, 'rgba(255, 195, 185, 0.4)');
    grad.addColorStop(0.7, 'rgba(255, 180, 175, 0.15)');
    grad.addColorStop(1, 'rgba(255, 170, 165, 0)');

    c.beginPath();
    c.moveTo(cx, cy - s);
    c.bezierCurveTo(cx + s * 0.7, cy - s * 0.6, cx + s * 0.8, cy + s * 0.2, cx, cy + s);
    c.bezierCurveTo(cx - s * 0.8, cy + s * 0.2, cx - s * 0.7, cy - s * 0.6, cx, cy - s);
    c.closePath();
    c.fillStyle = grad;
    c.fill();

    blurredPetal = off;
  }

  var fgCanvas, fgCtx, fgPetals = [];
  var fgCount = 8;

  function initForeground() {
    fgCanvas = document.getElementById('sakuraFront');
    if (!fgCanvas) return false;
    fgCtx = fgCanvas.getContext('2d');
    fgCanvas.width = window.innerWidth;
    fgCanvas.height = window.innerHeight;
    createBlurredPetal();

    for (var i = 0; i < fgCount; i++) {
      var p = new Petal(fgCanvas);
      p.y = Math.random() * fgCanvas.height;
      fgPetals.push(p);
    }
    return true;
  }

  function drawForeground() {
    fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
    for (var i = 0; i < fgPetals.length; i++) {
      var p = fgPetals[i];
      p.update();
      fgCtx.save();
      fgCtx.translate(p.x, p.y);
      fgCtx.rotate(p.rotation);
      fgCtx.globalAlpha = p.opacity;
      var drawSize = p.size * 2;
      fgCtx.drawImage(blurredPetal, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      fgCtx.restore();
    }
  }

  function animate() {
    drawForeground();
    requestAnimationFrame(animate);
  }

  window.addEventListener('load', function () {
    if (initForeground()) animate();
  });

  window.addEventListener('resize', function () {
    if (fgCanvas) {
      fgCanvas.width = window.innerWidth;
      fgCanvas.height = window.innerHeight;
    }
  });
})();

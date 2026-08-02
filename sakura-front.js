// Foreground large sakura petals - creates 3D depth illusion
// These are big, blurry, low-opacity petals that float in front of everything

(function() {
  var canvas, ctx;
  var petals = [];
  var numPetals = 12;
  var animId;

  function Petal() {
    this.reset();
  }

  Petal.prototype.reset = function() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.size = 40 + Math.random() * 80; // Large petals
    this.speedX = 0.3 + Math.random() * 0.8;
    this.speedY = 0.5 + Math.random() * 1.2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
    this.opacity = 0.04 + Math.random() * 0.08; // Very low opacity
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.01 + Math.random() * 0.02;
    this.wobbleAmp = 0.5 + Math.random() * 1.5;
    // Petal shape variation
    this.scaleX = 0.6 + Math.random() * 0.4;
    this.scaleY = 0.8 + Math.random() * 0.4;
  };

  Petal.prototype.update = function() {
    this.wobble += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobble) * this.wobbleAmp;
    this.y += this.speedY;
    this.rotation += this.rotSpeed;

    // Wrap around screen edges
    if (this.x > window.innerWidth + this.size) {
      this.x = -this.size;
    }
    if (this.x < -this.size) {
      this.x = window.innerWidth + this.size;
    }
    if (this.y > window.innerHeight + this.size) {
      this.y = -this.size;
      this.x = Math.random() * window.innerWidth;
    }
  };

  Petal.prototype.draw = function(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.globalAlpha = this.opacity;

    // Draw a petal shape
    ctx.beginPath();
    var s = this.size;
    // Petal shape using bezier curves
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.3, -s * 0.3, s * 0.4, s * 0.1, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.4, s * 0.1, -s * 0.3, -s * 0.3, 0, -s * 0.5);
    ctx.closePath();

    // Soft pink gradient fill
    var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
    gradient.addColorStop(0, 'rgba(255, 200, 200, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 170, 170, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 140, 160, 0.3)');
    ctx.fillStyle = gradient;
    ctx.filter = 'blur(3px)';
    ctx.fill();

    ctx.restore();
  };

  function init() {
    canvas = document.getElementById('sakuraFront');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < numPetals; i++) {
      var p = new Petal();
      // Stagger initial positions
      p.y = Math.random() * window.innerHeight * 1.5 - window.innerHeight * 0.25;
      petals.push(p);
    }

    animate();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < petals.length; i++) {
      petals[i].update();
      petals[i].draw(ctx);
    }

    animId = requestAnimationFrame(animate);
  }

  window.addEventListener('load', init);
})();

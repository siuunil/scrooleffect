// Original Sakura WebGL Background Effect
// Adapted from Sakura-Effect-main — runs on #sakura canvas

(function() {
  var Vector3 = {};
  var Matrix44 = {};
  Vector3.create = function(x, y, z) { return { x, y, z }; };
  Vector3.dot = function(v0, v1) { return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z; };
  Vector3.cross = function(v, v0, v1) {
    v.x = v0.y * v1.z - v0.z * v1.y;
    v.y = v0.z * v1.x - v0.x * v1.z;
    v.z = v0.x * v1.y - v0.y * v1.x;
  };
  Vector3.normalize = function(v) {
    var l = v.x * v.x + v.y * v.y + v.z * v.z;
    if (l > 1e-5) { l = 1 / Math.sqrt(l); v.x *= l; v.y *= l; v.z *= l; }
  };
  Vector3.arrayForm = function(v) {
    if (v.array) { v.array[0] = v.x; v.array[1] = v.y; v.array[2] = v.z; }
    else { v.array = new Float32Array([v.x, v.y, v.z]); }
    return v.array;
  };
  Matrix44.createIdentity = function() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  };
  Matrix44.loadProjection = function(m, aspect, vdeg, near, far) {
    var h = near * Math.tan(vdeg * Math.PI / 180 * 0.5) * 2;
    var w = h * aspect;
    m[0]=2*near/w; m[1]=0; m[2]=0; m[3]=0;
    m[4]=0; m[5]=2*near/h; m[6]=0; m[7]=0;
    m[8]=0; m[9]=0; m[10]=-(far+near)/(far-near); m[11]=-1;
    m[12]=0; m[13]=0; m[14]=-2*far*near/(far-near); m[15]=0;
  };
  Matrix44.loadLookAt = function(m, vpos, vlook, vup) {
    var frontv = Vector3.create(vpos.x-vlook.x, vpos.y-vlook.y, vpos.z-vlook.z);
    Vector3.normalize(frontv);
    var sidev = Vector3.create(1,0,0);
    Vector3.cross(sidev, vup, frontv); Vector3.normalize(sidev);
    var topv = Vector3.create(1,0,0);
    Vector3.cross(topv, frontv, sidev); Vector3.normalize(topv);
    m[0]=sidev.x; m[1]=topv.x; m[2]=frontv.x; m[3]=0;
    m[4]=sidev.y; m[5]=topv.y; m[6]=frontv.y; m[7]=0;
    m[8]=sidev.z; m[9]=topv.z; m[10]=frontv.z; m[11]=0;
    m[12]=-(vpos.x*m[0]+vpos.y*m[4]+vpos.z*m[8]);
    m[13]=-(vpos.x*m[1]+vpos.y*m[5]+vpos.z*m[9]);
    m[14]=-(vpos.x*m[2]+vpos.y*m[6]+vpos.z*m[10]);
    m[15]=1;
  };

  var timeInfo = { start:0, prev:0, delta:0, elapsed:0 };
  var gl;
  var renderSpec = {
    width:0, height:0, aspect:1,
    array: new Float32Array(3),
    halfWidth:0, halfHeight:0,
    halfArray: new Float32Array(3)
  };
  renderSpec.setSize = function(w, h) {
    this.width=w; this.height=h; this.aspect=w/h;
    this.array[0]=w; this.array[1]=h; this.array[2]=this.aspect;
    this.halfWidth=Math.floor(w/2); this.halfHeight=Math.floor(h/2);
    this.halfArray[0]=this.halfWidth; this.halfArray[1]=this.halfHeight;
    this.halfArray[2]=this.halfWidth/this.halfHeight;
  };

  function deleteRenderTarget(rt) {
    gl.deleteFramebuffer(rt.frameBuffer);
    gl.deleteRenderbuffer(rt.renderBuffer);
    gl.deleteTexture(rt.texture);
  }
  function createRenderTarget(w, h) {
    var ret = { width:w, height:h, sizeArray:new Float32Array([w,h,w/h]), dtxArray:new Float32Array([1/w,1/h]) };
    ret.frameBuffer = gl.createFramebuffer();
    ret.renderBuffer = gl.createRenderbuffer();
    ret.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ret.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ret.frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ret.texture, 0);
    gl.bindRenderbuffer(gl.RENDERBUFFER, ret.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ret.renderBuffer);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ret;
  }
  function compileShader(shtype, shsrc) {
    var retsh = gl.createShader(shtype);
    gl.shaderSource(retsh, shsrc);
    gl.compileShader(retsh);
    if (!gl.getShaderParameter(retsh, gl.COMPILE_STATUS)) {
      gl.deleteShader(retsh); return null;
    }
    return retsh;
  }
  function createShader(vtxsrc, frgsrc, uniformlist, attrlist) {
    var vsh = compileShader(gl.VERTEX_SHADER, vtxsrc);
    var fsh = compileShader(gl.FRAGMENT_SHADER, frgsrc);
    if (!vsh || !fsh) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh);
    gl.deleteShader(vsh); gl.deleteShader(fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    if (uniformlist) {
      prog.uniforms = {};
      for (var i=0; i<uniformlist.length; i++)
        prog.uniforms[uniformlist[i]] = gl.getUniformLocation(prog, uniformlist[i]);
    }
    if (attrlist) {
      prog.attributes = {};
      for (var i=0; i<attrlist.length; i++)
        prog.attributes[attrlist[i]] = gl.getAttribLocation(prog, attrlist[i]);
    }
    return prog;
  }
  function useShader(prog) {
    gl.useProgram(prog);
    for (var attr in prog.attributes) gl.enableVertexAttribArray(prog.attributes[attr]);
  }
  function unuseShader(prog) {
    for (var attr in prog.attributes) gl.disableVertexAttribArray(prog.attributes[attr]);
    gl.useProgram(null);
  }

  var projection = { angle:60, nearfar:new Float32Array([0.1,100]), matrix:Matrix44.createIdentity() };
  var camera = {
    position: Vector3.create(0,0,100), lookat: Vector3.create(0,0,0),
    up: Vector3.create(0,1,0), dof: Vector3.create(10,4,8),
    matrix: Matrix44.createIdentity()
  };
  var pointFlower = {};
  var sceneStandBy = false;

  var BlossomParticle = function() {
    this.velocity=new Array(3); this.rotation=new Array(3);
    this.position=new Array(3); this.euler=new Array(3);
    this.size=1; this.alpha=1; this.zkey=0;
  };
  BlossomParticle.prototype.setVelocity = function(vx,vy,vz) { this.velocity[0]=vx; this.velocity[1]=vy; this.velocity[2]=vz; };
  BlossomParticle.prototype.setRotation = function(rx,ry,rz) { this.rotation[0]=rx; this.rotation[1]=ry; this.rotation[2]=rz; };
  BlossomParticle.prototype.setPosition = function(nx,ny,nz) { this.position[0]=nx; this.position[1]=ny; this.position[2]=nz; };
  BlossomParticle.prototype.setEulerAngles = function(rx,ry,rz) { this.euler[0]=rx; this.euler[1]=ry; this.euler[2]=rz; };
  BlossomParticle.prototype.setSize = function(s) { this.size=s; };
  BlossomParticle.prototype.update = function(dt) {
    this.position[0]+=this.velocity[0]*dt; this.position[1]+=this.velocity[1]*dt; this.position[2]+=this.velocity[2]*dt;
    this.euler[0]+=this.rotation[0]*dt; this.euler[1]+=this.rotation[1]*dt; this.euler[2]+=this.rotation[2]*dt;
  };

  function createPointFlowers() {
    var vtxsrc = document.getElementById("sakura_point_vsh").textContent;
    var frgsrc = document.getElementById("sakura_point_fsh").textContent;
    pointFlower.program = createShader(vtxsrc, frgsrc,
      ["uProjection","uModelview","uResolution","uOffset","uDOF","uFade"],
      ["aPosition","aEuler","aMisc"]);
    useShader(pointFlower.program);
    pointFlower.offset = new Float32Array([0,0,0]);
    pointFlower.fader = Vector3.create(0,10,0);
    pointFlower.numFlowers = 800;
    pointFlower.particles = new Array(pointFlower.numFlowers);
    pointFlower.dataArray = new Float32Array(pointFlower.numFlowers * 8);
    pointFlower.positionArrayOffset = 0;
    pointFlower.eulerArrayOffset = pointFlower.numFlowers * 3;
    pointFlower.miscArrayOffset = pointFlower.numFlowers * 6;
    pointFlower.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    unuseShader(pointFlower.program);
    for (var i=0; i<pointFlower.numFlowers; i++)
      pointFlower.particles[i] = new BlossomParticle();
  }
  function initPointFlowers() {
    pointFlower.area = Vector3.create(20,20,20);
    pointFlower.area.x = pointFlower.area.y * renderSpec.aspect;
    pointFlower.fader.x = 10;
    pointFlower.fader.y = pointFlower.area.z;
    pointFlower.fader.z = 0.1;
    var PI2 = Math.PI*2, tmpv3 = Vector3.create(0,0,0), tmpv = 0;
    var srand = function() { return Math.random()*2-1; };
    for (var i=0; i<pointFlower.numFlowers; i++) {
      var p = pointFlower.particles[i];
      tmpv3.x=srand()*0.3+0.8; tmpv3.y=srand()*0.2-1; tmpv3.z=srand()*0.3+0.5;
      Vector3.normalize(tmpv3);
      tmpv = 2+Math.random();
      p.setVelocity(tmpv3.x*tmpv, tmpv3.y*tmpv, tmpv3.z*tmpv);
      p.setRotation(srand()*PI2*0.5, srand()*PI2*0.5, srand()*PI2*0.5);
      p.setPosition(srand()*pointFlower.area.x, srand()*pointFlower.area.y, srand()*pointFlower.area.z);
      p.setEulerAngles(Math.random()*PI2, Math.random()*PI2, Math.random()*PI2);
      p.setSize(0.9+Math.random()*0.1);
    }
  }
  function renderPointFlowers() {
    var PI2 = Math.PI*2;
    var repeatPos = function(prt,cmp,limit) {
      if (Math.abs(prt.position[cmp])-prt.size*0.5 > limit)
        prt.position[cmp] += (prt.position[cmp]>0 ? -limit*2 : limit*2);
    };
    var repeatEuler = function(prt,cmp) {
      prt.euler[cmp] = prt.euler[cmp] % PI2;
      if (prt.euler[cmp]<0) prt.euler[cmp]+=PI2;
    };
    for (var i=0; i<pointFlower.numFlowers; i++) {
      var p = pointFlower.particles[i];
      p.update(timeInfo.delta);
      repeatPos(p,0,pointFlower.area.x); repeatPos(p,1,pointFlower.area.y); repeatPos(p,2,pointFlower.area.z);
      repeatEuler(p,0); repeatEuler(p,1); repeatEuler(p,2);
      p.alpha=1;
      p.zkey = camera.matrix[2]*p.position[0]+camera.matrix[6]*p.position[1]+camera.matrix[10]*p.position[2]+camera.matrix[14];
    }
    pointFlower.particles.sort(function(a,b) { return a.zkey-b.zkey; });
    var ipos=0, ieuler=pointFlower.eulerArrayOffset, imisc=pointFlower.miscArrayOffset;
    for (var i=0; i<pointFlower.numFlowers; i++) {
      var p = pointFlower.particles[i];
      pointFlower.dataArray[ipos]=p.position[0]; pointFlower.dataArray[ipos+1]=p.position[1]; pointFlower.dataArray[ipos+2]=p.position[2]; ipos+=3;
      pointFlower.dataArray[ieuler]=p.euler[0]; pointFlower.dataArray[ieuler+1]=p.euler[1]; pointFlower.dataArray[ieuler+2]=p.euler[2]; ieuler+=3;
      pointFlower.dataArray[imisc]=p.size; pointFlower.dataArray[imisc+1]=p.alpha; imisc+=2;
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var prog = pointFlower.program;
    useShader(prog);
    gl.uniformMatrix4fv(prog.uniforms.uProjection, false, projection.matrix);
    gl.uniformMatrix4fv(prog.uniforms.uModelview, false, camera.matrix);
    gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array);
    gl.uniform3fv(prog.uniforms.uDOF, Vector3.arrayForm(camera.dof));
    gl.uniform3fv(prog.uniforms.uFade, Vector3.arrayForm(pointFlower.fader));
    gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(prog.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(prog.attributes.aEuler, 3, gl.FLOAT, false, 0, pointFlower.eulerArrayOffset*4);
    gl.vertexAttribPointer(prog.attributes.aMisc, 2, gl.FLOAT, false, 0, pointFlower.miscArrayOffset*4);
    for (var i=1; i<2; i++) {
      var zp = i*-2;
      var offsets = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (var j=0; j<offsets.length; j++) {
        pointFlower.offset[0]=pointFlower.area.x*offsets[j][0];
        pointFlower.offset[1]=pointFlower.area.y*offsets[j][1];
        pointFlower.offset[2]=pointFlower.area.z*zp;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
      }
    }
    pointFlower.offset[0]=0; pointFlower.offset[1]=0; pointFlower.offset[2]=0;
    gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
    gl.drawArrays(gl.POINT, 0, pointFlower.numFlowers);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    unuseShader(prog);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  }

  function createEffectProgram(vtxsrc, frgsrc, exunifs) {
    var ret = {};
    var unifs = ["uResolution","uSrc","uDelta"];
    if (exunifs) unifs = unifs.concat(exunifs);
    ret.program = createShader(vtxsrc, frgsrc, unifs, ["aPosition"]);
    useShader(ret.program);
    ret.dataArray = new Float32Array([-1,-1,1,-1,-1,1,1,1]);
    ret.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ret.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, ret.dataArray, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    unuseShader(ret.program);
    return ret;
  }
  function useEffect(fxobj, srctex) {
    useShader(fxobj.program);
    gl.uniform3fv(fxobj.program.uniforms.uResolution, renderSpec.array);
    if (srctex) {
      gl.uniform2fv(fxobj.program.uniforms.uDelta, srctex.dtxArray);
      gl.uniform1i(fxobj.program.uniforms.uSrc, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srctex.texture);
    }
  }
  function drawEffect(fxobj) {
    gl.bindBuffer(gl.ARRAY_BUFFER, fxobj.buffer);
    gl.vertexAttribPointer(fxobj.program.attributes.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function unuseEffect(fxobj) { unuseShader(fxobj.program); }

  var effectLib = {};
  function createEffectLib() {
    var cmnvtxsrc = document.getElementById("fx_common_vsh").textContent;
    effectLib.sceneBg = createEffectProgram(cmnvtxsrc, document.getElementById("bg_fsh").textContent, ["uTimes"]);
    effectLib.mkBrightBuf = createEffectProgram(cmnvtxsrc, document.getElementById("fx_brightbuf_fsh").textContent);
    effectLib.dirBlur = createEffectProgram(cmnvtxsrc, document.getElementById("fx_dirblur_r4_fsh").textContent, ["uBlurDir"]);
    effectLib.finalComp = createEffectProgram(
      document.getElementById("pp_final_vsh").textContent,
      document.getElementById("pp_final_fsh").textContent, ["uBloom"]);
  }
  function renderBackground() {
    gl.disable(gl.DEPTH_TEST);
    useEffect(effectLib.sceneBg, null);
    gl.uniform2f(effectLib.sceneBg.program.uniforms.uTimes, timeInfo.elapsed, timeInfo.delta);
    drawEffect(effectLib.sceneBg);
    unuseEffect(effectLib.sceneBg);
    gl.enable(gl.DEPTH_TEST);
  }
  function renderPostProcess() {
    gl.disable(gl.DEPTH_TEST);
    var bindRT = function(rt) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt.frameBuffer);
      gl.viewport(0,0,rt.width,rt.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    };
    bindRT(renderSpec.wHalfRT0);
    useEffect(effectLib.mkBrightBuf, renderSpec.mainRT);
    drawEffect(effectLib.mkBrightBuf); unuseEffect(effectLib.mkBrightBuf);
    for (var i=0; i<2; i++) {
      var p=1.5+i, s=2+i;
      bindRT(renderSpec.wHalfRT1);
      useEffect(effectLib.dirBlur, renderSpec.wHalfRT0);
      gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, p,0,s,0);
      drawEffect(effectLib.dirBlur); unuseEffect(effectLib.dirBlur);
      bindRT(renderSpec.wHalfRT0);
      useEffect(effectLib.dirBlur, renderSpec.wHalfRT1);
      gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, 0,p,0,s);
      drawEffect(effectLib.dirBlur); unuseEffect(effectLib.dirBlur);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,renderSpec.width,renderSpec.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    useEffect(effectLib.finalComp, renderSpec.mainRT);
    gl.uniform1i(effectLib.finalComp.program.uniforms.uBloom, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, renderSpec.wHalfRT0.texture);
    drawEffect(effectLib.finalComp); unuseEffect(effectLib.finalComp);
    gl.enable(gl.DEPTH_TEST);
  }

  function createScene() { createEffectLib(); createPointFlowers(); sceneStandBy=true; }
  function initScene() {
    initPointFlowers();
    camera.position.z = pointFlower.area.z + projection.nearfar[0];
    projection.angle = Math.atan2(pointFlower.area.y, camera.position.z+pointFlower.area.z)*180/Math.PI*2;
    Matrix44.loadProjection(projection.matrix, renderSpec.aspect, projection.angle, projection.nearfar[0], projection.nearfar[1]);
  }
  function renderScene() {
    Matrix44.loadLookAt(camera.matrix, camera.position, camera.lookat, camera.up);
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderSpec.mainRT.frameBuffer);
    gl.viewport(0,0,renderSpec.mainRT.width,renderSpec.mainRT.height);
    gl.clearColor(0.005,0,0.05,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    renderBackground();
    renderPointFlowers();
    renderPostProcess();
  }
  function onResize() {
    var c = document.getElementById("sakura");
    c.width = window.innerWidth; c.height = window.innerHeight;
    setViewports();
    if (sceneStandBy) initScene();
  }
  function setViewports() {
    renderSpec.setSize(gl.canvas.width, gl.canvas.height);
    gl.viewport(0,0,renderSpec.width,renderSpec.height);
    var rtfunc = function(name, w, h) {
      if (renderSpec[name]) deleteRenderTarget(renderSpec[name]);
      renderSpec[name] = createRenderTarget(w, h);
    };
    rtfunc("mainRT", renderSpec.width, renderSpec.height);
    rtfunc("wFullRT0", renderSpec.width, renderSpec.height);
    rtfunc("wFullRT1", renderSpec.width, renderSpec.height);
    rtfunc("wHalfRT0", renderSpec.halfWidth, renderSpec.halfHeight);
    rtfunc("wHalfRT1", renderSpec.halfWidth, renderSpec.halfHeight);
  }
  function animate() {
    var now = new Date();
    timeInfo.elapsed = (now-timeInfo.start)/1e3;
    timeInfo.delta = (now-timeInfo.prev)/1e3;
    timeInfo.prev = now;
    requestAnimationFrame(animate);
    renderScene();
  }

  window.addEventListener("load", function() {
    var canvas = document.getElementById("sakura");
    try {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    } catch(e) { console.error("Sakura WebGL error:", e); return; }
    if (!gl) return;
    window.addEventListener("resize", onResize);
    setViewports();
    createScene();
    initScene();
    timeInfo.start = new Date();
    timeInfo.prev = timeInfo.start;
    animate();
  });
})();

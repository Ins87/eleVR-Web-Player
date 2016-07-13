var vrHMD, vrSensor;

(function (global) {
  'use strict';

  function PlayerWebGL(video, canvas) {
    var self = this;
    this.video = video;
    this.canvas = canvas;
    this.gl = null;
    this.positionsBuffer = null;
    this.texture = null;
    this.verticesIndexBuffer = null;
    this.timing = {
      showTiming: false, // Switch to true to show frame times in the console
      frameTime: 0,
      prevFrameTime: 0,
      canvasResized: 0,
      textureLoaded: 0,
      start: 0,
      end: 0,
      framesSinceIssue: 0,
    };

    try {
      this.gl = getWebGLContext();
    } catch (e) {
    }

    if (!this.gl) {
      alert('Unable to initialize WebGL. Your browser may not support it.');
      return;
    }

    init();

    function getWebGLContext() {
      return self.canvas.getContext('webgl') ||
        self.canvas.getContext('experimental-webgl');
    }

    function init() {
      self.gl.clearColor(0.0, 0.0, 0.0, 0.0);
      self.gl.clearDepth(1.0);
      self.gl.disable(self.gl.DEPTH_TEST);
      loadShader();
    }

    function loadShader() { // Todo extract
      var params = {
        fragmentShaderName: 'shader-fs',
        vertexShaderName: 'shader-vs',
        attributes: ['aVertexPosition'],
        uniforms: ['uSampler', 'eye', 'projection', 'proj_inv'],
      };
      self.program = self.gl.createProgram();

      self.gl.attachShader(self.program, self.getShaderByName(params.vertexShaderName));
      self.gl.attachShader(self.program, self.getShaderByName(params.fragmentShaderName));
      self.gl.linkProgram(self.program);

      if (!self.gl.getProgramParameter(self.program, self.gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + self.gl.getProgramInfoLog(self.program));
        //  Todo return?
      }

      self.gl.useProgram(self.program);

      self.attributes = {};
      for (var i = 0; i < params.attributes.length; i++) {
        var attributeName = params.attributes[i];
        self.attributes[attributeName] = self.gl.getAttribLocation(self.program, attributeName);
        self.gl.enableVertexAttribArray(self.attributes[attributeName]);
      }

      self.uniforms = {};
      for (i = 0; i < params.uniforms.length; i++) {
        var uniformName = params.uniforms[i];
        self.uniforms[uniformName] = self.gl.getUniformLocation(self.program, uniformName);
        self.gl.enableVertexAttribArray(self.attributes[uniformName]);
      }
    }
  }

  PlayerWebGL.prototype.drawScene = function drawScene(frameTime) {
    this.timing.frameTime = frameTime;
    if (this.timing.showTiming) {
      this.timing.start = performance.now();
    }

    util.setCanvasSize(this.canvas, this.getBackingStorePixelRatio());

    if (this.timing.showTiming) {
      this.timing.canvasResized = performance.now();
    }

    this.updateTexture();

    if (this.timing.showTiming) {
      this.timing.textureLoaded = performance.now();
    }

    if (this.timing.prevFrameTime) {
      // Apply manual controls.
      var interval = (this.timing.frameTime - this.timing.prevFrameTime) * 0.001;

      var update = quat.fromValues(controls.manualRotateRate[0] * interval,
        controls.manualRotateRate[1] * interval,
        controls.manualRotateRate[2] * interval, 1.0);
      quat.normalize(update, update);
      quat.multiply(manualRotation, manualRotation, update);
    }

    var perspectiveMatrix = mat4.create();
    if (typeof vrHMD !== 'undefined') {
      var leftParams = vrHMD.getEyeParameters('left');
      var rightParams = vrHMD.getEyeParameters('right');
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(leftParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('left', perspectiveMatrix);
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(rightParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('right', perspectiveMatrix);
    } else {
      var ratio;
      if (eyesSelect.value === 'one') {
        ratio = (this.canvas.width) / this.canvas.height;
        mat4.perspective(perspectiveMatrix, Math.PI / 2, ratio, 0.1, 10);
        this.drawEye('both', perspectiveMatrix);
      } else {
        ratio = (this.canvas.width / 2) / this.canvas.height;
        mat4.perspective(perspectiveMatrix, Math.PI / 2, ratio, 0.1, 10);
        this.drawEye('left', perspectiveMatrix);
        this.drawEye('right', perspectiveMatrix);
      }
    }

    if (this.timing.showTiming) {
      this.gl.finish();
      this.timing.end = performance.now();
      if (this.timing.end - this.timing.frameTime > 20) {
        console.log(this.timing.framesSinceIssue + ' Frame time: ' +
          (this.timing.start - this.timing.frameTime) + 'ms animation frame lag + ' +
          (this.timing.canvasResized - this.timing.start) + 'ms canvas resized + ' +
          (this.timing.textureLoaded - this.timing.canvasResized) + 'ms to load texture + ' +
          (this.timing.end - this.timing.textureLoaded) + 'ms = ' + (this.timing.end - this.timing.frameTime) + 'ms');
        this.timing.framesSinceIssue = 0;
      } else {
        this.timing.framesSinceIssue++;
      }
    }

    this.play();
    this.timing.prevFrameTime = this.timing.frameTime;
  };

  PlayerWebGL.prototype.drawEye = function drawEye(eye, projectionMatrix) {
    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionsBuffer);
    this.gl.vertexAttribPointer(this.attributes['aVertexPosition'], 2, this.gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uniforms['uSampler'], 0);

    this.gl.uniform1f(this.uniforms['eye'], eye === 'right' ? 1 : 0);
    this.gl.uniform1f(this.uniforms['projection'], projection); // Todo remove global

    var rotation = mat4.create();
    var totalRotation = quat.create();

    if (typeof vrSensor !== 'undefined') { // Todo remove global
      var state = vrSensor.getState();
      if (state !== null && state.orientation !== null && typeof state.orientation !== 'undefined' &&
        state.orientation.x !== 0 &&
        state.orientation.y !== 0 &&
        state.orientation.z !== 0 &&
        state.orientation.w !== 0) {
        var sensorOrientation = new Float32Array([state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w]);
        quat.multiply(totalRotation, manualRotation, sensorOrientation); // Todo remove global
      } else {
        totalRotation = manualRotation; // Todo remove global
      }
      mat4.fromQuat(rotation, totalRotation);
    } else {
      quat.multiply(totalRotation, manualRotation, PhoneVR.getInstance().rotationQuat()); // Todo remove global
      mat4.fromQuat(rotation, totalRotation);
    }

    var projectionInverse = mat4.create();
    mat4.invert(projectionInverse, projectionMatrix);
    var inv = mat4.create();
    mat4.multiply(inv, rotation, projectionInverse);

    this.gl.uniformMatrix4fv(this.uniforms['proj_inv'], false, inv);

    if (eye === 'left') { // left eye
      this.gl.viewport(0, 0, this.canvas.width / 2, this.canvas.height);
    }

    if (eye === 'right') { // right eye
      this.gl.viewport(this.canvas.width / 2, 0, this.canvas.width / 2, this.canvas.height);
    }

    if (eye === 'both') { // both eyes
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  };

  PlayerWebGL.prototype.play = function play() {
    var self = this;
    reqAnimFrameID = requestAnimationFrame(function(frameTime) {
      self.drawScene(frameTime);
    });
  };

  PlayerWebGL.prototype.stop = function stop() {
    cancelAnimationFrame(this.reqAnimFrameID);
  };

  PlayerWebGL.prototype.getBackingStorePixelRatio = function getBackingStorePixelRatio() {
    return this.gl.webkitBackingStorePixelRatio ||
      this.gl.mozBackingStorePixelRatio ||
      this.gl.msBackingStorePixelRatio ||
      this.gl.oBackingStorePixelRatio ||
      this.gl.backingStorePixelRatio || 1;
  };

  PlayerWebGL.prototype.initBuffers = function initBuffers() {
    this.positionsBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionsBuffer);
    var positions = [
      -1.0, -1.0,
      1.0, -1.0,
      1.0, 1.0,
      -1.0, 1.0,
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    this.verticesIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
    var vertexIndices = [
      0, 1, 2, 0, 2, 3,
    ];
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
  };

  PlayerWebGL.prototype.initTextures = function initTextures() {
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  };

  PlayerWebGL.prototype.updateTexture = function updateTexture() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB,
      this.gl.UNSIGNED_BYTE, this.video);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  };


  PlayerWebGL.prototype.getShaderByName = function getShaderByName(id) {
    var shaderScript = document.getElementById(id);

    if (!shaderScript) {
      return null;
    }

    var theSource = '';
    var currentChild = shaderScript.firstChild;

    while (currentChild) {
      if (currentChild.nodeType === 3) {
        theSource += currentChild.textContent;
      }

      currentChild = currentChild.nextSibling;
    }

    var result;

    if (shaderScript.type === 'x-shader/x-fragment') {
      result = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === 'x-shader/x-vertex') {
      result = this.gl.createShader(this.gl.VERTEX_SHADER);
    } else {
      return null;  // Unknown shader type
    }

    this.gl.shaderSource(result, theSource);
    this.gl.compileShader(result);

    if (!this.gl.getShaderParameter(result, this.gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(result));
      return null;
    }

    return result;
  };


  global.PlayerWebGL = PlayerWebGL;

})(window);

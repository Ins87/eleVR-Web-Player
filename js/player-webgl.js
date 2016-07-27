class PlayerWebGL {
  constructor(video, canvas) {
    var self = this;
    this.video = video;
    this.canvas = canvas;
    this.gl = null;
    this.positionsBuffer = null;
    this.projection = 0;
    this.controls = null;
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
      let params = {
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
      for (let i = 0; i < params.attributes.length; i++) {
        let attributeName = params.attributes[i];
        self.attributes[attributeName] = self.gl.getAttribLocation(self.program, attributeName);
        self.gl.enableVertexAttribArray(self.attributes[attributeName]);
      }

      self.uniforms = {};
      for (i = 0; i < params.uniforms.length; i++) {
        let uniformName = params.uniforms[i];
        self.uniforms[uniformName] = self.gl.getUniformLocation(self.program, uniformName);
        self.gl.enableVertexAttribArray(self.attributes[uniformName]);
      }
    }
  }

  drawScene(frameTime) {
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
      let interval = (this.timing.frameTime - this.timing.prevFrameTime) * 0.001;

      let update = quat.fromValues(this.controls.manualRotateRate[0] * interval,
        this.controls.manualRotateRate[1] * interval,
        this.controls.manualRotateRate[2] * interval, 1.0);
      quat.normalize(update, update);
      quat.multiply(this.controls.manualRotation, this.controls.manualRotation, update);
    }

    let perspectiveMatrix = mat4.create();
    let vrHMD = webVR.getInstance().vrHMD;

    if (!!vrHMD) {
      let leftParams = vrHMD.getEyeParameters('left');
      let rightParams = vrHMD.getEyeParameters('right');
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(leftParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('left', perspectiveMatrix);
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(rightParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('right', perspectiveMatrix);
    } else {
      let ratio;
      if (true) { // Todo eyesSelect.value === 'one') {
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
  }

  drawEye(eye, projectionMatrix) {
    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionsBuffer);
    this.gl.vertexAttribPointer(this.attributes.aVertexPosition, 2, this.gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uniforms.uSampler, 0);

    this.gl.uniform1f(this.uniforms.eye, eye === 'right' ? 1 : 0);
    this.gl.uniform1f(this.uniforms.projection, this.projection);

    let rotation = mat4.create();
    let totalRotation = quat.create();

    if (!!webVR.getInstance().vrSensor) {
      let state = webVR.getInstance().vrSensor.getState();
      if (state !== null && state.orientation !== null && typeof state.orientation !== 'undefined' &&
        state.orientation.x !== 0 &&
        state.orientation.y !== 0 &&
        state.orientation.z !== 0 &&
        state.orientation.w !== 0) {
        let sensorOrientation = new Float32Array([state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w]);
        quat.multiply(totalRotation, this.controls.manualRotation, sensorOrientation);
      } else {
        totalRotation = this.controls.manualRotation; // Todo remove global
      }
      mat4.fromQuat(rotation, totalRotation);
    } else {
      quat.multiply(totalRotation, this.controls.manualRotation, PhoneVR.getInstance().rotationQuat());
      mat4.fromQuat(rotation, totalRotation);
    }

    let projectionInverse = mat4.create();
    mat4.invert(projectionInverse, projectionMatrix);
    let inv = mat4.create();
    mat4.multiply(inv, rotation, projectionInverse);

    this.gl.uniformMatrix4fv(this.uniforms.proj_inv, false, inv);

    if (eye === 'left') { // Left eye
      this.gl.viewport(0, 0, this.canvas.width / 2, this.canvas.height);
    }

    if (eye === 'right') { // Right eye
      this.gl.viewport(this.canvas.width / 2, 0, this.canvas.width / 2, this.canvas.height);
    }

    if (eye === 'both') { // Both eyes
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
  }

  play() {
    this.reqAnimFrameID = requestAnimationFrame((frameTime) => {
      this.drawScene(frameTime);
    });
  }

  stop() {
    cancelAnimationFrame(this.reqAnimFrameID);
  }

  getBackingStorePixelRatio() {
    return this.gl.webkitBackingStorePixelRatio ||
      this.gl.mozBackingStorePixelRatio ||
      this.gl.msBackingStorePixelRatio ||
      this.gl.oBackingStorePixelRatio ||
      this.gl.backingStorePixelRatio || 1;
  }

  initBuffers() {
    this.positionsBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionsBuffer);
    let positions = [
      -1.0, -1.0,
      1.0, -1.0,
      1.0, 1.0,
      -1.0, 1.0,
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    this.verticesIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
    let vertexIndices = [
      0, 1, 2, 0, 2, 3,
    ];
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
  }

  initTextures() {
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  updateTexture() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB,
      this.gl.UNSIGNED_BYTE, this.video);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  setProjection(projection) {
    this.projection = getCustomProjection(projection);

    function getCustomProjection(projection) {
      switch (projection.toLowerCase()) {
        case 'mono':
        case '2d':
        case '0':
        case 'equirectangular':
          return 0;
        // Otherwise, it could be 'stereo', '3d', '1', 'equirectangular 3d', etc.
        default:
          return 1;
      }
    }
  }

  setControls(controls) {
    this.controls = controls;
  }


  getShaderByName(id) {
    let shaderScript = document.getElementById(id);

    if (!shaderScript) {
      return null;
    }

    let theSource = '';
    let currentChild = shaderScript.firstChild;

    while (currentChild) {
      if (currentChild.nodeType === 3) {
        theSource += currentChild.textContent;
      }

      currentChild = currentChild.nextSibling;
    }

    let result;

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
  }
}

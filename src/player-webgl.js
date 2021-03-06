import { mat4, quat } from 'gl-matrix';
import util from './util';
import webVR from './webvr';
import PhoneVR from './phonevr';

export default class PlayerWebGL {
  constructor(video, canvas) {
    const self = this;
    this.stereoscopicMode = false;
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
      const params = {
        fragmentShaderName: 'fs',
        vertexShaderName: 'vs',
        attributes: ['aVertexPosition'],
        uniforms: ['uSampler', 'eye', 'projection', 'proj_inv'],
      };
      self.program = self.gl.createProgram();

      self.gl.attachShader(self.program, self.getShaderByName(params.vertexShaderName, 'x-vertex'));
      self.gl.attachShader(self.program, self.getShaderByName(params.fragmentShaderName, 'x-fragment'));
      self.gl.linkProgram(self.program);

      if (!self.gl.getProgramParameter(self.program, self.gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + self.gl.getProgramInfoLog(self.program));
        //  Todo return?
      }

      self.gl.useProgram(self.program);

      self.attributes = {};
      for (let i = 0; i < params.attributes.length; i++) {
        const attributeName = params.attributes[i];
        self.attributes[attributeName] = self.gl.getAttribLocation(self.program, attributeName);
        self.gl.enableVertexAttribArray(self.attributes[attributeName]);
      }

      self.uniforms = {};
      for (let i = 0; i < params.uniforms.length; i++) {
        const uniformName = params.uniforms[i];
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
      const interval = (this.timing.frameTime - this.timing.prevFrameTime) * 0.001;

      this.controls.latlong[0] += this.controls.manualRotateRate[0] * interval * 90;
      this.controls.latlong[1] += this.controls.manualRotateRate[1] * interval * 90;

      const ratio = Math.PI / 180 / 2;
      const yaw = quat.fromValues(Math.cos(ratio * this.controls.latlong[1]), 0, -Math.sin(ratio * this.controls.latlong[1]), 0);
      const pitch = quat.fromValues(Math.cos(ratio * this.controls.latlong[0]), 0, 0, -Math.sin(ratio * this.controls.latlong[0]));

      // this works but then the originRotation is not applied
      quat.multiply(this.controls.manualRotation, yaw, pitch);

      // FIXME: trying to do quat.multiply with originRotation (to apply original offset)
      // literally makes the world spin; need to get latlong from originRotation
    }

    let perspectiveMatrix = mat4.create();
    const vrHMD = webVR.vrHMD;

    if (!!vrHMD) {
      const leftParams = vrHMD.getEyeParameters('left');
      const rightParams = vrHMD.getEyeParameters('right');
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(leftParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('left', perspectiveMatrix);
      perspectiveMatrix = util.mat4PerspectiveFromVRFieldOfView(rightParams.recommendedFieldOfView, 0.1, 10);
      this.drawEye('right', perspectiveMatrix);
    } else {
      let ratio;
      if (this.stereoscopicMode) {
        ratio = (this.canvas.width / 2) / this.canvas.height;
        mat4.perspective(perspectiveMatrix, Math.PI / 2, ratio, 0.1, 10);
        this.drawEye('left', perspectiveMatrix);
        this.drawEye('right', perspectiveMatrix);
      } else {
        ratio = (this.canvas.width) / this.canvas.height;
        mat4.perspective(perspectiveMatrix, Math.PI / 2, ratio, 0.1, 10);
        this.drawEye('both', perspectiveMatrix);
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
    const self = this;
    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionsBuffer);
    this.gl.vertexAttribPointer(this.attributes.aVertexPosition, 2, this.gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uniforms.uSampler, 0);

    this.gl.uniform1f(this.uniforms.eye, eye === 'right' ? 1 : 0);
    this.gl.uniform1f(this.uniforms.projection, this.projection);

    const rotation = mat4.create();
    const totalRotation = getTotalRotation();
    mat4.fromQuat(rotation, totalRotation);

    const projectionInverse = mat4.create();
    mat4.invert(projectionInverse, projectionMatrix);
    const inv = mat4.create();
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

    function getTotalRotation() {
      const totalRotation = quat.create();
      let sensorOrientation = quat.create();

      if (!!webVR.vrSensor) {
        let state = webVR.vrSensor.getState();
        if (state !== null && state.orientation !== null && typeof state.orientation !== 'undefined' &&
          state.orientation.x !== 0 &&
          state.orientation.y !== 0 &&
          state.orientation.z !== 0 &&
          state.orientation.w !== 0) {
          sensorOrientation = new Float32Array([state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w]);
        }
      } else {
        sensorOrientation = PhoneVR.rotationQuat();
      }
      quat.multiply(totalRotation, self.controls.manualRotation, sensorOrientation);

      return totalRotation;
    }
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
    const positions = [
      -1.0, -1.0,
      1.0, -1.0,
      1.0, 1.0,
      -1.0, 1.0,
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    this.verticesIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
    const vertexIndices = [
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

  toggleStereoscopicMode() {
    this.stereoscopicMode = !this.stereoscopicMode;
  }

  getShaderByName(name, type) {
    let result = '';

    if (!window.shader || !window.shader[name]) {
      return null;
    }

    const theSource = window.shader[name];

    if (type === 'x-fragment') {
      result = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    } else if (type === 'x-vertex') {
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

  destroy() {
    this.stop();
    this.video = null;
    this.canvas = null;
    this.controls = null;
  }
}

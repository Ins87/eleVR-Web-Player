class PlayerControls {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.manualRotateRate = new Float32Array([0, 0, 0]);  // Vector, camera-relative
    this.manualRotation = quat.create();
    this.manualControls = {
      a: {index: 1, sign: 1, active: 0},
      d: {index: 1, sign: -1, active: 0},
      w: {index: 0, sign: 1, active: 0},
      s: {index: 0, sign: -1, active: 0},
      q: {index: 2, sign: -1, active: 0},
      e: {index: 2, sign: 1, active: 0},
    };
    this.initKeys();
  }

  initKeys() {
    this.onKeyPress = this.onKeyPress.bind(this);
    document.addEventListener('keydown', this.onKeyPress);
    document.addEventListener('keyup', this.onKeyPress);

    let self = this;
    let startX, startY;

    function downClbk(e) {
      self.canvas.addEventListener('mousemove', moveClbk);
      startX = e.clientX;
      startY = e.clientY;
    }

    function upClbk(e) {
      self.canvas.removeEventListener('mousemove', moveClbk);
      self.manualRotateRate[0] = 0;
      self.manualRotateRate[1] = 0;
      self.manualRotateRate[2] = 0;
    }

    function moveClbk(e) {
      let delX = e.clientX - startX;
      let delY = e.clientY - startY;
      let width = self.canvas.width,
        height = self.canvas.height,
        min = Math.min(width, height);

      self.manualRotateRate[0] += -delY * 2 / min;
      self.manualRotateRate[1] += -delX * 2 / min;

      startX = e.clientX;
      startY = e.clientY;
    }

    self.canvas.addEventListener('mousedown', downClbk);
    self.canvas.addEventListener('mouseup', upClbk);
  }

  onKeyPress(event) {
    let self = this;

    switch (String.fromCharCode(event.charCode)) {
      case 'z': {
        resetSensor();
        break;
      }
      default: {
        key(event, event.type === 'keydown' ? 1 : -1);
      }
    }

    function resetSensor() {
      if (event.type === 'keydown') {
        return;
      }
      if (!!webVR.getInstance().vrSensor) {
        webVR.getInstance().vrSensor.zeroSensor();
      } else {
        quat.invert(self.manualRotation, PhoneVR.getInstance().rotationQuat());
      }
    }

    function key(event, sign) {
      let control = self.manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
      if (!control) {
        return;
      }
      if (sign === 1 && control.active || sign === -1 && !control.active) {
        return;
      }

      control.active = (sign === 1);
      self.manualRotateRate[control.index] += sign * control.sign;
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.onKeyPress);
    document.removeEventListener('keyup', this.onKeyPress);
    this.video = null;
    this.canvas = null;
  }

}

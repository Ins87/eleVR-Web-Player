class PlayerControls {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.manualRotateRate = new Float32Array([0, 0, 0]);  // Vector, camera-relative
    this.latlong = getLatlong();
    this.manualRotation = quat.create();
    this.manualControls = {
      a: {index: 1, sign: 1, active: 0},
      d: {index: 1, sign: -1, active: 0},
      w: {index: 0, sign: 1, active: 0},
      s: {index: 0, sign: -1, active: 0},
    };
    this.initKeys();

    function getLatlong() {
      let originRotation = quat.create();
      let latlong = new Float32Array([0, 0, 0]);
      latlong[0] = Math.asin(2 * (originRotation[0] * originRotation[2] - originRotation[1] * originRotation[3])) * 180 / Math.PI;
      latlong[1] = Math.atan2(2 * (originRotation[0] * originRotation[1] + originRotation[2] * originRotation[3]), 1 - 2 * (originRotation[1] * originRotation[1] + originRotation[2] * originRotation[2])) * 180 / Math.PI;
      return latlong;
    }
  }

  initKeys() {
    let self = this;
    let startX, startY;
    this.onKeyPress = this.onKeyPress.bind(this);
    document.addEventListener('keydown', this.onKeyPress);
    document.addEventListener('keyup', this.onKeyPress);


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
      let width = self.canvas.width;
      let height = self.canvas.height;
      let min = Math.min(width, height);

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
    this.canvas.removeEventListener('mousedown');
    this.canvas.removeEventListener('mouseup');
    this.canvas.removeEventListener('mousemove');

    this.video = null;
    this.canvas = null;
  }

}

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
    this.mouseMove = {
      x: 0,
      y: 0,
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
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    document.addEventListener('keydown', this.onKeyPress);
    document.addEventListener('keyup', this.onKeyPress);
    document.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
  }

  onMouseDown(e) {
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.mouseMove.X = e.clientX;
    this.mouseMove.y = e.clientY;
  }

  onMouseUp() {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.manualRotateRate = quat.create();
  }

  onMouseMove(e) {
    let delX = e.clientX - this.mouseMove.X;
    let delY = e.clientY - this.mouseMove.y;
    let min = Math.min(this.canvas.width, this.canvas.height);

    this.manualRotateRate[0] += -delY * 2 / min;
    this.manualRotateRate[1] += -delX * 2 / min;

    this.mouseMove.X = e.clientX;
    this.mouseMove.y = e.clientY;
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
    document.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.video = null;
    this.canvas = null;
  }

}

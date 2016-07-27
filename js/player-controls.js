class PlayerControls {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.manualRotateRate = new Float32Array([0, 0, 0]);  // Vector, camera-relative
    this.manualRotation = quat.create();
    this.initKeys();
  }

  initKeys() {
    let self = this;
    let manualControls = {
      a: {index: 1, sign: 1, active: 0},
      d: {index: 1, sign: -1, active: 0},
      w: {index: 0, sign: 1, active: 0},
      s: {index: 0, sign: -1, active: 0},
      q: {index: 2, sign: -1, active: 0},
      e: {index: 2, sign: 1, active: 0},
    };

    document.addEventListener('keydown', function (event) {
        key(event, 1);
      });
    document.addEventListener('keyup', function (event) {
        key(event, -1);
      });
    window.addEventListener('keypress', onkey, true);

    function key(event, sign) {
      let control = manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
      if (!control) {
        return;
      }
      if (sign === 1 && control.active || sign === -1 && !control.active) {
        return;
      }

      control.active = (sign === 1);
      self.manualRotateRate[control.index] += sign * control.sign;
    }

    function onkey(event) {
      switch (String.fromCharCode(event.charCode)) {
        case 'z':
          if (!!webVR.getInstance().vrSensor) {
            webVR.getInstance().vrSensor.zeroSensor();
          } else {
            quat.invert(self.manualRotation, PhoneVR.getInstance().rotationQuat());
          }
          break;
      }
    }
  }

}

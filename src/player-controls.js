import { quat } from 'gl-matrix';
import webVR from './webvr';
import PhoneVR from './phonevr';

export default class PlayerControls {
  constructor(canvas, controlLayer = canvas) {
    this.canvas = canvas;
    this.controlLayer = controlLayer;
    this.controlLayer.classList.add('elevr-control');
    this.controlLayer.tabIndex = '-1';
    this.manualRotateRate = new Float32Array([0, 0, 0]);  // Vector, camera-relative
    this.latlong = getLatlong();
    this.manualRotation = quat.create();
    this.manualControls = {
      a: { index: 1, sign: 1, active: 0 },
      d: { index: 1, sign: -1, active: 0 },
      w: { index: 0, sign: 1, active: 0 },
      s: { index: 0, sign: -1, active: 0 },
    };
    this.mouseMove = {
      x: 0,
      y: 0,
    };

    this.initKeys();

    function getLatlong() {
      const originRotation = quat.create();
      const latlong = new Float32Array([0, 0, 0]);
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

    this.controlLayer.addEventListener('mousedown', this.onMouseDown);
    this.controlLayer.addEventListener('keydown', this.onKeyPress);
    document.addEventListener('keyup', this.onKeyPress);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseDown(e) {
    document.addEventListener('mousemove', this.onMouseMove);
    this.mouseMove.X = e.clientX;
    this.mouseMove.y = e.clientY;
    this.controlLayer.focus();
    e.preventDefault();
  }

  onMouseUp() {
    document.removeEventListener('mousemove', this.onMouseMove);
    this.manualRotateRate = quat.create();
  }

  onMouseMove(e) {
    const delX = e.clientX - this.mouseMove.X;
    const delY = e.clientY - this.mouseMove.y;
    const min = Math.min(this.canvas.width, this.canvas.height);

    this.manualRotateRate[0] += -delY * 2 / min;
    this.manualRotateRate[1] += -delX * 2 / min;

    this.mouseMove.X = e.clientX;
    this.mouseMove.y = e.clientY;
  }

  onKeyPress(event) {
    const self = this;

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
      if (!!webVR.vrSensor) {
        webVR.vrSensor.zeroSensor();
      } else {
        quat.invert(self.manualRotation, PhoneVR.rotationQuat());
      }
    }

    function key(event, sign) {
      const control = self.manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
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
    document.removeEventListener('keyup', this.onKeyPress);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.controlLayer.removeEventListener('keydown', this.onKeyPress);
    this.controlLayer.removeEventListener('mousedown', this.onMouseDown);
    this.controlLayer.classList.remove('elevr-control');
    this.controlLayer = null;
    this.canvas = null;
  }

}

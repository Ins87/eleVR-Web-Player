import { quat } from 'gl-matrix';
import util from './util';

class PhoneVR {
  constructor() {
    this.deviceAlpha = null;
    this.deviceGamma = null;
    this.deviceBeta = null;

    window.addEventListener('deviceorientation', (orientation) => {
      this.deviceAlpha = orientation.alpha;
      this.deviceGamma = orientation.gamma;
      this.deviceBeta = orientation.beta;
    });
  }

  orientationIsAvailable() {
    return this.deviceAlpha !== null;
  }

  rotationQuat() {
    if (!this.orientationIsAvailable()) {
      return quat.create(1, 0, 0, 0);
    }

    const degtorad = Math.PI / 180; // Degree-to-Radian conversion
    let z = this.deviceAlpha * degtorad / 2;
    let x = this.deviceBeta * degtorad / 2;
    let y = this.deviceGamma * degtorad / 2;
    const cX = Math.cos(x);
    const cY = Math.cos(y);
    const cZ = Math.cos(z);
    const sX = Math.sin(x);
    const sY = Math.sin(y);
    const sZ = Math.sin(z);

    // ZXY quaternion construction.
    const w = cX * cY * cZ - sX * sY * sZ;
    x = sX * cY * cZ - cX * sY * sZ;
    y = cX * sY * cZ + sX * cY * sZ;
    z = cX * cY * sZ + sX * sY * cZ;

    const deviceQuaternion = quat.fromValues(x, y, z, w);

    // Correct for the screen orientation.
    const screenOrientation = (util.getScreenOrientation() * degtorad) / 2;
    const screenTransform = [0, 0, -Math.sin(screenOrientation), Math.cos(screenOrientation)];

    const deviceRotation = quat.create();
    quat.multiply(deviceRotation, deviceQuaternion, screenTransform);

    // deviceRotation is the quaternion encoding of the transformation
    // from camera coordinates to world coordinates.  The problem is that
    // our shader uses conventional OpenGL coordinates
    // (+x = right, +y = up, +z = backward), but the DeviceOrientation
    // spec uses different coordinates (+x = East, +y = North, +z = up).
    // To fix the mismatch, we need to fix this.  We'll arbitrarily choose
    // North to correspond to -z (the default camera direction).
    const r22 = Math.sqrt(0.5);
    quat.multiply(deviceRotation, quat.fromValues(-r22, 0, 0, r22), deviceRotation);

    return deviceRotation;
  }
}

export default new PhoneVR();

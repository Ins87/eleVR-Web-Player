class WebVr {
  constructor() {
    const self = this;
    this.vrHMD = null;
    this.vrSensor = null;

    if (navigator.getVRDevices) {
      navigator.getVRDevices().then(vrDeviceCallback);
    }

    function vrDeviceCallback(vrdevs) {
      for (let i = 0; i < vrdevs.length; ++i) { // Todo _.find
        if (vrdevs[i] instanceof window.HMDVRDevice) {
          self.vrHMD = vrdevs[i];
          break;
        }
      }

      if (!self.vrHMD) {
        return;
      }

      // Then, find that HMD's position sensor
      for (let i = 0; i < vrdevs.length; ++i) { // Todo _.find
        if (vrdevs[i] instanceof window.PositionSensorVRDevice &&
          vrdevs[i].hardwareUnitId === self.vrHMD.hardwareUnitId) {
          self.vrSensor = vrdevs[i];
          break;
        }
      }

      if (!self.vrSensor) {
        console.error('Found an HMD, but didn\'t find its orientation sensor?');
      }
    }
  }
}

export default new WebVr();

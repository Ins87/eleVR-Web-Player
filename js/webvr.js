(function (global) {
  'use strict';

  class WebVr {
    constructor() {
      let self = this;
      this.vrHMD = null;
      this.vrSensor = null;

      if (navigator.getVRDevices) {
        navigator.getVRDevices().then(webVR.vrDeviceCallback);
      }

      function vrDeviceCallback(vrdevs) {
        for (let i = 0; i < vrdevs.length; ++i) { // Todo _.find
          if (vrdevs[i] instanceof HMDVRDevice) {
            self.vrHMD = vrdevs[i];
            break;
          }
        }

        if (!self.vrHMD) {
          return;
        }

        // Then, find that HMD's position sensor
        for (let i = 0; i < vrdevs.length; ++i) { // Todo _.find
          if (vrdevs[i] instanceof PositionSensorVRDevice &&
            vrdevs[i].hardwareUnitId === self.vrHMD.hardwareUnitId) {
            self.vrSensor = vrdevs[i];
            break;
          }
        }

        if (!self.vrSensor) {
          alert('Found an HMD, but didn\'t find its orientation sensor?');
        }
      }
    }
  }

  global.webVR = (function () {
    let instance;

    return {
      getInstance: function () {
        if (!instance) {
          instance = new WebVr();
        }
        return instance;
      },
    };
  })();

})(window);

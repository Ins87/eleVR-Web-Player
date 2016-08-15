/**
 * eleVR Web Player: A web player for 360 video on the Oculus
 * Copyright (C) 2014 Andrea Hawksley and Andrew Lutomirski
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Mozilla Public License; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

class EleVRPlayer {
  constructor(sourceVideo, options = {}) {
    this.video = sourceVideo;
    this.canvas = document.createElement('canvas');
    this.canvas.classList = this.video.classList;
    this.canvas.classList.add('elevr');
    this.canvas.style.display = 'none';

    this.video.parentNode.insertBefore(this.canvas, this.video);
    this.webGL = new PlayerWebGL(this.video, this.canvas);

    if (!this.webGL.gl) {
      return;
    }

    util.setCanvasSize(this.canvas, this.webGL.getBackingStorePixelRatio());

    this.controls = new PlayerControls(this.canvas, options.controlLayer);
    this.webGL.setControls(this.controls);
    this.webGL.initBuffers();
    this.webGL.initTextures();

    this.start = this.start.bind(this);
    this.video.addEventListener('canplaythrough', this.start);

    this.setEyeCount = (eyeCount) => this.webGL.setEyeCount(eyeCount);
  }

  start() {
    this.webGL.play();
    this.canvas.style.display = '';
    this.video.style.display = 'none';
  }

  destroy() {
    this.webGL.destroy();
    this.controls.destroy();

    this.video.removeEventListener('canplaythrough', this.start);
    this.video.parentNode.removeChild(this.canvas);
    this.canvas = null;

    this.video.style.display = '';
    this.video = null;
  }
}

window.EleVRPlayer = EleVRPlayer;

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
/* global PlayerWebGL, PlayerControls, util */

'use strict';

function EleVRPlayer(sourceVideo, destinationCanvas) {
  var self = this;

  this.webGL = new PlayerWebGL(sourceVideo, destinationCanvas);

  if (!this.webGL.gl) {
    return;
  }

  util.setCanvasSize(destinationCanvas, this.webGL.getBackingStorePixelRatio());

  this.controls = new PlayerControls(sourceVideo, destinationCanvas);
  this.webGL.setControls(this.controls); // Todo cleanup on destroy
  this.webGL.initBuffers();
  this.webGL.initTextures();

  sourceVideo.addEventListener('canplaythrough', function () {
    self.webGL.play();
  });
}

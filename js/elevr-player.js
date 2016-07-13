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
/* global controls, projection, util, webVR */

'use strict';

var called = {};
var videoOptions = {};

function resizeContainer() {
  if (!window.container) {
    window.container = document.getElementById('video-container');
  }

  window.container.style.width = window.innerWidth + 'px';
  window.container.style.height = window.innerHeight + 'px';
}

window.addEventListener('resize', resizeContainer);

function setupControls(video, canvas) {
  if (called.setupControls) {
    return;
  }

  window.videoControls = document.getElementById('video-controls');
  window.messageL = document.getElementById('message-l');
  window.messageR = document.getElementById('message-r');

  resizeContainer();

  window.leftLoad = document.getElementById('left-load');
  window.rightLoad = document.getElementById('right-load');
  window.leftPlay = document.getElementById('left-play');
  window.rightPlay = document.getElementById('right-play');
  // Buttons
  window.playButton = document.getElementById('play-pause');
  window.playL = document.getElementById('play-l');
  window.playR = document.getElementById('play-r');
  window.muteButton = document.getElementById('mute');
  window.loopButton = document.getElementById('loop');
  window.recenterButton = document.getElementById('recenter');
  window.fullScreenButton = document.getElementById('full-screen');

  // Sliders
  window.seekBar = document.getElementById('seek-bar');

  // Selectors
  window.videoSelect = document.getElementById('video-select');
  window.projectionSelect = document.getElementById('projection-select');
  window.eyesSelect = document.getElementById('eyes-select');

  document.getElementById('title-l').style.fontSize = window.outerHeight / 20 + 'px';
  document.getElementById('title-r').style.fontSize = window.outerHeight / 20 + 'px';

  window.messageL.style.fontSize = window.outerHeight / 30 + 'px';
  window.messageR.style.fontSize = window.outerHeight / 30 + 'px';

  controls.create(video, canvas);

  called.setupControls = true;
}

function EleVRPlayer(sourceVideo, destinationCanvas) {
  var self = this;

  if (called.runEleVRPlayer) { // Todo check canvas property
    return;
  }

  setupControls(sourceVideo, destinationCanvas);

  webVR.initWebVR();
  this.webGL = new PlayerWebGL(sourceVideo, destinationCanvas);

  if (this.webGL.gl) {
    util.setCanvasSize(destinationCanvas, this.webGL.getBackingStorePixelRatio());

    // Keyboard Controls
    controls.enableKeyControls();

    this.webGL.initBuffers();
    this.webGL.initTextures();

    sourceVideo.addEventListener('canplaythrough', function() {
      controls.loaded();
      self.webGL.play();
    });
    sourceVideo.addEventListener('ended', function() {
      self.webGL.stop();
      controls.ended();
    });

    // Keep a record of all the videos that are in the drop-down menu.
    Array.prototype.slice.call(window.videoSelect.options).forEach(function (option) {
      videoOptions[option.value] = option;
    });
  }

  initFromSettings(window.location.hash || window.location.search);

  called.runEleVRPlayer = true;
}

function initFromSettings(newSettings) {
  if (!newSettings) {
    controls.show();
    return;
  }

  var settings = util.getTruthyURLSearchParams(newSettings, {
    autoplay: undefined,
    controls: true,
    loop: true,
    sound: true,
    projection: 'mono',
  });

  if (settings.controls) {
    controls.show();
  } else {
    controls.hide();

    if (typeof settings.autoplay === 'undefined') {
      // `autoplay` by default if controls are hidden and no explicit `autoplay` param set.
      settings.autoplay = true;
    }
  }

  if (settings.sound) {
    controls.unmute();
  } else {
    controls.mute();
  }

  settings.projection = util.getCustomProjection(settings.projection);

  if (projection !== settings.projection) {
    projection = settings.projection;

    if (window.projectionSelect) {
      window.projectionSelect.value = settings.projection;
    }
  }

  controls.setLooping(settings.loop);

  if (settings.video) {
    window.video.innerHTML = '';

    if (window.videoSelect) {
      var optionValue = settings.projection + settings.video;

      if (optionValue in videoOptions) {
        videoOptions[optionValue].selected = true;
      } else {
        var option = document.createElement('option');
        option.selected = true;
        option.textContent = settings.title || util.getVideoTitle(settings.video);

        // Note: The controls code expects the filename to be prefixed with '0' or '1'.
        option.value = optionValue;

        if (settings.autoplay) {
          option.dataset.autoplay = '';
        } else {
          delete option.dataset.autoplay;
        }

        videoOptions[optionValue] = option;

        window.videoSelect.appendChild(option);
      }
    }

    controls.loadVideo(settings.video);
  }

  if (settings.autoplay) {
    controls.play();
  } else if (settings.autoplay === false) {
    // If user did not explicitly set `autoplay`, don't pause unnecessarily.
    window.video.pause();
  }
}

window.addEventListener('hashchange', function () {
  // Remove the querystring if there were custom parameters.
  window.history.pushState('', document.title, window.location.pathname + window.location.hash);

  initFromSettings(window.location.hash);
});

window.addEventListener('message', function (e) {
  if (typeof e.data === 'object') {
    window.location.hash = '#' + JSON.stringify(e.data);
  } else if (typeof e.data === 'string') {
    window.location.hash = '#' + e.data;
  } else {
    return;
  }
});

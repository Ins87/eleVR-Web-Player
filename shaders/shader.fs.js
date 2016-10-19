window.shader = window.shader || {};

window.shader.fs = `
  varying mediump vec3 vDirection;
  uniform mediump float eye;
  uniform mediump float projection;

  uniform sampler2D uSampler;

  #define PI 3.1415926535897932384626433832795

  mediump vec4 directionToColor(mediump vec3 direction, mediump float eye, mediump float projection) {
    /*
    * Input: a direction.  +x = right, +y = up, +z = backward.
    *        an eye. left = 0, right = 1.
    *        a projection. see ProjectionEnum in JS file for enum
    * Output: a color from the video
    *
    * Bug alert: the control flow here may screw up texture filtering.
    */

    mediump float theta = atan(direction.x, -1.0 * direction.z);
    mediump float phi = atan(direction.y, length(direction.xz));

    /*
    * The Nexus 7 and the Moto X (and possibly many others) have
    * a buggy atan2 implementation that screws up when the numerator
    * (the first argument) is too close to zero.  (The 1e-4 is carefully
    * chosen: 1e-5 doesn't fix the problem.
    */
    if (abs(direction.x) < 1e-4 * abs(direction.z))
    theta = 0.5*PI * (1.0 - sign(-1.0 * direction.z));
    if (abs(direction.y) < 1e-4 * length(direction.xz))
    phi = 0.0;

    // Uncomment to debug the transformations.
    // return vec4(theta / (2. * PI) + 0.5, phi / (2. * PI) + 0.5, 0., 0.);

    if (projection == 0.) {
      // Projection == 0: equirectangular projection
      return texture2D(uSampler, vec2(mod(theta / (2.0*PI), 1.0), phi / PI + 0.5));
    } else {
      // Projection == 1: equirectangular top/bottom 3D projection
      eye = 1. - eye;
      return texture2D(uSampler, vec2(mod(theta / (2.0*PI), 1.0), ((phi / PI + 0.5) + eye)/ 2.));
    }
  }

  void main(void) {
    gl_FragColor = directionToColor(vDirection, eye, projection);
  }
`;


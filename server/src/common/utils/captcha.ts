import * as svgCaptcha from 'svg-captcha';

const options = {
  charPreset: '0123456789QWERTYUIOPSDFGHJKLAZXCVBNMzxcvbnmasdfghjklqwertyuiop',
  size: 4,
  fontSize: 60,
  width: 100,
  height: 40,
  noise: 2,
  background: '#ffffff',
  rotate: 15,
  letterSpacing: 0,
  noiseColor: '#000000',
  opacity: 0.1,
  pointSize: 1,
  pointStyle: 'circle',
  pointRadius: 2,
  pointPosition: 'random',
};

export function createMath() {
  return svgCaptcha.createMathExpr({
    ...options,
    mathMin: 1,
    mathMax: 50,
    mathOperator: '+',
  });
}

export function createText() {
  return svgCaptcha.create(options);
}

/** 四位纯数字验证码 */
export function createNumeric() {
  return svgCaptcha.create({
    ...options,
    charPreset: '0123456789',
    size: 4,
    noise: 3,
  });
}

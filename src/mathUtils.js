
export const parse = (m) => {
  let A = m[0];
  let B = m[1];
  let C = m[2];
  let D = m[3];

  if (A * D === B * C) throw new Error('transform#unmatrix: matrix is singular');

  // step (3)
  let scaleX = Math.sqrt(A * A + B * B);
  A /= scaleX;
  B /= scaleX;

  // step (4)
  let skew = A * C + B * D;
  C -= A * skew;
  D -= B * skew;

  // step (5)
  const scaleY = Math.sqrt(C * C + D * D);
  C /= scaleY;
  D /= scaleY;
  skew /= scaleY;

  // step (6)
  if (A * D < B * C) {
    A = -A;
    B = -B;
    skew = -skew;
    scaleX = -scaleX;
  }

  return {
    x: parseInt(m[4], 10),
    y: parseInt(m[5], 10),
    rotate: rtod(Math.atan2(B, A)),
    skew: rtod(Math.atan(skew)),
    scale: scaleX === scaleY ? round(scaleX, 2) : 0
  };
};
export const matrixDeconstruct = (tr) => {
  if (!tr) {
    return null;
  }
  return parse(tr.split('(')[1].split(')')[0].split(','));
};
export const rtod = (radians) => {
  const deg = radians * 180 / Math.PI;
  return round(deg, 2);
};
export const round = (n, mult) => {
  const m = Math.pow(10, mult);
  return Math.round(n * m) / m;
};

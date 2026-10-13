export type Rendering3DView = { rotationX: number; rotationY: number; zoom: number };

export function perspectiveMatrix(view: Rendering3DView, aspect: number): Float32Array {
  const x = view.rotationX * Math.PI / 180;
  const y = view.rotationY * Math.PI / 180;
  const cX = Math.cos(x);
  const sX = Math.sin(x);
  const cY = Math.cos(y);
  const sY = Math.sin(y);
  const fov = 1.1 / view.zoom;
  const near = 0.1;
  const far = 100;
  const f = 1 / Math.tan(fov / 2);
  const projection = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
  const rotation = [cY, sY * sX, sY * cX, 0, 0, cX, -sX, 0, -sY, cY * sX, cY * cX, 0, 0, 0, -5, 1];
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) for (let row = 0; row < 4; row += 1) result[column * 4 + row] = projection[column * 4] * rotation[row] + projection[column * 4 + 1] * rotation[4 + row] + projection[column * 4 + 2] * rotation[8 + row] + projection[column * 4 + 3] * rotation[12 + row];
  return result;
}

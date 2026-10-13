export type MathematicalArtParameters = { mode: "mandelbrot" | "julia"; iterations: number; zoom: number; cReal: number; cImag: number };

export function renderFractal(context: CanvasRenderingContext2D, width: number, height: number, parameters: MathematicalArtParameters) {
  const image = context.createImageData(width, height); const aspect = width / height;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let real = (x / width - .5) * 3.2 * aspect / parameters.zoom - .7;
    let imag = (y / height - .5) * 3.2 / parameters.zoom;
    const cReal = parameters.mode === "julia" ? parameters.cReal : real; const cImag = parameters.mode === "julia" ? parameters.cImag : imag;
    if (parameters.mode === "mandelbrot") { real = 0; imag = 0; }
    let iteration = 0; while (real * real + imag * imag <= 4 && iteration < parameters.iterations) { const nextReal = real * real - imag * imag + cReal; imag = 2 * real * imag + cImag; real = nextReal; iteration += 1; }
    const value = iteration === parameters.iterations ? 0 : Math.floor(255 * Math.sqrt(iteration / parameters.iterations)); const index = (y * width + x) * 4;
    image.data[index] = value * .25; image.data[index + 1] = value * .65 + 30; image.data[index + 2] = 255 - value * .55; image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

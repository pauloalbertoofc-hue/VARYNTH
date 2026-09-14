export const MAX_APP_ICON_BYTES = 512 * 1024;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function validateAppIconPng(bytes: Uint8Array): string | null {
  if (bytes.byteLength > MAX_APP_ICON_BYTES) return "A imagem deve ter no máximo 512 KB.";
  if (bytes.byteLength < 24 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return "Envie uma imagem PNG válida.";
  }
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return "O arquivo PNG está inválido.";

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width !== height || width < 192 || width > 1024) {
    return "Use uma imagem quadrada entre 192 × 192 e 1024 × 1024 px.";
  }
  return null;
}

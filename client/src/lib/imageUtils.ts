const MAX_PROFILE_IMAGE_DIMENSION = 512;
const PROFILE_IMAGE_QUALITY = 0.82;

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function optimizeProfileImage(file: File) {
  const rawDataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Selected image could not be loaded"));
    img.src = rawDataUrl;
  });

  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    MAX_PROFILE_IMAGE_DIMENSION / Math.max(image.width, image.height),
  );
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not supported in this browser");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", PROFILE_IMAGE_QUALITY);
}

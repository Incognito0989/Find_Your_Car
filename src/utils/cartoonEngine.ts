/**
 * Cartoon Art Generator & Image Processing Engine
 * Transforms real vehicle photos into 2D cartoon sticker illustrations.
 * 
 * Works in tandem with:
 * 1. Server-side Gemini AI Vision & Image Generation (via @google/genai)
 * 2. High-performance client-side Canvas Cel-Shading & Edge-Extraction Algorithm
 */

export interface CartoonFilterOptions {
  edgeThreshold?: number; // 15 - 60 (lower = more lines, higher = cleaner)
  edgeThickness?: number; // 1 - 4 px
  colorSteps?: number; // 4 - 12 (color quantization levels)
  saturationBoost?: number; // 1.0 - 1.6
  contrastBoost?: number; // 1.0 - 1.4
  stickerBorder?: boolean; // add white die-cut sticker outline
  stickerBorderWidth?: number;
}

/**
 * Converts a real car photo (URL or base64) into a 2D Cel-Shaded Cartoon Sticker
 * using multi-pass canvas edge detection, color quantization, and inking.
 */
export async function convertPhotoToCartoonSticker(
  imageSourceUrl: string,
  options: CartoonFilterOptions = {}
): Promise<string> {
  const {
    edgeThreshold = 28,
    edgeThickness = 2,
    colorSteps = 7,
    saturationBoost = 1.35,
    contrastBoost = 1.15,
    stickerBorder = true,
    stickerBorderWidth = 8,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Target high-definition sticker resolution (max 1000px on long edge)
        const maxDimension = 1000;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSourceUrl);
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // Step 1: Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Step 2: Extract Pixel Buffer for Cel-Shading & Edge Detection
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;

        // Create Grayscale buffer for Sobel Edge Detection
        const gray = new Float32Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          // Luminance formula
          gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }

        // Apply 3x3 Gaussian Blur to grayscale to reduce noise before edge detection
        const blurred = new Float32Array(totalPixels);
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kSum = 16;

        for (let y = 1; y < height - 1; y++) {
          const rowOffset = y * width;
          for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            let kIdx = 0;
            for (let ky = -1; ky <= 1; ky++) {
              const kRow = (y + ky) * width;
              for (let kx = -1; kx <= 1; kx++) {
                sum += gray[kRow + x + kx] * kernel[kIdx++];
              }
            }
            blurred[rowOffset + x] = sum / kSum;
          }
        }

        // Sobel Operator for Edge Magnitude
        const edges = new Uint8Array(totalPixels);
        for (let y = 1; y < height - 1; y++) {
          const rowOffset = y * width;
          for (let x = 1; x < width - 1; x++) {
            // Sobel X
            const gx =
              -1 * blurred[(y - 1) * width + (x - 1)] +
              1 * blurred[(y - 1) * width + (x + 1)] +
              -2 * blurred[y * width + (x - 1)] +
              2 * blurred[y * width + (x + 1)] +
              -1 * blurred[(y + 1) * width + (x - 1)] +
              1 * blurred[(y + 1) * width + (x + 1)];

            // Sobel Y
            const gy =
              -1 * blurred[(y - 1) * width + (x - 1)] +
              -2 * blurred[(y - 1) * width + x] +
              -1 * blurred[(y - 1) * width + (x + 1)] +
              1 * blurred[(y + 1) * width + (x - 1)] +
              2 * blurred[(y + 1) * width + x] +
              1 * blurred[(y + 1) * width + (x + 1)];

            const mag = Math.sqrt(gx * gx + gy * gy);
            edges[rowOffset + x] = mag > edgeThreshold ? 255 : 0;
          }
        }

        // Dilate edges if thickness > 1
        let finalEdges = edges;
        if (edgeThickness > 1) {
          finalEdges = new Uint8Array(totalPixels);
          const rad = Math.floor(edgeThickness);
          for (let y = rad; y < height - rad; y++) {
            for (let x = rad; x < width - rad; x++) {
              if (edges[y * width + x] === 255) {
                for (let dy = -rad; dy <= rad; dy++) {
                  for (let dx = -rad; dx <= rad; dx++) {
                    finalEdges[(y + dy) * width + (x + dx)] = 255;
                  }
                }
              }
            }
          }
        }

        // Step 3: Color Quantization (Cel-Shading) + Saturation Boost
        const step = 255 / Math.max(2, colorSteps - 1);

        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          let r = data[idx];
          let g = data[idx + 1];
          let b = data[idx + 2];

          // Contrast Boost
          r = Math.min(255, Math.max(0, (r - 128) * contrastBoost + 128));
          g = Math.min(255, Math.max(0, (g - 128) * contrastBoost + 128));
          b = Math.min(255, Math.max(0, (b - 128) * contrastBoost + 128));

          // Saturation Boost (convert to HSL-like saturation adjustment)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          if (delta > 10) {
            const grayVal = (r + g + b) / 3;
            r = Math.min(255, Math.max(0, grayVal + (r - grayVal) * saturationBoost));
            g = Math.min(255, Math.max(0, grayVal + (g - grayVal) * saturationBoost));
            b = Math.min(255, Math.max(0, grayVal + (b - grayVal) * saturationBoost));
          }

          // Cel-shade palette banding
          r = Math.round(r / step) * step;
          g = Math.round(g / step) * step;
          b = Math.round(b / step) * step;

          // Composite Ink Outline
          if (finalEdges[i] === 255) {
            // Rich Comic Book Inking Outline (#151518)
            data[idx] = 22;
            data[idx + 1] = 22;
            data[idx + 2] = 26;
          } else {
            data[idx] = Math.min(255, Math.round(r));
            data[idx + 1] = Math.min(255, Math.round(g));
            data[idx + 2] = Math.min(255, Math.round(b));
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Step 4: Add Crisp Die-Cut Sticker Border & Sticker Badge Aesthetic
        if (stickerBorder) {
          ctx.save();
          // Inner sticker stroke
          ctx.lineWidth = stickerBorderWidth;
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeRect(
            stickerBorderWidth / 2,
            stickerBorderWidth / 2,
            width - stickerBorderWidth,
            height - stickerBorderWidth
          );

          // Outer thin contour line
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(1, 1, width - 2, height - 2);
          ctx.restore();
        }

        resolve(canvas.toDataURL('image/png', 0.95));
      } catch (err) {
        console.warn('Canvas cartoon conversion failed, falling back to original:', err);
        resolve(imageSourceUrl);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image for cartoon conversion:', imageSourceUrl);
      resolve(imageSourceUrl);
    };

    img.src = imageSourceUrl;
  });
}

/**
 * Formats a media URL safely for canvas loading or API transport
 */
export function normalizeMediaForCanvas(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

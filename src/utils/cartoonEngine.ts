/**
 * Cartoon Art Generator & Stylizer
 * Transforms vehicles into 2D minimalist vector cartoon stickers matching the iconic Miata cartoon art style
 * (Bold black outlines, clean cel-shading, pop-up / stylized headlights, cambered stance, sticker cutout aesthetics).
 */

export interface CartoonStyleOptions {
  primaryColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  headlightStyle?: 'popup' | 'popup-taped-x' | 'laser' | 'round-classic' | 'sharp-aggressive';
  carType?: 'miata' | 'coupe' | 'supercar' | 'muscle' | 'jdm-sedan';
  wingStyle?: 'none' | 'ducktail' | 'gt-wing' | 'carbon-spoiler';
  smileGrille?: boolean;
}

export function generateCarVectorSvg(options: CartoonStyleOptions = {}): string {
  const {
    primaryColor = '#FA7B8C', // Cute signature pink like the sample image
    outlineColor = '#000000',
    outlineWidth = 10,
    headlightStyle = 'popup-taped-x',
    carType = 'miata',
    wingStyle = 'none',
    smileGrille = true,
  } = options;

  const encodedColor = encodeURIComponent(primaryColor);
  const encodedOutline = encodeURIComponent(outlineColor);

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(100, 90) scale(0.75)">
    <!-- Optional GT Wing for Supercar / Track Cars -->
    ${
      wingStyle === 'gt-wing'
        ? `<rect x="120" y="30" width="560" height="28" rx="6" fill="%2318181B" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <line x1="240" y1="58" x2="260" y2="150" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <line x1="560" y1="58" x2="540" y2="150" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>`
        : ''
    }

    <!-- Wheels & Track Stance (Cambered) -->
    <path d="M 80,330 L 50,350 L 65,440 L 120,440 L 110,380 Z" fill="%231C1C1E" stroke="${encodedOutline}" stroke-width="${outlineWidth}" stroke-linejoin="round"/>
    <path d="M 720,330 L 750,350 L 735,440 L 680,440 L 690,380 Z" fill="%231C1C1E" stroke="${encodedOutline}" stroke-width="${outlineWidth}" stroke-linejoin="round"/>

    <!-- Car Body Lower/Mid Base -->
    <path d="M 120,430 C 100,430 80,420 80,390 L 80,330 C 80,280 120,230 180,210 C 240,190 320,180 400,180 C 480,180 560,190 620,210 C 680,230 720,280 720,330 L 720,390 C 720,420 700,430 680,430 Z" fill="${encodedColor}" stroke="${encodedOutline}" stroke-width="${outlineWidth}" stroke-linejoin="round"/>

    <!-- Windshield & Roof Frame -->
    <path d="M 230,200 L 260,100 C 270,75 320,65 400,65 C 480,65 530,75 540,100 L 570,200 Z" fill="${encodedColor}" stroke="${encodedOutline}" stroke-width="${outlineWidth}" stroke-linejoin="round"/>
    <path d="M 270,190 L 290,110 C 300,95 340,85 400,85 C 460,85 500,95 510,110 L 530,190 Z" fill="%232D3136" stroke="${encodedOutline}" stroke-width="8"/>
    <!-- Windshield Reflection -->
    <polygon points="310,120 340,120 320,180 290,180" fill="rgba(255,255,255,0.15)"/>

    <!-- Pop-up or Styled Headlights -->
    ${
      headlightStyle === 'popup-taped-x' || headlightStyle === 'popup'
        ? `<!-- Left Pop-up -->
           <rect x="165" y="140" width="115" height="115" rx="12" fill="%23111111" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <circle cx="222" cy="198" r="42" fill="%23F3F3F3" stroke="${encodedOutline}" stroke-width="8"/>
           
           <!-- Right Pop-up -->
           <rect x="520" y="140" width="115" height="115" rx="12" fill="%23111111" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <circle cx="578" cy="198" r="42" fill="%23F3F3F3" stroke="${encodedOutline}" stroke-width="8"/>
           ${
             headlightStyle === 'popup-taped-x'
               ? `<line x1="548" y1="168" x2="608" y2="228" stroke="${encodedOutline}" stroke-width="9"/>
                  <line x1="608" y1="168" x2="548" y2="228" stroke="${encodedOutline}" stroke-width="9"/>`
               : ''
           }`
        : headlightStyle === 'laser'
        ? `<!-- Sharp Laser Lights -->
           <polygon points="140,240 240,195 260,235 160,265" fill="%23FEF08A" stroke="${encodedOutline}" stroke-width="8"/>
           <polygon points="660,240 560,195 540,235 640,265" fill="%23FEF08A" stroke="${encodedOutline}" stroke-width="8"/>`
        : `<!-- Round Headlights -->
           <circle cx="200" cy="240" r="40" fill="%23FFFFFF" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <circle cx="600" cy="240" r="40" fill="%23FFFFFF" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>`
    }

    <!-- Turn Signal Indicator Bars -->
    <rect x="155" y="290" width="125" height="35" rx="10" fill="%23F5BC38" stroke="${encodedOutline}" stroke-width="8"/>
    <rect x="520" y="290" width="125" height="35" rx="10" fill="%23F5BC38" stroke="${encodedOutline}" stroke-width="8"/>

    <!-- Grille / Smile / Intake -->
    ${
      smileGrille
        ? `<!-- Miata Smile / Happy Grille -->
           <path d="M 270,390 C 270,440 530,440 530,390 C 530,370 270,370 270,390 Z" fill="%23382736" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>
           <path d="M 300,410 C 350,430 450,430 500,410 Z" fill="%231D121B"/>`
        : `<!-- Wide Sport Intake -->
           <path d="M 220,350 L 580,350 L 550,420 L 250,420 Z" fill="%2318181B" stroke="${encodedOutline}" stroke-width="${outlineWidth}"/>`
    }

    <!-- Tow Hook / Aero Lip -->
    <rect x="200" y="445" width="55" height="22" rx="6" fill="%23111111" stroke="${encodedOutline}" stroke-width="6"/>
  </g>
</svg>`;
}

/**
 * Filter an uploaded photo onto an HTML Canvas with a Cel-Shaded Posterized Cartoon effect
 */
export function applyCartoonCanvasFilter(
  imageSource: HTMLImageElement,
  outlineStrength: number = 3,
  colorLevels: number = 5
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSource.src;

  canvas.width = imageSource.naturalWidth || imageSource.width || 800;
  canvas.height = imageSource.naturalHeight || imageSource.height || 600;

  // Step 1: Draw original image
  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const step = 255 / (colorLevels - 1);

  // Posterize colors for flat comic style
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step; // Red
    data[i + 1] = Math.round(data[i + 1] / step) * step; // Green
    data[i + 2] = Math.round(data[i + 2] / step) * step; // Blue
    // Boost saturation slightly
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const delta = max - min;
    if (delta > 30) {
      if (data[i] === max) data[i] = Math.min(255, data[i] * 1.15);
      if (data[i + 1] === max) data[i + 1] = Math.min(255, data[i + 1] * 1.15);
      if (data[i + 2] === max) data[i + 2] = Math.min(255, data[i + 2] * 1.15);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 2: Overlay subtle edge outline
  ctx.lineWidth = outlineStrength;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  return canvas.toDataURL('image/png', 0.95);
}

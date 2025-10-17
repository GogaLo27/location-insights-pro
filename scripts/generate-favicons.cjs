const path = require('path');
const fs = require('fs');
const JimpModule = require('jimp');
const Jimp = JimpModule.default || JimpModule;
const pngToIco = require('png-to-ico');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');
const outPng32 = path.join(publicDir, 'fav.png');
const outIco = path.join(publicDir, 'favicon.ico');

async function build() {
  if (!fs.existsSync(logoPath)) {
    console.error('logo.png not found in public folder:', logoPath);
    process.exit(1);
  }

  // Load logo, make square by cropping center if needed, resize to 32x32
  const image = await Jimp.read(logoPath);
  const size = Math.min(image.bitmap.width, image.bitmap.height);
  const x = Math.floor((image.bitmap.width - size) / 2);
  const y = Math.floor((image.bitmap.height - size) / 2);
  const square = image.clone().crop(x, y, size, size).resize(32, 32);
  await square.writeAsync(outPng32);
  console.log('Wrote', outPng32);

  // Create a 32x32 PNG and also convert to ICO (contains multiple sizes)
  // For ICO, produce 16x16 and 32x32 PNGs
  const png16Path = path.join(publicDir, 'fav-16.png');
  const png32Path = path.join(publicDir, 'fav-32.png');
  await image.clone().crop(x, y, size, size).resize(16, 16).writeAsync(png16Path);
  await image.clone().crop(x, y, size, size).resize(32, 32).writeAsync(png32Path);

  const buffer = await pngToIco([png16Path, png32Path]);
  fs.writeFileSync(outIco, buffer);
  console.log('Wrote', outIco);

  // cleanup temporary files
  try { fs.unlinkSync(png16Path); fs.unlinkSync(png32Path); } catch(e){}
}

build().catch(err => { console.error(err); process.exit(1); });

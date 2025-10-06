```javascript
// Generador sencillo de WAVs en Node (sin dependencias)
// Copiado aquí como respaldo

const fs = require('fs');
const path = require('path');

function writeWav(filePath, samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2; // 16-bit

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(samples[i] * 32767))), offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, buffer);
}

function sineWave(freq, duration, sampleRate = 44100, amplitude = 0.6) {
  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin(2 * Math.PI * freq * (i / sampleRate));
  }
  return samples;
}

function noiseBurst(duration, sampleRate = 44100, amplitude = 0.8) {
  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * (Math.random() * 2 - 1);
  }
  // fade out
  for (let i = 0; i < Math.min(2000, length); i++) {
    const f = 1 - i / Math.min(2000, length);
    samples[length - 1 - i] *= f;
  }
  return samples;
}

function sweep(freqStart, freqEnd, duration, sampleRate = 44100, amplitude = 0.6) {
  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const freq = freqStart + (freqEnd - freqStart) * (i / length);
    samples[i] = amplitude * Math.sin(2 * Math.PI * freq * t);
  }
  return samples;
}

(function main() {
  const outDir = path.join(__dirname, '..', 'src', 'assets', 'sounds');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // start: breve chime 880Hz 0.2s
  console.log('Generando start.wav...');
  writeWav(path.join(outDir, 'start.wav'), sineWave(880, 0.22));

  // collision: ruido corto 0.15s
  console.log('Generando collision.wav...');
  writeWav(path.join(outDir, 'collision.wav'), noiseBurst(0.15));

  // victory: sweep 400->1400 0.5s
  console.log('Generando victory.wav...');
  writeWav(path.join(outDir, 'victory.wav'), sweep(400, 1400, 0.5));

  console.log('Hecho. Archivos generados en:', outDir);
})();

```

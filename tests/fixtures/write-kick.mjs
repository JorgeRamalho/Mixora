import fs from "node:fs";
import path from "node:path";

const sampleRate = 44100;
const seconds = 2;
const bpm = 120;
const length = sampleRate * seconds;
const samples = new Int16Array(length);
const step = Math.floor((60 / bpm) * sampleRate);

for (let beat = 0; beat < 4; beat += 1) {
  const at = beat * step;
  const dur = Math.floor(sampleRate * 0.12);
  for (let i = 0; i < dur && at + i < length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 28);
    const freq = 60;
    samples[at + i] = Math.max(-32767, Math.min(32767, Math.sin(2 * Math.PI * freq * t) * env * 30000));
  }
}

const dataSize = samples.length * 2;
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(dataSize, 40);

const body = Buffer.from(samples.buffer);
const wav = Buffer.concat([header, body]);
const dir = path.resolve(import.meta.dirname);
const wavPath = path.join(dir, "mixer-kick-120bpm.wav");
fs.writeFileSync(wavPath, wav);
console.log("wrote", wavPath, wav.length, "bytes");

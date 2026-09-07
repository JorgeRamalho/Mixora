# fixtures/

Arquivos de áudio para CI.

| Arquivo | Papel |
| --- | --- |
| `mixer-kick-120bpm.mp3` | Kick de 2 s a 120 BPM para o e2e de load. |
| `mixer-kick-120bpm.wav` | PCM fonte, para regenerar o MP3. |
| `write-kick.mjs` | Gera o WAV. |

Regenerar:

```bash
node tests/fixtures/write-kick.mjs
ffmpeg -y -i tests/fixtures/mixer-kick-120bpm.wav tests/fixtures/mixer-kick-120bpm.mp3
```

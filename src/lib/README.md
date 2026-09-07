# src/lib/

Lógica de domínio e adaptação de ambiente. Sem JSX.

| Arquivo | Papel |
| --- | --- |
| `audio-engine.ts` | Dual deck Web Audio (loops sintéticos, EQ, pitch, crossfader). `MamuteEngineOptions` injeta o `AudioContext` nos testes. |
| `mixer-snapshot.ts` | Clone do `MixerSnapshot` e conversão fase → beat. |
| `mixer-browse.ts` | Cursor da biblioteca de treino, wrap nas pontas e índice do master. |
| `mixer-dispatch.ts` | Resolve `MixerAction` em absoluto, intenção ou browse, sem React. |
| `mixer-action-routing.ts` | Tabela `MIXER_ACTION_ROUTES`: dispatch-only, reducer-only, reducer-direct. |
| `mixer-assert.ts` | `assertAllowedInReducer` — throw `[MixerContract]` em DEV se a rota for dispatch-only. |
| `waveform-peaks.ts` | Picos de amplitude por bin para a waveform tipo CDJ. |
| `deck-audio-decode.ts` | `decodeAudioData` + título/BPM do nome do arquivo. |
| `deck-metadata.ts` | Heurística de BPM no filename. |
| `storage.ts` | Perfil DJ em `localStorage`. |
| `academy.ts` | Progresso das aulas em `localStorage`. |
| `base.ts` | Basename do router, URL do Live Server e `publicAsset()` para favicon. |
| `midi/ddj-400-protocol.ts` | Status bytes, CCs e notes da Pioneer DDJ-400, mais a decodificação de 14 bits e do jog. |
| `midi/parse-message.ts` | Quebra o `Uint8Array` da Web MIDI em CC ou note e ignora sysex. |
| `midi/midi-session.ts` | `requestMIDIAccess` e filtro do input cujo nome contém DDJ-400. |
| `midi/ddj-400-map.ts` | Função pura que decide qual controle é cada mensagem, de knob e jog a transporte, loop, pads e browser, e devolve o `MixerAction`. |
| `midi/midi-scales.ts` | Range de destino de cada controle na cabine, mais os ticks de jog que valem um `nudge`. |
| `midi/midi-coalesce.ts` | Fila de um frame que junta ação contínua, soma a cumulativa e deixa a imediata passar direto. |
| `midi/use-midi-controller.ts` | Hook que liga a sessão MIDI ao `dispatch` da cabine e mede a latência até a tela. |

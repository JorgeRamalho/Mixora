# src/types/

Contratos TypeScript por domínio. `index.ts` reexporta tudo; o restante do app importa de `../types` (ou `../../types`).

| Arquivo | Tipos |
| --- | --- |
| `index.ts` | Barrel de reexport. |
| `download.ts` | `DownloadPackId`, `DownloadPack`, `DownloadDocId`, `DownloadDoc`, `DetectedClient` |
| `platform.ts` | `PlatformId`, `PlatformIntel` |
| `academy.ts` | `CourseLevel`, `CourseLesson`, `CourseModule`, `TipCard`, `Exercise` |
| `dj.ts` | `ExperienceLevel`, `HardwareKind`, `DjProfile` |
| `mixer.ts` | `DeckId`, `MixerSnapshot`, `MixerAction` |
| `radio.ts` | `RadioClip` |
| `ticker.ts` | `TickerItem` |

# src/data/

Conteúdo editorial estático. Sem I/O e sem React.

| Arquivo | Exporta | Consumidores |
| --- | --- | --- |
| `platforms.ts` | `PLATFORMS` | Hero, home, catálogo |
| `ticker.ts` | `TICKER_ITEMS` | `StatusBar` |
| `courses.ts` | `COURSE_MODULES` | Academia (aulas) |
| `academy.ts` | `TIPS`, `EXERCISES`, opções de form | Academia, cadastro DJ |
| `radio.ts` | `RADIO_CLIPS` | Rádio |
| `training-tracks.ts` | `TRAINING_TRACKS`, `DEFAULT_DECK_TRACKS`, `TrainingTrackId`, `getTrainingTrack` | Cabine (decks, BROWSE, engine) |

`training-tracks.ts` deriva de `radio.ts`, porém por **id** e não por posição, e as chaves dessa
derivação formam o tipo `TrainingTrackId`. Por isso reordenar `RADIO_CLIPS` não troca a biblioteca
de treino, e uma faixa padrão inexistente falha na compilação em vez de cair num fallback mudo.

# src/components/

UI por superfície. Cada subpasta corresponde a uma rota ou ao chrome global.

| Pasta | Arquivos | Papel |
| --- | --- | --- |
| `layout/` | `AppShell.tsx`, `Header.tsx`, `StatusBar.tsx` | Chrome: header, ticker, footer. |
| `hero/` | `Hero.tsx`, `DigitalVisor.tsx` | Home: HUD, waveform, chips. |
| `mixer/` | `MixerBoard.tsx`, `MixerConsole.tsx`, `CdjDeck.tsx`, `MidiStatus.tsx`, `BrowseChip.tsx` | Dual deck, EQ, pitch, crossfader, chip da sessão MIDI da DDJ-400 e chip da biblioteca sob o encoder BROWSE. |
| `academy/` | `Classroom.tsx` | Aulas, dicas, exercícios, progresso. |
| `radio/` | `RadioStudio.tsx` | Fila YouTube IFrame. |
| `catalog/` | `CatalogHub.tsx` | Fichas das plataformas. |
| `dj/` | `RegisterForm.tsx` | Cadastro persistido + Netlify Forms. |

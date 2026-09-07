# Pesquisa — plataformas de áudio

Fontes oficiais consultadas para o catálogo e para o limite do mixer. O mixer **não** roteia streams dessas plataformas.

| Serviço | Uso no Mamute DJPLAYER | Bloqueio principal | Documentação |
| --- | --- | --- | --- |
| Beatport | Charts, BPM/key, parceria LINK futura | API só para parceiros | [API v4](https://api.beatport.com/v4/docs/) |
| Spotify | Metadados e descoberta | Termos proíbem mix/crossfade | [Web API](https://developer.spotify.com/documentation/web-api) |
| SoundCloud | Embed de mixes | Getters async / atribuição | [Widget HTML5](https://developers.soundcloud.com/docs/api/html5-widget.html) |
| Deezer | Busca e rádio editorial | 30s sem Premium + SDK | [Guidelines](https://developers.deezer.com/guidelines) |
| YouTube | Clipes da rádio e aulas | Data API key no backend | [IFrame API](https://developers.google.com/youtube/iframe_api_reference) |

## Decisão de produto

Loops sintéticos no `src/lib/audio-engine.ts` treinam beatmatch sem violar termos. Fichas detalhadas (capabilities, limits, `playerDjUse`) vivem em `src/data/platforms.ts` e aparecem na rota `/catalogo`.

Quando uma parceria (Beatport LINK ou equivalente) existir, o ponto de extensão é o motor de áudio — não o catálogo editorial.

import { describe, expect, it } from "vitest";

import {
  canFetchRemoteCollection,
  hasCatalogBrowseCriteria,
  remoteCollectionIdleCopy,
} from "../../src/lib/tracks-api/hooks/use-track-library";

describe("remote collection browse", () => {
  it("catálogo sem artist/track/release/label nem gênero não habilita fetch", () => {
    expect(hasCatalogBrowseCriteria({})).toBe(false);
    expect(hasCatalogBrowseCriteria({ artist: "  ", genre: null })).toBe(false);
    expect(
      canFetchRemoteCollection({ collectionMode: "catalog", artist: "", genre: null }),
    ).toBe(false);
  });

  it("catálogo habilita com busca explícita ou gênero", () => {
    expect(hasCatalogBrowseCriteria({ artist: "amelie" })).toBe(true);
    expect(hasCatalogBrowseCriteria({ track: "nocturne" })).toBe(true);
    expect(hasCatalogBrowseCriteria({ release: "discovery" })).toBe(true);
    expect(hasCatalogBrowseCriteria({ label: "afterlife" })).toBe(true);
    expect(hasCatalogBrowseCriteria({ genre: "Techno" })).toBe(true);
    expect(
      canFetchRemoteCollection({ collectionMode: "catalog", genre: "Techno" }),
    ).toBe(true);
  });

  it("subgênero sozinho não habilita o catálogo", () => {
    expect(hasCatalogBrowseCriteria({ subgenre: "Peak Time Techno" })).toBe(false);
  });

  it("biblioteca habilita sem filtros quando o modo está ativo", () => {
    expect(canFetchRemoteCollection({ collectionMode: "library" })).toBe(true);
  });

  it("sem modo selecionado mantém gênero e lista ociosos", () => {
    expect(canFetchRemoteCollection({ collectionMode: null })).toBe(false);
    expect(remoteCollectionIdleCopy({ collectionMode: null })).toBe(
      "Escolha biblioteca ou catálogo",
    );
  });

  it("catálogo sem critério mostra copy de busca ou gênero", () => {
    expect(remoteCollectionIdleCopy({ collectionMode: "catalog" })).toBe(
      "Busque artista, faixa, álbum, label ou escolha um gênero",
    );
  });
});

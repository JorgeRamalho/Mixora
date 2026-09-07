import { expect, test, type Page } from "@playwright/test";
import { fillCadastroJourney } from "./cadastro-helpers";

async function dismissPrivacyBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  if (await accept.isVisible()) {
    await accept.click();
  }
}

const STORED_PROFILE = {
  fullName: "DJ Anterior",
  artistName: "DJ Residual",
  pronouns: "",
  birthDate: "",
  nationality: "",
  city: "Recife",
  country: "Brasil",
  languages: "Português",
  email: "anterior@mamute.test",
  phone: "",
  whatsapp: "",
  website: "",
  bio: "Bio que não deveria aparecer na ficha nova.",
  experienceLevel: "iniciante",
  yearsDJing: "0",
  genres: ["Techno"],
  influences: "",
  setsPerMonth: "0",
  preferredVenue: "clube",
  hardware: ["cdj"],
  brands: "",
  software: ["MIXORAPlayerDJ Mixer"],
  headphones: "",
  instagram: "@residual",
  soundcloud: "",
  mixcloud: "",
  beatport: "",
  spotify: "",
  youtube: "",
  tiktok: "",
  deezer: "",
  agencies: "",
  labels: "",
  residencies: "",
  travel: "local",
  feeRange: "",
  pressKit: "",
  goals: "",
  weeklyHours: "3",
  mentorship: false,
  challenges: "",
  terms: true,
  imageRights: false,
  newsletter: true,
  over18: true,
};

async function seedStoredProfile(page: Page, withSession = false): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ profile, withSession: session }) => {
      localStorage.setItem("mamute.dj.profile", JSON.stringify(profile));
      localStorage.setItem(
        "mamute.dj.credentials",
        JSON.stringify({ email: profile.email, passwordHash: "deadbeef" }),
      );
      if (session) {
        sessionStorage.setItem(
          "mamute.dj.session",
          JSON.stringify({
            email: profile.email,
            artistName: profile.artistName,
            loggedInAt: Date.now(),
          }),
        );
      } else {
        sessionStorage.removeItem("mamute.dj.session");
      }
    },
    { profile: STORED_PROFILE, withSession },
  );
}

async function visitaCard(page: Page) {
  return page.evaluate(() => {
    const hero = document.querySelector(".dj-register-hero");
    return {
      progress: hero?.querySelector(".dj-register-progress-value")?.textContent?.trim() ?? null,
      donePills: hero?.querySelectorAll(".dj-register-step-pill.is-done").length ?? 0,
    };
  });
}

async function fillMinimalCadastro(page: Page, suffix: string): Promise<void> {
  await fillCadastroJourney(page, suffix);
}

test.describe("Cadastro DJ — ficha limpa até enviar ao banco", () => {
  test("ficha nova não herda cadastro anterior nem o cartão de visita", async ({ page }) => {
    await seedStoredProfile(page, false);
    await page.goto("/cadastro");
    await dismissPrivacyBanner(page);

    await expect(page.getByText("Visor atual: DJ Residual")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "1. Identidade" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nome artístico" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Bio" })).toHaveCount(0);

    const card = await visitaCard(page);
    expect(card.progress).toBe("0%");
    expect(card.donePills).toBe(0);

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Nome artístico" })).toHaveValue("");
    const cardAfterReload = await visitaCard(page);
    expect(cardAfterReload.progress).toBe("0%");
    expect(cardAfterReload.donePills).toBe(0);
  });

  test("após gravar com sucesso a ficha volta limpa para um novo cadastro", async ({ page }) => {
    await page.goto("/cadastro");
    await dismissPrivacyBanner(page);
    await fillMinimalCadastro(page, "Novo");
    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await expect(page.getByRole("heading", { name: /Parabéns, DJ Novo/ })).toBeVisible();
    await expect(
      page.getByText("Seja bem-vindo. Você concluiu todas as etapas do cadastro MIXORAPlayerDJ."),
    ).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("mamute.dj.profile"));
    expect(stored).toContain("DJ Novo");

    await page.evaluate(() => sessionStorage.removeItem("mamute.dj.session"));

    await page.goto("/cadastro");
    await expect(page.getByText("Visor atual: DJ Novo")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "1. Identidade" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nome artístico" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Bio" })).toHaveCount(0);

    const card = await visitaCard(page);
    expect(card.progress).toBe("0%");
    expect(card.donePills).toBe(0);
  });

  test("edição logada mantém o mural salvo no banco", async ({ page }) => {
    await seedStoredProfile(page, true);
    await page.goto("/cadastro?editar=1");
    await dismissPrivacyBanner(page);

    await expect(page.getByText("Visor atual: DJ Residual")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nome artístico" })).toHaveValue("DJ Residual");
    await page.getByRole("button", { name: "03 · Perfil" }).click();
    await page.getByRole("textbox", { name: "Bio" }).fill("Bio atualizada no mural.");
    await page.getByRole("button", { name: "Gravar perfil de cabine" }).click();
    await expect(page).toHaveURL(/\/dj\?cadastrado=1/);

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("mamute.dj.profile");
      return raw ? (JSON.parse(raw) as { bio?: string }).bio : null;
    });
    expect(stored).toBe("Bio atualizada no mural.");
  });

  test("a jornada percorre as oito etapas até as boas-vindas", async ({ page }) => {
    await page.goto("/cadastro");
    await dismissPrivacyBanner(page);

    await expect(page.getByRole("button", { name: "08 · Termos" })).toBeDisabled();
    await fillCadastroJourney(page, "Jornada");
    await expect(page.getByRole("button", { name: "01 · Identidade" })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "8. Termos" })).toBeVisible();
    await page.getByRole("button", { name: "Concluir cadastro" }).click();

    await expect(page.getByRole("heading", { name: /Parabéns, DJ Jornada/ })).toBeVisible();
    await expect(page.getByText("Seja bem-vindo. Você concluiu todas as etapas do cadastro MIXORAPlayerDJ.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar na Área do DJ" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir o mixer" })).toBeVisible();
  });
});

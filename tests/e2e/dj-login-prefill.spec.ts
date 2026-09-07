import { expect, test, type Page } from "@playwright/test";
import { fillCadastroJourney } from "./cadastro-helpers";

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
  bio: "Bio residual.",
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

async function dismissPrivacyBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  if (await accept.isVisible()) {
    await accept.click();
  }
}

async function seedStoredProfile(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate((profile) => {
    localStorage.setItem("mamute.dj.profile", JSON.stringify(profile));
    localStorage.setItem(
      "mamute.dj.credentials",
      JSON.stringify({ email: profile.email, passwordHash: "deadbeef" }),
    );
    sessionStorage.removeItem("mamute.dj.session");
  }, STORED_PROFILE);
}

async function loginEmailValue(page: Page): Promise<string> {
  return page.getByRole("textbox", { name: "E-mail" }).inputValue();
}

test.describe("Área do DJ — e-mail no login", () => {
  test("visita genérica a /dj não herda e-mail de cadastro anterior", async ({ page }) => {
    await seedStoredProfile(page);
    await page.goto("/dj");
    await dismissPrivacyBanner(page);

    await expect(page.getByRole("heading", { name: "Login da cabine" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue("");

    await page.reload();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue("");
  });

  test("após novo cadastro o login usa o e-mail recém-gravado (URL e reload)", async ({ page }) => {
    await seedStoredProfile(page);
    const suffix = `login-prefill-${Date.now()}`;
    const newEmail = `${suffix}@mamute.test`;

    await page.goto("/cadastro");
    await dismissPrivacyBanner(page);
    await fillCadastroJourney(page, suffix);
    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`Parabéns, DJ ${suffix}`, "i") })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: /Ir para login|Entrar na Área do DJ/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`email=${encodeURIComponent(newEmail).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue(newEmail);
    expect(await loginEmailValue(page)).not.toBe("anterior@mamute.test");

    await page.reload();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue(newEmail);
  });

  test("painéis Esqueci a senha e Receber código não herdam e-mail residual", async ({ page }) => {
    await seedStoredProfile(page);
    await page.goto("/dj");
    await dismissPrivacyBanner(page);

    await page.getByRole("button", { name: "Esqueci a senha" }).click();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue("");

    await page.getByRole("button", { name: "Voltar ao login" }).click();
    await page.getByRole("button", { name: "Receber código" }).click();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue("");
  });
});

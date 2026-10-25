import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fetchStarCount,
  fetchTotalDownloads,
  formatCount,
  parseLatestRelease,
  sumReleaseDownloads
} from "../public/assets/main.js";

describe("API de GitHub Releases", () => {
  it("elige el instalador de Stream Deck e ignora otros assets", () => {
    assert.deepEqual(parseLatestRelease({
      tag_name: "v2.0.0",
      assets: [
        { name: "SHA256SUMS.txt", browser_download_url: "https://example.test/hash" },
        { name: "Gaming-Toggles-for-PC-v2.0.0.streamDeckPlugin", browser_download_url: "https://example.test/plugin" }
      ]
    }), {
      version: "v2.0.0",
      downloadUrl: "https://example.test/plugin",
      fileName: "Gaming-Toggles-for-PC-v2.0.0.streamDeckPlugin"
    });
  });

  it("rechaza respuestas inválidas y Releases sin instalador", () => {
    assert.throws(() => parseLatestRelease(null), /Release inválida/);
    assert.throws(
      () => parseLatestRelease({ tag_name: "v2.0.0", assets: [] }),
      /no contiene un instalador/
    );
  });
});

function jsonResponse(body: unknown, { status = 200, link = "" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "link" && link ? link : null) },
    json: async () => body
  };
}

describe("métricas públicas de GitHub", () => {
  it("suma download_count de todos los assets e ignora valores inválidos", () => {
    assert.equal(sumReleaseDownloads([
      { assets: [{ download_count: 7 }, { download_count: 3 }] },
      { assets: [{ download_count: -1 }, { download_count: "9" }, {}] },
      { assets: null },
      {}
    ]), 10);
    assert.equal(sumReleaseDownloads([]), 0);
    assert.throws(() => sumReleaseDownloads(null), /lista de Releases inválida/);
  });

  it("recorre todas las páginas de Releases siguiendo la cabecera Link", async () => {
    const calls: string[] = [];
    const next = "https://api.github.com/repositories/1/releases?per_page=100&page=2";
    const total = await fetchTotalDownloads(async (url: string) => {
      calls.push(url);
      return url === next
        ? jsonResponse([{ assets: [{ download_count: 1000 }] }])
        : jsonResponse([{ assets: [{ download_count: 234 }] }], { link: `<${next}>; rel="next", <${next}>; rel="last"` });
    });
    assert.equal(total, 1234);
    assert.deepEqual(calls, ["https://api.github.com/repos/MAECLY/gaming-toggles/releases?per_page=100", next]);
  });

  it("no inventa un total si GitHub falla o limita la cuota", async () => {
    await assert.rejects(fetchTotalDownloads(async () => jsonResponse({ message: "rate limited" }, { status: 403 })), /GitHub API 403/);
    await assert.rejects(fetchStarCount(async () => jsonResponse({}, { status: 503 })), /GitHub API 503/);
    await assert.rejects(fetchStarCount(async () => jsonResponse({ stargazers_count: "12" })), /estrellas inválido/);
    assert.equal(await fetchStarCount(async () => jsonResponse({ stargazers_count: 0 })), 0);
  });

  it("formatea las cifras según el idioma de la página", () => {
    assert.equal(formatCount(1234, "es"), "1.234");
    assert.equal(formatCount(1234, "en"), "1,234");
    assert.equal(formatCount(10, "es"), "10");
  });
});

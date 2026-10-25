const RELEASE_API = "https://api.github.com/repos/MAECLY/gaming-toggles/releases/latest";
const REPO_API = "https://api.github.com/repos/MAECLY/gaming-toggles";
const RELEASES_API = `${REPO_API}/releases?per_page=100`;
const MAX_RELEASE_PAGES = 10;
const GITHUB_HEADERS = { Accept: "application/vnd.github+json" };

export function parseLatestRelease(release) {
  if (!release || typeof release !== "object") {
    throw new TypeError("GitHub devolvió una Release inválida.");
  }
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const installer = assets.find((asset) =>
    typeof asset?.name === "string" &&
    asset.name.endsWith(".streamDeckPlugin") &&
    typeof asset.browser_download_url === "string"
  );
  if (!installer) {
    throw new Error("La Release no contiene un instalador .streamDeckPlugin.");
  }
  return {
    version: typeof release.tag_name === "string" ? release.tag_name : "",
    downloadUrl: installer.browser_download_url,
    fileName: installer.name
  };
}

export function toggleDemoKey(key, root = document) {
  const setting = key.dataset.setting;
  const isOn = key.classList.toggle("is-on");
  key.setAttribute("aria-pressed", String(isOn));
  const label = isOn ? key.dataset.onLabel : key.dataset.offLabel;
  const image = isOn ? key.dataset.onImage : key.dataset.offImage;
  const strong = key.querySelector("strong");
  const icon = key.querySelector("img");
  const indicator = root.querySelector(`[data-indicator="${setting}"]`);
  if (strong && label) strong.textContent = label;
  if (icon && image) icon.src = image;
  if (indicator) {
    indicator.classList.toggle("is-on", isOn);
    indicator.textContent = label;
    indicator.dataset.state = isOn ? "on" : "off";
  }
  return isOn;
}

export function cycleDemoKey(key, root = document) {
  const labels = (key.dataset.cycleLabels ?? "").split("|").filter(Boolean);
  const images = (key.dataset.cycleImages ?? "").split("|").filter(Boolean);
  if (labels.length === 0 || labels.length !== images.length) {
    throw new Error("La tecla cíclica de la demo no tiene estados válidos.");
  }
  const previous = Number.parseInt(key.dataset.demoIndex ?? "0", 10);
  const index = (Number.isFinite(previous) ? previous + 1 : 0) % labels.length;
  const label = labels[index];
  key.dataset.demoIndex = String(index);
  const strong = key.querySelector("strong");
  const icon = key.querySelector("img");
  const indicator = root.querySelector(`[data-indicator="${key.dataset.setting}"]`);
  if (strong) strong.textContent = label;
  if (icon) icon.src = images[index];
  if (indicator) {
    indicator.textContent = label;
    indicator.dataset.state = "cycle";
  }
  return label;
}

export function triggerDemoCommand(key, root = document) {
  const strong = key.querySelector("strong");
  const indicator = root.querySelector(`[data-indicator="${key.dataset.setting}"]`);
  const original = strong?.textContent ?? "WIN+F11";
  const ready = document.documentElement.lang === "es" ? "LISTO" : "READY";
  key.classList.add("is-command-active");
  if (strong) strong.textContent = key.dataset.commandLabel ?? "SENT";
  if (indicator) {
    indicator.textContent = key.dataset.commandLabel ?? "SENT";
    indicator.dataset.state = "command";
  }
  window.setTimeout(() => {
    key.classList.remove("is-command-active");
    if (strong) strong.textContent = original;
    if (indicator) {
      indicator.textContent = ready;
      indicator.dataset.state = "command";
    }
  }, 900);
  return true;
}

export function activateDemoKey(key, root = document) {
  if (key.dataset.demo === "toggle") return toggleDemoKey(key, root);
  if (key.dataset.demo === "cycle") return cycleDemoKey(key, root);
  if (key.dataset.demo === "command") return triggerDemoCommand(key, root);
  return false;
}

export function applyLatestRelease(latest, root = document) {
  root.querySelectorAll("[data-latest-download]").forEach((link) => {
    link.href = latest.downloadUrl;
    link.setAttribute("download", latest.fileName);
  });
  root.querySelectorAll("[data-release-version]").forEach((node) => {
    node.textContent = latest.version;
    node.removeAttribute("aria-busy");
  });

  const status = root.querySelector("[data-release-status]");
  if (status) {
    const suffix = status.dataset.releaseStatus;
    status.textContent = suffix ? `${latest.fileName} · ${suffix}` : latest.fileName;
  }

  const schemaNode = root.querySelector("[data-release-schema]");
  if (schemaNode?.textContent) {
    try {
      const schema = JSON.parse(schemaNode.textContent);
      const software = schema["@graph"]?.find((item) => item["@type"] === "SoftwareApplication");
      if (software) {
        software.softwareVersion = latest.version.replace(/^v/i, "");
        software.downloadUrl = latest.downloadUrl;
        schemaNode.textContent = JSON.stringify(schema);
      }
    } catch (error) {
      console.info("No se pudieron actualizar los metadatos de la Release.", error);
    }
  }
}

export async function hydrateLatestRelease(fetchRelease = fetch, root = document) {
  try {
    const response = await fetchRelease(RELEASE_API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const latest = parseLatestRelease(await response.json());
    applyLatestRelease(latest, root);
    return latest;
  } catch (error) {
    root.querySelectorAll("[data-release-version]").forEach((node) => {
      node.removeAttribute("aria-busy");
    });
    console.info("No se pudo consultar la última Release; se conserva el enlace general.", error);
    return null;
  }
}

export function sumReleaseDownloads(releases) {
  if (!Array.isArray(releases)) throw new TypeError("GitHub devolvió una lista de Releases inválida.");
  return releases.reduce((total, release) => {
    const assets = Array.isArray(release?.assets) ? release.assets : [];
    return total + assets.reduce((sum, asset) =>
      sum + (Number.isSafeInteger(asset?.download_count) && asset.download_count > 0 ? asset.download_count : 0), 0);
  }, 0);
}

function nextPageUrl(response) {
  const link = response.headers?.get?.("link") ?? "";
  return link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
}

// Suma las descargas de todas las páginas; si cualquier página falla no se muestra
// ninguna cifra, para no publicar un total incompleto como si fuera el real.
export async function fetchTotalDownloads(fetchJson = fetch) {
  let url = RELEASES_API;
  let total = 0;
  for (let page = 0; url && page < MAX_RELEASE_PAGES; page += 1) {
    const response = await fetchJson(url, { headers: GITHUB_HEADERS });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    total += sumReleaseDownloads(await response.json());
    url = nextPageUrl(response);
  }
  if (url) throw new Error("Demasiadas páginas de Releases.");
  return total;
}

export async function fetchStarCount(fetchJson = fetch) {
  const response = await fetchJson(REPO_API, { headers: GITHUB_HEADERS });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const stars = (await response.json())?.stargazers_count;
  if (!Number.isSafeInteger(stars) || stars < 0) throw new TypeError("Recuento de estrellas inválido.");
  return stars;
}

export function formatCount(value, lang = "es") {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", { useGrouping: "always" }).format(value);
}

function isPositiveCount(value) {
  return Number.isSafeInteger(value) && value > 0;
}

// Solo se muestran cifras conocidas y mayores que cero; el resto permanece oculto.
export function applyPublicMetrics({ downloads = null, stars = null } = {}, root = document) {
  const lang = root.documentElement?.lang || "es";

  root.querySelectorAll("[data-download-count]").forEach((node) => {
    if (!isPositiveCount(downloads)) {
      node.hidden = true;
      return;
    }
    const plural = new Intl.PluralRules(lang).select(downloads) === "one" ? "labelOne" : "labelOther";
    const template = node.dataset[plural] ?? "{count}";
    node.textContent = template.replace("{count}", formatCount(downloads, lang));
    node.hidden = false;
  });

  root.querySelectorAll("[data-star-count]").forEach((node) => {
    const value = node.querySelector("dd") ?? node;
    if (!isPositiveCount(stars)) {
      node.hidden = true;
      return;
    }
    value.textContent = formatCount(stars, lang);
    node.hidden = false;
  });

  const schemaNode = root.querySelector("[data-release-schema]");
  if (schemaNode?.textContent && isPositiveCount(downloads)) {
    try {
      const schema = JSON.parse(schemaNode.textContent);
      const software = schema["@graph"]?.find((item) => item["@type"] === "SoftwareApplication");
      if (software) {
        software.interactionStatistic = {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/DownloadAction",
          userInteractionCount: downloads
        };
        schemaNode.textContent = JSON.stringify(schema);
      }
    } catch (error) {
      console.info("No se pudieron actualizar las métricas en los metadatos.", error);
    }
  }
}

export async function hydratePublicMetrics(fetchJson = fetch, root = document) {
  const [downloads, stars] = await Promise.all([
    fetchTotalDownloads(fetchJson).catch((error) => {
      console.info("No se pudo consultar el total de descargas; no se muestra la cifra.", error);
      return null;
    }),
    fetchStarCount(fetchJson).catch((error) => {
      console.info("No se pudo consultar el número de estrellas; no se muestra la cifra.", error);
      return null;
    })
  ]);
  const metrics = { downloads, stars };
  applyPublicMetrics(metrics, root);
  return metrics;
}

function initialize() {
  document.querySelectorAll(".deck-key[data-demo]").forEach((key) => {
    key.addEventListener("click", () => activateDemoKey(key));
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });
    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
  }

  void hydrateLatestRelease();
  void hydratePublicMetrics();
}

if (typeof document !== "undefined") initialize();

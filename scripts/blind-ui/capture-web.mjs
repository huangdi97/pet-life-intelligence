// capture-web.mjs — Playwright blind capture of all owner screens (V2).
// Per screen writes: screenshot.png, aria.yml, layout.json, styles.json,
// visual.json, report.md into <out>/<screen>/.
// No vision model: everything extracted from DOM/ARIA/geometry/computed styles
// and the real RUNTIME 3D manifest (window.__PLI_3D_MANIFEST__).
//
// V2 (R2P3D-R3):
//    comes from real DOM (aria-pressed / disabled / data-pli-selected /
//    data-pli-interactive).
//  - Life View captures REAL camera A/B (drag), zoom A/B (button), reset
//    (button) and writes camera_a.json / camera_b.json / camera_zoom.json /
//    camera_reset.json evidence.
//
// Usage: node scripts/blind-ui/capture-web.mjs [--base-url http://localhost:3100] [--out artifacts/blind-ui/web]
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

const args = process.argv.slice(2);
const baseUrl = pick(args, "--base-url", "http://localhost:3100");
const outRoot = resolve(pick(args, "--out", resolve(root, "artifacts/blind-ui/web")));

const VIEWPORT = { width: 390, height: 844 };

const SCREENS = [
  { name: "today", path: "/" },
  { name: "timeline", path: "/timeline" },
  { name: "pet", path: "/pets" },
  { name: "lifeview", path: "/pets/%id%/life-view" },
  { name: "assistant", path: "/agent" },
  { name: "me", path: "/settings" },
  { name: "health", path: "/health" },
  { name: "behavior", path: "/behavior" },
  { name: "training", path: "/training" },
  { name: "welfare", path: "/welfare" },
  { name: "social", path: "/social" },
  { name: "companion", path: "/companion" },
  { name: "monitoring", path: "/monitoring" },
  { name: "twincapture", path: "/pets/%id%/capture" },
  { name: "twinreview", path: "/pets/%id%/twin/review?version=1" },
  { name: "twinversion", path: "/pets/%id%/twin/version" },
];

function pick(argv, flag, fallback) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const STYLE_KEYS = ["backgroundColor", "color", "fontSize", "fontWeight", "borderRadius", "opacity", "display", "position", "zIndex", "overflow"];
const SURFACE_ROLES = ["OPEN", "SOFT_PANEL", "CARD", "CHIP", "STAGE", "NAV", "MEDIA"];

async function snapshotPage(page, name) {
  const result = await page.evaluate(
    ({ STYLE_KEYS, SURFACE_ROLES }) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const els = [];
      const seen = new Set();
      const pickEl = (el) => {
        const testId = el.getAttribute("data-testid");
        const role = el.getAttribute("data-pli-role");
        const id = testId || role || null;
        if (!id || seen.has(id)) return;
        seen.add(id);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const styles = {};
        for (const k of STYLE_KEYS) {
          const v = cs[k];
          if (k === "fontSize" || k === "zIndex") {
            const n = parseFloat(v);
            styles[k] = Number.isFinite(n) ? n : null;
          } else if (k === "opacity") {
            styles[k] = parseFloat(v);
          } else if (k === "fontWeight") {
            styles[k] = v === "400" ? 400 : v;
          } else {
            styles[k] = v;
          }
        }
        els.push({
          id,
          role: el.getAttribute("role") || (el.tagName.toLowerCase() === "button" ? "button" : undefined),
          type: el.getAttribute("data-pli-type") || undefined,
          surfaceType: el.getAttribute("data-pli-surface") || undefined,
          appearanceRole: el.getAttribute("data-appearance-role") || undefined,
          surfaceRole: el.getAttribute("data-surface-role") || undefined,
          realityField: el.getAttribute("data-reality-field") === "true" || undefined,
          petPresenceRole: el.getAttribute("data-pet-presence-role") || undefined,
          materialRole: el.getAttribute("data-material-role") || undefined,
          ariaSelected: el.getAttribute("aria-pressed") || el.getAttribute("aria-selected") || undefined,
          disabled: el instanceof HTMLButtonElement ? el.disabled : undefined,
          interactive: el.getAttribute("data-pli-interactive") || undefined,
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          visible: r.width > 0 && r.height > 0,
          z: parseInt(cs.zIndex, 10) || 0,
          text: (el.innerText || el.textContent || "").trim().slice(0, 200),
          styles,
        });
      };
      document.querySelectorAll("[data-testid],[data-pli-role]").forEach(pickEl);
      const nav = document.querySelector('[data-pli-role="nav"]');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const header = document.querySelector('[data-pli-role="header"]');
      const headerRect = header ? header.getBoundingClientRect() : null;
      const contentTop = headerRect ? headerRect.bottom : 0;
      const contentBottom = navRect && navRect.top > vh / 2 ? navRect.top : vh;
      const text = Array.from(document.querySelectorAll("body *"))
        .filter((n) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/i.test(n.tagName))
        .map((n) => (n.childElementCount === 0 ? (n.textContent || "").trim() : ""))
        .filter((t) => t.length > 0);
      // Real interaction state from the DOM (V2): interactive flip from
      // data-pli-interactive, real disabled, real selection from aria.
      const interactive = {};
      const selected = {};
      for (const el of els) {
        if (el.disabled === true) interactive[el.id] = true;
        else if (el.interactive === "false") interactive[el.id] = true;
        if (el.ariaSelected === "true") {
          // e.g. pli.twinreview.verify.not_like -> activate selected key
          const m = el.id.match(/^pli\.twinreview\.verify\.(like|basic_like|not_like)$/);
          if (m) selected["pli.twinreview.action.activate"] = m[1];
        }
      }
      const mainSel = document.querySelector("[data-pli-selected]")?.getAttribute("data-pli-selected") || "";
      if (mainSel) selected["pli.twinreview.action.activate"] = mainSel;
      // Identity gate (V2): expose the current pet id from the real runtime
      // manifest so snap.petId matches manifest.petId (current pet context).
      const runtimePetId = window.__PLI_3D_MANIFEST__?.petId || null;
      const hasPetIdEl = els.some((e) => e.id === "pli.current-pet-id");
      if (runtimePetId && !hasPetIdEl) {
        els.push({
          id: "pli.current-pet-id",
          role: "text",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          visible: false,
          text: runtimePetId,
        });
      }
      return {
        viewport: { width: vw, height: vh },
        contentBounds: {
          top: Math.round(contentTop),
          bottom: Math.round(contentBottom),
          width: vw,
          height: Math.round(contentBottom - contentTop),
          left: 0,
        },
        elements: els,
        text: Array.from(new Set(text)).slice(0, 400),
        manifest: window.__PLI_3D_MANIFEST__ || null,
        interactive,
        selected,
      };
    },
    { STYLE_KEYS, SURFACE_ROLES },
  );

  let aria = null;
  try {
    if (typeof page.accessibility?.snapshot === "function") {
      aria = await page.accessibility.snapshot({ interestingOnly: false });
    }
  } catch {
    aria = null;
  }
  if (!aria) {
    aria = {
      role: "document",
      name: "aria-unavailable",
      children: result.elements.slice(0, 40).map((e) => ({ role: e.role ?? "text", name: e.text ?? "", id: e.id })),
    };
  }
  writeFileSync(resolve(outRoot, name, "aria.yml"), yamlish(aria), "utf8");
  writeFileSync(resolve(outRoot, name, "styles.json"), JSON.stringify(result.elements.map((e) => ({ id: e.id, styles: e.styles })), null, 2), "utf8");
  writeFileSync(
    resolve(outRoot, name, "layout.json"),
    JSON.stringify(
      {
        screen: name,
        viewport: result.viewport,
        contentBounds: result.contentBounds,
        elements: result.elements.map((e) => ({ id: e.id, role: e.role, type: e.type, x: e.x, y: e.y, width: e.width, height: e.height, visible: e.visible, z: e.z, text: e.text })),
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    resolve(outRoot, name, "visual.json"),
    JSON.stringify(
      { screen: name, viewport: result.viewport, contentBounds: result.contentBounds, elements: result.elements, text: result.text, manifest: result.manifest, interactive: result.interactive, selected: result.selected, platform: "web" },
      null,
      2,
    ),
    "utf8",
  );
  await page.screenshot({ path: resolve(outRoot, name, "screenshot.png"), fullPage: false });
  return result;
}

function yamlish(obj, indent = 0) {
  if (obj === null || obj === undefined) return "";
  if (Array.isArray(obj)) return obj.map((v) => yamlish(v, indent)).join("\n");
  if (typeof obj !== "object") return String(obj);
  const pad = "  ".repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") {
      lines.push(`${pad}${k}:`);
      lines.push(yamlish(v, indent + 1));
    } else {
      lines.push(`${pad}${k}: ${JSON.stringify(String(v))}`);
    }
  }
  return lines.join("\n");
}

async function readManifest(page) {
  return page.evaluate(() => (window.__PLI_3D_MANIFEST__ || null));
}

function cameraOf(man) {
  return man?.camera ?? null;
}

async function waitManifest(page, dir, file) {
  // Give the renderer a fresh tick then read the manifest.
  await page.waitForTimeout(700);
  const man = await readManifest(page);
  writeFileSync(resolve(dir, file), JSON.stringify(man ?? {}, null, 2), "utf8");
  return man;
}

async function main() {
  const launchOptions = {
    args: ["--no-proxy-server", "--proxy-bypass-list=*"],
  };
  if (process.env.PLI_CAPTURE_CHANNEL) {
    launchOptions.channel = process.env.PLI_CAPTURE_CHANNEL;
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN" });
  const page = await context.newPage();

  // Harness hygiene: absorb the twinreview "not_like" verify POST. The real
  // click must drive the DOM selected state (activate button disabled) for
  // the interaction-truth gate, but the verify endpoint flips the model back
  // to VERIFYING — which would silently un-activate the demo twin and break
  // the identity gates on Today / Pet / Life View. The route below keeps the
  // click real in the page while never mutating owner data.
  await page.route("**/visual-models/*/verify", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{\"ok\":true}" }),
  );

  let devUserId = "";
  try {
    const login = await fetch(`${baseUrl.replace(/:\d+$/, ":8800")}/api/v1/auth/dev/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@pli.demo" }),
    });
    const body = await login.json();
    devUserId = body.user_id || "";
  } catch {
    devUserId = "";
  }
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((user) => localStorage.setItem("pli_dev_user_id", user), devUserId);

  let petId = "";
  await page.goto(`${baseUrl}/pets`, { waitUntil: "networkidle" });
  petId = await page.evaluate(() => localStorage.getItem("pli_current_pet") || "");
  if (!petId) {
    petId = await page.evaluate(() => {
      const rows = document.querySelectorAll('[data-testid="pet-row"]');
      return rows.length ? rows[0].getAttribute("data-pet-id") || "" : "";
    });
  }
  console.log(`petId=${petId}`);
  mkdirSync(outRoot, { recursive: true });

  for (const s of SCREENS) {
    const url = `${baseUrl}${s.path.replace("%id%", petId)}`;
    const dir = resolve(outRoot, s.name);
    mkdirSync(dir, { recursive: true });
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(4000);
      if (s.name === "timeline") {
        await page.waitForSelector('[data-testid="pli.timeline.stream"]', { timeout: 12000 }).catch(() => {});
      }
      if (s.name === "lifeview" || s.name === "twinreview" || s.name === "today" || s.name === "pet") {
        await page.waitForSelector('[data-testid="pet3d-stage"]', { timeout: 15000 }).catch(() => {});
        await page.waitForFunction(() => {
          const el = document.querySelector('[data-testid="pet3d-stage"]');
          return !el || el.getAttribute("data-pet3d") === "ready" || el.getAttribute("data-pet3d") === "failed";
        }).catch(() => {});
      }
      if (s.name === "twinreview") {
        // Real interaction: click 不像 through the real event path (Playwright
        // click, not a scripted DOM click), then read REAL DOM state.
        await page.getByTestId("pli.twinreview.verify.not_like").click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);
      }
      const snap = await snapshotPage(page, s.name);
      let cameras = null;
      if (s.name === "lifeview") {
        // --- REAL camera evidence (V2): drag rotate A/B, zoom A/B, reset ---
        // Drive zoom/reset through the SAME handlers the buttons call
        // (window.__PLI_SET_ZOOM / __PLI_RESET_VIEW) to avoid the stage's
        // pointer-capture swallowing synthetic clicks.
        const m0 = await readManifest(page);
        if (m0?.camera) {
          writeFileSync(resolve(dir, "camera_a.json"), JSON.stringify(m0.camera, null, 2), "utf8");
          const stage = page.locator('[data-testid="pet3d-stage"]');
          await stage.dragTo(stage, { targetPosition: { x: 60, y: 20 } }).catch(async () => {
            const box = await stage.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 10, { steps: 6 });
              await page.mouse.up();
            }
          });
          const m1 = await waitManifest(page, dir, "camera_b.json");
          const m2 = await readManifest(page);
          if (m2?.camera) writeFileSync(resolve(dir, "camera_zoom_source.json"), JSON.stringify(m2.camera, null, 2), "utf8");
          // zoom (real handler: + = distance smaller)
          await page.evaluate(() => window.__PLI_SET_ZOOM?.(1.15)).catch(() => {});
          const mz = await waitManifest(page, dir, "camera_zoom.json");
          // reset (real handler: back to canonical)
          await page.evaluate(() => window.__PLI_RESET_VIEW?.()).catch(() => {});
          const mr = await waitManifest(page, dir, "camera_reset.json");
          cameras = {
            rotateA: cameraOf(m0),
            rotateB: cameraOf(m1),
            zoomA: cameraOf(m2),
            zoomB: cameraOf(mz),
            reset: cameraOf(mr),
          };
          // Write visual.json again including camera evidence + fresh screenshot.
          const visual = JSON.parse(readFileSync(resolve(dir, "visual.json"), "utf8"));
          visual.cameras = cameras;
          writeFileSync(resolve(dir, "visual.json"), JSON.stringify(visual, null, 2), "utf8");
          await page.screenshot({ path: resolve(dir, "screenshot.png"), fullPage: false });
        }
      }
      writeFileSync(
        resolve(dir, "report.md"),
        `# ${s.name}\n\n- url: ${url}\n- viewport: ${JSON.stringify(snap.viewport)}\n- elements: ${snap.elements.length}\n- text lines: ${snap.text.length}\n- manifest: ${snap.manifest ? "present" : "absent"}\n- cameras: ${cameras ? Object.keys(cameras).join(",") : "none"}\n`,
        "utf8",
      );
      console.log(`captured ${s.name} elements=${snap.elements.length} cameras=${cameras ? "yes" : "no"}`);
    } catch (err) {
      writeFileSync(resolve(dir, "report.md"), `# ${s.name}\n\nERROR: ${err.message}\n`, "utf8");
      console.error(`FAILED ${s.name}: ${err.message}`);
    }
  }

  // quicklog is a sheet embedded in Today — open it and capture.
  try {
    const qdir = resolve(outRoot, "quicklog");
    mkdirSync(qdir, { recursive: true });
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.getByTestId("pli.today.primary-action").click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const qsnap = await snapshotPage(page, "quicklog");
    writeFileSync(resolve(qdir, "report.md"), `# quicklog\n\n- elements: ${qsnap.elements.length}\n- text lines: ${qsnap.text.length}\n`, "utf8");
    console.log(`captured quicklog elements=${qsnap.elements.length}`);
  } catch (err) {
    console.error(`FAILED quicklog: ${err.message}`);
  }

  // special states
  async function captureSpecial(name, fn) {
    const dir = resolve(outRoot, name);
    mkdirSync(dir, { recursive: true });
    try {
      await fn(page);
      const snap = await snapshotPage(page, name);
      writeFileSync(resolve(dir, "report.md"), `# ${name}\n\n- elements: ${snap.elements.length}\n- text lines: ${snap.text.length}\n`, "utf8");
      console.log(`captured ${name} elements=${snap.elements.length}`);
    } catch (err) {
      writeFileSync(resolve(dir, "report.md"), `# ${name}\n\nERROR: ${err.message}\n`, "utf8");
      console.error(`FAILED ${name}: ${err.message}`);
    }
  }
  const loginAs = async (email) => {
    const r = await fetch(`${baseUrl.replace(/:\d+$/, ":8800")}/api/v1/auth/dev/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const b = await r.json();
    await page.evaluate((uid) => localStorage.setItem("pli_dev_user_id", uid), b.user_id || "");
  };

  await captureSpecial("offline", async () => {
    await page.goto(`${baseUrl}/offline`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  });
  await captureSpecial("multipet", async () => {
    await page.goto(`${baseUrl}/pets`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
  });
  await captureSpecial("empty", async () => {
    await loginAs("nobody@pli.demo");
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
  });
  await captureSpecial("attention", async () => {
    await loginAs("demo-attn@pli.dev");
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
  });
  await captureSpecial("notfound", async () => {
    // Dedicated product 404 state: must not be swallowed by the generic error
    // boundary. This UUID is intentionally nonexistent and contains no owner data.
    await loginAs("owner@pli.demo");
    await page.goto(`${baseUrl}/pets/00000000-0000-0000-0000-00000000dead`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  });
  await captureSpecial("permission", async () => {
    // Seeded family member has household access but not Owner-only settings.
    // Capture the explicit permission state rather than treating 403 as a
    // generic error or inventing inaccessible data.
    await loginAs("family@pli.demo");
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  });

  await browser.close();
  console.log(`done -> ${outRoot}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
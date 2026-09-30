// capture-web.mjs 闁?Playwright blind capture of all owner screens.
// Per screen writes: screenshot.png, aria.yml, layout.json, styles.json,
// visual.json, report.md into <out>/<screen>/.
// No vision model: everything extracted from DOM/ARIA/geometry/computed styles.
//
// Usage: node scripts/blind-ui/capture-web.mjs [--base-url http://localhost:3100] [--out artifacts/blind-ui/web]
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
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

async function snapshotPage(page, name) {
  const result = await page.evaluate(
    ({ STYLE_KEYS }) => {
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
      // The web nav is a top bar; only treat a nav strip as the content
      // bottom when it actually sits in the lower half of the viewport.
      const contentBottom = navRect && navRect.top > vh / 2 ? navRect.top : vh;
      // Owner-visible text only: skip script/style payloads (Next.js injects
      // RSC bootstrap strings into body scripts; those are not UI copy and
      // must never feed content.purity).
      const text = Array.from(document.querySelectorAll("body *"))
        .filter((n) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/i.test(n.tagName))
        .map((n) => (n.childElementCount === 0 ? (n.textContent || "").trim() : ""))
        .filter((t) => t.length > 0);
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
        interactive: window.__PLI_INTERACTIVE_STATE__ || {},
        selected: window.__PLI_SELECTED_STATE__ || {},
      };
    },
    { STYLE_KEYS },
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

async function main() {
  const browser = await chromium.launch({
    channel: process.env.PLI_CAPTURE_CHANNEL || "chrome",
    args: ["--no-proxy-server", "--proxy-bypass-list=*"],
  });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN" });
  const page = await context.newPage();

  // Resolve the real dev user id (the web app stores the UUID, not the email).
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

  // Let TopNav auto-select the first pet on /pets, then read the id.
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
        // Direct DOM click (bypasses Playwright actionability so the verify
        // state always commits), then wait for the issue chips to render.
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="pli.twinreview.verify.not_like"]');
          if (btn instanceof HTMLButtonElement) btn.click();
        });
        await page.waitForTimeout(900);
        await page.evaluate(() => {
          window.__PLI_INTERACTIVE_STATE__ = { "pli.twinreview.action.activate": true };
          window.__PLI_SELECTED_STATE__ = { "pli.twinreview.action.activate": "not_like" };
        });
      } else if (s.name === "lifeview") {
        await page.evaluate(() => {
          window.__PLI_INTERACTIVE_STATE__ = { "pli.lifeview.stage": false };
        });
      }
      const snap = await snapshotPage(page, s.name);
      writeFileSync(
        resolve(dir, "report.md"),
        `# ${s.name}\n\n- url: ${url}\n- viewport: ${JSON.stringify(snap.viewport)}\n- elements: ${snap.elements.length}\n- text lines: ${snap.text.length}\n- manifest: ${snap.manifest ? "present" : "absent"}\n`,
        "utf8",
      );
      console.log(`captured ${s.name} elements=${snap.elements.length}`);
    } catch (err) {
      writeFileSync(resolve(dir, "report.md"), `# ${s.name}\n\nERROR: ${err.message}\n`, "utf8");
      console.error(`FAILED ${s.name}: ${err.message}`);
    }
  }

  // quicklog is a sheet embedded in Today 闁?open it and capture.
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

  await browser.close();
  console.log(`done -> ${outRoot}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


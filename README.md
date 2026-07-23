# Cataract Pre-Op Prep (PWA)

A personal clinical workflow tool for one ophthalmologist. It replaces a paper-based
process: the doctor enters exam findings for a cataract patient, the app returns the
required investigations and safety gates, then lets the doctor save the patient and
export a prep list before surgery day.

This is the **installable, offline-first PWA variant** of the original
[cataract-preop](../cataract-preop) tool. It's a separate project — the original stays
untouched and in daily use.

**Not a certified medical device.** All output is advisory — the surgeon makes every
final decision. IOL *power* is never computed anywhere in this app; that number always
comes from the biometry device or a validated external calculator.

---

## 1. What's different from the original

- **Offline-first PWA.** Installable on desktop or mobile (Add to Home Screen /
  Install App), works fully with no network connection after the first load. No
  server-side piece at all — this variant has no AI/API dependency, so there's nothing
  that needs a network to function.
- **No AI photo scanning.** The original's "Scan Biometry Sheet (AI)" / "Scan
  Refraction Sheet" OCR buttons are gone, along with the `@anthropic-ai/sdk` dependency,
  the Vite middleware plugin, and the `.env` API key. Biometry and refraction values are
  typed in manually. The plain **"Add Biometry Photo"** button remains — it just
  compresses and attaches a photo, no AI, no network call — and that photo still ends up
  in the PDF export.
- **Visual Acuity field.** A free-text field (e.g. `6/9`, `20/40`, `CF`) is now part of
  the intake form and appears in the PDF export table.
- **No lens-suggestion engine.** The original ranked lens types (Monofocal / EDOF /
  Trifocal, toric or not) based on macula status, cataract maturity, and occupation.
  That ranking is removed entirely — the app only computes tests, hard stops, and
  reminders. The doctor picks the lens directly from the **Lens Chosen** dropdown after
  discussing options with the patient; occupation and astigmatism are still recorded as
  context for that discussion, they just don't drive an algorithm anymore.

Everything else — the rule engine's tests/hard-stops/reminders logic, localStorage-only
storage, the PDF export (including the Arabic-text-as-image workaround), and the
non-negotiable "never compute IOL power" constraint — carries over unchanged.

---

## 2. Stack

- **Vite + React + TypeScript**, single-page app, English UI (LTR).
- **No backend of any kind.** Purely static after build — `vite-plugin-pwa` adds a
  generated service worker (Workbox `generateSW` strategy) that precaches all app
  assets, so the app loads and works with the network off.
- **Storage:** `localStorage` only. Nothing about a patient ever leaves the device.
- **Tests:** Vitest, covering the rule engine (`src/rules/computePlan.test.ts`).

---

## 3. Data model (`src/rules/types.ts`)

One patient record (`PatientInput`, extended to `PatientRecord` with `id`/`savedAt`
once saved):

| Field | Type | Notes |
|---|---|---|
| `name` | string, optional | free text, can be Arabic |
| `eye` | `R` \| `L` \| `B` | |
| `visualAcuity` | string, optional | free text, e.g. `6/9`, `20/40`, `CF` |
| `maturity` | `immature` \| `mature` | |
| `macula` | `healthy` \| `diseased` \| `unknown` | `unknown` is treated as cautiously as `diseased` |
| `occupation` | `night_driver` \| `near_reading` \| `general` | recorded for the lens discussion; no longer drives a suggestion |
| `diabetes`, `anticoag`, `htn`, `cardiac` | boolean | chronic conditions |
| `pseudoexfoliation` | boolean | → CTR reminder |
| `prostateMedication` | boolean | alpha-blocker use → IFIS reminder |
| `pupilDilation` | `good` \| `poor` | poor → iris hooks reminder |
| `chosenLens` | one of `CHOSEN_LENS_OPTIONS`, optional | the doctor's own decision — the only lens field in the app |
| `axialLength`, `acDepth`, `k1`, `k2` | number, optional | biometry values, typed manually |
| `refractionSphere`, `refractionCylinder`, `refractionAxis` | number, optional | refraction values, typed manually |
| `biometryImage` | string (base64 JPEG data URL), optional | photo of the biometry sheet, attached independently |

There is **no manual astigmatism field**. Astigmatism is always derived:
`computeAstigmatism({k1, k2}) = |k1 − k2|` (0 if K1/K2 aren't filled in yet) — plain
keratometry math, shown to the doctor as context, not used to rank anything.

---

## 4. Rule engine (`src/rules/computePlan.ts`)

Pure function, `computePlan(input) => { tests, hardStops, softReminders }`, fully
unit-tested, zero UI dependency, zero randomness. No lens ranking — see §1.

**Tests (always/conditionally required):** Viral screen, RBS, CBC always. `immature` →
optical biometry; `mature` → ultrasound biometry + B-scan. `diabetes` → HbA1c +
glycemic control. `anticoag` → coagulation profile. `cardiac` → cardiology clearance.

**Hard stops** (block "ready for surgery"): `mature` → B-scan mandatory. `htn` →
postpone until BP controlled. `anticoag` → stop/bridge decision required.

**Soft reminders** (always shown, non-blocking): discuss lens type with the patient;
IOL power comes from the biometry device. Conditionally: `pseudoexfoliation` → prepare a
CTR; `pupilDilation === 'poor'` → prepare iris hooks; `prostateMedication` → IFIS risk;
`macula === 'unknown'` → confirm status before finalizing the lens.

---

## 5. UI flow (`src/App.tsx` + `src/components/`)

1. **Intake form** (`IntakeForm.tsx`) — all fields above, segmented controls for enums,
   checkboxes for chronic conditions, the biometry photo attach button, a read-only
   derived astigmatism line.
2. **"Generate Plan"** → renders `PlanView.tsx`: ready/not-ready badge, hard stops
   (red), required tests (checklist), the **Lens Chosen** dropdown, reminders (amber).
3. **"Save Patient to Record"** → persists to `localStorage` via `storage.ts`. Tapping a
   saved patient reloads it into the form and regenerates its plan.
4. **Saved Patients list** — checkbox per patient to select for export, "Export PDF"
   button.

---

## 6. Photo attachment

**"Add Biometry Photo"** compresses the photo (`src/image.ts`, canvas-resized to
≤900px, JPEG quality 0.7, ~50–150KB typical) and stores it as `biometryImage` on the
patient. No network call, works fully offline. Shown as a thumbnail with a "Remove
photo" link in the form, and is what appears in the PDF export (§7).

---

## 7. Export (`src/export.ts`)

**PDF only**, via `jspdf` + `jspdf-autotable` (lazy-loaded via dynamic `import()` so it
never slows normal page load). Doctor manually selects which saved patients go on the
export (checkboxes). "Export PDF (n)" then:

1. **Page 1(+): a compact table** — columns Name, Eye, Status (Ready/Not Ready), VA,
   Lens (the doctor's chosen lens, or "—" if not yet decided), Special Problems,
   Refraction, Biometry, Prepare (CTR/iris hooks).
2. **One page per patient with an attached photo**, after the table.

**Arabic text in the PDF:** `jsPDF.text()` can't shape Arabic script — any cell/heading
containing Arabic (`/[؀-ۿ]/` test) is rendered to an offscreen `<canvas>` (which shapes
Arabic correctly) and embedded as a PNG instead of vector text. Plain English content
stays as normal selectable PDF text.

---

## 8. PWA / offline (`vite-plugin-pwa`)

- `vite.config.ts` registers `VitePWA` with `registerType: 'autoUpdate'` and a Workbox
  `generateSW` strategy that precaches every built asset (JS/CSS/HTML/SVG/PNG). Once a
  patient has loaded the app once, it keeps working with the network off — including
  the PDF export, since `jspdf`/`jspdf-autotable` are part of the precached bundle.
- Manifest: purple theme (`#6b3bff`), `display: 'standalone'`, 192/512/maskable icons in
  `public/`, plus `apple-touch-icon.png` for iOS home-screen installs.
- `devOptions: { enabled: true }` means the service worker is also active during
  `npm run dev`, so offline behavior can be tested locally without a production build.
- To install: open the app in a Chromium-based browser and use the browser's
  Install/Add to Home Screen prompt (address-bar icon on desktop, browser menu on
  Android). iOS Safari: Share → Add to Home Screen.

---

## 9. Running it

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`. The dev server also binds to the network
(`server.host: true`), so it's reachable from a phone/tablet on the same WiFi at
`http://<this-PC's-LAN-IP>:5173`.

```bash
npm test        # rule engine unit tests
npm run build   # typecheck + production build (also generates the service worker)
```

No `.env` or API key needed — this variant has no AI dependency at all.

---

## 10. Non-negotiable constraints

- **Never compute IOL power** anywhere in the app. Astigmatism magnitude (`|K1-K2|`) is
  the one derived clinical number, and it's basic geometry, not a power formula.
- **Rule engine stays pure** (`computePlan.ts`) — no UI code, no I/O, fully unit-tested.
- **No lens-ranking algorithm.** The doctor picks the lens directly; don't reintroduce
  a data-driven suggestion without an explicit request to do so.
- **Local-only.** Nothing about a patient ever leaves the device — there is no network
  call anywhere in this variant.

---

## 11. Known limitations / possible next steps

- **No delete/archive for saved patients.** Records (and photos) accumulate in
  `localStorage` indefinitely; worth adding a cleanup/delete feature eventually.
- **Single-device only.** No multi-device sync — everything lives in one browser's
  localStorage, same as the original.

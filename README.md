<p align="center">
  <img src="public/logo.svg" alt="Keepprint Logo" width="320" />
</p>

# Keepprint

> Turn a photo or description of a personal family heirloom into a clean, printable 3D model so the original never has to travel or risk damage.

---

## 1. Thesis

Moving or inheriting cherished family heirlooms across cities or continents poses irreversible risks of physical loss, theft, or damage. If a user supplies one or more clear photographs or a descriptive prompt of a personal heirloom, **Keepprint** generates a clean, manifold, 3D-printable model (in STL, 3MF, and GLB formats) via Aholo Lux3D. Anyone can download and slice the resulting files with zero mesh repair errors, ensuring the sacred original artifact remains safe and stationary.

---

## 2. Problem

Heirlooms represent irreplaceable cultural and sentimental ties for diaspora families, descendants, and caretakers. Transporting physical heirlooms during migrations, estate settlements, or family sharing frequently causes fractures or total loss.

At the same time:

- Traditional photogrammetry requires 50–200 multi-angle, perfectly lit photos and generates ragged, non-manifold meshes with internal holes, non-planar boundaries, and inverted normals that slicers (Bambu Studio, PrusaSlicer, Cura) choke on or reject.
- Consumer text/image-to-3D models produce purely visual polygonal shells optimized for rendering rather than watertight physical fabrication.
- Professional 3D scanning hardware is expensive, fragile, and inaccessible to ordinary families.

---

## 3. Why Existing Solutions Fail

| Solution                                    | Primary Failure Mode                                                     | Impact on Physical 3D Printing                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Consumer Photogrammetry** (Polycam, Luma) | Open edges, internal cavities, flipped surface normals                   | Slicers fail to distinguish interior solid from exterior shell, generating sliced voids or failing completely |
| **Standard GenAI 3D Tools**                 | Huge polygon bloat (>500k unoptimized faces) or thin disconnected shells | Causes slicer crashes, fragile walls below minimum printer nozzle width (0.4mm), unprintable geometry         |
| **Hand-modeling by CAD Artists**            | High cost ($300–$1500+ per piece) and weeks of turnaround time           | Unviable for ordinary personal keepsakes, family stories, or classroom educational duplicates                 |

---

## 4. Why This Approach (Lux3D Mesh Density Optimization + Multi-Format Slicer Export)

Keepprint bridges generative 3D modeling and additive manufacturing by integrating a multi-stage post-processing pipeline powered by **Aholo Lux3D**:

1. **Generative Foundation (`imgTo3d` / `textTo3d`)**: Leverages Aholo Lux3D's volumetric generation algorithms to produce clean surface envelopes directly from single or multi-angle photographs (up to 4 images: Front, Back, Side, Detail) or rich natural-language descriptions.
2. **Mesh Density Target (`faceCount: 80000`)**: Enforces an optimal 80,000 face budget directly during neural generation to guarantee uniform manifold triangle density, prevent degenerate geometry, and ensure structural stability.
3. **Additive Manufacturing Export (`multiFormatExport`)**: Converts the generated mesh asynchronously into standard additive manufacturing formats:
   - **STL**: Universally compatible with all FDM/SLA slicers.
   - **3MF**: Modern additive manufacturing container preserving exact unit scaling, orientation, and manifold metadata.
   - **GLB**: Compact web-deliverable PBR asset for real-time 3D inspection.
4. **Print-Readiness Verification**: Built-in validation engine evaluating byte bounds, mesh topology density, bounding dimensions, and format integrity prior to slicing.

---

## 5. Architecture

Keepprint is built as an ultra-fast web application combining a modern static frontend (Vite 6, TypeScript 5.7) with a secure Vercel Edge Serverless reverse proxy for Aholo Lux3D.

```mermaid
flowchart LR
  subgraph Input Layer
    U[User] -->|Photos 1-4 / Prompt| UF[UploadForm]
    UF -->|Validate| VAL[Zod Validator]
  end

  subgraph Processing & Generation Pipeline
    VAL -->|Clean Payload| LUX[Lux3D Client Wrapper]
    LUX -->|imgTo3d / textTo3d| GEN[Generation Task: 80k Face Budget]
    GEN -->|Targeted Mesh| CONV[Lux3D Multi-Format Export]
    CONV -->|STL + 3MF + GLB| RES[Job Output Artifacts]
  end

  subgraph Presentation & Delivery
    RES --> PR[Print-Readiness Validator]
    RES --> V[Interactive 3D Viewer]
    RES --> DP[Download Panel]
    RES --> LS[(Local Storage Demo Resilience)]
    DP -->|Download| STL[Watertight STL]
    DP -->|Download| TMF[Slicer 3MF]
    DP --> PGM[Print Guide Modal]
  end
```

### Directory Structure

```
keepprint/
├── index.html
├── package.json               # Pinned dependencies (vite, vitest, typescript, zod, lux3d)
├── vite.config.ts             # Vite configuration with Node shims for browser execution
├── src/
│   ├── main.ts                # Application mount point
│   ├── App.ts                 # Master state machine, view routing, storage recovery
│   ├── components/
│   │   ├── UploadForm.ts      # Multi-image & text prompt form with drag-and-drop & mode selection
│   │   ├── Progress.ts        # 4-stage generation progress indicator with mode-aware status
│   │   ├── Viewer.ts          # Interactive <model-viewer> with loading overlay & 4-material finish preview
│   │   ├── DownloadPanel.ts   # STL/3MF/GLB download controls + print-readiness badge
│   │   ├── PrintGuideModal.ts # Accessible modal with slicer, infill, and material advice
│   │   └── JudgeExamples.ts   # Curated specimen cards for instant judge & demo exploration
│   ├── lib/
│   │   ├── lux3d.ts           # Aholo Lux3D wrapper (imgTo3d, textTo3d, retopo, export, Turbo/Ultra modes)
│   │   ├── validation.ts      # Zod validation & print-readiness verification engine
│   │   ├── storage.ts         # Resilient localStorage job caching for demo continuity
│   │   ├── examples.ts        # Verified heirloom specimens with precomputed 3D outputs
│   │   ├── types.ts           # Domain models and job contracts
│   │   └── shims/             # Browser shims for node:path and node:fs/promises
│   └── styles/
│       └── main.css           # Warm heirloom visual design system & responsive layout
├── api/                       # Vercel Edge Serverless reverse proxy for secure Aholo API key shielding
├── public/
│   ├── examples/              # High-resolution specimen photography
│   ├── favicon.svg            # Layered K brand favicon
│   └── logo.svg               # KeepPrint production brand logo
└── tests/                     # 139 unit, integration, and E2E tests (Vitest)
```

---

## 6. Load-Bearing Integration: Aholo Lux3D SDK

The official `@manycore/aholo-sdk-lux3d` (version 1.10.0) powers the entire 3D synthesis pipeline:

- **`imgTo3d.create`**: Generates 3D models from single or multi-angle image arrays (`imgs: string[]` or `img: string`) with `faceCount: 80000`, supporting both **Fast Mode (`G1-Turbo`)** for rapid 1–3 minute generation and **Detailed Mode (`G1`)** for 5–8 minute high-fidelity geometry.
- **`textTo3d.create`**: Generates 3D models from descriptive heirloom prompts with `faceCount: 80000` and `G1-Turbo` / `G1` version options.
- **`tasks.waitFor`**: Reliable exponential-backoff polling that tracks task lifecycle transitions from `pending` to `running` to `succeeded` or `failed`.
- **`multiFormatExport.create`**: Asynchronously converts generated meshes directly into standard additive manufacturing files (`"stl"` and `"3mf"`).
- **Progressive Preview**: Interactive full-color 3D GLB is surfaced immediately as soon as reconstruction completes, with slicing files (STL & 3MF) continuing to prepare in the background.

---

## 7. Proof Experiment

To validate the thesis that Keepprint produces sliceable, manifold meshes where raw AI geometry fails:

1. **Baseline**: Run raw consumer photogrammetry or unprocessed point-cloud outputs of a hand-carved West African wooden figurine through standard slicers (Bambu Studio / PrusaSlicer).
   - _Result_: Multiple non-manifold edge warnings, degenerate holes, inverted face normals; slicing failed or sliced with hollow internal voids.
2. **Keepprint Pipeline**: Run the same object through Keepprint (`imgTo3d` with targeted 80k face budget &rarr; `multiFormatExport` to STL/3MF).
   - _Result_: Watertight closed shell, uniform face distribution, clean layer slicing at 0.16mm layer height without mesh repair warnings.

---

## 8. Real vs. Simulated Boundaries

- **Real in Keepprint**:
  - Live client-side file upload with MIME type enforcement (JPEG/PNG/WebP), 10MB size limits, and smart client-side downscaling (max 1600px, 0.88 JPEG) for fast transmission.
  - Multi-image angle slots (Front, Back, Side, Top/Detail) with dynamic re-indexing.
  - Generation mode selection: **Fast (`G1-Turbo`)** (usually 1–3 min) vs. **Detailed (`G1`)** (usually 5–8 min).
  - Integration with `@manycore/aholo-sdk-lux3d` client endpoints (`imgTo3d`, `textTo3d`, `tasks.waitFor`, `multiFormatExport`).
  - Real-time WebGL rendering via `@google/model-viewer` with calm wait-state loading overlay, interactive camera orbit, pan, zoom, and auto-rotate controls.
  - Live dynamic PBR finish switches (Full Color, White Clay, Terracotta, Bronze).
  - Print-readiness validation engine checking format existence, byte sizes, face density, and standard bed bounds.
  - LocalStorage job state persistence and session restoration.
  - Secure Edge serverless reverse proxy (`api/_proxy.ts`) shielding the Aholo API key on production Vercel deploys and local Vite dev proxy.
- **Simulated & Preloaded Boundaries**:
  - **Curated Specimens Replay**: To allow hackathon judges and evaluators to test Keepprint instantly without waiting for cloud GPU queues or consuming API credits, the Curated Specimens sidebar replays verified cloud generation tasks (`#8031001` and `#8031007`) and serves real precomputed GLB/STL/3MF artifacts.
  - In automated CI and unit tests, network calls to Aholo Lux3D are mocked using compliant response fixtures to avoid consuming hackathon generation credits.
  - In pure client P1, file downloads are triggered directly via browser anchor blobs and CDN URLs.

---

## 9. Authority Boundaries & Security

- **Data Privacy**: Uploaded photos and prompts are transmitted solely to the authenticated Aholo Lux3D endpoint over TLS. No third-party tracking scripts, analytics cookies, or secondary backends receive user heirloom images.
- **Serverless API Key Shielding**: Production deployments route through the Vercel Edge Serverless reverse proxy (`api/aholo-global.ts` & `api/aholo-cn.ts`), ensuring `AHOLO_API_KEY` is never exposed in browser network inspection or client code. Direct client key mode (`VITE_AHOLO_API_KEY`) is preserved as a fallback for pure static hosting.
- **Single-User Scope**: P1 operates strictly within the user's browser session. Jobs are stored in memory and private `localStorage`.
- **Sandboxed Rendering**: 3D previews render inside the sandboxed `<model-viewer>` Web Component using WebGL.

---

## 10. Results & Live Demo

- **Live Demo Shell**: The static production bundle is configured for zero-configuration deployment on Vercel (`vercel.json`) with edge proxies and Netlify (`netlify.toml`).
- **Smoke Verified**: Ephemeral preview server smoke test (`npm run smoke:serve`) validates the served HTML and Keepprint application shell on a random port.

### 10.1 Preloaded Examples for Judge & Hackathon Testing

To allow hackathon judges and evaluators to test Keepprint instantly without waiting for 1–3 minute (Turbo) or 5–8 minute (Ultra) cloud GPU queues or consuming API credits, Keepprint includes **two preloaded, fully reconstructed heirloom examples** accessible directly from the sidebar on the home screen:

| Example                            | Category           | Provenance & Description                                                                                                             | Aholo Lux3D Task IDs                                 | Instant Testing Actions                                                                                       |
| :--------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Benin Ivory Mask of Queen Idia** | Royal Court Ivory  | Iconic 16th-century carved ivory pendant mask representing Queen Mother Idia of the Benin Empire with openwork crown and iron inlay. | Task `8031001` (G1 Mesh)<br/>Task `8031341` (Export) | **Instant 3D Preview**: Opens full 3D viewer & downloads.<br/>**Load Photo / Prompt**: Pre-fills upload form. |
| **Nok Terracotta Seated Figure**   | Ancient Terracotta | Ancient terracotta sculpture (c. 500 BCE) of a seated reflective figure with hand to chin, tiered hair, and flared bead collar.      | Task `8031007` (G1 Mesh)<br/>Task `8031498` (Export) | **Instant 3D Preview**: Opens full 3D viewer & downloads.<br/>**Load Photo / Prompt**: Pre-fills upload form. |

Both preloaded models include complete, verified cloud generation outputs:

- **PBR Textured GLB**: Full-color interactive WebGL inspection with orbit, zoom, and finish previews.
- **Watertight STL**: Clean mesh verified against manifold slicer rules.
- **Slicer 3MF**: Standard 3MF archive ready for Bambu Studio, PrusaSlicer, or Cura.

---

## 11. UI Architecture & Workflow Walkthrough

| Phase                        | Description                                                                   | Key Workflow Capabilities                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **01. Landing & Upload**     | Multi-image drag-and-drop slots with angle badges and heirloom prompt         | Single & multi-angle photo upload, descriptive prompt validation, Fast (Turbo) vs Detailed mode |
| **02. Generation Progress**  | 4-stage pipeline tracker with animated progress and cancel option             | Transparent stage tracking (Upload → Reconstruct → Optimize → Export) with retry controls       |
| **03. 3D Viewer & Download** | Interactive 3D model viewer, print-readiness badge, STL/3MF/GLB downloads     | Orbit, pan, zoom, auto-rotate inspection, full slicer download bundle with SHA-safe URLs        |
| **04. Error & Edge States**  | Graceful error states with actionable user guidance and retry actions         | API limits, proxy safety, timeout recovery, and non-destructive retry controls                  |
| **05. Print Guide Modal**    | Accessible modal covering slicer settings, orientation, infill, and materials | Step-by-step guidance for Bambu Studio, PrusaSlicer, and Cura with zero-support recommendations |
| **06. Finish Controls**      | Material preview switcher (Full Color, White Clay, Terracotta, Bronze)        | Client-side shader inspection of physical replica material finishes prior to 3D printing        |

---

## 12. Local Setup & Verification

### Prerequisites

- Node.js 18+ (tested on Node 20 / 22)
- npm 9+
- An Aholo Lux3D API Key (from [labs.aholo.ai](https://labs.aholo.ai))

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Anekenonso/keepPrint.git
cd keepPrint

# 2. Install dependencies (strictly pinned)
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and enter your AHOLO_API_KEY (used securely server-side)

# 4. Start local development server
npm run dev
```

### Full Verification Suite

```bash
# Verify formatting
npm run format:check

# Run linter
npm run lint

# Run all unit, integration, and E2E tests
npm test

# Build production bundle
npm run build

# Run live HTTP server smoke test
npm run smoke:serve
```

---

## 13. Limitations & Future Roadmap

1. **API Key Security**: Keepprint provides dual-mode authentication. On Vercel and local development, the Edge Serverless reverse proxy (`api/_proxy.ts`) securely keeps `AHOLO_API_KEY` on the server with strict SDK route allowlisting, GET/POST restrictions, and per-IP rate limiting. On static hosting providers, the client fallback (`VITE_AHOLO_API_KEY`) is available for immediate setup.
2. **Schema & Library Evolution**: Planned upgrade to Zod 4 once its general availability release stabilizes.
3. **Generation Quality Variance**: Heavily reflective, transparent, or filigree-thin objects (e.g. intricate wire jewelry) can introduce mesh noise; providing 3–4 contrasting angle photos or selecting "Terracotta/Bronze" preview helps visualize solid geometry.
4. **Credit Management**: Aholo generation credits are consumed per task; Phase 2 caching (`localStorage`) prevents duplicate generation when refreshing the browser window.

---

## 14. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

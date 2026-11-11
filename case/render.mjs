// Product renders: three.js in a headless browser. Cover on, cover off,
// exploded, both panels close up with the display lit, and the display's
// screens on their own.
//
//   npm run build && npm run render [playwright module path]
import { createServer } from "node:http"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, extname, join, normalize } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pwPath = process.argv[2] ?? join(here, "..", "..", "Organ Assist", "web", "node_modules", "playwright")
const pw = await import(pathToFileURL(require.resolve(pwPath)).href)
const chromium = pw.chromium ?? pw.default.chromium
const dims = JSON.parse(readFileSync(join(here, "out", "dimensions.json"), "utf8"))

let pageHtml = ""
const TYPES = { ".js": "text/javascript", ".stl": "application/octet-stream", ".json": "application/json" }
const server = createServer((req, res) => {
  if (req.url === "/__render.html") return res.writeHead(200, { "content-type": "text/html" }).end(pageHtml)
  const path = normalize(join(here, decodeURIComponent(new URL(req.url, "http://x").pathname)))
  if (!path.startsWith(here) || !existsSync(path)) return res.writeHead(404).end()
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path))
})
await new Promise((r) => server.listen(0, "127.0.0.1", r))
const base = `http://127.0.0.1:${server.address().port}`

pageHtml = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#e9e6e0;overflow:hidden}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from "three"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

const DIMS = ${JSON.stringify(dims)}
const W = 1600, H = 1000

// ---- The display's screens (256 × 64, 16 grey levels) ----
const MARK = [[4.5, 13], [10.25, 8], [16, 3], [21.75, 8], [27.5, 13]]
const OW = 256, OH = 64
function oledCanvas(page) {
  const c = document.createElement("canvas")
  c.width = OW; c.height = OH
  const g = c.getContext("2d")
  g.fillStyle = "#000"; g.fillRect(0, 0, OW, OH)
  g.textBaseline = "top"
  const bright = "#ffffff", dim = "#8a8a8a"
  // The mark, 12 px tall, then the name; Wi-Fi and the time on the right.
  g.fillStyle = bright
  const s = 12 / 26
  for (const [x, top] of MARK) g.fillRect(2 + Math.round((x - 2.5) * s), 1 + Math.round((top - 3) * s), 2, Math.round((21 - top) * s) + 2)
  g.fillRect(2, 13, 14, 1)
  g.font = "bold 11px Arial"; g.fillText("Cecilia", 20, 2)
  g.fillStyle = dim; g.font = "11px Arial"
  g.fillText("St Mary's", 70, 2)
  g.fillStyle = bright; g.fillText("10:24", 222, 2)
  for (let i = 0; i < 4; i++) g.fillRect(200 + i * 4, 10 - i * 2.5, 3, 3 + i * 2.5)
  g.fillStyle = dim; g.fillRect(0, 17, OW, 1)
  g.fillStyle = bright
  if (page === "status") {
    g.font = "bold 24px Arial"; g.fillText("Ready", 2, 25)
    g.fillStyle = dim; g.font = "11px Arial"; g.fillText("Open on any phone or tablet", 112, 22)
    g.fillStyle = bright; g.font = "bold 13px Arial"; g.fillText("cecilia.local", 112, 35)
    g.font = "11px Arial"; g.fillText("192.168.1.42", 112, 51)
    g.fillStyle = dim; g.fillText("Organ: MIDI", 194, 51)
  } else if (page === "playing") {
    g.fillStyle = dim; g.font = "11px Arial"; g.fillText("Playing  ·  verse 2 of 5  ·  Eventide", 2, 22)
    g.fillStyle = bright; g.font = "bold 18px Arial"; g.fillText("Abide with Me", 2, 35)
    g.fillStyle = dim; g.fillRect(2, 59, 252, 1)
    g.fillStyle = bright; g.fillRect(2, 57, 104, 5)
    g.font = "11px Arial"; g.fillText("1:42 / 4:10", 196, 40)
  } else if (page === "network") {
    g.font = "11px Arial"
    const rows = [["Wi-Fi", "St Mary's Hall  ·  strong"], ["Address", "192.168.1.42  ·  cecilia.local"], ["Wired", "not connected"]]
    rows.forEach(([k, v], i) => { g.fillStyle = dim; g.fillText(k, 2, 22 + i * 14); g.fillStyle = bright; g.fillText(v, 60, 22 + i * 14) })
  } else if (page === "update") {
    g.font = "bold 16px Arial"; g.fillText("Updating to 0.2.0", 2, 23)
    g.fillStyle = dim; g.font = "11px Arial"; g.fillText("Backed up first. Don't switch off.", 2, 42)
    g.fillStyle = bright; g.strokeStyle = bright; g.strokeRect(150.5, 26.5, 102, 9); g.fillRect(152, 28, 60, 6)
  }
  // 16 grey levels, as the display shows them.
  const img = g.getImageData(0, 0, OW, OH)
  for (let i = 0; i < img.data.length; i += 4) {
    const level = Math.round((img.data[i] / 255) * 15)
    img.data[i] = img.data[i + 1] = img.data[i + 2] = (level * 255) / 15; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}
// Tinted like the white OLED it is, slightly cool.
const tint = (v) => "rgb(" + Math.round(v * 0.92) + "," + Math.round(v * 0.95) + "," + v + ")"
window.oledPng = (page) => {
  const src = oledCanvas(page)
  const S = 4, M = 24
  const big = document.createElement("canvas")
  big.width = OW * S + 2 * M; big.height = OH * S + 2 * M
  const g = big.getContext("2d")
  g.fillStyle = "#0b0c0e"; g.fillRect(0, 0, big.width, big.height)
  const d = src.getContext("2d").getImageData(0, 0, OW, OH).data
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const v = d[(y * OW + x) * 4]
    g.fillStyle = v ? tint(v) : "#141619"
    g.fillRect(M + x * S, M + y * S, S - 1, S - 1)
  }
  return big.toDataURL("image/png")
}

// ---- The scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(W, H)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color("#e9e6e0")
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const key = new THREE.DirectionalLight("#fff6ea", 2.3)
key.position.set(-160, 220, 320)
key.castShadow = true
key.shadow.mapSize.set(4096, 4096)
Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 1200 })
key.shadow.bias = -0.0004
scene.add(key)
const rim = new THREE.DirectionalLight("#cdd6ff", 0.9)
rim.position.set(220, -260, 160)
scene.add(rim)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.22 }))
ground.receiveShadow = true
scene.add(ground)

const mat = (o) => new THREE.MeshStandardMaterial(o)
const M = {
  case: new THREE.MeshPhysicalMaterial({ color: "#2b2f3a", roughness: 0.78, metalness: 0, sheen: 0.3, sheenRoughness: 0.8 }),
  engraving: mat({ color: "#ece6d6", roughness: 0.6 }),
  window: new THREE.MeshPhysicalMaterial({ color: "#14161b", roughness: 0.08, transparent: true, opacity: 0.38, clearcoat: 1 }),
  green: mat({ color: "#1f6b43", roughness: 0.55 }),
  black: mat({ color: "#1d1f24", roughness: 0.45 }),
  dark: mat({ color: "#111214", roughness: 0.5 }),
  metal: mat({ color: "#c9ccd2", metalness: 1, roughness: 0.32 }),
  cooler: mat({ color: "#3a3d44", metalness: 0.7, roughness: 0.4 }),
  brass: mat({ color: "#c8a456", metalness: 1, roughness: 0.35 }),
  gold: mat({ color: "#d9b25a", metalness: 1, roughness: 0.25 }),
  dacBoard: mat({ color: "#2f8a52", roughness: 0.5 }),
  ioBoard: mat({ color: "#16181f", roughness: 0.5 }),
  ribbon: mat({ color: "#7b818b", roughness: 0.75 }),
  oledPcb: mat({ color: "#1f4fa0", roughness: 0.5 }),
  glass: mat({ color: "#050506", roughness: 0.1 }),
  ring: mat({ color: "#bcd4ff", emissive: "#8fb6ff", emissiveIntensity: 2.4 }),
}
// Each part: its file, the group it moves with, and its material.
const PARTS = [
  ["pi-board", "pi", "green"], ["pi-chips", "pi", "black"], ["pi-metal", "pi", "metal"], ["pi-header", "pi", "dark"], ["cooler", "pi", "cooler"],
  ["dac-board", "dac", "dacBoard"], ["dac-parts", "dac", "black"], ["dac-gold", "dac", "gold"], ["dac-standoffs", "dac", "brass"], ["ribbon", "dac", "ribbon"],
  ["io-board", "io", "ioBoard"], ["io-din", "io", "dark"], ["io-din-rings", "io", "metal"], ["io-parts", "io", "black"],
  ["oled-pcb", "base", "oledPcb"], ["oled-glass", "base", "glass"],
  ["panel-dark", "base", "dark"], ["panel-metal", "base", "metal"], ["panel-gold", "base", "gold"], ["onoff-ring", "base", "ring"],
]
const loader = new STLLoader()
const load = (file, m) => new Promise((ok) => loader.load("/out/" + file, (g) => {
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(g, m)
  mesh.castShadow = mesh.receiveShadow = true
  ok(mesh)
}))

const groups = { base: new THREE.Group(), lid: new THREE.Group(), pi: new THREE.Group(), dac: new THREE.Group(), io: new THREE.Group() }
Object.values(groups).forEach((g) => scene.add(g))
groups.base.add(await load("case-base.stl", M.case), await load("case-window.stl", M.window), await load("case-labels.stl", M.engraving))
groups.lid.add(await load("case-lid.stl", M.case), await load("case-engraving.stl", M.engraving))
for (const [file, group, m] of PARTS) groups[group].add(await load("parts/" + file + ".stl", M[m]))

// The display's picture, behind the window.
const screen = new THREE.CanvasTexture(oledCanvas("status"))
screen.magFilter = THREE.NearestFilter
screen.colorSpace = THREE.SRGBColorSpace
const [aw, ah] = DIMS.FRONT.oled.active
const display = new THREE.Mesh(new THREE.PlaneGeometry(aw, ah), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }))
// Facing out of the front (+y), reading left to right for someone in front (−x), up +z.
display.setRotationFromMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)))
display.position.set(DIMS.FRONT.oled.x, DIMS.FACES.frontIn - 3.35, DIMS.FRONT.oled.z)
groups.base.add(display)

const camera = new THREE.PerspectiveCamera(28, W / H, 1, 4000)
camera.up.set(0, 0, 1)
window.shoot = (v) => {
  groups.lid.visible = !v.lidOff
  groups.dac.visible = !v.noDac
  groups.lid.position.z = v.explode ? 120 : 0
  groups.dac.position.z = v.explode ? 50 : 0
  camera.fov = v.fov ?? 28
  camera.updateProjectionMatrix()
  camera.position.set(...v.from)
  camera.lookAt(...(v.at ?? [0, 0, 15]))
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL("image/png")
}
window.ready = true
</script></body></html>`

const views = [
  { file: "unit-front.png", from: [-330, 430, 300], at: [0, 0, 12] },
  { file: "unit-back.png", from: [320, -440, 280], at: [0, 0, 12] },
  { file: "unit-open.png", from: [-260, 300, 480], at: [0, -5, 8], lidOff: true },
  { file: "unit-open-back.png", from: [260, -330, 420], at: [0, -10, 8], lidOff: true },
  { file: "unit-exploded.png", from: [-440, 500, 470], at: [0, 0, 55], explode: true },
  { file: "unit-front-panel.png", from: [0, 330, 24], at: [0, 75, 20], fov: 40 },
  { file: "unit-back-panel.png", from: [0, -330, 24], at: [0, -75, 20], fov: 40 },
]

const out = join(here, "renders")
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
p.on("pageerror", (e) => console.log("page error:", e.message))
await p.goto(`${base}/__render.html`)
await p.waitForFunction(() => window.ready === true, null, { timeout: 180000 })
for (const v of views) {
  const data = await p.evaluate((view) => window.shoot(view), v)
  writeFileSync(join(out, v.file), Buffer.from(data.split(",")[1], "base64"))
  console.log("rendered", v.file)
}
for (const page of ["status", "playing", "network", "update"]) {
  const data = await p.evaluate((pg) => window.oledPng(pg), page)
  writeFileSync(join(out, `oled-${page}.png`), Buffer.from(data.split(",")[1], "base64"))
  console.log("drew oled", page)
}
await browser.close()
server.close()

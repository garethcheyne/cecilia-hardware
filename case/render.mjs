// Product renders: three.js in a headless browser. Cover on, cover off,
// exploded, a close-up of the front panel with the OLED lit, and the OLED's
// status screens on their own.
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

// ---- The OLED's screens (128 × 64, one colour) ----
const MARK = [[4.5, 13], [10.25, 8], [16, 3], [21.75, 8], [27.5, 13]]
function oledCanvas(page) {
  const c = document.createElement("canvas")
  c.width = 128; c.height = 64
  const g = c.getContext("2d")
  g.fillStyle = "#000"; g.fillRect(0, 0, 128, 64)
  g.fillStyle = "#dfe9ff"; g.strokeStyle = "#dfe9ff"; g.textBaseline = "top"
  // The mark, 12 px tall, top left.
  const s = 12 / 26
  for (const [x, top] of MARK) g.fillRect(1 + Math.round((x - 2.5) * s), 1 + Math.round((top - 3) * s), 2, Math.round((21 - top) * s) + 2)
  g.fillRect(1, 13, 14, 1)
  g.font = "bold 11px Arial"; g.fillText("Cecilia", 18, 2)
  // Wi-Fi strength, top right.
  for (let i = 0; i < 4; i++) g.fillRect(110 + i * 4, 10 - i * 2.5, 3, 3 + i * 2.5)
  g.fillRect(0, 17, 128, 1)
  if (page === "status") {
    g.font = "bold 16px Arial"; g.fillText("Ready", 2, 22)
    g.font = "10px Arial"; g.fillText("cecilia.local", 2, 41); g.fillText("192.168.1.42", 2, 52)
  } else if (page === "playing") {
    g.font = "10px Arial"; g.fillText("Playing  ·  verse 2 of 5", 2, 21)
    g.font = "bold 13px Arial"; g.fillText("Abide with Me", 2, 33)
    g.fillRect(2, 56, 124, 1); g.fillRect(2, 53, 52, 7)
  } else if (page === "network") {
    g.font = "10px Arial"
    g.fillText("Wi-Fi   St Mary's Hall", 2, 21); g.fillText("Address 192.168.1.42", 2, 33); g.fillText("Wired   not connected", 2, 45)
  } else if (page === "update") {
    g.font = "bold 12px Arial"; g.fillText("Updating to 0.2.0", 2, 23)
    g.font = "10px Arial"; g.fillText("Backing up first…", 2, 39)
    g.strokeRect(2.5, 52.5, 123, 8); g.fillRect(4, 54, 70, 5)
  }
  // OLEDs are 1 bit: snap every pixel to on or off.
  const img = g.getImageData(0, 0, 128, 64)
  for (let i = 0; i < img.data.length; i += 4) {
    const on = img.data[i] > 90
    img.data[i] = on ? 223 : 0; img.data[i + 1] = on ? 233 : 0; img.data[i + 2] = on ? 255 : 0; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}
window.oledPng = (page) => {
  const src = oledCanvas(page)
  const big = document.createElement("canvas")
  big.width = 128 * 5 + 40; big.height = 64 * 5 + 40
  const g = big.getContext("2d")
  g.fillStyle = "#0b0c0e"; g.fillRect(0, 0, big.width, big.height)
  const d = src.getContext("2d").getImageData(0, 0, 128, 64).data
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4
    g.fillStyle = d[i] ? "#dfe9ff" : "#15171b"
    g.fillRect(20 + x * 5, 20 + y * 5, 4, 4)
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
Object.assign(key.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 900 })
key.shadow.bias = -0.0004
scene.add(key)
const rim = new THREE.DirectionalLight("#cdd6ff", 0.9)
rim.position.set(220, -260, 160)
scene.add(rim)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.22 }))
ground.receiveShadow = true
scene.add(ground)

const M = {
  case: new THREE.MeshPhysicalMaterial({ color: "#2b2f3a", roughness: 0.78, metalness: 0, sheen: 0.3, sheenRoughness: 0.8 }),
  engraving: new THREE.MeshStandardMaterial({ color: "#ece6d6", roughness: 0.6 }),
  window: new THREE.MeshPhysicalMaterial({ color: "#14161b", roughness: 0.08, transparent: true, opacity: 0.38, clearcoat: 1 }),
  "pi-board": new THREE.MeshStandardMaterial({ color: "#1f6b43", roughness: 0.55 }),
  "pi-chips": new THREE.MeshStandardMaterial({ color: "#1d1f24", roughness: 0.4 }),
  "pi-metal": new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.32 }),
  "pi-header": new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.5 }),
  heatsink: new THREE.MeshStandardMaterial({ color: "#2a2c31", metalness: 0.7, roughness: 0.45 }),
  "hat-board": new THREE.MeshStandardMaterial({ color: "#16181f", roughness: 0.5 }),
  "hat-din": new THREE.MeshStandardMaterial({ color: "#141518", roughness: 0.6 }),
  "hat-din-rings": new THREE.MeshStandardMaterial({ color: "#d7dae0", metalness: 1, roughness: 0.3 }),
  "hat-parts": new THREE.MeshStandardMaterial({ color: "#1d1f24", roughness: 0.4 }),
  "standoffs-low": new THREE.MeshStandardMaterial({ color: "#c8a456", metalness: 1, roughness: 0.35 }),
  get "standoffs-high"() { return this["standoffs-low"] },
  "button-board": new THREE.MeshStandardMaterial({ color: "#1f6b43", roughness: 0.55 }),
  switches: new THREE.MeshStandardMaterial({ color: "#1d1f24", roughness: 0.4 }),
  "oled-pcb": new THREE.MeshStandardMaterial({ color: "#1f4fa0", roughness: 0.5 }),
  "oled-glass": new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.1 }),
  button: new THREE.MeshStandardMaterial({ color: "#3a3f4b", roughness: 0.5 }),
  led: new THREE.MeshStandardMaterial({ color: "#7cf29a", emissive: "#5fe08a", emissiveIntensity: 2.2 }),
}
const loader = new STLLoader()
const load = (file, mat) => new Promise((ok) => loader.load("/out/" + file, (g) => {
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, mat)
  m.castShadow = m.receiveShadow = true
  ok(m)
}))

const groups = { base: new THREE.Group(), lid: new THREE.Group(), pi: new THREE.Group(), hat: new THREE.Group() }
Object.values(groups).forEach((g) => scene.add(g))
groups.base.add(await load("case-base.stl", M.case), await load("case-window.stl", M.window), await load("case-labels.stl", M.engraving))
groups.lid.add(await load("case-lid.stl", M.case), await load("case-engraving.stl", M.engraving))
for (const p of ["pi-board", "pi-chips", "pi-metal", "heatsink", "standoffs-low", "oled-pcb", "oled-glass", "button", "led", "button-board", "switches"])
  (p.startsWith("oled") || ["button", "led", "button-board", "switches"].includes(p) ? groups.base : groups.pi).add(await load("parts/" + p + ".stl", M[p]))
for (const p of ["pi-header", "standoffs-high", "hat-board", "hat-din", "hat-din-rings", "hat-parts"]) groups.hat.add(await load("parts/" + p + ".stl", M[p]))

// The OLED's picture, on the glass.
const screen = new THREE.CanvasTexture(oledCanvas("status"))
screen.magFilter = THREE.NearestFilter
screen.colorSpace = THREE.SRGBColorSpace
const front = DIMS.CASE.d / 2 - DIMS.CASE.wall
const display = new THREE.Mesh(new THREE.PlaneGeometry(29.4, 14.7), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }))
// Facing out of the front (+y), reading left to right for someone in front (−x), up +z.
display.setRotationFromMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)))
display.position.set(DIMS.FRONT.oled.x, front - 3.95, DIMS.FRONT.oled.z)
groups.base.add(display)

const camera = new THREE.PerspectiveCamera(28, W / H, 1, 3000)
camera.up.set(0, 0, 1)
window.shoot = (v) => {
  groups.lid.visible = !v.lidOff
  groups.lid.position.z = v.explode ? 92 : 0
  groups.hat.position.z = v.explode ? 44 : 0
  camera.fov = v.fov ?? 28
  camera.updateProjectionMatrix()
  camera.position.set(...v.from)
  camera.lookAt(...(v.at ?? [0, 0, 22]))
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL("image/png")
}
window.ready = true
</script></body></html>`

const views = [
  { file: "unit-front.png", from: [-190, 250, 170], at: [0, 0, 20] },
  { file: "unit-back.png", from: [210, -250, 160], at: [0, 0, 20] },
  { file: "unit-open.png", from: [-150, 190, 250], at: [0, 2, 18], lidOff: true },
  { file: "unit-exploded.png", from: [-300, 330, 300], at: [0, 0, 62], explode: true },
  { file: "unit-front-panel.png", from: [-5, 175, 30], at: [-5, 30, 27], fov: 42 },
  { file: "unit-ports.png", from: [190, -170, 70], at: [20, -10, 18], fov: 34 },
  { file: "unit-back-panel.png", from: [12, -175, 30], at: [12, -30, 20], fov: 42 },
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

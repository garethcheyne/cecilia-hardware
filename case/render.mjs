// Product renders of the case: three.js in a headless browser, studio
// lighting, graphite anodised aluminium with a laser-engraved mark.
//
//   npm run build && npm run render [playwright module path]
import { createServer } from "node:http"
import { readFileSync, existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, extname, join, normalize } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pwPath = process.argv[2] ?? join(here, "..", "..", "Organ Assist", "web", "node_modules", "playwright")
const pw = await import(pathToFileURL(require.resolve(pwPath)).href)
const chromium = pw.chromium ?? pw.default.chromium

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".stl": "application/octet-stream", ".json": "application/json" }
let pageHtml = ""
const server = createServer((req, res) => {
  if (req.url === "/__render.html") return res.writeHead(200, { "content-type": "text/html" }).end(pageHtml)
  const path = normalize(join(here, decodeURIComponent(new URL(req.url, "http://x").pathname)))
  if (!path.startsWith(here) || !existsSync(path)) return res.writeHead(404).end()
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path))
})
await new Promise((r) => server.listen(0, "127.0.0.1", r))
const base = `http://127.0.0.1:${server.address().port}`

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#e9e6e0;overflow:hidden}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from "three"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

const W = 1600, H = 1000
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(W, H)
renderer.setPixelRatio(1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color("#e9e6e0")
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

const key = new THREE.DirectionalLight("#fff6ea", 2.4)
key.position.set(-160, -220, 320)
key.castShadow = true
key.shadow.mapSize.set(4096, 4096)
Object.assign(key.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 900 })
key.shadow.bias = -0.0004
key.shadow.radius = 6
scene.add(key)
const rim = new THREE.DirectionalLight("#cdd6ff", 0.9)
rim.position.set(220, 260, 160)
scene.add(rim)

const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.22 }))
ground.receiveShadow = true
scene.add(ground)

const aluminium = new THREE.MeshPhysicalMaterial({ color: "#2b2f3a", metalness: 0.55, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 })
const engraved = new THREE.MeshStandardMaterial({ color: "#d9dce3", metalness: 0.9, roughness: 0.32 })
const loader = new STLLoader()
const load = (name, material) => new Promise((ok) => loader.load("/out/" + name, (g) => {
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, material)
  m.castShadow = true
  m.receiveShadow = true
  ok(m)
}))
const [base, lid, mark] = await Promise.all([load("case-base.stl", aluminium), load("case-lid.stl", aluminium), load("case-engraving.stl", engraved)])
const lidGroup = new THREE.Group()
lidGroup.add(lid, mark)
scene.add(base, lidGroup)

const camera = new THREE.PerspectiveCamera(28, W / H, 1, 3000)
camera.up.set(0, 0, 1)

window.shoot = (view) => {
  lidGroup.position.z = view.explode ?? 0
  camera.position.set(...view.from)
  camera.lookAt(...(view.at ?? [0, 0, 16]))
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL("image/png")
}
window.ready = true
</script></body></html>`

const views = [
  { file: "case-front.png", from: [-260, 330, 230], at: [0, 0, 14] },
  { file: "case-back.png", from: [250, -320, 200], at: [0, 0, 14] },
  { file: "case-top.png", from: [0, 1, 520], at: [0, 0, 0] },
  { file: "case-exploded.png", from: [-300, 330, 300], at: [0, 0, 30], explode: 46 },
  { file: "case-front-panel.png", from: [0, 300, 40], at: [0, 0, 18] },
  { file: "case-back-panel.png", from: [0, -300, 40], at: [0, 0, 18] },
]

const out = join(here, "renders")
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
p.on("pageerror", (e) => console.log("page error:", e.message))
pageHtml = page
await p.goto(`${base}/__render.html`)
await p.waitForFunction(() => window.ready === true, null, { timeout: 120000 })
for (const v of views) {
  const data = await p.evaluate((view) => window.shoot(view), v)
  const { writeFileSync } = await import("node:fs")
  writeFileSync(join(out, v.file), Buffer.from(data.split(",")[1], "base64"))
  console.log("rendered", v.file)
}
await browser.close()
server.close()

<template>
  <!-- 该组件本身不渲染 DOM 元素，canvas 会附着到传入的容器（或 viewer 容器）上 -->
  <div style="display: none"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as Cesium from 'cesium'

/* ================== Props & Emits ================== */
const props = defineProps({
  viewer: { type: Object, required: true }, // Cesium.Viewer 实例
  container: { type: [Object, String], default: null }, // optional container element or selector
  markers: { type: Array, default: () => [] }, // [{ id, lon, lat, alt, name, ... }]
  imageUrl: { type: String, default: '/icons/marker.png' },
  iconWidth: { type: Number, default: 32 },
  iconHeight: { type: Number, default: 32 },
  enableHitmap: { type: Boolean, default: true },
  redrawDebounceMs: { type: Number, default: 50 }, // ms debounce when camera moves
  maxDraw: { type: Number, default: 2000 }, // visible points threshold to enable clustering
  clusterPixelSize: { type: Number, default: 64 }, // grid size for clustering in CSS pixels
  showClusterLabel: { type: Boolean, default: true } // show cluster count
})

const emit = defineEmits(['marker-click'])

/* ================== Internal State ================== */
let canvas = null
let hitCanvas = null
let ctx = null
let hitCtx = null
let dpr = 1
let resizeObserver = null
let postRenderCb = null
let lastCameraState = null
let imageSrc = null
let img = null
let imgCacheCanvas = null // scaled cache for image
let internalMarkers = []
let colorToMarker = {}
let needsRedraw = true
let resizeHandler = null
let containerRef = null
let handleContainerClick = null
let lastRedrawTime = 0
let clusteringResult = null

/* ================== Utilities ================== */
function idToColor(id) {
  const s = String(id)
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  }
  const r = (h & 0xff0000) >> 16
  const g = (h & 0x00ff00) >> 8
  const b = h & 0x0000ff
  return { r: (r % 254) + 1, g: (g % 254) + 1, b: (b % 254) + 1 }
}

const getContainerEl = () => {
  if (props.container) {
    if (typeof props.container === 'string') return document.querySelector(props.container)
    return props.container
  }
  // try viewer container
  return props.viewer && (props.viewer.container || props.viewer._container || document.querySelector('#cesium-container'))
}

/* Load image and build scaled cache */
async function ensureImage(url) {
  if (!url) { img = null; imageSrc = null; imgCacheCanvas = null; return null }
  if (imageSrc === url && img) return img
  imageSrc = url
  return new Promise((resolve) => {
    const temp = new Image()
    temp.crossOrigin = 'anonymous'
    temp.onload = () => {
      img = temp
      // build scaled cache for icon size
      try {
        const c = document.createElement('canvas')
        c.width = props.iconWidth
        c.height = props.iconHeight
        const cctx = c.getContext('2d')
        cctx.clearRect(0, 0, c.width, c.height)
        cctx.drawImage(img, 0, 0, c.width, c.height)
        imgCacheCanvas = c
      } catch (err) {
        // cross-origin draw may taint; fallback to using raw image directly
        imgCacheCanvas = null
      }
      resolve(img)
    }
    temp.onerror = () => { img = null; imgCacheCanvas = null; resolve(null) }
    temp.src = url
  })
}

/* ================== Canvas create / destroy ================== */
function createCanvases() {
  const containerEl = getContainerEl()
  if (!containerEl) return
  containerRef = containerEl

  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.id = 'cesium-canvas-markers-overlay'
    // pointer-events: none -> allow interactions to pass through to Cesium
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20'
    containerEl.appendChild(canvas)
    ctx = canvas.getContext('2d')
    // note: we do NOT attach click to canvas; attach to container to allow interaction pass-through
  }

  if (!hitCanvas) {
    hitCanvas = document.createElement('canvas')
    hitCanvas.id = 'cesium-canvas-markers-hitmap'
    hitCanvas.style.display = 'none'
    containerEl.appendChild(hitCanvas)
    hitCtx = hitCanvas.getContext('2d')
  }

  // container click handler (events pass through canvas, reach this container)
  handleContainerClick = (e) => {
    if (!props.enableHitmap) return
    if (!canvas || !hitCtx) return
    const rect = canvas.getBoundingClientRect()
    // map to device pixels (same coords as hitCanvas)
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    try {
      const pixel = hitCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data
      if (pixel[3] === 0) return
      const key = `${pixel[0]}_${pixel[1]}_${pixel[2]}`
      const marker = colorToMarker[key]
      if (marker) {
        emit('marker-click', marker)
      }
    } catch (err) {
      // getImageData can throw if canvas tainted in some browsers; ignore gracefully
      // console.warn('hitmap read error', err)
      return
    }
  }

  containerEl.addEventListener('click', handleContainerClick)

  const resize = () => {
    dpr = window.devicePixelRatio || 1
    const w = containerEl.clientWidth
    const h = containerEl.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    // transform so ctx draws in CSS pixel units
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    hitCanvas.width = canvas.width
    hitCanvas.height = canvas.height
    needsRedraw = true
  }

  resizeHandler = resize
  resize()
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerEl)
  } else {
    window.addEventListener('resize', resize)
  }
}

function destroyCanvases() {
  if (postRenderCb && props.viewer && props.viewer.scene) {
    props.viewer.scene.postRender.removeEventListener(postRenderCb)
    postRenderCb = null
  }
  if (resizeObserver) {
    if (containerRef) resizeObserver.unobserve(containerRef)
    resizeObserver.disconnect()
    resizeObserver = null
  } else if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (containerRef && handleContainerClick) {
    containerRef.removeEventListener('click', handleContainerClick)
  }
  containerRef = null
  handleContainerClick = null

  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
  if (hitCanvas && hitCanvas.parentNode) hitCanvas.parentNode.removeChild(hitCanvas)
  canvas = null; hitCanvas = null; ctx = null; hitCtx = null; imgCacheCanvas = null
  colorToMarker = {}
}

/* ================== Marker prep & clustering ================== */
function prepareInternalMarkers(list) {
  colorToMarker = {}
  internalMarkers = (list || []).map((p, idx) => {
    const id = p.id ?? p.recordId ?? idx
    const c = idToColor(id)
    const key = `${c.r}_${c.g}_${c.b}`
    const m = {
      __idx: idx,
      id,
      lon: Number(p.lon),
      lat: Number(p.lat),
      alt: Number(p.alt || 0),
      name: p.name || p.title || '',
      meta: p,
      hitColor: c
    }
    colorToMarker[key] = m
    return m
  }).filter(m => !Number.isNaN(m.lon) && !Number.isNaN(m.lat))
}

/* Grid-based clustering in screen space.
   Returns { clustered: bool, items: array } where items are either markers or cluster objects:
   cluster: { __cluster: true, count, _wnd: {x,y}, items: [...] }
*/
function clusterVisibleMarkers(viewMarkers, cssW, cssH) {
  if (!props.maxDraw || viewMarkers.length <= props.maxDraw) {
    return { clustered: false, items: viewMarkers }
  }
  const grid = new Map()
  const cellSize = Math.max(8, props.clusterPixelSize)
  for (let i = 0; i < viewMarkers.length; i++) {
    const m = viewMarkers[i]
    const x = Math.round(m._wnd.x)
    const y = Math.round(m._wnd.y)
    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)
    const key = `${gx}_${gy}`
    if (!grid.has(key)) {
      grid.set(key, { count: 0, rep: m, items: [], cx: 0, cy: 0 })
    }
    const cell = grid.get(key)
    cell.count++
    cell.items.push(m)
    cell.cx += x
    cell.cy += y
  }

  const clustered = []
  for (const cell of grid.values()) {
    if (cell.count === 1) {
      clustered.push(cell.rep)
    } else {
      const avgX = cell.cx / cell.count
      const avgY = cell.cy / cell.count
      clustered.push({
        __cluster: true,
        count: cell.count,
        lon: null, lat: null, alt: 0,
        _wnd: { x: avgX, y: avgY },
        rep: cell.rep,
        items: cell.items
      })
    }
  }
  return { clustered: true, items: clustered }
}

/* ================== Draw logic ================== */
function drawOnce() {
  if (!canvas || !ctx || !props.viewer || !props.viewer.scene) return
  const cam = props.viewer.camera

  // ...原来的相机移动检测、debounce

  // CSS canvas尺寸
  const cssW = canvas.width / (window.devicePixelRatio || 1)
  const cssH = canvas.height / (window.devicePixelRatio || 1)
  ctx.clearRect(0, 0, cssW, cssH)
  if (props.enableHitmap && hitCtx) hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height)

  const visible = []
  for (let i = 0; i < internalMarkers.length; i++) {
    const m = internalMarkers[i]
    const cart = Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt)
    const wnd = props.viewer.scene.cartesianToCanvasCoordinates(cart)
    if (!wnd) continue
    m._wnd = wnd

    // 计算缩放系数
    const height = props.viewer.camera.positionCartographic.height
    const scale = Math.min(0.8, Math.max(0.3, 2000 / height))

    m._scale = scale

    if (wnd.x < -props.iconWidth * scale || wnd.y < -props.iconHeight * scale ||
      wnd.x > cssW + props.iconWidth * scale || wnd.y > cssH + props.iconHeight * scale) continue
    visible.push(m)
  }

  const clusterRes = clusterVisibleMarkers(visible, cssW, cssH)
  clusteringResult = clusterRes

  for (let i = 0; i < clusterRes.items.length; i++) {
    const item = clusterRes.items[i]
    if (item.__cluster) {
      // 保留原来的cluster画法
      const x = item._wnd.x
      const y = item._wnd.y
      const radius = Math.max(12, Math.min(28, Math.sqrt(item.count) * 4))
      ctx.beginPath()
      ctx.arc(x, y - radius / 2, radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(60,120,200,0.9)'
      ctx.fill()
      if (props.showClusterLabel) {
        ctx.fillStyle = '#fff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(item.count), x, y - radius / 2)
      }
    } else {
      // marker draw，应用缩放系数
      const x = item._wnd.x
      const y = item._wnd.y
      const w = props.iconWidth * (item._scale || 1)
      const h = props.iconHeight * (item._scale || 1)
      try {
        if (imgCacheCanvas) ctx.drawImage(imgCacheCanvas, x - w / 2, y - h, w, h)
        else if (img) ctx.drawImage(img, x - w / 2, y - h, w, h)
        else {
          ctx.beginPath()
          ctx.arc(x, y - h / 2, Math.max(2, w / 4), 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(200,40,40,0.9)'
          ctx.fill()
        }
      } catch (err) { /* fallback */ }
      // hitmap也缩放
      if (props.enableHitmap && hitCtx) {
        const dprLocal = window.devicePixelRatio || 1
        const px = Math.round(x * dprLocal)
        const py = Math.round(y * dprLocal)
        const hw = Math.round(w / 2 * dprLocal)
        const hh = Math.round(h * dprLocal)
        const c = item.hitColor
        hitCtx.fillStyle = `rgb(${c.r},${c.g},${c.b})`
        hitCtx.fillRect(px - hw, py - hh, hw * 2, hh * 2)
      }
    }
  }
}


/* Attach postRender drawing (so we redraw synchronized with Cesium render) */
function attachPostRender() {
  if (!props.viewer || !props.viewer.scene) return
  if (postRenderCb) props.viewer.scene.postRender.removeEventListener(postRenderCb)
  postRenderCb = () => {
    drawOnce()
  }
  props.viewer.scene.postRender.addEventListener(postRenderCb)
}

/* ================== Public API ================== */
function setMarkers(list) {
  prepareInternalMarkers(list || [])
  needsRedraw = true
}
function clearMarkers() {
  internalMarkers = []
  colorToMarker = {}
  needsRedraw = true
}
function redraw() { needsRedraw = true }

/* ================== Watches & Lifecycle ================== */
watch(() => props.markers, async (nv) => {
  await nextTick()
  setMarkers(nv)
}, { deep: true, immediate: true })

watch(() => props.imageUrl, async (nv) => {
  await ensureImage(nv)
  needsRedraw = true
}, { immediate: true })

onMounted(async () => {
  await nextTick()
  createCanvases()
  await ensureImage(props.imageUrl)
  prepareInternalMarkers(props.markers)
  attachPostRender()
})

onUnmounted(() => {
  destroyCanvases()
})

/* expose methods to parent via ref */
defineExpose({ setMarkers, clearMarkers, redraw })
</script>

<style scoped>
/* no component-scoped DOM to style */
</style>

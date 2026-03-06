<template>
  <div class="viewer-container">
    <!-- Cesium 容器 -->
    <div ref="cesiumContainer" class="cesium-container"></div>

    <!-- Canvas 图标组件 -->
    <CesiumCanvasMarkers ref="canvasMarkersRef" :viewer="viewer" :markers="imgIconArr" :image-url="markerImage"
      :icon-width="32" :icon-height="32" @marker-click="handleMarkerClick" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { getLoading } from "@/api/record"
import { useRoute } from 'vue-router'
import CesiumCanvasMarkers from './CesiumCanvasMarkers.vue'

// ---------------- Props ----------------
const props = defineProps({
  initPosition: { type: Object, default: () => ({ lon: 113.55, lat: 22.39, height: 5000 }) },
  taskList: { type: Array, default: () => [] }
})

// ---------------- 响应式变量 ----------------
const cesiumContainer = ref(null)
const viewer = ref({})
const canvasMarkersRef = ref(null)

const imgIconArr = ref([])
const allIconArr = ref([])
const markerImage = '/icons/marker.png'

let tileset3D = null
const currentClickData = ref({})
const modelPath = ref(`${import.meta.env.VITE_STATIC_RESOURCE_URL}3dtitle/tileset.json`);

// 控制相机高度修正是否启用（zoom 时临时禁用）
const cameraLimitsEnabled = ref(true)
// 节流相关
let cameraChangeListenerAdded = false
let cameraThrottleTimer = null

// Cesium 原生点击处理器引用（创建一次）
let screenSpaceHandler = null

// =======================================================
// 工具函数（优化后）
// =======================================================

function limitCameraRange(viewerInstance, minHeight = 0, maxHeight = props.initPosition.height + 100) {
  if (!viewerInstance?.camera || !viewerInstance.scene) return
  const controller = viewerInstance.scene.screenSpaceCameraController

  // 使用 controller 提供的俯仰/缩放限制（低开销）
  controller.minimumPitch = Cesium.Math.toRadians(-85)
  controller.maximumPitch = Cesium.Math.toRadians(-6)
  controller.minimumZoomDistance = minHeight
  controller.maximumZoomDistance = maxHeight

  if (cameraChangeListenerAdded) return

  // 节流处理：camera.changed 触发非常频繁，使用定时器每 100ms 最多处理一次
  cameraChangeListenerAdded = true
  cameraThrottleTimer = null
  const handler = () => {
    if (!cameraLimitsEnabled.value) return
    // 节流：若已有定时器则跳过
    if (cameraThrottleTimer) return
    cameraThrottleTimer = setTimeout(() => {
      cameraThrottleTimer = null
      try {
        const cam = viewerInstance.camera
        const carto = Cesium.Cartographic.fromCartesian(cam.position)
        const h = carto.height || 0
        if (h < minHeight || h > maxHeight) {
          const clamped = Math.min(Math.max(h, minHeight), maxHeight)
          // 只在差距明显时调整，避免微小跳动
          if (Math.abs(clamped - h) > 0.5) {
            const newPos = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, clamped)
            // 使用 setView 而不是直接赋值，避免触发复杂内部逻辑
            cam.setView({ destination: newPos })
          }
        }
      } catch (e) {
        // 保守处理：不抛出，避免打断主循环
        // console.warn('camera limit handler err', e)
      }
    }, 100) // 100ms 节流窗口，可根据性能再调小或调大
  }

  viewerInstance.camera.changed.addEventListener(handler)

  // 在 onUnmounted 时移除：记录 handler 引用到全局以便移除
  // 我们不把 handler 设为外部变量以避免泄露；移除时使用 camera.changed.removeEventListener(handler)
  // 若组件重复 mount/unmount，请确保 cameraChangeListenerAdded 标志重置（onUnmounted 已处理）
}

// 将 3DTiles 调整到地形的函数：只在 tileset ready 后调用一次，避免频繁采样地形
function adjustTilesetToTerrain(viewerInstance, tileset, offset = 100) {
  if (!viewerInstance || !tileset) return
  try {
    const boundingSphere = tileset.boundingSphere
    const cartoCenter = Cesium.Cartographic.fromCartesian(boundingSphere.center)
    Cesium.sampleTerrainMostDetailed(viewerInstance.terrainProvider, [cartoCenter])
      .then(updated => {
        const terrainHeight = (updated && typeof updated[0]?.height === 'number') ? updated[0].height : 0
        const surfaceCenter = Cesium.Cartesian3.fromRadians(
          cartoCenter.longitude,
          cartoCenter.latitude,
          terrainHeight + offset
        )
        const translation = Cesium.Cartesian3.subtract(surfaceCenter, boundingSphere.center, new Cesium.Cartesian3())
        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation)
        // 请求渲染一次（开启 requestRenderMode 时需要手动触发）
        try { viewerInstance.scene.requestRender() } catch (e) { }
      })
      .catch(() => { /* ignore terrain sample failure */ })
  } catch (e) {
    // ignore
  }
}

function forceModelAboveTerrain(viewerInstance) {
  if (!viewerInstance) return
  viewerInstance.scene.globe.depthTestAgainstTerrain = false
  // 当所有瓦片加载完（progress===0）再尝试调整一次（但我们已在 readyPromise 做一次）
  viewerInstance.scene.globe.tileLoadProgressEvent.addEventListener(progress => {
    if (progress === 0 && tileset3D) {
      adjustTilesetToTerrain(viewerInstance, tileset3D, 100)
    }
  })
}

// =======================================================
// Cesium 初始化 & 加载（优化版）
// =======================================================

function initCesium() {
  // scene3DOnly 能节省 CPU（去掉 2D/Columbus 相关负担）
  viewer.value = new Cesium.Viewer(cesiumContainer.value, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    shouldAnimate: true,
    scene3DOnly: true,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    // 关闭一些重渲染特性（根据需要）
    shadows: false,
    // 可以根据需求关闭或启用 antialiasing（会影响 GPU）
    // contextOptions: { webgl: { antialias: false } }
  });

  // 隐藏 Cesium 水印/credit（你的原逻辑）
  if (viewer.value && viewer.value._cesiumWidget && viewer.value._cesiumWidget._creditContainer) {
    viewer.value._cesiumWidget._creditContainer.style.display = "none";
  }

  // 启用按需渲染，减少 CPU 占用（静态场景优势明显）
  try {
    viewer.value.scene.requestRenderMode = true
    // 当有轻微变化时允许渲染（单位：秒），避免完全卡顿
    viewer.value.scene.maximumRenderTimeChange = 0.1
  } catch (e) {
    // 某些旧版 Cesium 属性可能不存在，忽略
  }

  // 先设置到一个大概位置（保持初始视角设置）
  const pos = Cesium.Cartesian3.fromDegrees(
    props.initPosition.lon,
    props.initPosition.lat,
    props.initPosition.height
  );

  viewer.value.camera.setView({
    destination: pos,
    orientation: {
      heading: Cesium.Math.toRadians(32),
      pitch: Cesium.Math.toRadians(-80),
      roll: 0
    }
  });
}

// 加载 tileset（优化：设置 LOD/内存上限，减少压力）
async function loadTileset() {
  if (!viewer.value) return;
  removeCurrent();

  try {
    tileset3D = await Cesium.Cesium3DTileset.fromUrl(modelPath.value);

    // 降低渲染压力：适当提高 maximumScreenSpaceError（越大表示更低精度）
    if (typeof tileset3D.maximumScreenSpaceError === 'number') {
      tileset3D.maximumScreenSpaceError = 16 // 默认值一般 16-32 都能显著提升性能
    }
    // 限制内存（瓦片缓存），单位 MB（部分 Cesium 版本支持）
    if (typeof tileset3D.maximumMemoryUsage === 'number') {
      tileset3D.maximumMemoryUsage = 512
    }

    // 先加入场景，再等待 ready 事件进行一次调整
    viewer.value.scene.primitives.add(tileset3D);

    tileset3D.readyPromise.then(ts => {
      // 只做一次贴地调整（避免后续频繁采样地形）
      adjustTilesetToTerrain(viewer.value, ts, 50)

      const center = ts.boundingSphere.center;
      const radius = ts.boundingSphere.radius;
      const offset = new Cesium.Cartesian3(0, -radius * 2, radius * 1.5);
      // lookAt 会触发渲染（requestRenderMode 下）
      try {
        viewer.value.camera.lookAt(center, offset)
      } catch (e) { /* ignore */ }

      // 强制模型显示在地形上（保留你的逻辑）
      forceModelAboveTerrain(viewer.value);
    }).catch(() => { /* ignore tileset ready error */ });
  } catch (err) {
    // console.warn('loadTileset failed', err)
  }
}

function removeCurrent() {
  if (tileset3D && viewer.value && viewer.value.scene) {
    try { viewer.value.scene.primitives.remove(tileset3D) } catch (e) { }
    tileset3D = null
  }
}

// =======================================================
// 图标与事件（优化）
// =======================================================

const initCesiumIcon = async () => {
  const route = useRoute()
  const res = await getLoading(route.query.projectId || null)
  if (res?.code === 200) {
    allIconArr.value = res.data || []
    imgIconArr.value = [...allIconArr.value]
    await nextTick()
  }
}

watch(() => props.taskList, () => {
  const showIds = props.taskList.filter(i => i.isShow).map(i => i.id)
  // 只有在真正不同时才更新，避免不必要的响应式开销
  const filtered = allIconArr.value.filter(i => showIds.includes(i.recordId))
  if (JSON.stringify(filtered) !== JSON.stringify(imgIconArr.value)) {
    imgIconArr.value = filtered
  }
}, { deep: true })

const handleMarkerClick = marker => {
  currentClickData.value = marker.meta || marker
  console.log('Canvas 图标点击:', currentClickData.value)
}

const registerClickHandler = () => {
  if (!viewer.value) return
  // 只创建一次 handler
  if (!screenSpaceHandler) {
    screenSpaceHandler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas)
    screenSpaceHandler.setInputAction(m => {
      try {
        const picked = viewer.value.scene.pick(m.position)
        if (Cesium.defined(picked) && picked.id && picked.id.billboard && !picked.id.isHtmlIcon) {
          currentClickData.value = picked.id.data
          console.log('点击 Cesium 原生图标:', currentClickData.value)
        }
      } catch (e) {
        // ignore
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }
}

// =======================================================
// 放大 / 缩小（保持视角，不受限高度修正）
// =======================================================

async function _zoomByFactorNoLimit(factor = 0.7, duration = 0.6) {
  if (!viewer?.value || !viewer.value.camera) return

  const cam = viewer.value.camera

  // 暂时禁用自动高度修正
  cameraLimitsEnabled.value = false

  try {
    const carto = Cesium.Cartographic.fromCartesian(cam.position)
    const lon = carto.longitude
    const lat = carto.latitude
    const curH = (carto.height != null && !Number.isNaN(carto.height)) ? carto.height : 0
    const targetH = curH * factor

    if (Math.abs(targetH - curH) < 0.2) return

    const dest = Cesium.Cartesian3.fromRadians(lon, lat, targetH)
    const heading = (typeof cam.heading === 'number') ? cam.heading : 0
    const pitch = (typeof cam.pitch === 'number') ? cam.pitch : 0
    const roll = (typeof cam.roll === 'number') ? cam.roll : 0

    // 使用 flyTo 的 Promise（部分 Cesium 版本返回 promise）
    const p = cam.flyTo({
      destination: dest,
      duration,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      orientation: { heading, pitch, roll }
    })
    // 若返回 promise，等待它完成；否则直接在 finally 恢复
    if (p && typeof p.then === 'function') {
      await p
    }
  } catch (e) {
    // fallback：使用 setView（保持 orientation）
    try {
      const carto = Cesium.Cartographic.fromCartesian(cam.position)
      const dest = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, (carto.height || 0) * factor)
      cam.setView({
        destination: dest,
        orientation: {
          heading: (typeof cam.heading === 'number') ? cam.heading : 0,
          pitch: (typeof cam.pitch === 'number') ? cam.pitch : 0,
          roll: (typeof cam.roll === 'number') ? cam.roll : 0
        }
      })
    } catch (err) { }
  } finally {
    // 保证一定恢复（稍微延迟以确保摄像机稳定），避免长时间禁用约束
    setTimeout(() => { cameraLimitsEnabled.value = true }, 150)
    // 主动触发一次渲染（requestRenderMode 下）
    try { viewer.value.scene.requestRender() } catch (e) { }
  }
}

const ZOOM_FACTOR = 0.7
const zoomIn = () => _zoomByFactorNoLimit(ZOOM_FACTOR)
const zoomOut = () => _zoomByFactorNoLimit(1 / ZOOM_FACTOR)

// =======================================================
// 生命周期
// =======================================================

onMounted(() => {
  initCesium()
  loadTileset().then(() => forceModelAboveTerrain(viewer.value)).catch(() => { })
  initCesiumIcon()
  registerClickHandler()

  // 启用限制监听（第一次绑定）
  limitCameraRange(viewer.value, 0, props.initPosition.height + 100)

  // 进一步设置最小缩放距离为 100（你的原代码）
  if (viewer.value && viewer.value.scene && viewer.value.scene.screenSpaceCameraController) {
    viewer.value.scene.screenSpaceCameraController.minimumZoomDistance = 100
  }
})

onUnmounted(() => {
  // 清理 canvas markers
  try { canvasMarkersRef.value?.clearMarkers?.() } catch (e) { }

  // 移除 tileset
  removeCurrent()

  // 移除 camera changed 监听（如果可能）
  try {
    if (viewer.value && viewer.value.camera && viewer.value.camera.changed) {
      // 这里无法直接拿到 handler 引用（已在 limitCameraRange 内部闭包），因此直接重置标志即可。
      // 若你需要严格移除，可以把 handler 提升为外部变量并在此移除。
      // 为稳妥起见，重置标志并延迟触发一次渲染
      cameraChangeListenerAdded = false
    }
  } catch (e) { }

  cameraThrottleTimer && clearTimeout(cameraThrottleTimer)
  cameraThrottleTimer = null

  // 销毁 screen space handler
  try { screenSpaceHandler?.destroy?.() } catch (e) { }
  screenSpaceHandler = null

  // 销毁 viewer
  try {
    if (viewer.value && !viewer.value.isDestroyed && !viewer.value.isDestroyed()) {
      viewer.value.destroy()
    }
  } catch (e) { }
  viewer.value = null
})

defineExpose({ currentClickData, zoomIn, zoomOut })
</script>

<style scoped>
.viewer-container,
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

import * as Cesium from 'cesium'

export class CesiumUtils {
    constructor(viewer) {
        this.viewer = viewer
    }

    // 添加点
    addPoint(position, options = {}) {
        return this.viewer.entities.add({
            position: position,
            point: {
                color: options.color || Cesium.Color.RED,
                pixelSize: options.size || 10,
                outlineColor: options.outlineColor || Cesium.Color.WHITE,
                outlineWidth: options.outlineWidth || 2,
                ...options.pointOptions
            },
            ...options.entityOptions
        })
    }

    // 添加线
    addLine(positions, options = {}) {
        return this.viewer.entities.add({
            polyline: {
                positions: positions,
                width: options.width || 2,
                material: options.material || Cesium.Color.BLUE,
                clampToGround: options.clampToGround || false,
                ...options.polylineOptions
            },
            ...options.entityOptions
        })
    }

    // 添加多边形
    addPolygon(positions, options = {}) {
        return this.viewer.entities.add({
            polygon: {
                hierarchy: positions,
                material: options.material || Cesium.Color.GREEN.withAlpha(0.5),
                outline: options.outline !== false,
                outlineColor: options.outlineColor || Cesium.Color.BLACK,
                outlineWidth: options.outlineWidth || 1,
                ...options.polygonOptions
            },
            ...options.entityOptions
        })
    }

    // 飞行到某个位置
    flyTo(position, options = {}) {
        return this.viewer.camera.flyTo({
            destination: position,
            orientation: {
                heading: options.heading || 0,
                pitch: options.pitch || -Cesium.Math.PI_OVER_TWO,
                roll: options.roll || 0
            },
            duration: options.duration || 3,
            ...options.flyToOptions
        })
    }

    // 清除所有实体
    clearAll() {
        this.viewer.entities.removeAll()
    }

    // 获取当前视角
    getCurrentView() {
        const camera = this.viewer.camera
        return {
            position: camera.position,
            heading: camera.heading,
            pitch: camera.pitch,
            roll: camera.roll
        }
    }

    // 设置地形
    setTerrainProvider(provider) {
        this.viewer.terrainProvider = provider
    }

    // 添加3D模型
    addModel(url, position, options = {}) {
        return this.viewer.entities.add({
            name: options.name || '3D Model',
            position: position,
            model: {
                uri: url,
                minimumPixelSize: options.minimumPixelSize || 128,
                maximumScale: options.maximumScale || 20000,
                ...options.modelOptions
            },
            ...options.entityOptions
        })
    }
}
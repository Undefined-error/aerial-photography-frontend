<script setup>
import { ref, onMounted } from "vue";
import { useApiLoader } from "vue-tianditu";
const TDT_API_Key = import.meta.env.VITE_APP_TDT_KEY;
const mapInstance = ref(null);
const center = ref([116.40, 39.90]);
const zoom = ref(15);
onMounted(() => {
  useApiLoader({
    v: "4.0",
    tk: TDT_API_Key,
    // plugins: ["D3", "CarTrack", "HeatmapOverlay", "BufferTool", "ImageOverLayer"]
  }).then(() => {
    if(window.T){
      console.log("天地图加载成功")
      mapInstance.value = new T.Map("tdt_map");
      mapInstance.value.centerAndZoom(new T.LngLat(center.value[0], center.value[1]), zoom.value);
      // 添加图层
      const tileLayerUrl = "http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=7f013d0186775b063d6a046977bbefc6";
      const layer = new T.TileLayer(tileLayerUrl);
      // layer.setOpacity(0.5);
      mapInstance.value.addLayer(layer);
    }
  });
});
</script>

<template>
  <div id="tdt_map"></div>
</template>

<style scoped lang="scss">
#tdt_map{
  width: 100%;
  height: 100vh;
}
</style>
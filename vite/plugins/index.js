import vue from '@vitejs/plugin-vue'
import tailwindcss from "@tailwindcss/vite";
import createAutoImport from './auto-import'
import createSvgIcon from './svg-icon'
import createCompression from './compression'
import createSetupExtend from './setup-extend'
import cesium from 'vite-plugin-cesium'
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';

export default function createVitePlugins(viteEnv, isBuild = false) {
    const vitePlugins = [
        vue(),
        cesium(),
        tailwindcss(),
        Components({
            resolvers: [
                AntDesignVueResolver({
                    importStyle: false, // css in js
                }),
            ],
        }),
    ]
    vitePlugins.push(createAutoImport())
	vitePlugins.push(createSetupExtend())
    vitePlugins.push(createSvgIcon(isBuild))
	isBuild && vitePlugins.push(...createCompression(viteEnv))
    return vitePlugins
}

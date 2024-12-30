// rollup.config.js
import serve from "rollup-plugin-serve"
import livereload from "rollup-plugin-livereload"
import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import nodeResolve from "rollup-plugin-node-resolve"
import { string } from "rollup-plugin-string"
import arraybuffer from "@wemap/rollup-plugin-arraybuffer"

export default {
    input: "src/main.ts",
    output: {
        file: "build/index.js",
        useStrict: false,
        format: "esm",
        sourcemap: "true",
    },
    external: ["three", "three/examples/jsm/loaders/GLTFLoader.js"],
    plugins: [
        typescript({
            sourceMap: true,
            inlineSources: true,
        }),
        string({
            include: ["**/*.wgsl"],
        }),
        nodeResolve({
            jsnext: true,
            main: true,
        }),
        commonjs({
            include: ["node_modules/**"],
        }),
        arraybuffer({ include: "**/*.wasm" }),
        serve({
            contentBase: ".",
            headers: {
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "require-corp",
            },
        }),
        livereload({ watch: "build", delay: 250 }),
    ],
}

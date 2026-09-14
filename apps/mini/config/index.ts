import { defineConfig, type UserConfigExport } from "@tarojs/cli";

const config: UserConfigExport = {
  projectName: "pli-mini",
  date: "2026-09-14",
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 375: 2, 828: 1.81 / 2 },
  sourceRoot: "src",
  outputRoot: "dist",
  plugins: ["@tarojs/plugin-platform-weapp", "@tarojs/plugin-platform-alipay", "@tarojs/plugin-platform-tt"],
  defineConstants: {},
  copy: { patterns: [], options: {} },
  framework: "react",
  compiler: {
    type: "webpack5",
    prebundle: { enable: false },
  },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true, config: { limit: 1024 } },
      cssModules: { enable: false },
    },
    webpackChain(chain) {
      chain.resolve.alias.set("@", require("path").resolve(__dirname, "..", "src"));
    },
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    postcss: {
      autoprefixer: { enable: true, config: {} },
      cssModules: { enable: false },
    },
  },
};

export default defineConfig(async (merge) => {
  return merge({}, config, require("./dev"));
});
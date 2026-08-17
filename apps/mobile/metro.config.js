/* 모노레포 설정 — @naejip/core는 워크스페이스 심볼릭 링크로 들어오므로
 * Metro가 레포 루트까지 감시하고 루트 node_modules도 탐색하게 한다. */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;

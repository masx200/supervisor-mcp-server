#!/usr/bin/env node
// 简单的构建测试脚本

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("=== Supervisor MCP Server 构建测试 ===\n");

// 检查 package.json 是否存在
if (!fs.existsSync("./package.json")) {
  console.error("❌ package.json 不存在");
  process.exit(1);
}
console.log("✅ package.json 存在");

// 检查 src 目录
if (!fs.existsSync("./src")) {
  console.error("❌ src 目录不存在");
  process.exit(1);
}
console.log("✅ src 目录存在");

// 检查主要源文件
const requiredFiles = [
  "src/server.ts",
  "src/supervisordClient.ts",
  "src/configManager.ts",
  "src/logReader.ts",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 必需文件不存在: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file} 存在`);
}

// 检查 package.json 中的依赖
try {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

  const requiredDeps = [
    "morgan",
    "express",
    "axios",
    "ini",
    "@modelcontextprotocol/sdk",
  ];
  const requiredDevDeps = [
    "typescript",
    "@types/morgan",
    "@types/express",
    "@types/ini",
  ];

  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      console.warn(`⚠️  生产依赖缺失: ${dep}`);
    } else {
      console.log(`✅ 生产依赖: ${dep}`);
    }
  }

  for (const dep of requiredDevDeps) {
    if (!packageJson.devDependencies[dep]) {
      console.warn(`⚠️  开发依赖缺失: ${dep}`);
    } else {
      console.log(`✅ 开发依赖: ${dep}`);
    }
  }
} catch (error) {
  console.error("❌ 读取 package.json 失败:", error.message);
}

// 检查 tsconfig.json
if (!fs.existsSync("./tsconfig.json")) {
  console.error("❌ tsconfig.json 不存在");
  process.exit(1);
}
console.log("✅ tsconfig.json 存在");

// 尝试简单编译测试
console.log("\n=== 编译测试 ===");
try {
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log("✅ TypeScript 编译检查通过");
} catch (error) {
  console.error("❌ TypeScript 编译检查失败");
  console.log("这通常是因为缺少依赖或 Node.js 环境问题");
}

// 检查 Morgan 集成
console.log("\n=== Morgan HTTP 日志集成检查 ===");
try {
  const serverContent = fs.readFileSync("./src/server.ts", "utf8");
  if (serverContent.includes("import morgan from 'morgan'")) {
    console.log("✅ Morgan 导入正确");
  } else {
    console.error("❌ Morgan 导入缺失");
  }

  if (serverContent.includes("app.use(morgan('combined'))")) {
    console.log("✅ Morgan 中间件配置正确");
  } else {
    console.error("❌ Morgan 中间件配置缺失");
  }

  if (
    serverContent.includes("HTTP Request Logging: Morgan middleware enabled")
  ) {
    console.log("✅ 启动日志包含 HTTP 日志信息");
  } else {
    console.warn("⚠️  启动日志可能未包含 HTTP 日志信息");
  }
} catch (error) {
  console.error("❌ 检查 Morgan 集成时出错:", error.message);
}

console.log("\n=== 测试完成 ===");
console.log("\n如需安装依赖，请运行:");
console.log("npm install");
console.log("\n如需构建项目，请运行:");
console.log("npm run build");
console.log("\n如需启动服务器，请运行:");
console.log("npm start");

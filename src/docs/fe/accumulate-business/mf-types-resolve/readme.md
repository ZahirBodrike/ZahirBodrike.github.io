# mf 解决 types 问题

[[toc]]

## 手动实现 mf-types-plugin

webpack module federation 三方类型导出/导入插件，类型导出使用 MFTypesExportPlugin,类型引入使用 MFTypesInjectPlugin

## Usage

### 类型引入

```js
const { MFTypesInjectPlugin } = require("@xxx/mf-types-plugin");

// webpack.conf.js
module.exports = {
  plugins: [
    new MFTypesInjectPlugin({
      name: MF_LIB_NAME, // mf库名称
      typesZipUrl: MF_LIB_TYPES_ZIP_URL, // 类型文件压缩包地址，配有mf-types-export-plugin工程打包生成
    }),
  ],
};
```

### 类型导出

```js
const { MFTypesExportPlugin } = require("@xxx/mf-types-plugin");

// webpack.conf.js
module.exports = {
  plugins: [
    new MFTypesExportPlugin({
      targetDir: paths.appBuild, // 打包目录路径
      nodeModulesDir: paths.nodeModules, // node_modules目录路径
      configPath: paths.typesConfig, // 导出类型配置文件路径
    }),
  ],
};
```

## 导出类型配置文件例子

key 为三方库库名，value 为项目 node_modules 下相对路径，会遍历获取指定目录下.d.ts 后缀文件再在使用者项目中引入，达到智能提醒目的。

```js
module.exports = {
  react: "@types/react",
  "react-dom": "@types/react-dom",
  history: "@types/history",
  "react-router-dom": "@types/react-router-dom",
  axios: "axios",
  lodash: "@types/lodash",
  moment: "moment",
  swiper: "@types/swiper",
  viewerjs: "viewerjs/types",
  "json-bigint": "@types/json-bigint",
  "js-cookie": "@types/js-cookie",
  qs: "@types/qs",
  "prop-types": "@types/prop-types",
  "@lizhife/pplive-utils": "@lizhife/pplive-utils/lib",
  classnames: "classnames",
  "fundebug-javascript": "fundebug-javascript/typings",
  "react-qrcode-logo": "react-qrcode-logo/dist",
  "file-saver": "@types/file-saver",
  "spark-md5": "@types/spark-md5",
  xlsx: "xlsx/types",
};
```

## 源码

### 导出插件 MFTypesExportPlugin

```js
const fs = require("fs");
const path = require("path");
const compressing = require("compressing");

module.exports = class MFTypesExportPlugin {
  constructor(props) {
    const { targetDir, srcDir, nodeModulesDir, mfConfig, ignore } = props;

    this.targetDir = targetDir;
    this.nodeModulesDir = nodeModulesDir;
    this.srcDir = srcDir;
    this.ignore = ignore;
    this.mfConfig = mfConfig;

    if (!this.targetDir) {
      throw Error("MFTypesExportPlugin: 请配置构建目录路径 targetDir");
    }
    if (!this.nodeModulesDir) {
      throw Error("MFTypesExportPlugin: 请配置node_modules路径 nodeModulesDir");
    }
    if (!this.srcDir) {
      throw Error("MFTypesExportPlugin: 请配置src路径 srcDir");
    }
    if (!this.mfConfig) {
      throw Error("MFTypesExportPlugin: 请配置MF配置 mfConfig");
    }
  }

  copyTypesRecursively(searchPath, targetDir) {
    let hasTypesFile = false;
    if (fs.existsSync(searchPath) && fs.lstatSync(searchPath).isDirectory()) {
      fs.readdirSync(searchPath).forEach((filename) => {
        const fullPath = path.resolve(searchPath, filename);
        const distPath = path.resolve(targetDir, filename);
        if (filename.endsWith(".d.ts") || filename === "package.json") {
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(path.resolve(targetDir), { recursive: true });
          }
          if (!hasTypesFile) {
            hasTypesFile = filename.endsWith(".d.ts");
          }
          fs.copyFileSync(fullPath, distPath);
        } else if (fs.lstatSync(fullPath).isDirectory()) {
          const dirResult = this.copyTypesRecursively(fullPath, distPath);
          if (!hasTypesFile) {
            hasTypesFile = dirResult;
          }
        }
      });
    }
    return hasTypesFile;
  }

  apply(compiler) {
    compiler.hooks.done.tapAsync("MFTypesExportPlugin", () => {
      const targetTypesPath = path.resolve(this.targetDir, "types");

      if (!this.mfConfig.exposes) {
        return;
      }

      let exposeNpmPackage = Object.keys(this.mfConfig.exposes).map(
        (exposePackage) => exposePackage.replace("./", "")
      );
      if (this.ignore instanceof Array) {
        exposeNpmPackage = exposeNpmPackage.filter((exposePackage) => {
          return this.ignore.indexOf(exposePackage) < 0;
        });
      }
      exposeNpmPackage.forEach((pkgName) => {
        const pkgTargetTypesPath = path.resolve(targetTypesPath, pkgName);
        // 从node_modules中寻找类型文件
        // 从代码目录寻找
        const pkgPath = path.resolve(this.nodeModulesDir, pkgName);
        const codeDirResult = this.copyTypesRecursively(
          pkgPath,
          pkgTargetTypesPath
        );

        // 从@types下寻找
        if (codeDirResult) {
          return;
        }
        const npmTypesPath = path.resolve(
          this.nodeModulesDir,
          "@types",
          pkgName
        );
        this.copyTypesRecursively(npmTypesPath, pkgTargetTypesPath);
      });

      // 从src中寻找类型文件
      const srcTypesPath = path.resolve(this.srcDir, "@types");
      this.copyTypesRecursively(srcTypesPath, targetTypesPath);

      compressing.zip
        .compressDir(targetTypesPath, path.resolve(this.targetDir, "types.zip"))
        .then(() => {
          fs.rmdirSync(path.resolve(this.targetDir, "types"), {
            recursive: true,
          });
        });
    });
  }
};
```

### 导入插件 MFTypesInjectPlugin

```JS
const fs = require('fs');
const path = require('path');
const http = require('http');
const compressing = require('compressing');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);


module.exports = class MFTypesInjectPlugin {
  constructor(props) {
    const {
      name,
      typesZipUrl,
    } = props;

    this.name = name;
    this.typesZipUrl = typesZipUrl;
  }

  apply(compiler) {
    compiler.hooks.environment.tap(
      'MFTypesInjectPlugin',
      () => {
        if (process.env.NODE_ENV === 'development') {
          const zipFile = resolveApp(path.resolve('node_modules', `${this.name}_types.zip`));
          const unzipPath = resolveApp(path.resolve('node_modules', '@types', `${this.name}_temp`));
          const target = resolveApp(path.resolve('node_modules', '@types', this.name));

          deleteFolder(unzipPath);
          deleteFolder(target);

          fs.mkdirSync(unzipPath, { recursive: true });

          downloadFile(this.name, this.typesZipUrl, zipFile, () => {
            compressing.zip.uncompress(zipFile, unzipPath).then(() => {
              fs.renameSync(path.resolve(unzipPath, 'types'), target);
              deleteFolder(unzipPath);
            });
          });
        }
      }
    );
  }
}

function downloadFile(name, uri, dest, cb){
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }

  const file = fs.createWriteStream(dest);

  http.get(uri.replace('https://', 'http://'), (res)=>{
    if(res.statusCode !== 200){
      cb(res.statusCode);
      return;
    }

    res.on('end', ()=>{
      // console.log('download end');
    });

    // 进度、超时等
    file.on('finish', ()=>{
      console.log(`${name} MF types file downloaded`);
      file.close(cb);
    }).on('error', (err)=>{
      fs.unlink(dest);
      if(cb) cb(err.message);
    })

    res.pipe(file);
  });
}

function deleteFolder(filePath) {
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`;
      const states = fs.statSync(nextFilePath);
      if (states.isDirectory()) {
        //recurse
        deleteFolder(nextFilePath);
      } else {
        //delete file
        fs.unlinkSync(nextFilePath);
      }
    });
    fs.rmdirSync(filePath);
  }
}
```

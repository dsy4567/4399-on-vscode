# 4399 on VSCode 贡献者指南

欢迎为本扩展贡献代码，以下是您贡献代码时的注意事项

> 本文针对扩展代码本身的贡献，如果您需要开发 HTML 代码片段，请移步至 [dsy4567/4ov-scripts](https://github.com/dsy4567/4ov-scripts)

## 贡献流程

1. 贡献者 fork 仓库
2. 贡献者修改并测试代码
3. 贡献者提交 PR
4. 管理员审查代码，并提出修改意见
5. 代码符合要求后，管理员合并代码

## 代码风格

### 基本格式

-   使用 [Prettier](https://github.com/prettier/prettier) 格式化代码（已准备好 VSCode 配置文件）
    -   每个语句应有分号
    -   尽量使用双引号 `""`
    -   箭头函数只有一个参数时，参数不应被括号包裹
    -   缩进使用 4 个空格
    -   换行符使用 LF (`\n`)
    -   不能包含尾随空格
    -   文件以一个换行符结尾

### 兼容性

-   尽量保持扩展对本地/远程开发环境、不同操作系统的兼容性
    -   尽量不在扩展内包含或使用二进制可执行文件、命令行、.`sh`/`.bat` 脚本
        -   不使用 `child_process.exec()`
    -   尽量使用 Node.js 内置模块或对跨平台有良好支持的外部 npm 包
        -   使用 `path.join()` 拼接路径和文件名
        -   使用 `os.userInfo().homedir` 获取主目录
        -   使用 `vscode.env.openExternal(vscode.Uri.parse(url))` 在浏览器打开链接/在资源管理器中打开文件夹
        -   使用 `vscode.env.asExternalUri(vscode.Uri.parse(url))` 解析包含环回地址（如 `127.0.0.1`）的 URL
-   使用 ES2022 语法
-   纯 JS 文件应使用严格模式 `"use strict"`

### 语句的分组与排序

-   包含 `import` 的语句应按以下依据分组，并根据模块/函数/常量名首字母排序组内语句：
    -   Node.js 内置模块（如 `path`）和外部 npm 包（如 `axios`）
    -   本地模块（使用相对路径）
-   `export` 语句内的常量/函数名等应按照声明顺序排序
-   所有使用 `let`/`const` 声明了普通变量/常量的语句、所有使用 `function`/`const` 声明了函数/包含方法的对象的语句、`export` 语句各为一组
-   除包含 `import`、`export` 的语句组，其他语句组均可根据适当依据（如按首字母、相关性）排序语句和再次分组
-   每组语句之间以空白行分隔。
-   局部变量怎么合适怎么来

```ts
import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as vscode from "vscode";

import { aa, ab, ac, ad } from "./a";
import { ba, bb, bc, bd } from "./b";

const A1, B1;
let a1, b1;

const A2, B2;
let a2, b2;

const oa = {
    f() {},
};
const ob = {
    f() {},
};
function fa() {}
function fb() {}

const o1 = {
    f() {},
};
const o2 = {
    f() {},
};
function f1() {}
function f2() {}

export { A1, B1, a1, b1, A2, B2, a2, b2, oa, ob, fa, fb, o1, o2, f1, f2 };
```

### 变量的声明和命名规范

-   使用 `let`（而不是 `var`）声明变量
-   使用 `let`/`const` 声明了**全局**变量/常量的语句组应共用一个 `let`/`const`
-   变量/函数名等尽量使用小驼峰命名法
-   类型使用大驼峰命名法
-   **全局**常量尽量使用全大写的下划线命名法

### 注释

-   每个**全局**变量/常量/函数/包含方法的对象尽量写文档注释（尤其是可被其他模块使用的），并尽量写明每个参数的用途
-   单行注释的两个斜杠 `//` 后应有空格、位于一行的文档注释的 `/**` 后和 `*/` 前应有空格

### 字符串的拼接

-   三个及以上字符串和变量拼接时尽量使用模板字符串
-   两个字符串和变量拼接时既可使用加号又可使用模板字符串

### 类型转换

-   字符串转为数字：使用加号或 `String()`
-   数字转为字符串：将空字符串与数字拼接或 `Number()`

### 类型声明

-   所有自定义类型应在 [src/index.d.ts](./src/index.d.ts) 中声明

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

-   使用 [Prettier](https://github.com/prettier/prettier) 格式化代码
    -   每个语句应有分号
    -   尽量使用双引号 `""`
    -   缩进使用 4 个空格
    -   换行符使用 LF (`\n`)
    -   不能包含尾随空格
    -   文件以一个换行符结尾
-   `import` 语句应按以下排序并分组：
    -   Node.js 内置模块（如 `path`）和外部 npm 包（如 `axios`）
    -   本地模块（使用相对路径）
-   尽量保持扩展对远程开发环境/不同操作系统的兼容性
    -   尽量不在扩展内包含或使用二进制可执行文件、命令行、.`sh`/`.bat` 脚本
        -   不使用 `child_process.exec()`
    -   尽量使用 Node.js 内置模块或支持跨平台的外部 npm 包
        -   使用 `path.join()` 拼接路径和文件名
        -   使用 `os.userInfo().homedir` 获取主目录
        -   使用 `vscode.env.openExternal(vscode.Uri.parse(url))` 在浏览器打开链接/在资源管理器中打开文件夹
        -   使用 `vscode.env.asExternalUri(vscode.Uri.parse(url))` 解析包含环回地址（如 `127.0.0.1`）的 URL
-   使用 ES2022 语法
-   纯 JS 文件应使用严格模式 `"use strict"`
-   变量/函数名等尽量使用小驼峰命名法，类型使用大驼峰命名法，全局常量尽量使用全大写的下划线法命名法
-   使用 `let` 声明变量
-   `let`/`const` 语句可根据用途分组
-   每组声明全局变量/常量的 `let`/`const` 语句应共用一个 `let`/`const`
-   每组 `import` 语句、声明普通变量/常量的 `let`/`const` 语句、声明函数/包含方法的对象的 `function`/`const` 语句、`export` 语句之间以换行符分隔。
-   每组语句中的变量名、函数名等应按首字母排序
-   每个函数/全局变量/全局常量应有文档注释，函数尽量写明每个参数的用途
-   三个及以上字符串和变量拼接时尽量使用模板字符串
-   所有自定义类型应在 [index.d.ts](./src/index.d.ts) 中声明
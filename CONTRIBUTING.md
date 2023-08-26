# 4399 on VSCode 贡献者指南

欢迎为本扩展贡献代码，以下是您贡献代码时的注意事项

> 本文针对扩展代码本身的贡献，如果您需要开发 HTML 代码片段，请移步至 [dsy4567/4ov-scripts](https://github.com/dsy4567/4ov-scripts)

## 贡献流程

1. 贡献者 fork 仓库
2. 贡献者修改并测试代码
3. 贡献者提交 PR
4. 管理员审查代码，并提出修改意见
5. 代码符合要求后，管理员合并代码

## 开始开发

执行 `npm i` 后，在 VSCode 中打开本项目并按 <kbd>F5</kbd> 启动调试

## 兼容性注意事项

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


## 代码风格

请使用 [Prettier](https://github.com/prettier/prettier) 格式化代码，不要随意修改 VSCode 配置文件

<https://github.com/dsy4567/dsy4567/blob/main/coding-style.md>

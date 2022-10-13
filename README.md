<div align="center">

<img width="128" src="https://dsy4567.github.io/icon.png" alt="logo" title="logo" />

<h1 align="center">4399 on VSCode</h1>

[![Visual Studio Marketplace](https://img.shields.io/badge/Visual%20Studio-Marketplace-007acc.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=dsy4567.4399-on-vscode)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/dsy4567.4399-on-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=dsy4567.4399-on-vscode)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/dsy4567.4399-on-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=dsy4567.4399-on-vscode)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/dsy4567.4399-on-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=dsy4567.4399-on-vscode)
[![GitHub Stars](https://img.shields.io/github/stars/dsy4567/4399-on-vscode.svg?style=flat-square)](https://github.com/dsy4567/4399-on-vscode)

<img src="https://dsy4567.github.io/4-o-v.gif" alt="演示" title="演示" />
</div>

> 抵制不良游戏，拒绝盗版游戏，注意自我保护，谨防受骗上当，适度游戏益脑，沉迷游戏伤身，合理安排时间，享受健康生活

> 如果觉得好用, 请不要吝啬[star](https://github.com/dsy4567/4399-on-vscode)

# ✨ 简介

4399 on VSCode 是一个牛逼他妈给牛逼开门, 牛逼到家的 VSCode 扩展, 它可以让您在紧张的开发工作之余, 通过玩一会 4399 小游戏, 放松身心, 劳逸结合, 更好地开始接下来的工作 (玩游戏时不会有防沉迷这个\*\*玩意)

# 👍 功能

-   🖊 登录账号
-   🎮 玩 h5 页游(需要登录)
-   🔍 搜索游戏
-   ✨ 推荐游戏
-   👆 手动输入游戏 id
-   🕒 历史记录
-   🔧 自定义标题(摸鱼必备)
-   💬 逛群组
-   ❔ 随机游戏
-   📚 注入自定义 HTML 代码片段
-   🛠️ 更多功能开发中......

# 🔨 使用方法

按下 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
, 输入 `4399 on VSCode` 开始探索

# ⚠️ 注意事项

-   **建议登陆后使用, 这样可以避免许多奇奇怪怪的问题**
-   **请不要用这个扩展玩 u3d 或 2006 年 6 月以后的 flash 游戏, 此扩展不会支持这类游戏**
-   如果焦点在游戏界面上, 快捷键可能会失效, **请确保您的鼠标或 Windows 徽标键/Command 键正常工作**
-   ~~如果需要 flash 游戏和少数 h5 游戏有声音, 请尝试 [替换 ffmpeg](https://github.com/nondanee/vsc-netease-music#requirement)~~(VSCode 1.71.0+ 用户请见 [ffmpeg-codecs-support](https://code.visualstudio.com/updates/v1_71#_ffmpeg-codecs-support))
-   请勿在任何一个游戏未完全加载完成前多开另一个游戏(页游不受限制)
-   如果游戏显示方向不正确, 请尽可能让游戏界面变宽(比如取消拆分编辑器)

# 📢 已知问题

-   ~~大多数 h5 游戏在 [替换 ffmpeg](https://github.com/nondanee/vsc-netease-music#requirement) 后仍然没有声音(用 [Cocos](https://www.cocos.com/) 做的游戏 %99.99 没有声音)~~(VSCode 1.71.0+ 用户请见 [ffmpeg-codecs-support](https://code.visualstudio.com/updates/v1_71#_ffmpeg-codecs-support))
-   部分游戏半天不能完成加载, 或黑白屏(如果您遇到此问题, 欢迎提交 issue)
-   游戏无法锁定鼠标(尤其是射击类游戏)

# 🍪 获取 cookie

cookie 用于登录 h5 页游以及使用更多需要登录的功能

请使用基于 chromium 内核的浏览器登录 4399, 然后在 [ptlogin.4399.com](https://ptlogin.4399.com) 下打开开发者工具(按 F12), 在控制台(console)下输入以下代码即可(cookie 将复制到剪贴板)

```javascript
copy(document.cookie);
```

> 请确保 cookie 里包含 `Pauth` 值

# 🤝 特别感谢

这个扩展依赖的, 超棒的项目

-   [axios](https://github.com/axios/axios)
-   [cheerio](https://github.com/cheeriojs/cheerio)
-   [ruffle](https://github.com/ruffle-rs/ruffle)

给我灵感的项目

-   [flash collector](https://github.com/cnotech/flash-collector)
-   [vsc netease music](https://github.com/nondanee/vsc-netease-music)

# ⚖️ 许可证

MIT License with "Anti 996" License  
游戏由 [4399](http://www.4399.com) 提供, 游戏的版权归各自游戏作者所有

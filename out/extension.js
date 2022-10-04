/*

MIT License

Copyright (c) 2022 dsy4567(https://github.com/dsy4567/ ; dsy4567@outlook.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

----------

Copyright (c) 2022 dsy4567(https://github.com/dsy4567/ ; dsy4567@outlook.com)

"Anti 996" License Version 1.0 (Draft)

Permission is hereby granted to any individual or legal entity
obtaining a copy of this licensed work (including the source code,
documentation and/or related items, hereinafter collectively referred
to as the "licensed work"), free of charge, to deal with the licensed
work for any purpose, including without limitation, the rights to use,
reproduce, modify, prepare derivative works of, distribute, publish
and sublicense the licensed work, subject to the following conditions:

1. The individual or the legal entity must conspicuously display,
without modification, this License and the notice on each redistributed
or derivative copy of the Licensed Work.

2. The individual or the legal entity must strictly comply with all
applicable laws, regulations, rules and standards of the jurisdiction
relating to labor and employment where the individual is physically
located or where the individual was born or naturalized; or where the
legal entity is registered or is operating (whichever is stricter). In
case that the jurisdiction has no such laws, regulations, rules and
standards or its laws, regulations, rules and standards are
unenforceable, the individual or the legal entity are required to
comply with Core International Labor Standards.

3. The individual or the legal entity shall not induce, suggest or force
its employee(s), whether full-time or part-time, or its independent
contractor(s), in any methods, to agree in oral or written form, to
directly or indirectly restrict, weaken or relinquish his or her
rights or remedies under such laws, regulations, rules and standards
relating to labor and employment as mentioned above, no matter whether
such written or oral agreements are enforceable under the laws of the
said jurisdiction, nor shall such individual or the legal entity
limit, in any methods, the rights of its employee(s) or independent
contractor(s) from reporting or complaining to the copyright holder or
relevant authorities monitoring the compliance of the license about
its violation(s) of the said license.

THE LICENSED WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN ANY WAY CONNECTION WITH THE
LICENSED WORK OR THE USE OR OTHER DEALINGS IN THE LICENSED WORK.

*/
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const cheerio = require("cheerio");
const axios_1 = require("axios");
const iconv = require("iconv-lite");
const http = require("http");
const cookie = require("cookie");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mime = require("mime");
let HTTP_SERVER;
let DATA; // 游戏入口文件
let REF; // 覆盖用户设置的 referer, 仅用于本地服务器
let PORT = 44399;
let server = ""; // szhong.4399.com
let gamePath = ""; // /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
let gameUrl = ""; // http://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
let gameInfoUrls = {};
let alerted = false; // 第一次游戏前提示
let panel;
let context;
let statusBarItem = vscode.window.createStatusBarItem(1); // 加载提示
let threadQp;
let threadQpItems = [];
let threadSearchValue; // 搜索词
let threadPage;
let threadData;
let threads = {};
let threadTimeout; // 延迟获取搜索建议
let searchQp;
let searchQpItems = [];
let searchValue; // 搜索词
let searchPage;
let searchData;
let searchedGames = {};
let searchTimeout; // 延迟获取搜索建议
const DATA_DIR = path.join(os.userInfo().homedir, ".4ov-data/");
const getScript = (cookie = "") => {
    let s = "", f = getCfg("scripts", "").split(", ");
    f.forEach((file) => {
        if (file) {
            try {
                s += fs
                    .readFileSync(path.join(DATA_DIR, "scripts/", file))
                    .toString();
            }
            catch (e) {
                err(`读取 HTML 代码片段文件${path.join(DATA_DIR, "scripts/", file)}时出错`, e);
            }
        }
    });
    return (`
<script>
// 强制设置 referrer
Object.defineProperty(document, "referrer", {
    value: "http://www.4399.com/",
    writable: true,
});
// 强制设置 cookie
Object.defineProperty(document, "cookie", {
    value: \`${cookie.replaceAll(";", "; ")}\`,
    writable: false,
});
// 设置 document.domain 不会报错
Object.defineProperty(document, "domain", {
    value: "4399.com",
    writable: true,
});
// 打开链接
Object.defineProperty(window, "open", {
    value: (url) => {
        console.log(url);
        fetch("/openUrl/" + url);
    },
    writable: true,
});
// 用户头像
setInterval(() => {
    document
        .querySelectorAll("img[src*='//a.img4399.com/']")
        ?.forEach((elem) => {
            if (!elem.src.includes("/proxy/")) {
                elem.src = "/proxy/" + elem.src;
            }
        });
}, 3000);
</script>
` + s);
};
const getWebviewHtml_h5 = (url) => `
<!DOCTYPE html>
<html lang="zh-CN">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>4399</title>
        <base target="_self" />
    </head>

    <body>
        <style>
            ::-webkit-scrollbar {
                display: none !important;
            }

            html, body {
                overflow: hidden;
                margin: 0;
                padding: 0;
            }


            iframe {
                width: 100%;
                height: 100vh;
            }
        </style>
        <iframe id="ifr" src="${url}" frameborder="0"></iframe>
    </body>
</html>

`;
const getWebviewHtml_flash = (url) => `
<!DOCTYPE html>
<html style="height: 100%;margin: 0;padding: 0;">
    <head>
        <meta charset="UTF-8" />
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0"
        />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>flash 播放器(Ruffle 引擎)</title>
        <style>
            ::-webkit-scrollbar {
                display: none !important;
            }
            
            html, body {
                overflow: hidden;
                margin: 0;
                padding: 0;
            }
        </style>
        <script>
            try{ var vscode = acquireVsCodeApi(); } catch (e) {}
            // 打开链接
            Object.defineProperty(window, "open", {
                value: (url) => {
                    console.log(url);
                    vscode.postMessage({ open: new URL(url, location.href).href })
                },
                writable: true,
            });
        </script>
        <script>
            window.play = function (url) {
                var html =
                    '<object id="flashgame" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0" width="100%" height="100%"><param id="game" name="movie" value="' +
                    url +
                    '" /><embed id="flashgame1" name="flashgame" src="' +
                    url +
                    '" quality="high" pluginspage="//www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" width="100%" height="100%" /> <param name="quality" value="high" /></object>';
                document.body.innerHTML =html
            };
        </script>
        <script src="https://unpkg.com/@ruffle-rs/ruffle"></script>
    </head>
    <body style="height: 100%;margin: 0;padding: 0;">
        <script>
            window.play("${url}");
        </script>
    </body>
</html>
`;
const GlobalStorage = (context) => {
    return {
        get: (key) => JSON.parse(context.globalState.get(key) || '""'),
        set: (key, value) => context.globalState.update(key, JSON.stringify(value)),
    };
};
function initHttpServer(callback, ref) {
    REF = ref;
    let onRequest = (request, response) => {
        try {
            if (!request?.url) {
                response.end(null);
            }
            else if (request.url === "/") {
                // 访问根目录直接跳转到游戏
                gamePath !== "/"
                    ? response.writeHead(302, {
                        Location: gamePath,
                    })
                    : response.writeHead(500, {}); // 防止重复重定向
                response.end();
            }
            else if (request.url.startsWith("/proxy/")) {
                let u = request.url.substring("/proxy/".length);
                let h = new URL(u, "https://www.4399.com/").hostname;
                if (h === "127.0.0.1" || h === "localhost") {
                    u = "";
                }
                if (u) {
                    axios_1.default
                        .get(u, getReqCfg("arraybuffer", true, REF))
                        .then((res) => {
                        let headers = res.headers;
                        response.writeHead(res.status, headers);
                        response.statusMessage = res.statusText;
                        response.end(res.data);
                    })
                        .catch((e) => {
                        log(request, request.url);
                        response.writeHead(500, {
                            "Content-Type": "text/plain",
                        });
                        response.statusMessage = e.message;
                        response.end(e.message);
                        if (!String(e.message).includes("Request failed with status code")) {
                            // 忽略 4xx, 5xx 错误
                            err("本地服务器出现错误: ", e.message);
                        }
                    });
                }
                else {
                    response.end(null);
                }
            }
            else if (request.url.startsWith("/openUrl/") &&
                getCfg("openUrl", true)) {
                let u;
                try {
                    u = new URL(request.url.substring("/openUrl/".length), "https://www.4399.com/");
                }
                catch (e) {
                    openUrl(request.url.substring("/openUrl/".length));
                    response.writeHead(200);
                    response.end(null);
                    return;
                }
                if (u.hostname.endsWith(".4399.com") &&
                    u.pathname.startsWith("/flash/")) {
                    getPlayUrl(u.href);
                }
                else if (u.hostname === "sbai.4399.com" &&
                    u.searchParams.get("4399id")) {
                    getPlayUrl("http://www.4399.com/flash/" +
                        u.searchParams.get("4399id") +
                        ".htm");
                }
                else {
                    openUrl(request.url.substring("/openUrl/".length));
                }
                response.writeHead(200);
                response.end(null);
            }
            else if (new URL(request.url, "http://localhost:" + PORT).pathname ===
                gamePath) {
                // 访问游戏入口页面直接返回数据
                let t = mime.getType(request.url ? request.url : "");
                t = t ? t : "text/html";
                response.writeHead(200, {
                    "content-security-policy": "allow-pointer-lock allow-scripts",
                    "content-type": t + "; charset=utf-8",
                    "access-control-allow-origin": "*",
                });
                response.end(DATA);
            }
            else {
                // 向 4399 服务器请求游戏文件
                axios_1.default
                    .get("http://" + server + request.url, getReqCfg("arraybuffer", false, REF))
                    .then((res) => {
                    let headers = res.headers;
                    headers["access-control-allow-origin"] = "*";
                    response.writeHead(res.status, headers);
                    response.statusMessage = res.statusText;
                    response.end(res.data);
                })
                    .catch((e) => {
                    log(request, request.url);
                    response.writeHead(500, {
                        "Content-Type": "text/plain",
                    });
                    response.statusMessage = e.message;
                    response.end(e.message);
                    if (!String(e.message).includes("Request failed with status code")) {
                        // 忽略 4xx, 5xx 错误
                        err("本地服务器出现错误: ", e.message);
                    }
                });
            }
        }
        catch (e) {
            response.writeHead(500, {
                "Content-Type": "text/plain",
            });
            response.end(String(e));
        }
    };
    if (HTTP_SERVER) {
        callback();
    }
    else {
        PORT = Number(getCfg("port", 44399));
        if (isNaN(PORT)) {
            PORT = 44399;
        }
        try {
            HTTP_SERVER = http
                .createServer(onRequest)
                .listen(PORT, "localhost", function () {
                log("本地服务器已启动");
                callback();
            })
                .on("error", (e) => {
                err("本地服务器启动时出错(第一次出现端口占用问题请忽略): ", e.stack);
                PORT += 1; // 端口第一次被占用时自动 +1
                HTTP_SERVER = http
                    .createServer(onRequest)
                    .listen(PORT, "localhost", function () {
                    log("本地服务器已启动");
                    callback();
                })
                    .on("error", (e) => {
                    err(e.stack);
                    HTTP_SERVER = undefined;
                });
            });
        }
        catch (e) {
            err(String(e));
            HTTP_SERVER = undefined;
        }
    }
}
function getReqCfg(responseType, noCookie = false, ref) {
    let c;
    if (!noCookie) {
        c = GlobalStorage(context).get("cookie");
    }
    return {
        baseURL: "http://www.4399.com",
        responseType: responseType,
        headers: {
            "user-agent": getCfg("user-agent"),
            referer: ref ? ref : getCfg("referer"),
            cookie: c && !noCookie ? c : "",
        },
    };
}
function openUrl(url) {
    if (!url) {
        return;
    }
    let u = new URL(url, "https://www.4399.com/").href;
    vscode.env.openExternal(vscode.Uri.parse(u));
}
function log(...arg) {
    if (!getCfg("outputLogs")) {
        return;
    }
    console.log("[4399 on VSCode]", ...arg);
}
function err(...arg) {
    vscode.window
        .showErrorMessage([...arg].join(" "), "切换开发人员工具(Ctrl+Shift+I)", "在 GitHub 上报告问题")
        .then((val) => {
        if (val === "在 GitHub 上报告问题") {
            openUrl("https://github.com/dsy4567/4399-on-vscode/issues");
        }
        else if (val === "切换开发人员工具(Ctrl+Shift+I)") {
            vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
        }
    });
    console.error("[4399 on VSCode]", ...arg);
    loaded(true);
}
function loaded(hide) {
    if (!statusBarItem.name) {
        statusBarItem.text = "$(loading~spin) " + "游戏加载中";
    }
    hide ? statusBarItem.hide() : statusBarItem.show();
}
function createQuickPick(o) {
    return new Promise((resolve, reject) => {
        let qp = vscode.window.createQuickPick();
        qp.title = o.title;
        qp.value = o.value || "";
        qp.placeholder = o.prompt;
        qp.canSelectMany = false;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        qp.ignoreFocusOut = true;
        resolve(qp);
    });
}
// 获取工作区配置
function getCfg(name, defaultValue = undefined) {
    return vscode.workspace
        .getConfiguration()
        .get("4399-on-vscode." + name, defaultValue);
}
function setCfg(name, val) {
    return vscode.workspace
        .getConfiguration()
        .update("4399-on-vscode." + name, val, true);
}
async function getServer(server_matched) {
    try {
        let res = await axios_1.default.get("http://www.4399.com" + server_matched[0].split('"')[1], getReqCfg("text", true));
        if (res.data) {
            log("成功获取到定义游戏服务器的脚本");
            return res.data.split('"')[1].split("/")[2];
        }
        else {
            throw new Error("无法获取定义游戏服务器的脚本: 响应文本为空, 您可能需要配置 UA 或登录账号");
        }
    }
    catch (e) {
        console.error(e);
        return (server_matched[0]
            .split('"')[1]
            .replace("/js/server", "")
            .replace(".js", "") + ".4399.com");
    }
}
// 获取 h5 页游的真实地址
function getPlayUrlForWebGames(urlOrId) {
    login(async (cookie) => {
        loaded(false);
        let i = urlOrId.split("/").at(-1);
        if (i && !isNaN(Number(i))) {
            urlOrId = i;
        }
        else {
            let i = urlOrId.split("gameId=").at(-1);
            if (i && !isNaN(Number(i))) {
                urlOrId = i;
            }
            else {
                return err("h5 页游链接格式不正确");
            }
        }
        let gameId = Number(urlOrId);
        if (isNaN(gameId)) {
            return err("h5 页游链接格式不正确");
        }
        try {
            let m = cookie.match(/Pauth=.+;/i);
            let cookieValue = "";
            if (m) {
                cookieValue = m[0].split("=")[1].split(";")[0];
            }
            if (!cookieValue) {
                return err("cookie 没有 Pauth 的值");
            }
            let data = (await axios_1.default.post("https://h.api.4399.com/intermodal/user/grant2", "gameId=" +
                gameId +
                "&authType=cookie&cookieValue=" +
                cookieValue, getReqCfg("json"))).data;
            if (data.data?.game?.gameUrl &&
                data.data.game.gameUrl !== "&addiction=0") {
                let url = "https://www.zxwyouxi.com/g/" + urlOrId;
                let title = decodeURI(data.data.game.gameName);
                title = title ? title : url;
                try {
                    gameInfoUrls[title] =
                        "http://www.4399.com/flash/" +
                            data.data.game.mainId +
                            ".htm";
                }
                catch (e) { }
                try {
                    let D = new Date();
                    updateHistory({
                        date: ` (${D.getFullYear()}年${D.getMonth() + 1}月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                        name: title,
                        webGame: true,
                        url: url,
                    });
                }
                catch (e) {
                    err("写入历史记录失败", String(e));
                }
                showWebviewPanel(data.data.game.gameUrl, title, "", true);
            }
            else {
                err("无法登录游戏, 或者根本没有这个游戏");
            }
        }
        catch (e) {
            err("无法获取游戏页面", String(e));
        }
    });
}
// 获取普通小游戏的真实地址
async function getPlayUrl(url) {
    if (url.startsWith("//")) {
        url = "http:" + url;
    }
    else if (url.startsWith("/")) {
        url = getReqCfg(undefined, true).baseURL + url;
    }
    try {
        loaded(false);
        let res = await axios_1.default.get(url, getReqCfg("arraybuffer"));
        if (res.data) {
            res.data = iconv.decode(res.data, "gb2312");
            log("成功获取到游戏页面");
            const $ = cheerio.load(res.data);
            const html = $.html();
            if (!html) {
                return err("无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏详情页阶段)");
            }
            let title = "";
            let m = null;
            m = html.match(/<title>.+<\/title>/i);
            if (!m) {
                title = $("title").html();
            }
            else {
                title = m[0]
                    .replace(/<\/?title>/gi, "")
                    .split(/[-_ |，,¦]/gi)[0]
                    .replaceAll(/[\n ]/gi, "");
            }
            let server_matched = html.match(/src\=\"\/js\/server.*\.js\"/i);
            let gamePath_matched = html.match(/\_strGamePath\=\".+\.(swf|htm[l]?)(\?.+)?\"/i);
            title = title ? title : url;
            if ($("title").text().includes("您访问的页面不存在！") &&
                res.status) {
                delete gameInfoUrls[title];
                return err("无法获取游戏信息: 游戏可能因为某些原因被删除");
            }
            gameInfoUrls[title] = url;
            if (!server_matched || !gamePath_matched) {
                // 游戏可能是 h5 页游
                let u1 = $("iframe#flash22").attr("src");
                let u2 = $("a.start-btn").attr("href");
                if (u1) {
                    return getPlayUrlForWebGames(u1);
                }
                if (u2) {
                    return getPlayUrlForWebGames(u2);
                }
                delete gameInfoUrls[title];
                err("正则匹配结果为空, 此扩展可能出现了问题, 也可能因为这个游戏是页游, 较新(约2006年6月以后或 AS3)的 flash 游戏或非 h5 游戏, 已自动为您跳转至游戏详情页面");
                return showWebviewPanel(url, title);
            }
            gamePath =
                "/4399swf" +
                    gamePath_matched[0]
                        .replace("_strGamePath=", "")
                        .replace(/["]/g, "");
            if (gamePath.includes("gameId=")) {
                try {
                    let u = new URL(gamePath, "http://www.4399.com/");
                    let i = u.searchParams.get("gameId");
                    if (i && !isNaN(Number(i))) {
                        return getPlayUrlForWebGames(i);
                    }
                }
                catch (e) { }
            }
            try {
                let D = new Date();
                updateHistory({
                    date: ` (${D.getFullYear()}年${D.getMonth() + 1}月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                    name: title,
                    webGame: false,
                    url: url,
                });
            }
            catch (e) {
                err("写入历史记录失败", String(e));
            }
            let s = await getServer(server_matched);
            let isFlashPage = false;
            // 简单地判断域名是否有效
            if (s === "127.0.0.1" ||
                s === "localhost" ||
                /[/:?#\\=&]/g.test(s)) {
                return err("游戏服务器域名 " + s + " 非法");
            }
            if (!s.endsWith(".4399.com") &&
                s !== "4399.com" &&
                (await vscode.window.showWarningMessage("游戏服务器域名 " +
                    s +
                    " 不以 4399.com 结尾, 是否仍要开始游戏", "是", "否")) !== "是") {
                return;
            }
            server = s;
            gameUrl = "http://" + s + gamePath;
            gameUrl
                ? (async () => {
                    if (!$("#skinbody > div:nth-child(7) > div.fl-box > div.intr.cf > div.eqwrap")[0] &&
                        !gamePath.includes(".swf")) {
                        isFlashPage = true;
                    }
                    try {
                        res = await axios_1.default.get(gameUrl, getReqCfg("arraybuffer"));
                        if (!res.data) {
                            return err("无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号 (错误发生在处理游戏真实页面阶段)");
                        }
                        if (isFlashPage &&
                            res.headers["content-type"]
                                .toLocaleLowerCase()
                                .includes("html")) {
                            let m = iconv.decode(res.data, "gb2312").match(/<embed.+src=".+.swf/i);
                            if (m) {
                                let fileName = m[0]
                                    .split('"')
                                    .at(-1);
                                if (fileName.includes("gameloader.swf")) {
                                    m = fileName.match(/gameswf=.+.swf/);
                                    if (m) {
                                        fileName = m[0]
                                            .split("=")
                                            .at(-1);
                                    }
                                }
                                gameUrl = gameUrl.replace(gameUrl.split("/").at(-1), fileName);
                                let u = new URL(gameUrl);
                                gamePath = u.pathname;
                                res.data = (await axios_1.default.get(gameUrl, getReqCfg("arraybuffer"))).data;
                            }
                        }
                        if (res.data) {
                            log("成功获取到游戏真实页面", gameUrl);
                            initHttpServer(() => {
                                DATA = res.data;
                                let u = new URL(gamePath, "http://localhost/");
                                u.port = String(PORT);
                                title = title ? title : url;
                                showWebviewPanel(u.toString(), title, gamePath.includes(".swf")
                                    ? "fl"
                                    : undefined, true);
                            });
                        }
                    }
                    catch (e) {
                        err("无法获取游戏真实页面: ", e);
                    }
                })()
                : (() => {
                    return err("游戏真实地址为空");
                })();
        }
        else {
            err("无法获取游戏页面: 响应文本为空, 您可能需要配置 UA 或登录账号");
            log(res);
        }
    }
    catch (e) {
        err("无法获取游戏页面: ", e);
    }
}
async function searchGames(s) {
    if (searchQp) {
        searchQp.show();
    }
    // let data: [string, number][];
    // let items: vscode.QuickPickItem[] = [];
    // let games: Record<string, number> = {};
    // let timeout: NodeJS.Timeout;
    // let pageNum = 1;
    searchQp = await createQuickPick({
        value: s ? String(s) : "",
        title: "4399 on VSCode: 搜索",
        prompt: "输入搜索词",
    });
    const search = (s) => {
        searchQp.busy = true;
        log("页码 " + searchPage);
        axios_1.default
            .get("https://so2.4399.com/search/search.php?k=" +
            encodeURI(s) +
            "&p=" +
            searchPage, getReqCfg("arraybuffer"))
            .then((res) => {
            if (res.data) {
                res.data = iconv.decode(res.data, "gb2312");
                log("成功获取到4399搜索页面");
                const $ = cheerio.load(res.data);
                searchedGames = {};
                searchData = [];
                searchQpItems = [];
                $("#skinbody > div.w_980.cf > div.anim > div > div > div.pop > b > a").each((i, elem) => {
                    let h = $(elem).html();
                    let u = $(elem).attr("href");
                    if (!h || !u) {
                        return;
                    }
                    let id = Number(u.split(/[/.]/gi).at(-2));
                    let n = h
                        .replace(/<font color=['"]?red['"]?>/, "")
                        .replace("</font>", "");
                    if (!id || isNaN(id) || !n) {
                        return;
                    }
                    searchData.push([n, id]);
                    searchedGames[n] = id;
                });
                searchData.forEach((g) => {
                    searchQpItems.push({
                        label: g[0],
                        description: "游戏 id: " + g[1],
                        alwaysShow: true,
                    });
                });
                searchQpItems.push({
                    label: "下一页",
                    description: "加载下一页内容",
                    alwaysShow: true,
                });
                searchQp.items = searchQpItems;
                searchQp.busy = false;
            }
        })
            .catch((e) => {
            err("无法获取4399首页: ", e);
        });
    };
    searchQp.onDidChangeValue((kwd) => {
        if (kwd === searchValue) {
            return (searchQp.items = searchQpItems);
        }
        searchValue = kwd;
        searchPage = 1;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQp.busy = true;
            axios_1.default
                .get("https://so2.4399.com/search/lx.php?k=" + encodeURI(kwd), getReqCfg("arraybuffer"))
                .then((res) => {
                if (!res.data) {
                    return err("获取搜索建议失败");
                }
                res.data = iconv.decode(res.data, "gb2312");
                let d = res.data;
                log(d);
                let m = d.split(" =")[1];
                searchedGames = {};
                searchData = [];
                searchQpItems = [];
                try {
                    if (!m) {
                        throw new Error("");
                    }
                    searchData = JSON.parse(m.replaceAll("'", '"'));
                }
                catch (e) {
                    return err("解析搜索建议失败");
                }
                searchQpItems.push({
                    label: searchQp.value,
                    description: "直接搜索",
                    alwaysShow: true,
                });
                searchData.forEach((g) => {
                    searchQpItems.push({
                        label: g[0],
                        description: "游戏 id: " + g[1],
                        alwaysShow: true,
                    });
                    searchedGames[g[0]] = g[1];
                });
                if (searchQpItems[0]) {
                    searchQp.items = searchQpItems;
                }
                searchQp.busy = false;
            })
                .catch((e) => {
                return err("获取搜索建议失败", String(e));
            });
        }, 1000);
    });
    searchQp.onDidAccept(() => {
        if (searchQp.activeItems[0].description === "直接搜索") {
            search(searchQp.value);
        }
        else if (searchQp.activeItems[0].label === "下一页") {
            searchPage++;
            search(searchQp.value);
        }
        else {
            getPlayUrl(`http://www.4399.com/flash/${searchedGames[searchQp.activeItems[0].label]}.htm`);
            searchQp.hide();
            GlobalStorage(context).set("kwd", searchQp.value);
        }
    });
    searchQp.show();
}
async function showGameInfo(url) {
    let u = Object.keys(gameInfoUrls);
    if (url) {
    }
    else if (u.length === 1) {
        url = gameInfoUrls[u[0]];
    }
    else if (u[1]) {
        let n = await vscode.window.showQuickPick(u);
        url = gameInfoUrls[n ? n : ""];
    }
    if (!url) {
        return err("无法显示这个游戏的详细信息, 或者未在玩游戏");
    }
    try {
        if (url.startsWith("/") && !url.startsWith("//")) {
            url = getReqCfg(undefined, true).baseURL + url;
        }
        const html = iconv.decode((await axios_1.default.get(url, getReqCfg("arraybuffer"))).data, "gb2312");
        if (!html) {
            return err("无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏详情页阶段)");
        }
        const $ = cheerio.load(html);
        const desc1 = $("#introduce > font").text().replaceAll(/[\n ]/gi, "");
        const desc2 = $("body > div.waper > div.content > div > div.box1.cf > div.intro.fl > div")
            .text()
            .replaceAll(/[\n ]/gi, "");
        const desc3 = $("body > div.main > div.w3.mb10 > div > div.bd_bg > div > div.w3_con1.cf > div.fl.con_l > div.cf.con_l1 > div.m11.fl > p")
            .text()
            .replaceAll(/[\n ]/gi, "");
        const desc4 = $("#cont").text().replaceAll(/[\n ]/gi, "");
        let desc = desc1 || desc2 || desc3 || desc4 || "未知";
        let title = $("title")
            .text()
            .split(/[-_ |，,¦]/gi)[0]
            .replaceAll(/[\n ]/gi, "");
        let gameId = url.split(/[/.]/gi).at(-2);
        title = title ? title : "未知";
        gameId = !gameId || isNaN(Number(gameId)) ? "未知" : gameId;
        vscode.window
            .showQuickPick([
            "🎮 游戏名: " + title,
            "📜 简介: " + desc,
            "🆔 游戏 id: " + gameId,
            "❤️ 添加到收藏盒",
            "🌏 在浏览器中打开详情页面",
            "💬 热门评论",
        ])
            .then(async (item) => {
            if (item) {
                try {
                    if (item.includes("添加到收藏盒")) {
                        login(async () => {
                            try {
                                await axios_1.default.get("https://gprp.4399.com/cg/add_collection.php?gid=" +
                                    gameId, getReqCfg("json"));
                                vscode.window.showInformationMessage("添加到收藏盒成功");
                            }
                            catch (e) {
                                err("添加到收藏盒失败", String(e));
                            }
                        });
                    }
                    else if (item.includes("在浏览器中打开详情页面")) {
                        openUrl(url);
                    }
                    else if (item.includes("热门评论")) {
                        const html = iconv.decode((await axios_1.default.get("https://cdn.comment.4399pk.com/nhot-" +
                            gameId +
                            "-1.htm", getReqCfg("arraybuffer"))).data, "utf8");
                        if (!html) {
                            return err("无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏评论页阶段)");
                        }
                        const $ = cheerio.load(html);
                        let items = [], tops = [];
                        $("#cntBox > div.zd > div.con").each((i, elem) => {
                            tops[i] = "[置顶评论] " + $(elem).text();
                        });
                        $(".lam .tex").each((i, elem) => {
                            items[i] = $(elem).text();
                        });
                        items.unshift(...tops);
                        vscode.window.showQuickPick(items).then((item) => {
                            if (item) {
                                vscode.window.showInformationMessage(item);
                            }
                        });
                    }
                    else {
                        vscode.window.showInformationMessage(item);
                    }
                }
                catch (e) {
                    err("无法获取游戏页面", String(e));
                }
            }
        });
    }
    catch (e) {
        err("无法获取游戏页面", String(e));
    }
}
function showWebviewPanel(url, title, type, hasIcon) {
    // try {
    //     panel.dispose();
    // } catch (e) {}
    const customTitle = getCfg("title");
    panel = vscode.window.createWebviewPanel("4399OnVscode", customTitle ? customTitle : title ? title : "4399 on VSCode", vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: getCfg("background", true),
    });
    panel.onDidDispose(() => {
        delete gameInfoUrls[title];
    });
    // 打开外链
    panel.webview.onDidReceiveMessage((m) => {
        log(m);
        if (m.open && getCfg("openUrl", true)) {
            openUrl(m.open);
        }
    }, undefined, context.subscriptions);
    // 注入脚本
    if (type !== "fl" && getCfg("injectionScript", true)) {
        try {
            if (url.endsWith(".html") || (url.endsWith(".htm") && DATA)) {
                const $ = cheerio.load(iconv.decode(DATA, "utf8"));
                $("head").append(getScript(GlobalStorage(context).get("cookie")));
                DATA = $.html();
            }
        }
        catch (e) {
            err("无法为游戏页面注入优化脚本", String(e));
        }
    }
    type === "fl"
        ? (panel.webview.html = getWebviewHtml_flash(url))
        : (panel.webview.html = getWebviewHtml_h5(url));
    if (!alerted) {
        alerted = true;
        vscode.window.showInformationMessage("温馨提示: 请在使用快捷键前使游戏失去焦点");
    }
    // 获取游戏图标
    let iconPath;
    let setIcon = () => {
        if (iconPath) {
            panel.iconPath = {
                light: iconPath,
                dark: iconPath,
            };
        }
    };
    if (hasIcon && getCfg("showIcon", true) && title) {
        try {
            let gameId = gameInfoUrls[title].split(/[/.]/gi).at(-2);
            if (gameId) {
                if (fs.existsSync(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`))) {
                    iconPath = vscode.Uri.file(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`));
                    setIcon();
                }
                else {
                    axios_1.default
                        .get(`https://imga1.5054399.com/upload_pic/minilogo/${gameId}.jpg`, getReqCfg("arraybuffer"))
                        .then((res) => {
                        if (res.data) {
                            fs.writeFile(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`), res.data, (e) => {
                                if (e) {
                                    console.error(String(e));
                                }
                                try {
                                    if (fs.existsSync(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`))) {
                                        iconPath = vscode.Uri.file(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`));
                                        setIcon();
                                    }
                                }
                                catch (e) {
                                    console.error(String(e));
                                }
                            });
                        }
                    })
                        .catch((e) => {
                        console.error(String(e));
                    });
                }
            }
        }
        catch (e) {
            console.error(String(e));
        }
    }
    loaded(true);
}
function login(callback, loginOnly = false) {
    loaded(true);
    if (GlobalStorage(context).get("cookie")) {
        if (loginOnly) {
            return vscode.window
                .showInformationMessage("是否退出登录?", "是", "否")
                .then((value) => {
                if (value === "是") {
                    GlobalStorage(context).set("cookie", "");
                    vscode.window.showInformationMessage("退出登录成功");
                }
            });
        }
        return callback(GlobalStorage(context).get("cookie"));
    }
    if (!GlobalStorage(context).get("cookie")) {
        if (!loginOnly) {
            vscode.window.showInformationMessage("请登录后继续");
        }
        vscode.window
            .showQuickPick(["🆔 使用账号密码登录", "🍪 使用 cookie 登录"])
            .then((value) => {
            if (value?.includes("使用 cookie 登录")) {
                vscode.window
                    .showInputBox({
                    title: "4399 on VSCode: 登录(使用 cookie)",
                    prompt: "请输入 cookie, 获取方法请见扩展详情页, 登录后, 您可以玩页游或者使用其它需要登录的功能",
                })
                    .then((c) => {
                    if (c) {
                        try {
                            let parsedCookie = cookie.parse(c);
                            if (!parsedCookie["Pauth"]) {
                                return err("登录失败, cookie 没有 Pauth 值");
                            }
                            GlobalStorage(context).set("cookie", encodeURI(c));
                            let welcomeMsg = "";
                            if (parsedCookie["Pnick"]) {
                                welcomeMsg = `亲爱的 ${parsedCookie["Pnick"]}, 您已`;
                            }
                            vscode.window.showInformationMessage(welcomeMsg +
                                "登录成功, 请注意定期更新 cookie");
                            callback(encodeURI(c));
                        }
                        catch (e) {
                            return err("登录失败, 其它原因", String(e));
                        }
                    }
                });
            }
            else if (value?.includes("使用账号密码登录")) {
                vscode.window
                    .showInputBox({
                    title: "4399 on VSCode: 登录(使用账号密码)",
                    prompt: "请输入 4399 账号",
                })
                    .then((user) => {
                    if (user) {
                        vscode.window
                            .showInputBox({
                            title: "4399 on VSCode: 登录(使用账号密码)",
                            prompt: "请输入密码",
                            password: true,
                        })
                            .then(async (pwd) => {
                            if (pwd) {
                                try {
                                    const r = await axios_1.default.post("https://ptlogin.4399.com/ptlogin/login.do?v=1", `username=${user}&password=${pwd}`, getReqCfg("arraybuffer", true));
                                    const html = iconv.decode(r.data, "utf8");
                                    const $ = cheerio.load(html);
                                    const msg = $("#Msg");
                                    if (msg.text()) {
                                        return err("登录失败, ", msg
                                            .text()
                                            .replace(/[\n\r\t ]/gi, ""));
                                    }
                                    let c = r.headers["set-cookie"];
                                    let cookies = [];
                                    // 合并多个 set-cookie
                                    if (c && c[0]) {
                                        c.forEach((co) => {
                                            cookies.push(cookie.parse(co));
                                        });
                                        cookies = Object.assign({}, ...cookies, {
                                            Path: "/",
                                            Domain: "4399.com",
                                        });
                                        cookies =
                                            objectToQuery(cookies);
                                        let parsedCookie = cookie.parse(cookies);
                                        if (!parsedCookie["Pauth"]) {
                                            return err("登录失败, cookie 没有 Pauth 值");
                                        }
                                        GlobalStorage(context).set("cookie", encodeURI(cookies));
                                        let welcomeMsg = "";
                                        if (parsedCookie["Pnick"]) {
                                            welcomeMsg = `亲爱的 ${parsedCookie["Pnick"]}, 您已`;
                                        }
                                        vscode.window.showInformationMessage(welcomeMsg +
                                            "登录成功, 请注意定期重新登录");
                                        callback(encodeURI(cookies));
                                    }
                                    else {
                                        return err("登录失败, 响应头没有 set-cookie");
                                    }
                                }
                                catch (e) {
                                    return err("登录失败, 其它原因", String(e));
                                }
                            }
                        });
                    }
                });
            }
        });
    }
}
function updateHistory(history) {
    if (!getCfg("updateHistory", true)) {
        return;
    }
    let h = GlobalStorage(context).get("history");
    if (!h || (typeof h === "object" && !h[0])) {
        h = [];
    }
    h.unshift(history);
    GlobalStorage(context).set("history", h);
}
function objectToQuery(obj, prefix) {
    if (typeof obj !== "object") {
        return "";
    }
    const attrs = Object.keys(obj);
    return attrs.reduce((query, attr, index) => {
        // 判断是否是第一层第一个循环
        if (index === 0 && !prefix) {
            query += "";
        }
        if (typeof obj[attr] === "object") {
            const subPrefix = prefix ? `${prefix}[${attr}]` : attr;
            query += objectToQuery(obj[attr], subPrefix);
        }
        else {
            if (prefix) {
                query += `${prefix}[${attr}]=${obj[attr]}`;
            }
            else {
                query += `${attr}=${obj[attr]}`;
            }
        }
        // 判断是否是第一层最后一个循环
        if (index !== attrs.length - 1) {
            query += ";";
        }
        return query;
    }, "");
}
function activate(ctx) {
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.random", () => {
        getPlayUrl("https://www.4399.com/flash/" +
            String(Math.floor(Math.random() * 10000) + 200000) +
            ".htm");
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.get", () => {
        let i = GlobalStorage(ctx).get("id1");
        vscode.window
            .showInputBox({
            value: i ? String(i) : "222735",
            title: "4399 on VSCode: 输入游戏 id",
            prompt: "输入 http(s)://www.4399.com/flash/ 后面的数字(游戏 id)",
        })
            .then((id) => {
            if (id) {
                log("用户输入 ", id);
                GlobalStorage(ctx).set("id1", id);
                getPlayUrl("https://www.4399.com/flash/" + id + ".htm");
            }
        });
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.get-h5-web-game", () => {
        let i = GlobalStorage(ctx).get("id2");
        vscode.window
            .showInputBox({
            value: i ? String(i) : "100060323",
            title: "4399 on VSCode: 输入游戏 id",
            prompt: "输入 http(s)://www.zxwyouxi.com/g/ 后面的数字(游戏 id)",
        })
            .then((id) => {
            if (id) {
                log("用户输入 ", id);
                GlobalStorage(ctx).set("id2", id);
                getPlayUrlForWebGames("https://www.zxwyouxi.com/g/" + id);
            }
        });
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.special", () => {
        axios_1.default
            .get("https://www.4399.com/", getReqCfg("arraybuffer"))
            .then((res) => {
            if (res.data) {
                res.data = iconv.decode(res.data, "gb2312");
                log("成功获取到4399首页");
                const $ = cheerio.load(res.data);
                let gameNames = [], urls = [];
                $("#skinbody > div.middle_3.cf > div.box_c > div.tm_fun.h_3 > ul > li > a[href*='/flash/']").each((i, elem) => {
                    urls[i] = $(elem).attr("href");
                });
                $("#skinbody > div.middle_3.cf > div.box_c > div.tm_fun.h_3 > ul > li > a[href*='/flash/'] > img").each((i, elem) => {
                    gameNames[i] = $(elem).attr("alt");
                });
                if (!gameNames[0] || !urls[0]) {
                    return err("一个推荐的游戏也没有");
                }
                vscode.window
                    .showQuickPick(gameNames)
                    .then((val) => {
                    log("用户输入:", val);
                    if (!val) {
                        return;
                    }
                    let index = gameNames.indexOf(val);
                    log("游戏页面: ", urls[index]);
                    if (index !== -1) {
                        let url = urls[index];
                        if (!url) {
                            return err("变量 url 可能为 undefined");
                        }
                        getPlayUrl(url);
                    }
                    else {
                        log("用户似乎取消了操作");
                    }
                });
            }
        })
            .catch((e) => {
            err("无法获取4399首页: ", e);
        });
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.search", () => {
        let s = GlobalStorage(ctx).get("kwd"); // 上次搜索词
        searchGames(s);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.my", () => {
        login((c) => {
            let Pnick = cookie.parse(c)["Pnick"] || "未知";
            Pnick = Pnick === "0" ? "未知" : Pnick;
            vscode.window
                .showQuickPick([
                "🆔 昵称: " + Pnick,
                "❤️ 我的收藏盒",
                "✨ 猜你喜欢",
                "🕒 我玩过的",
                "🖊 签到",
                "🚪 退出登录",
            ])
                .then(async (value) => {
                if (value) {
                    const getGames = async (url, index = "recommends") => {
                        try {
                            let favorites = (await axios_1.default.get(url, getReqCfg("json"))).data;
                            let _favorites = {};
                            let names = [];
                            if (favorites &&
                                favorites.game_infos &&
                                favorites[index]) {
                                let info = favorites.game_infos;
                                favorites[index].forEach((o) => {
                                    let id = typeof o === "number"
                                        ? o
                                        : o.gid;
                                    _favorites[info[id].name] =
                                        info[id].c_url;
                                    names.push(info[id].name);
                                });
                                vscode.window
                                    .showQuickPick(names)
                                    .then((game) => {
                                    if (game) {
                                        getPlayUrl(_favorites[game]);
                                    }
                                });
                            }
                        }
                        catch (e) {
                            err("获取失败", String(e));
                        }
                    };
                    if (value.includes("我的收藏")) {
                        getGames("https://gprp.4399.com/cg/collections.php?page_size=999", "games");
                    }
                    else if (value.includes("猜你喜欢")) {
                        getGames("https://gprp.4399.com/cg/recommend_by_both.php?page_size=100", "recommends");
                    }
                    else if (value.includes("我玩过的")) {
                        getGames("https://gprp.4399.com/cg/get_gamehistory.php?page_size=100", "played_gids");
                    }
                    else if (value.includes("签到")) {
                        try {
                            let data = (await axios_1.default.get("https://my.4399.com/plugins/sign/set-t-" +
                                new Date().getTime(), getReqCfg("json"))).data;
                            if (typeof data.result === "string") {
                                vscode.window.showInformationMessage(data.result);
                            }
                            else if (typeof data.result === "object") {
                                vscode.window.showInformationMessage(`签到成功, 您已连续签到${data.result.days}天`);
                            }
                            else {
                                err("签到失败, 返回数据格式不正确");
                            }
                        }
                        catch (e) {
                            err("签到失败: ", String(e));
                        }
                    }
                    else if (value.includes("退出登录")) {
                        login(() => { }, true);
                    }
                }
            });
        });
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.info", async () => {
        showGameInfo();
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.history", () => {
        try {
            let h = GlobalStorage(ctx).get("history");
            if (!h || (typeof h === "object" && !h[0])) {
                h = [];
            }
            h.unshift({
                webGame: false,
                name: "🧹 清空历史记录",
                url: "",
                date: "",
            });
            let quickPickList = [];
            h.forEach((obj) => {
                quickPickList.push(obj.name + obj.date);
            });
            vscode.window.showQuickPick(quickPickList).then((gameName) => {
                if (gameName === "🧹 清空历史记录") {
                    return GlobalStorage(ctx).set("history", []);
                }
                if (gameName) {
                    for (let index = 0; index < h.length; index++) {
                        const item = h[index];
                        if (item.name + item.date === gameName) {
                            if (item.webGame) {
                                getPlayUrlForWebGames(item.url);
                            }
                            else {
                                getPlayUrl(item.url);
                            }
                            break;
                        }
                    }
                }
            });
        }
        catch (e) {
            err("无法读取历史记录", String(e));
        }
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode.forums", async () => {
        try {
            if (threadQp) {
                threadQp.show();
            }
            // let threadData: [string, number][];
            // let threadQpItems: vscode.QuickPickItem[] = [];
            // let forums: Record<string, number> = {};
            // let threadTimeout: NodeJS.Timeout;
            // let threadPage = 1;
            let k = GlobalStorage(ctx).get("kwd-forums"); // 上次搜索词
            threadQp = await createQuickPick({
                value: k ? k : "",
                title: "4399 on VSCode: 逛群组",
                prompt: "搜索群组",
            });
            const geThreads = async (id) => {
                threads = {};
                threadData = [];
                threadQpItems = [];
                threadQp.busy = true;
                log("帖子 id: " + id);
                let d = (await axios_1.default.get(`https://my.4399.com/forums/mtag-${id}`, getReqCfg("arraybuffer"))).data;
                if (d) {
                    const $ = cheerio.load(d);
                    threads = {};
                    threadData = [];
                    // 获取标题和类型
                    $("div.listtitle > div.title").each((i, elem) => {
                        let $title = $(elem).children("a.thread_link");
                        let id = Number($title.attr("href")?.split("-").at(-1));
                        let title = $title.text();
                        let type = $(elem).children("a.type").text();
                        if (!id || isNaN(id) || !title) {
                            return;
                        }
                        type = type ? type : "[顶] ";
                        title = type + title;
                        threadData.push([title, id]);
                        threads[title] = id;
                    });
                    threadData.forEach((g) => {
                        threadQpItems.push({
                            label: g[0],
                            description: "进入帖子",
                            alwaysShow: true,
                        });
                        threads[g[0]] = g[1];
                    });
                    threadQpItems.push({
                        label: "到底了",
                        description: "只展示第一页内容",
                        alwaysShow: true,
                    });
                    if (threadQpItems[0]) {
                        threadQp.items = threadQpItems;
                    }
                    threadQp.busy = false;
                }
                else {
                    err("无法获取群组页面");
                }
            };
            const search = (kwd) => {
                clearTimeout(threadTimeout);
                log("页码: " + threadPage);
                threadTimeout = setTimeout(() => {
                    threadQp.busy = true;
                    axios_1.default
                        .get("http://my.4399.com/forums/index-getMtags?type=game&keyword=" +
                        encodeURI(kwd ? kwd : "") +
                        "&page=" +
                        threadPage, getReqCfg("arraybuffer"))
                        .then((res) => {
                        if (!res.data) {
                            return err("获取搜索建议失败");
                        }
                        res.data = iconv.decode(res.data, "utf8");
                        let d = res.data;
                        const $ = cheerio.load(d);
                        threads = {};
                        threadData = [];
                        threadQpItems = [];
                        $("ul > li > a > span.title").each((i, elem) => {
                            let g = $(elem).text();
                            let id = $(elem)
                                .parent()
                                .attr("href")
                                ?.split("-")
                                ?.at(-1);
                            if (!id || isNaN(Number(id))) {
                                return;
                            }
                            id = Number(id);
                            threadData.push([g, id]);
                            threads[g] = id;
                        });
                        threadData.forEach((g) => {
                            threadQpItems.push({
                                label: g[0],
                                description: "群组 id: " + g[1],
                                alwaysShow: true,
                            });
                            threads[g[0]] = g[1];
                        });
                        threadQpItems.push({
                            label: "下一页",
                            description: "加载下一页内容",
                            alwaysShow: true,
                        });
                        if (threadQpItems[0]) {
                            threadQp.items = threadQpItems;
                        }
                        threadQp.busy = false;
                    })
                        .catch((e) => {
                        return err("获取搜索建议失败", String(e));
                    });
                }, 1000);
            };
            threadQp.onDidChangeValue((kwd) => {
                if (kwd === threadSearchValue) {
                    return (threadQp.items = threadQpItems);
                }
                threadSearchValue = kwd;
                threadPage = 1;
                search(kwd);
            });
            threadQp.onDidAccept(async () => {
                if (threadQp.activeItems[0].label === "下一页") {
                    threadPage++;
                    search(threadQp.value);
                }
                else if (threadQp.activeItems[0].description?.includes("群组 id")) {
                    geThreads(threads[threadQp.activeItems[0].label]);
                    GlobalStorage(context).set("kwd-forums", threadQp.value);
                }
                else if (threadQp.activeItems[0].description === "进入帖子") {
                    try {
                        if (threadQp.activeItems[0].label) {
                            threadQp.hide();
                            let id = threads[threadQp.activeItems[0].label];
                            let d = (await axios_1.default.get(`https://my.4399.com/forums/thread-${id}`, getReqCfg("arraybuffer"))).data;
                            if (d) {
                                const $ = cheerio.load(d);
                                let title = $("div.host_main_title > a").text();
                                if (!title) {
                                    err("无法获取帖子页面: 标题为空");
                                }
                                // 强制使用 http
                                $("img").each((i, elem) => {
                                    let s = $(elem).attr("src");
                                    if (s && !s.startsWith("http")) {
                                        s = s.replace("//", "http://");
                                        $(elem).attr("src", s);
                                    }
                                });
                                // 解除防盗链限制
                                $("img").each((i, elem) => {
                                    let s = "http://localhost:" +
                                        PORT +
                                        "/proxy/" +
                                        $(elem).attr("src");
                                    $(elem).attr("src", s);
                                });
                                $(".host_content.user_content.j-thread-content").css();
                                let html = `
                                        <style>* {color: #888;}</style>
                                        <h1>${title}</h1>
                                        <a href="https://my.4399.com/forums/thread-${id}">在浏览器中打开</a> ` +
                                    String($($(".post_author_name_text")[0]).text()) +
                                    " " +
                                    String($(".host_title").html()) +
                                    " " +
                                    String($(".host_content.user_content.j-thread-content").html());
                                initHttpServer(() => {
                                    panel =
                                        vscode.window.createWebviewPanel("4399OnVscode", title
                                            ? title
                                            : "4399 on VSCode", vscode.ViewColumn.Active, {});
                                    panel.webview.html = html;
                                }, "http://my.4399.com/");
                            }
                            else {
                                err("无法获取帖子页面");
                            }
                        }
                    }
                    catch (e) {
                        err("无法获取帖子页面", String(e));
                    }
                }
            });
            threadQp.show();
            if (!threadSearchValue) {
                search(k ? k : "");
            }
        }
        catch (e) {
            err("无法获取群组页面", String(e));
        }
    }));
    context = ctx;
    fs.mkdir(path.join(DATA_DIR, "cache/icon"), { recursive: true }, (err) => { });
    fs.mkdir(path.join(DATA_DIR, "scripts"), { recursive: true }, (err) => { });
    if (!fs.existsSync(path.join(DATA_DIR, "scripts/example.html"))) {
        fs.writeFile(path.join(DATA_DIR, "scripts/example.html"), `\
<!-- 由 4399 on VSCode 创建的示例 HTML 代码片段 -->
<script>
    // 打开链接
    // fetch("/openUrl/https://www.4399.com/flash/227465.htm")
    // 屏蔽广告
    /*
    window.addEventListener("load", () => {
        h5api.playAd = function (cb) {
            cb({
                code: 10001,
                message: "播放结束",
            });
        };
        h5api.canPlayAd = function (cb) {
            cb({
                canPlayAd: true,
                remain: 99999,
            });
            return true;
        };
    });
    */
</script>
<style>
    /*
    .myDiv{
        color: #fff;
    }
    */
</style>
`, (err) => { });
    }
    console.log("4399 on VSCode is ready!");
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map
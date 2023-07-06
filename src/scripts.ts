/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { DATA_DIR, err, getCfg, is4399Domain } from "./utils";

/** 获取要注入的 HTML 代码片段 */
const getScript = (
    cookie: string = "",
    includeDefaultScript: boolean = true,
    server: string
): string => {
    if (!getCfg("injectionScripts", true))
        return getCfg("enableProxy") && getCfg("enableServiceWorker")
            ? 'navigator.serviceWorker.register("/sw-4ov.js");'
            : "navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})";
    let s = "";
    const f = ((getCfg("scripts") as string) || "").split(", ");
    f.forEach(file => {
        if (file)
            try {
                s += fs
                    .readFileSync(path.join(DATA_DIR, "html-scripts/", file))
                    .toString();
            } catch (e) {
                err(
                    `读取 HTML 代码片段文件 ${path.join(
                        DATA_DIR,
                        "html-scripts/",
                        file
                    )} 时出错`,
                    e
                );
            }
    });

    return (
        (includeDefaultScript
            ? `
<style>
html, body {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

p.tip4ov {
    color: #888;
    position: absolute;
    top: 0;
    z-index: -1;
}
</style>
<script>
// 强制设置 referrer
Object.defineProperty(document, "referrer", {
    value: "https://www.4399.com/",
    writable: true,
});
// 强制设置 cookie
Object.defineProperty(document, "cookie", {
    value: \`${is4399Domain(server) ? cookie.replaceAll(";", "; ") : ""}\`,
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
        fetch("/_4ov/openUrl/" + url);
    },
    writable: true,
});
// 加载提示
document.documentElement.insertAdjacentHTML("beforeend", "<p class='tip4ov'>游戏正在加载，第一次加载需要一些时间，请耐心等待</p>");

${
    getCfg("enableProxy") && getCfg("enableServiceWorker")
        ? 'navigator.serviceWorker.register("/sw-4ov.js");'
        : "navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})"
}
</script>
`
            : "") + s
    );
};
const getWebviewHtml_h5 = (
    fullWebServerUri: vscode.Uri | string,
    w: string | number = "100%",
    h: string | number = "100vh"
) => `
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
                width: ${typeof w === "string" ? w : w + "%"};
                height: ${
                    typeof h === "string" ? h.replace("%", "vh") : h + "vh"
                };
            }

            p {
                color: #888;
                position: absolute;
                top: 0;
                z-index: -1;
            }
        </style>
        <iframe id="ifr" src="" frameborder="0"></iframe>
        <p>游戏正在加载，第一次加载需要一些时间，请耐心等待</p>
        <script>
            const IFR_FULL_WEB_SERVER_URI = "${String(
                fullWebServerUri
            )}".replaceAll("%3D","=").replaceAll("%26","&")
            console.log(IFR_FULL_WEB_SERVER_URI);
            ifr.src = IFR_FULL_WEB_SERVER_URI;
        </script>
    </body>
</html>

`;
const getWebviewHtml_flash = (
    fullWebServerUri: vscode.Uri | string,
    server: string,
    w: string | number = "100%",
    h: string | number = "100%"
) => `
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
            // 打开链接
            Object.defineProperty(window, "open", {
                value: (url) => {
                    console.log(url);
                    fetch("/_4ov/openUrl/" + url);
                },
                writable: true,
            });
            ${
                getCfg("enableProxy") && getCfg("enableServiceWorker")
                    ? 'navigator.serviceWorker.register("/sw-4ov.js");'
                    : "navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})"
            }
        </script>
        ${getScript("", false, server)}
        <script>
            window.play = function (url) {
                var html =
                    '<object id="flashgame" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0" width="100%" height="100%"><param id="game" name="movie" value="' +
                    url +
                    '" /><embed id="flashgame1" name="flashgame" src="' +
                    url +
                    '" quality="high" pluginspage="//www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" width="${
                        typeof w === "string" ? w : w + "%"
                    }" height="${
    typeof h === "string" ? h : h + "%"
}" /> <param name="quality" value="high" /></object>';
                document.body.innerHTML =html
            };
        </script>
        <script src="${(() => {
            try {
                const u = new URL(getCfg("RuffleSource"));
                return u;
            } catch (e) {
                return "https://unpkg.com/@ruffle-rs/ruffle/ruffle.js";
            }
        })()}"></script>
    </head>
    <body style="height: 100%;margin: 0;padding: 0;">
        <p style=color #888;">游戏正在加载，第一次加载需要一些时间，请耐心等待</p>
        <script>
            const IFR_FULL_WEB_SERVER_URI = "${String(
                fullWebServerUri
            )}".replaceAll("%3D","=").replaceAll("%26","&")
            let u = new URL(IFR_FULL_WEB_SERVER_URI)
            u.path = "/_4ov/flash"
            console.log(u);
            window.play(u);
        </script>
    </body>
</html>
`;

export { getScript, getWebviewHtml_flash, getWebviewHtml_h5 };

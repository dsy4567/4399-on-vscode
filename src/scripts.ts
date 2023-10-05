/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { scripts } from ".";
import { getUid } from "./account";
import {
    DATA_DIR,
    createQuickPick,
    err,
    getCfg,
    getContext,
    httpRequest,
    is4399Domain,
    openUrl,
    setCfg,
    showWebviewPanel,
} from "./utils";

const defaultRuffleSource = "https://unpkg.com/@ruffle-rs/ruffle/ruffle.js";

/** 获取要注入的 HTML 代码片段 */
const getScript = (
    cookie: string = "",
    registerServiceWorker: boolean = true,
    server: string = "",
    gameType: "flash" | "h5" | "other" = "h5"
): string => {
    if (!getCfg("injectionScripts", true))
        return registerServiceWorker
            ? getCfg("enableProxy") && getCfg("enableServiceWorker")
                ? 'navigator.serviceWorker.register("/sw-4ov.js");'
                : "navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})"
            : "";
    let s = "";
    const f = (getCfg("htmlScripts", []) as scripts.ScriptConfig[]).map(item =>
        item?.enabled ? item.filename : ""
    );
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
        `
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
"use strict";

const __4399_on_vscode__ = {
    gameType: "${gameType}",
    userID: ${getUid()},
    version: [${(
        getContext().extension.packageJSON.version as string | undefined
    )
        ?.split(".")
        .map(n => +n)}],
}
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
    value: url => {
        let u = new URL(url, location.href);
        u = u.href.replaceAll(location.host, "_4ov-server");
        fetch("/_4ov/openUrl/" + u);
    },
    writable: true,
});
addEventListener("click", ev => {
    if (ev.target?.tagName === "A" && ev.target.href) {
        ev.preventDefault();
        let u = new URL(ev.target.href, location.href);
        if (ev.target.pathname !== location.pathname && !u.hash) {
            u.href = u.href.replaceAll(location.host, "_4ov-server");
            open(u.href);
        }
    }
});
// 加载提示
document.documentElement.insertAdjacentHTML("beforeend", "<p class='tip4ov'>游戏正在加载，第一次加载需要一些时间，请耐心等待</p>");

// serviceWorker
${
    registerServiceWorker
        ? getCfg("enableProxy") && getCfg("enableServiceWorker")
            ? 'navigator.serviceWorker.register("/sw-4ov.js");'
            : "navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})"
        : ""
}
</script>
` + s
    );
};
/** 获取用于运行 H5 游戏的 HTML 代码 */
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
/** 获取用于运行 Flash 游戏的 HTML 代码 */
const getWebviewHtml_flash = (
    fullWebServerUri: vscode.Uri | string,
    server = "",
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
            window.play = function (url) {
                const html =
                    '<object id="flashgame" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0" width="100%" height="100%"><param id="game" name="movie" value="' +
                    url +
                    '" /><embed id="flashgame1" name="flashgame" src="' +
                    url +
                    '" quality="high" pluginspage="//www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" width="${
                        typeof w === "string" ? w : w + "%"
                    }" height="${
    typeof h === "string" ? h : h + "%"
}" /> <param name="quality" value="high" /></object>';
                document.body.innerHTML = html
            };
        </script>
        <script src="${(() => {
            try {
                const u = new URL(getCfg("RuffleSource"));
                return u;
            } catch (e) {
                return defaultRuffleSource;
            }
        })()}"></script>
        ${getScript("", true, server, "flash")}
    </head>
    <body style="height: 100%;margin: 0;padding: 0;">
        <p style=color #888;">游戏正在加载，第一次加载需要一些时间，请耐心等待</p>
        <script>
            const IFR_FULL_WEB_SERVER_URI = "${String(
                fullWebServerUri
            )}".replaceAll("%3D","=").replaceAll("%26","&")
            let u = new URL(IFR_FULL_WEB_SERVER_URI)
            u.pathname = "/_4ov/flash"
            console.log(u);
            window.play(u);
        </script>
    </body>
</html>
`;
/** 管理 HTML 代码片段 */
async function manageScripts() {
    try {
        let scriptsQp = createQuickPick({
                title: "管理 HTML 代码片段",
            }),
            installedItems: (scripts.ScriptConfig | null)[] = getCfg(
                "htmlScripts",
                []
            ),
            onlineQpItems: scripts.OnlineScriptQuickPickItem[] = [],
            qpItems: scripts.ScriptsQuickPickItem[] = [];

        const updateQpItems = async (updateConfig = true) => {
            let s: Set<string> = new Set(),
                remove: number[] = [];

            scriptsQp.busy = true;
            qpItems = [];

            qpItems.push({
                label: "已安装",
                kind: vscode.QuickPickItemKind.Separator,
            });
            installedItems.forEach((installedItem, i) => {
                if (
                    !installedItem ||
                    !installedItem.filename ||
                    s.has(installedItem.filename)
                )
                    return remove.push(i);
                s.add(installedItem.filename);

                const id = installedItem.filename.split(".")[0];
                qpItems.push({
                    label: installedItem.displayName,
                    description: installedItem.filename,
                    buttons: [
                        {
                            tooltip: "简介",
                            iconPath: new vscode.ThemeIcon("info"),
                            action() {
                                showWebviewPanel(
                                    `https://dsy4567.github.io/4ov-scripts/${id}/`,
                                    installedItem.displayName || "简介",
                                    "",
                                    true,
                                    false
                                );
                            },
                        },
                        {
                            tooltip: installedItem.enabled ? "禁用" : "启用",
                            iconPath: new vscode.ThemeIcon(
                                installedItem.enabled
                                    ? "debug-breakpoint-unverified"
                                    : "debug-breakpoint"
                            ),
                            action() {
                                installedItem.enabled = !installedItem.enabled;
                                updateQpItems();
                            },
                        },
                        {
                            tooltip: "更新",
                            iconPath: new vscode.ThemeIcon("arrow-circle-up"),
                            async action() {
                                installOrUpdateScript(
                                    id,
                                    installedItem.displayName,
                                    installedItem
                                );
                            },
                        },
                        {
                            tooltip: "移除",
                            iconPath: new vscode.ThemeIcon("trashcan"),
                            action() {
                                installedItem.filename = "";
                                try {
                                    fs.rmSync(
                                        path.join(
                                            DATA_DIR,
                                            "html-scripts/",
                                            id + ".html"
                                        )
                                    );
                                } catch (e) {}
                                vscode.window.showInformationMessage(
                                    "移除成功: " + installedItem.displayName
                                );
                                updateQpItems();
                            },
                        },
                    ],
                });
            });
            remove.forEach((r, i) => {
                installedItems.splice(r + i, 1);
            });
            qpItems.push(
                {
                    label: "全部",
                    kind: -1,
                },
                ...onlineQpItems
            );

            scriptsQp.items = qpItems;

            if (updateConfig) {
                await setCfg("htmlScripts", installedItems);

                scriptsQp.busy = false;
            }
        };
        const installOrUpdateScript = async (
            id: string,
            displayName: string,
            installedItem?: scripts.ScriptConfig
        ) => {
            scriptsQp.busy = true;
            fs.writeFileSync(
                path.join(DATA_DIR, "html-scripts/", id + ".html"),
                (
                    await httpRequest.get(
                        `https://dsy4567.github.io/4ov-scripts/${id}/${id}.html`,
                        "arraybuffer"
                    )
                ).data
            );

            if (installedItem) {
                installedItem.displayName = displayName;
                installedItem.filename = id + ".html";
            } else {
                let installed = false;
                for (const item of installedItems)
                    if (item?.filename.split(".")[0] === id) {
                        item.displayName = displayName;
                        installed = true;
                        break;
                    }
                !installed &&
                    installedItems.push({
                        displayName: displayName,
                        enabled: true,
                        filename: id + ".html",
                    });
            }
            vscode.window.showInformationMessage("安装成功: " + displayName);
            updateQpItems();
        };

        scriptsQp.busy = true;
        const prom = httpRequest.get(
            "https://dsy4567.github.io/4ov-scripts/download.html",
            "text"
        );
        updateQpItems(false).then(() => {
            prom.then(res => {
                const $ = cheerio.load(res.data);
                $("ul#items > li").each((i, el) => {
                    const dataset = $(el).data() as Record<string, string>;
                    const id = dataset["id"],
                        displayName = dataset["displayName"];
                    if (!id) return;

                    const o: scripts.OnlineScriptQuickPickItem = {
                        label: displayName,
                        description: id + ".html",
                        buttons: [
                            {
                                tooltip: "简介",
                                iconPath: new vscode.ThemeIcon("info"),
                                action() {
                                    showWebviewPanel(
                                        `https://dsy4567.github.io/4ov-scripts/${id}/`,
                                        displayName,
                                        "",
                                        true,
                                        false
                                    );
                                },
                            },
                            {
                                tooltip: "安装或更新",
                                iconPath: new vscode.ThemeIcon(
                                    "cloud-download"
                                ),
                                action() {
                                    installOrUpdateScript(id, displayName);
                                },
                            },
                        ],
                    };
                    onlineQpItems.push(o);
                });
                updateQpItems(false);
                scriptsQp.busy = false;
            }).catch(e => {
                err("无法获取 HTML 代码片段下载页", e);
                scriptsQp.busy = false;
            });
        });

        scriptsQp.keepScrollPosition = true;
        scriptsQp.buttons = [
            {
                tooltip: "了解更多",
                iconPath: new vscode.ThemeIcon("globe"),
                action() {
                    openUrl("https://dsy4567.github.io/4ov-scripts/");
                },
            },
            {
                tooltip: "反馈/贡献",
                iconPath: new vscode.ThemeIcon("feedback"),
                action() {
                    openUrl("https://github.com/dsy4567/4ov-scripts/issues");
                },
            },
        ];
        scriptsQp.onDidHide(() => scriptsQp.dispose());
        scriptsQp.show();
    } catch (e) {
        err(e);
    }
}

export { getScript, getWebviewHtml_h5, getWebviewHtml_flash, manageScripts };

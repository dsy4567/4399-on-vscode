/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

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
    const f = (getCfg("htmlScripts", []) as ScriptConfig[]).map(item =>
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
                return "https://unpkg.com/@ruffle-rs/ruffle/ruffle.js";
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
            qpItems: vscode.QuickPickItem[] = [],
            onlineQpItems: vscode.QuickPickItem[] = [],
            installedItems: (ScriptConfig | null)[];
        scriptsQp.keepScrollPosition = true;
        scriptsQp.buttons = [
            {
                tooltip: "了解更多",
                iconPath: new vscode.ThemeIcon("globe"),
            },
            {
                tooltip: "反馈",
                iconPath: new vscode.ThemeIcon("feedback"),
            },
        ];

        const f = (update = true) => {
            scriptsQp.items = [];
            qpItems = [];
            installedItems = getCfg("htmlScripts", []);
            scriptsQp.busy = true;
            qpItems.push({
                label: "已安装",
                kind: -1,
            });
            installedItems.forEach(installedItem => {
                if (!installedItem?.filename) return;
                qpItems.push({
                    label: installedItem.displayName,
                    description: installedItem.filename,
                    buttons: [
                        {
                            tooltip: "简介",
                            iconPath: new vscode.ThemeIcon("info"),
                        },
                        {
                            tooltip: installedItem.enabled ? "禁用" : "启用",
                            iconPath: new vscode.ThemeIcon(
                                installedItem.enabled
                                    ? "debug-breakpoint-unverified"
                                    : "debug-breakpoint"
                            ),
                        },
                        {
                            tooltip: "安装或更新",
                            iconPath: new vscode.ThemeIcon("cloud-download"),
                        },
                        {
                            tooltip: "移除",
                            iconPath: new vscode.ThemeIcon("trashcan"),
                        },
                    ],
                });
            });
            scriptsQp.items = qpItems;
            if (update)
                httpRequest
                    .get(
                        "https://dsy4567.github.io/4ov-scripts/download.html",
                        "text"
                    )
                    .then(res => {
                        const $ = cheerio.load(res.data);
                        let items: Record<string, string> = {};
                        $("ul#items > li").each((i, el) => {
                            const dataset = $(el).data() as Record<
                                string,
                                string
                            >;
                            items[dataset["id"]] = dataset["displayName"];
                        });

                        qpItems.push({
                            label: "全部",
                            kind: -1,
                        });
                        Object.entries(items).forEach(([id, displayName]) => {
                            if (!id) return;
                            const o = {
                                label: displayName,
                                description: id + ".html",
                                buttons: [
                                    {
                                        tooltip: "简介",
                                        iconPath: new vscode.ThemeIcon("info"),
                                    },
                                    {
                                        tooltip: "安装或更新",
                                        iconPath: new vscode.ThemeIcon(
                                            "cloud-download"
                                        ),
                                    },
                                ],
                            };
                            qpItems.push(o);
                            onlineQpItems.push(o);
                        });
                        scriptsQp.items = qpItems;
                        scriptsQp.busy = false;
                    })
                    .catch(e => {
                        err("无法获取 HTML 代码片段下载页", e);
                        scriptsQp.busy = false;
                    });
            else {
                qpItems.push(
                    {
                        label: "全部",
                        kind: -1,
                    },
                    ...onlineQpItems
                );
                scriptsQp.items = qpItems;
                scriptsQp.busy = false;
            }
            scriptsQp.busy = true;
            setCfg("htmlScripts", installedItems).then(
                () => {
                    scriptsQp.busy = false;
                },
                () => {
                    scriptsQp.busy = false;
                }
            );
        };
        scriptsQp.onDidTriggerItemButton(async b => {
            try {
                if (scriptsQp.busy) return;
                scriptsQp.busy = true;
                installedItems = getCfg("htmlScripts", []);
                let installedItem: ScriptConfig | null = null,
                    installedItemIndex = -1,
                    id = b.item.description?.split(".")[0];
                installedItems.forEach((_, i) => {
                    if (b.item.description === _?.filename) {
                        installedItem = _;
                        installedItemIndex = i;
                    }
                });
                installedItem = installedItem as ScriptConfig | null;

                switch (b.button.tooltip) {
                    case "简介":
                        showWebviewPanel(
                            `https://dsy4567.github.io/4ov-scripts/${id}/`,
                            b.item.label,
                            "",
                            true,
                            false
                        );
                        break;
                    case "禁用":
                    case "启用":
                        if (installedItem)
                            installedItem.enabled = !installedItem.enabled;
                        break;
                    case "安装或更新":
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
                            installedItem.displayName = b.item.label;
                            installedItem.filename = id + ".html";
                        } else
                            installedItems.push({
                                displayName: b.item.label,
                                enabled: true,
                                filename: id + ".html",
                            });
                        vscode.window.showInformationMessage(
                            "安装成功: " + b.item.label
                        );
                        break;
                    case "移除":
                        installedItems.splice(installedItemIndex, 1);
                        fs.rmSync(
                            path.join(DATA_DIR, "html-scripts/", id + ".html")
                        );
                        vscode.window.showInformationMessage(
                            "移除成功: " + b.item.label
                        );
                        break;
                    default:
                        break;
                }

                installedItems.forEach((item, i) => {
                    if (!item || !item.filename) installedItems.splice(i, 1);
                });
                await setCfg("htmlScripts", installedItems);
            } catch (e) {
                err(e);
            }
            scriptsQp.busy = false;
            f(false);
        });
        scriptsQp.onDidTriggerButton(b => {
            switch (b.tooltip) {
                case "了解更多":
                    openUrl("https://dsy4567.github.io/4ov-scripts/");
                    break;
                case "反馈":
                    openUrl("https://github.com/dsy4567/4ov-scripts/issues");
                    break;
                default:
                    break;
            }
        });
        scriptsQp.onDidHide(() => scriptsQp.dispose());

        f();
        scriptsQp.show();
    } catch (e) {
        err(e);
    }
}

export { getScript, getWebviewHtml_h5, getWebviewHtml_flash, manageScripts };

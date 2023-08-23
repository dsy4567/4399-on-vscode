/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import axios, { AxiosResponse, AxiosRequestConfig, ResponseType } from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { checkIn, getCookie, getCookieSync, setCookie } from "./account";
import { getGameInfo, setGameInfo } from "./game";
import { getScript, getWebviewHtml_h5, manageScripts } from "./scripts";
import { getData, setData, getPort, initHttpServer } from "./server";
import isLocalhost = require("is-localhost-ip");

/** 第一次游戏前提示 */
let alerted = false;
/** 远程开发环境提示 */
let RemoteDevEnv_alerted = false;
/** 扩展上下文 */
let context: vscode.ExtensionContext;
/** 加载提示状态栏项 */
const STATUS_BAR_ITEM: vscode.StatusBarItem =
    vscode.window.createStatusBarItem(1);

/** `<扩展安装路径>/src/` */
const DIRNAME = __dirname;
/** 主目录路径 e.g. `"C:\users\you\.4ov-data\"`, `"/home/you/.4ov-data/"` */
const DATA_DIR = path.join(os.userInfo().homedir, ".4ov-data/");

/** axios 的封装 */
const httpRequest = {
    get<RT>(url: string, responseType: ResponseType & RT, noCookie = false) {
        return axios.get<RTypes[ResponseType & RT]>(
            url,
            getReqCfg(responseType, noCookie)
        );
    },
    post<RT>(
        url: string,
        data: string | undefined,
        responseType: ResponseType & RT,
        noCookie = false
    ) {
        return axios.post<RTypes[ResponseType & RT]>(
            url,
            data,
            getReqCfg(responseType, noCookie)
        );
    },
};
/** `vscode.window.createQuickPick` 的封装 */
function createQuickPick(o: {
    value?: string;
    title?: string;
    prompt?: string;
}): vscode.QuickPick<vscode.QuickPickItem> {
    const qp = vscode.window.createQuickPick();
    qp.title = o.title;
    qp.value = o.value || "";
    qp.placeholder = o.prompt;
    qp.canSelectMany = false;
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;
    qp.ignoreFocusOut = true;
    return qp;
}
/**
 * 获取工作区配置
 * @param name 去掉 "4399-on-vscode." 后的配置 ID
 * @param defaultValue 找不到配置时的返回值
 */
function getCfg(name: CfgNames, defaultValue: any = undefined) {
    return vscode.workspace
        .getConfiguration()
        .get("4399-on-vscode." + name, defaultValue);
}
/**
 * 更改工作区配置
 * @param name 去掉 "4399-on-vscode." 后的配置 ID
 * @param val 更改后的配置值
 */
function setCfg(name: CfgNames, val: any) {
    return vscode.workspace
        .getConfiguration()
        .update("4399-on-vscode." + name, val, true);
}
/** 获取上下文 */
function getContext() {
    return context;
}
/** 设置上下文 */
function setContext(ctx: vscode.ExtensionContext) {
    context = ctx;
}
/**
 * 获取发起请求时的配置
 * @param responseType 响应类型
 * @param noCookie 是否带上 cookie
 * @param ref referer
 * @returns Axios 请求配置
 */
function getReqCfg<RT>(
    responseType: ResponseType & RT,
    noCookie: boolean = false
): AxiosRequestConfig<RT> {
    let c;
    if (!noCookie) c = getCookieSync();

    return {
        baseURL: "https://www.4399.com",
        responseType: responseType,
        headers: {
            "user-agent": getCfg("user-agent"),
            referer: getCfg("referer"),
            cookie: c && !noCookie ? c : "",
        },
    };
}
/**
 * 全局存储
 * @param context 扩展上下文
 */
function globalStorage(context: vscode.ExtensionContext): GlobalStorage {
    return {
        get: (key: string) => JSON.parse(context.globalState.get(key) || '""'),
        set: (key: string, value: any) =>
            context.globalState.update(key, JSON.stringify(value)),
    };
}
/** 初始化 */
async function init() {
    // 初始化数据目录
    fs.mkdir(path.join(DATA_DIR, "cache/icon"), { recursive: true }, err => {
        err && console.error(err);
    });
    fs.mkdir(path.join(DATA_DIR, "html-scripts"), { recursive: true }, err => {
        err && console.error(err);
    });
    fs.mkdir(path.join(DATA_DIR, "downloads"), { recursive: true }, err => {
        err && console.error(err);
    });
    if (!fs.existsSync(path.join(DATA_DIR, "html-scripts/example.html")))
        fs.writeFile(
            path.join(DATA_DIR, "html-scripts/example.html"),
            `\
<!-- 由 4399 on VSCode 创建的示例 HTML 代码片段 -->
<!-- 去这里看看吧 https://dsy4567.github.io/4ov-scripts/ -->
`,
            err => {
                err && console.error(err);
            }
        );

    const stopSecret = Math.random();
    globalStorage(getContext()).set("stop-secret", "" + stopSecret);
    log("stop-secret:", stopSecret);

    axios.interceptors.request.use(
        function (config) {
            let u = new URL(config.url || "https://www.example.com");
            if (!isLocalhost(u.hostname)) u.protocol = "https:"; // 强制 https
            // 域名检测
            if (!is4399Domain(u.hostname))
                config.headers && (config.headers["cookie"] = "");
            config.url && (config.url = "" + u);
            config.headers && (config.headers["host"] = u.hostname);
            return config;
        },
        function (error) {
            return Promise.reject(error);
        }
    );

    // 初始化cookie, 已登录则检查登录状态
    (await getCookie()) &&
        httpRequest
            .get("https://u.4399.com/profile/index.html", "arraybuffer")
            .then(async res => {
                const $ = cheerio.load(await iconv.decode(res.data, "utf8"));
                if (!$("#loginUserNick")[0])
                    vscode.window
                        .showErrorMessage("登录失败", "退出登录")
                        .then(val => {
                            if (val === "退出登录") setCookie();
                        });
                else if (getCfg("automaticCheckIn")) checkIn(true);
            })
            .catch(e => err("获取登录状态失败:", e));
}
/** 判断是否为 4399 域名 */
function is4399Domain(hostname: string) {
    return hostname === "4399.com" || hostname.endsWith(".4399.com");
}
/**
 * 游戏开始/完成加载时调用
 * @param hide 游戏是否已加载完毕
 */
function loaded(hide: boolean) {
    if (!STATUS_BAR_ITEM.name)
        STATUS_BAR_ITEM.text = "$(loading~spin) " + "游戏加载中";

    hide ? STATUS_BAR_ITEM.hide() : STATUS_BAR_ITEM.show();
}
/** 输出日志, 受用户配置影响(推荐优先使用) */
function log(...arg: any) {
    if (!getCfg("printLogs")) return;

    console.log("[4399 on VSCode]", ...arg);
}
/** 报错并提示用户(仅在用户必须知情时使用) */
function err(...arg: any) {
    vscode.window
        .showErrorMessage(
            [...arg].join(" "),
            "切换开发人员工具(Ctrl+Shift+I)",
            "在 GitHub 上报告问题"
        )
        .then(val => {
            if (val === "在 GitHub 上报告问题")
                openUrl("https://github.com/dsy4567/4399-on-vscode/issues");
            else if (val === "切换开发人员工具(Ctrl+Shift+I)")
                vscode.commands.executeCommand(
                    "workbench.action.webview.openDeveloperTools"
                );
        });
    console.error("[4399 on VSCode]", ...arg);
    loaded(true);
}
/** 更多操作 */
function moreAction() {
    vscode.window
        .showQuickPick([
            "管理 HTML 代码片段",
            "显示数据目录路径",
            "⚠️ 以下选项仅应用于开发用途 ⬇️",
            "启动本地服务器",
            "关闭本地服务器",
            "启动简易浏览器",
        ])
        .then(async val => {
            if (val === "管理 HTML 代码片段") manageScripts();
            else if (val === "显示数据目录路径")
                vscode.window.showInformationMessage(DATA_DIR);
            else if (val === "启动本地服务器") {
                const gameInfo = getGameInfo();
                initHttpServer(
                    async () => {
                        gameInfo.server =
                            (await vscode.window.showInputBox({
                                title: "请输入被代理的服务器域名",
                                value: "szhong.4399.com",
                            })) || "szhong.4399.com";
                        gameInfo.gamePath =
                            (await vscode.window.showInputBox({
                                title: "请输入游戏入口路径(可选)",
                                placeHolder: "/foo/bar",
                            })) || "/_4ov/proxy/https://www.4399.com/";
                        let u = new URL(
                            gameInfo.gamePath,
                            "http://" + gameInfo.server
                        );
                        if (u.pathname === "/")
                            u.pathname = "/_4ov/proxy/https://www.4399.com/";
                        gameInfo.gameUrl = u.toString();
                        try {
                            setData(
                                (
                                    await httpRequest.get(
                                        gameInfo.gameUrl,
                                        "arraybuffer"
                                    )
                                ).data
                            );
                        } catch (e) {
                            setData("");
                        }
                    },
                    await vscode.window.showInputBox({
                        title: "请输入 referer (可选)",
                        placeHolder: "https://www.4399.com/",
                    })
                );
            } else if (val === "关闭本地服务器")
                try {
                    await httpRequest.get(
                        "http://127.0.0.1:" +
                            getPort() +
                            "/_4ov/stop/" +
                            globalStorage(context).get("stop-secret"),
                        "arraybuffer"
                    );
                } catch (e) {}
            else if (val === "启动简易浏览器")
                showWebviewPanel(
                    (await vscode.window.showInputBox({
                        title: "请输入网址",
                        value: "https://www.4399.com/",
                    })) || "https://www.4399.com/",
                    "简易浏览器"
                );
        });
}
/** 对象转 query */
function objectToQuery(obj: any, prefix?: string) {
    if (typeof obj !== "object") return "";

    const attrs = Object.keys(obj);
    return attrs.reduce((query, attr, index) => {
        // 判断是否是第一层第一个循环
        if (index === 0 && !prefix) query += "";

        if (typeof obj[attr] === "object") {
            const subPrefix = prefix ? `${prefix}[${attr}]` : attr;
            query += objectToQuery(obj[attr], subPrefix);
        } else if (prefix) query += `${prefix}[${attr}]=${obj[attr]}`;
        else query += `${attr}=${obj[attr]}`;

        // 判断是否是第一层最后一个循环
        if (index !== attrs.length - 1) query += ";";

        return query;
    }, "");
}
/**
 * 在浏览器打开链接
 * @param url 链接
 */
function openUrl(url: string) {
    if (!url) return;

    const u = new URL(url, "https://www.4399.com/").href;
    vscode.env.openExternal(vscode.Uri.parse(u));
}
/** 游戏详情页链接转游戏 ID */
function parseId(url: string | number): number {
    if (!isNaN(Number(url))) return url as number;

    const u = new URL(url as string, "https://www.4399.com/"),
        id: string =
            u.searchParams.get("gameId") ||
            path.parse(u.pathname).name.split(/[\_\-\.\/]/g)[0];
    log(url, " -> ", id);
    return Number(id);
}
/**
 * 显示 Webview 面板
 * @param url 游戏链接
 * @param title 游戏标题
 * @param type 游戏类型(可留空, flash 游戏/其他)
 * @param hasIcon 显示游戏图标
 * @param asExternalUri 没用
 */
async function showWebviewPanel(
    url: string,
    title: string,
    type?: "fl" | false | "",
    hasIcon?: boolean,
    asExternalUri = true
) {
    setGameInfo(undefined, undefined, undefined, undefined, undefined, !!type);

    const customTitle = getCfg("title"),
        panel = vscode.window.createWebviewPanel(
            "4399OnVscode",
            customTitle || title || "4399 on VSCode",
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: getCfg("background", true),
                localResourceRoots: [],
            }
        );
    panel.onDidDispose(() => {
        let gameInfoUrls = getGameInfo().gameInfoUrls;
        delete gameInfoUrls[title];
        setGameInfo(undefined, undefined, undefined, gameInfoUrls);
    });

    // 注入脚本
    if (
        new URL(url, "http://127.0.0.1:" + getPort()).host ===
            "127.0.0.1:" + getPort() &&
        type !== "fl" &&
        getCfg("injectionScripts", true)
    )
        try {
            const D = getData(),
                gameInfo = getGameInfo();
            if (
                gameInfo.gamePath.endsWith(".html") ||
                (gameInfo.gamePath.endsWith(".htm") && D)
            ) {
                const $ = cheerio.load(
                    typeof D === "string" ? D : iconv.decode(D, "utf8")
                );
                $("head").append(
                    getScript(getCookieSync(), true, gameInfo.server, "h5")
                );
                setData($.html());
            }
        } catch (e) {
            err("无法为游戏页面注入优化脚本", String(e));
        }

    panel.webview.html = getWebviewHtml_h5(
        asExternalUri
            ? await vscode.env.asExternalUri(vscode.Uri.parse(url))
            : url
    );
    if (!alerted && getCfg("alert", true)) {
        alerted = true;
        vscode.window
            .showInformationMessage(
                "温馨提示: 请在使用快捷键前使游戏失去焦点",
                "不再提示"
            )
            .then(val => setCfg("alert", false));
    }

    alertWhenUsingRemoteDevEnv();

    // 获取游戏图标
    let iconPath: vscode.Uri = vscode.Uri.file(
        path.join(DIRNAME, "../icon.png")
    );
    const setIcon = () => {
        panel.iconPath = {
            light: iconPath,
            dark: iconPath,
        };
    };

    loaded(true);

    if (!(hasIcon && getCfg("showIcon", true) && title)) return setIcon();

    try {
        const gameId = (
            getGameInfo().gameInfoUrls[title].split(/[/.]/gi).at(-2) || ""
        ).split("_")[0];
        if (gameId)
            if (
                fs.existsSync(path.join(DATA_DIR, `cache/icon/${gameId}.jpg`))
            ) {
                iconPath = vscode.Uri.file(
                    path.join(DATA_DIR, `cache/icon/${gameId}.jpg`)
                );
                setIcon();
            } else {
                let res: AxiosResponse<Buffer>;
                try {
                    res = await httpRequest.get(
                        `https://imga1.5054399.com/upload_pic/minilogo/${gameId}.jpg`,
                        "arraybuffer"
                    );
                } catch (e) {
                    return console.error(e);
                }

                if (!res.data) return;
                fs.writeFile(
                    path.join(DATA_DIR, `cache/icon/${gameId}.jpg`),
                    res.data,
                    e => {
                        if (e) return console.error(String(e));

                        try {
                            if (
                                !fs.existsSync(
                                    path.join(
                                        DATA_DIR,
                                        `cache/icon/${gameId}.jpg`
                                    )
                                )
                            )
                                return;
                            iconPath = vscode.Uri.file(
                                path.join(DATA_DIR, `cache/icon/${gameId}.jpg`)
                            );
                            setIcon();
                        } catch (e) {
                            console.error(String(e));
                        }
                    }
                );
            }
    } catch (e) {
        console.error(String(e));
    }
}
/** 使用远程开发环境时发出警告 */
function alertWhenUsingRemoteDevEnv() {
    if (
        !RemoteDevEnv_alerted &&
        getContext().extension.extensionKind === vscode.ExtensionKind.Workspace
    ) {
        RemoteDevEnv_alerted = true;
        vscode.window
            .showWarningMessage(
                `您似乎正在使用 GitHub CodeSpaces 或其他远程开发环境，如果游戏无法加载或图裂，请点击下方按钮完成验证，然后重启游戏。请勿将端口 ${getPort()} 的可见性设为 Public (公共)，这可能导致您的 cookie 被泄露。`,
                "去验证"
            )
            .then(val => {
                if (val === "去验证")
                    openUrl(`http://127.0.0.1:${getPort()}/_4ov/ok`);
            });
    }
}

export {
    DIRNAME,
    DATA_DIR,
    alertWhenUsingRemoteDevEnv,
    createQuickPick,
    getCfg,
    setCfg,
    getContext,
    setContext,
    getReqCfg,
    globalStorage,
    httpRequest,
    init,
    is4399Domain,
    loaded,
    log,
    err,
    moreAction,
    objectToQuery,
    openUrl,
    parseId,
    showWebviewPanel,
};

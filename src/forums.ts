/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as vscode from "vscode";

import { login } from "./account";
import { getPort, initHttpServer } from "./server";
import {
    DIRNAME,
    alertWhenUsingRemoteDevEnv,
    createQuickPick,
    err,
    getContext,
    globalStorage,
    httpRequest,
    log,
} from "./utils";

// 群组相关
let threadQp: vscode.QuickPick<vscode.QuickPickItem>;
let threadQpItems: vscode.QuickPickItem[] = [];
let threadId = 0;
let threadTitle = "";
/** 已输入的搜索词 */
let threadSearchValue: string;
/** 页码 */
let threadPage: number = 1;
/** e.g. threadData[0] == ["造梦无双", 84526] */
let threads: [string, number][];
/** 延迟获取搜索建议 */
let threadTimeout: NodeJS.Timeout;
/** 正在展示所有帖子 */
let showingThreads = false;

/** 进入帖子 */
async function enterThread(id: number) {
    try {
        if (!id) return;
        threadQp.hide();
        const fullWebServerUri = await vscode.env.asExternalUri(
                vscode.Uri.parse("http://localhost:" + getPort())
            ),
            d: Buffer = (
                await httpRequest.get(
                    `https://my.4399.com/forums/thread-${id}`,
                    "arraybuffer"
                )
            ).data;
        if (!d) return err("无法获取帖子页面");

        const $ = cheerio.load(d);
        let title = $("div.host_main_title > a").text();
        if (!title) err("无法获取帖子页面: 标题为空");

        // 预处理
        // 修改 // 为 https://
        $("img").each((i, elem) => {
            let s = $(elem).attr("src");
            if (s) {
                s = s.replaceAll(/ |\n|\%20|\%0A/g, "");
                if (!s.startsWith("http")) {
                    s = s.replace("//", "https://");
                    $(elem).attr("src", s);
                }
            }
        });
        // 解除防盗链限制
        $("img").each((i, elem) => {
            let u = new URL(
                "/_4ov/proxy/" +
                    $(elem)
                        .attr("src")
                        ?.replaceAll(/ |\n|\%20|\%0A/g, ""),
                String(fullWebServerUri)
            );
            $(elem).attr("src", String(u));
        });
        $(
            "#send-floor,[class*='user_actions'],script,style,link,meta,object"
        ).remove();

        // 从帖
        let singlePostHtml = "";
        $(".single_post").each((i, elem) => {
            if (i === 0) return;

            singlePostHtml +=
                " <hr/> " +
                ($("[class*='post_author_name']", elem).html() || "") + // 张三
                " " +
                ($(".post_title", elem).html() || "") + // 发表于 2022-12-31 23:59:59 福建 修改于 2022-12-31 23:59:59 沙发
                " <br/> " +
                ($(".main_content", elem).html() || "") + // 正文
                " <br /> ";
        });

        // 生成文章 html
        let html =
            // 主帖
            " <br /> <h1>" +
            ($(".mainPost .host_main_title a").html() || "") + // (btd) 震惊, 3 + 3 居然等于 3!
            "</h1> <br /> " +
            `
                                   <style>* {color: #888;}</style>
                                   <a href="https://my.4399.com/forums/thread-${id}">在浏览器中打开</a>
                                ` +
            ($(".mainPost [class*='post_author_name']").html() || "") + // 张三
            " " +
            ($(".mainPost .host_title").html() || "") + // 楼主 发表于 2022-12-31 23:59:59 福建 修改于 2022-12-31 23:59:59
            " <br /> " +
            ($(".mainPost .host_content").html() || "") + // 正文
            " <br /> " +
            singlePostHtml;
        html = html
            .replaceAll(/(#ffffff|#fff)/gi, "transparent")
            .replaceAll(/(javascript|on.+=)/gi, "ovo");

        initHttpServer(() => {
            const panel = vscode.window.createWebviewPanel(
                "4399OnVscode",
                title || "4399 on VSCode",
                vscode.ViewColumn.Active,
                {
                    enableScripts: false,
                    localResourceRoots: [],
                }
            );
            const iconPath: vscode.Uri = vscode.Uri.file(
                path.join(DIRNAME, "../resources/icon.png")
            );
            panel.webview.html = html;
            panel.iconPath = {
                light: iconPath,
                dark: iconPath,
            };
            alertWhenUsingRemoteDevEnv();
        }, "http://my.4399.com/");
    } catch (e) {
        err("无法获取帖子页面", String(e));
    }
}
/** 搜索群组 */
function searchForums(kwd: string) {
    if (threadQp.busy) return;

    clearTimeout(threadTimeout);
    log("页码: " + threadPage);
    threadTimeout = setTimeout(async () => {
        threadQp.busy = true;
        let res;
        try {
            res = (await httpRequest.get(
                "https://my.4399.com/forums/index-getMtags?type=game&keyword=" +
                    encodeURI(kwd || "") +
                    "&page=" +
                    threadPage,
                "arraybuffer"
            )) as AxiosResponse<Buffer | string>;
        } catch (e) {
            return err("获取搜索建议失败", "" + e);
        }
        if (!res.data) return err("获取搜索建议失败");

        res.data = iconv.decode(res.data as Buffer, "utf8");
        const d: string = res.data;
        const $ = cheerio.load(d);
        threads = [];
        threadQpItems = [];

        $("ul > li > a > span.title").each((i, elem) => {
            let g = $(elem).text();
            let id: string | undefined | number = $(elem)
                .parent()
                .attr("href")
                ?.split("-")
                ?.at(-1);
            if (!id || isNaN(Number(id))) return;

            id = Number(id);
            threads.push([g, id]);
        });

        threads.forEach(g => {
            threadQpItems.push({
                label: g[0],
                description: "群组 ID: " + g[1],
                alwaysShow: true,
            });
        });
        threadQpItems.push({
            label: "下一页",
            description: "加载下一页群组",
            alwaysShow: true,
        });

        if (threadQpItems[0]) threadQp.items = threadQpItems;
        showingThreads = false;
        threadQp.buttons = [];
        threadQp.busy = false;
    }, 1000);
}
/** 显示所有帖子 */
async function showThreads(id: number, title: string) {
    if (threadQp.busy) return;

    threads = [];
    threadQpItems = [];
    threadQp.busy = true;

    log("群组 ID: " + id);
    const d: Buffer = (
        await httpRequest.get(
            `https://my.4399.com/forums/mtag-${id}?page=${threadPage}`,
            "arraybuffer"
        )
    ).data;

    if (d) {
        const $ = cheerio.load(d);
        let joined = false;
        threads = [];

        // 获取标题和类型
        $("div.listtitle > div.title").each((i, elem) => {
            const $title = $(elem).children("a.thread_link"),
                id = Number($title.attr("href")?.split("-").at(-1));
            let title = $title.text(),
                type = $(elem).children("a.type").text();
            if (!id || isNaN(id) || !title) return;

            type = type || "[顶] ";
            title = type + title;
            threads.push([title, id]);
        });
        joined = $("a.join").hasClass("hasjoin");

        threads.forEach(g => {
            threadQpItems.push({
                label: g[0],
                description: "帖子 ID: " + g[1],
                alwaysShow: true,
            });
        });
        threadQpItems.push({
            label: "下一页",
            description: "加载下一页帖子",
            alwaysShow: true,
        });

        if (threadQpItems[0]) {
            threadQp.items = threadQpItems;
            threadQp.title = "群组: " + title;
        }
        showingThreads = true;
        threadQp.buttons = [
            vscode.QuickInputButtons.Back,
            {
                tooltip: joined ? "离开群组" : "加入群组",
                iconPath: joined
                    ? new vscode.ThemeIcon("remove")
                    : new vscode.ThemeIcon("add"),
            },
            {
                tooltip: "签到",
                iconPath: new vscode.ThemeIcon("check"),
            },
        ];
        threadQp.busy = false;
    } else err("无法获取群组页面");
}

async function main() {
    try {
        let k = ""; // 上次搜索词

        if (threadQp) threadQp.value = threadSearchValue;
        else {
            k = globalStorage(getContext()).get("kwd-forums");
            threadQp = createQuickPick({
                value: k || "",
                title: "4399 on VSCode: 逛群组",
                prompt: "搜索群组",
            });
            threadQp.onDidChangeValue(kwd => {
                if (showingThreads) return;

                threadQp.title = "4399 on VSCode: 逛群组";
                threadSearchValue = kwd;
                threadPage = 1;
                searchForums(kwd);
            });
            threadQp.onDidAccept(async () => {
                if (threadQp.activeItems[0].description === "加载下一页群组") {
                    threadPage++;
                    searchForums(threadQp.value);
                } else if (
                    threadQp.activeItems[0].description === "加载下一页帖子"
                ) {
                    threadPage++;
                    showThreads(threadId, threadTitle);
                } else if (
                    threadQp.activeItems[0].description?.includes("群组 ID: ")
                ) {
                    threadPage = 1;
                    threadId = +threadQp.activeItems[0].description?.replace(
                        "群组 ID: ",
                        ""
                    );
                    threadTitle = threadQp.activeItems[0].label;
                    showThreads(threadId, threadTitle);
                    globalStorage(getContext()).set(
                        "kwd-forums",
                        threadQp.value
                    );
                } else if (
                    threadQp.activeItems[0].description?.includes("帖子 ID: ")
                )
                    enterThread(
                        +threadQp.activeItems[0].description?.replace(
                            "帖子 ID: ",
                            ""
                        )
                    );
            });
            threadQp.onDidTriggerButton(async b => {
                if (threadQp.busy) return;
                if (b === vscode.QuickInputButtons.Back) {
                    threadQp.title = "4399 on VSCode: 逛群组";
                    threadQp.value = threadSearchValue = "";
                    threadPage = 1;
                    return searchForums("");
                }

                threadQp.busy = true;
                try {
                    let result: any;
                    switch (b.tooltip) {
                        case "离开群组":
                            result = (
                                await httpRequest.post(
                                    "https://my.4399.com/forums/operate-leaveMtag",
                                    `tagid=${threadId}&_AJAX_=1`,
                                    "json"
                                )
                            ).data;
                            if (result?.code !== 100)
                                vscode.window.showInformationMessage(
                                    result?.msg || "操作失败"
                                );
                            break;
                        case "加入群组":
                            result = (
                                await httpRequest.post(
                                    "https://my.4399.com/forums/operate-joinMtag",
                                    `tagid=${threadId}&_AJAX_=1`,
                                    "json"
                                )
                            ).data;
                            if (result?.code === 100)
                                vscode.window.showInformationMessage(
                                    result?.msg || "加入成功"
                                );
                            else
                                vscode.window.showInformationMessage(
                                    result?.msg || "操作失败"
                                );
                            break;
                        case "签到":
                            result = (
                                await httpRequest.post(
                                    "https://my.4399.com/forums/grade-signIn",
                                    `sign=1&tagid=${threadId}&_AJAX_=1`,
                                    "json"
                                )
                            ).data;
                            if (result?.code === 100)
                                vscode.window.showInformationMessage(
                                    result?.msg ||
                                        `签到成功, 已连续签到 ${+result?.result
                                            ?.totalDays} 天`
                                );
                            else
                                vscode.window.showInformationMessage(
                                    result?.msg || "操作失败"
                                );
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    err(e);
                }
                threadQp.busy = false;
                showThreads(threadId, threadTitle);
            });
            if (!threadQp.value) searchForums("");
        }
        threadQp.buttons = showingThreads
            ? [vscode.QuickInputButtons.Back]
            : [];

        threadQp.items = threadQpItems;
        threadQp.show();
    } catch (e) {
        err("无法获取群组页面", String(e));
    }
}

/** 逛群组 */
export const showForums = () => {
    login(() => {
        main();
    });
};

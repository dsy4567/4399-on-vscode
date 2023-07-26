/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as vscode from "vscode";

import { login } from "./account";
import { getPort, initHttpServer } from "./server";
import {
    DIRNAME,
    alertWhenUsingGHCodeSpaces,
    createQuickPick,
    err,
    log,
    getContext,
    getReqCfg,
    globalStorage,
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
let threadData: [string, number][];
/** e.g. threads["造梦无双"] == 84526 */
let threads: Record<string, number> = {};
/** 延迟获取搜索建议 */
let threadTimeout: NodeJS.Timeout;

async function main() {
    try {
        if (threadQp) threadQp.show();

        const k = globalStorage(getContext()).get("kwd-forums"); // 上次搜索词

        threadQp = createQuickPick({
            value: k || "",
            title: "4399 on VSCode: 逛群组",
            prompt: "搜索群组",
        });

        const getThreads = async (id: number, title: string) => {
            threads = {};
            threadData = [];
            threadQpItems = [];
            threadQp.busy = true;

            log("群组 ID: " + id);
            const d: Buffer = (
                await axios.get(
                    `https://my.4399.com/forums/mtag-${id}?page=${threadPage}`,
                    getReqCfg("arraybuffer")
                )
            ).data;

            if (d) {
                const $ = cheerio.load(d);
                threads = {};
                threadData = [];

                // 获取标题和类型
                $("div.listtitle > div.title").each((i, elem) => {
                    const $title = $(elem).children("a.thread_link"),
                        id = Number($title.attr("href")?.split("-").at(-1));
                    let title = $title.text(),
                        type = $(elem).children("a.type").text();
                    if (!id || isNaN(id) || !title) return;

                    type = type || "[顶] ";
                    title = type + title;
                    threadData.push([title, id]);
                    threads[title] = id;
                });

                threadData.forEach(g => {
                    threadQpItems.push({
                        label: g[0],
                        description: "进入帖子",
                        alwaysShow: true,
                    });
                    threads[g[0]] = g[1];
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

                threadQp.busy = false;
            } else err("无法获取群组页面");
        };
        const search = (kwd: string) => {
            clearTimeout(threadTimeout);
            log("页码: " + threadPage);
            threadTimeout = setTimeout(async () => {
                threadQp.busy = true;
                let res: AxiosResponse;
                try {
                    res = await axios.get(
                        "https://my.4399.com/forums/index-getMtags?type=game&keyword=" +
                            encodeURI(kwd || "") +
                            "&page=" +
                            threadPage,
                        getReqCfg("arraybuffer")
                    );
                } catch (e) {
                    return err("获取搜索建议失败", "" + e);
                }
                if (!res.data) return err("获取搜索建议失败");

                res.data = iconv.decode(res.data, "utf8");
                const d: string = res.data;
                const $ = cheerio.load(d);
                threads = {};
                threadData = [];
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
                    threadData.push([g, id]);
                    threads[g] = id;
                });

                threadData.forEach(g => {
                    threadQpItems.push({
                        label: g[0],
                        description: "群组 ID: " + g[1],
                        alwaysShow: true,
                    });
                    threads[g[0]] = g[1];
                });
                threadQpItems.push({
                    label: "下一页",
                    description: "加载下一页群组",
                    alwaysShow: true,
                });

                if (threadQpItems[0]) threadQp.items = threadQpItems;

                threadQp.busy = false;
            }, 1000);
        };
        threadQp.onDidChangeValue(kwd => {
            if (kwd === threadSearchValue)
                return (threadQp.items = threadQpItems);

            threadQp.title = "4399 on VSCode: 逛群组";
            threadSearchValue = kwd;

            threadPage = 1;
            search(kwd);
        });

        threadQp.onDidAccept(async () => {
            if (threadQp.activeItems[0].description === "加载下一页群组") {
                threadPage++;
                search(threadQp.value);
            } else if (
                threadQp.activeItems[0].description === "加载下一页帖子"
            ) {
                threadPage++;
                getThreads(threadId, threadTitle);
            } else if (
                threadQp.activeItems[0].description?.includes("群组 ID")
            ) {
                threadPage = 1;
                threadId = threads[threadQp.activeItems[0].label];
                threadTitle = threadQp.activeItems[0].label;
                getThreads(threadId, threadTitle);
                globalStorage(getContext()).set("kwd-forums", threadQp.value);
            } else if (threadQp.activeItems[0].description === "进入帖子")
                try {
                    if (!threadQp.activeItems[0].label) return;
                    threadQp.hide();
                    const id = threads[threadQp.activeItems[0].label],
                        fullWebServerUri = await vscode.env.asExternalUri(
                            vscode.Uri.parse("http://localhost:" + getPort())
                        ),
                        d: Buffer = (
                            await axios.get(
                                `https://my.4399.com/forums/thread-${id}`,
                                getReqCfg("arraybuffer")
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
                            ($("[class*='post_author_name']", elem).html() ||
                                "") + // 张三
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
                        ($(".mainPost [class*='post_author_name']").html() ||
                            "") + // 张三
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
                            path.join(DIRNAME, "../icon.png")
                        );
                        panel.webview.html = html;
                        panel.iconPath = {
                            light: iconPath,
                            dark: iconPath,
                        };
                        alertWhenUsingGHCodeSpaces();
                    }, "http://my.4399.com/");
                } catch (e) {
                    err("无法获取帖子页面", String(e));
                }
        });
        threadQp.show();
        if (!threadSearchValue) {
            threadPage = 1;
            search(k || "");
        }
    } catch (e) {
        err("无法获取群组页面", String(e));
    }
}

export const showForums = () => {
    login(() => {
        main();
    });
};

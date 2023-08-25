/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { createQuickPick, err, httpRequest, log } from "./utils";

async function showComments(gameId: number, title: string) {
    let commentQp = createQuickPick({
            value: "",
            title: title + " 的评论",
            prompt: "",
        }),
        page = 1,
        items: Comment[] = [];
    const showComments = async () => {
        commentQp.busy = true;
        items = [];
        const html = iconv.decode(
            (
                await httpRequest.get(
                    `https://cdn.comment.4399pk.com/nhot-${gameId}-${page}.htm`,
                    "arraybuffer"
                )
            ).data,
            "utf8"
        );
        log("页码", page);
        if (!html) return err("无法获取评论页面: 响应为空");

        const $ = cheerio.load(html);

        // 置顶评论
        $("#cntBox > div.zd").each((i, elem) => {
            let item: Comment = {
                nickname:
                    $(elem)
                        .children("div.zd_t")
                        .children("a")
                        .children("b")
                        .text() || "未知用户",
                content: $(elem).children("div.con").text(),
                top: true,
                replies: [],
                repliesPage: 1,
                cid: -(
                    $(elem)
                        .children("div.con")
                        .children("div[id*='hidden_div_']")
                        .attr("id")
                        ?.split("_")
                        .at(-1) || -1
                ),
                lastPage:
                    $(
                        $(elem).siblings("span[id*='reply_']")[(i + 1) * 3 - 1]
                    ).children("div.hf1").length < 5,
            };
            // 回复
            $($(elem).siblings("span[id*='reply_']")[(i + 1) * 3 - 1])
                .children("div.hf1")
                .children("div.hf_le")
                .children("div.hf_ri1")
                .each((i, elem) => {
                    item.replies.push({
                        nickname:
                            $(elem)
                                .children("div.hf_wj")
                                .children("b")
                                .children("a")
                                .text() || "未知用户",
                        content: $(elem).children("p").text(),
                    });
                });
            items.push(item);
        });
        // 普通评论
        $("#cntBox > div.lam > div.am_ri > div.lam").each((i, elem) => {
            let item: Comment = {
                nickname:
                    $(elem)
                        .children("div.lam_t")
                        .children("div.wj")
                        .children("b")
                        .children("a")
                        .text() || "未知用户",
                content: $(elem).children("div.tex").children("p").text(),
                replies: [],
                repliesPage: 1,
                cid: +(
                    $(elem)
                        .children("span[id*='reply_']")
                        .attr("id")
                        ?.split("_")
                        .at(-1) || -1
                ),
                lastPage:
                    $(elem).children("span[id*='reply_']").children("div.hf1")
                        .length < 5,
            };
            // 回复
            $(elem)
                .children("span[id*='reply_']")
                .children("div.hf1")
                .children("div.hf_le")
                .children("div.hf_ri1")
                .each((i, elem) => {
                    item.replies.push({
                        nickname:
                            $(elem)
                                .children("div.hf_wj")
                                .children("b")
                                .children("a")
                                .text() || "未知用户",
                        content: $(elem).children("p").text(),
                    });
                });
            items.push(item);
        });

        let qpItems: vscode.QuickPickItem[] = [];
        for (let i = 0; i < items.length; i++) {
            const comment = items[i];
            qpItems.push({
                label: `${comment.top ? "[置顶评论] " : ""}${
                    comment.nickname
                }: ${comment.content}`,
            });
            for (let j = 0; j < comment.replies.length; j++) {
                const reply = comment.replies[j];
                qpItems.push({
                    label: " | ",
                    description: `${reply.nickname}: ${reply.content}`,
                });
            }
            if (!comment.lastPage)
                qpItems.push({
                    label: " | > 查看更多回复",
                    description: "" + i,
                });
        }

        qpItems.push({
            label: "下一页",
            description: "加载下一页内容",
        });
        commentQp.items = qpItems;
        commentQp.busy = false;
    };
    const showReplies = async (CommentIndex: number) => {
        commentQp.busy = true;
        const page = ++items[CommentIndex].repliesPage,
            cid = items[CommentIndex].cid,
            json = (
                await httpRequest.get(
                    `https://cdn.comment.4399pk.com/user_reply.php?fid=${gameId}&cid=${cid}&p=${page}&t=${Math.random()}`,
                    "json"
                )
            ).data;
        log("页码", page, "CommentIndex", CommentIndex);
        if (!json.data) return err("无法获取评论页面: 响应为空");
        const $ = cheerio.load(json.data);

        if ($("div.hf1").length < 5 || json.cur_page !== page)
            items[CommentIndex].lastPage = true;
        else
            $("div.hf1 > div.hf_le > div.hf_ri1").each((i, elem) => {
                items[CommentIndex].replies.push({
                    nickname:
                        $(elem)
                            .children("div.hf_wj")
                            .children("b")
                            .children("a")
                            .text() || "未知用户",
                    content: $(elem).children("p").text(),
                });
            });

        let qpItems: vscode.QuickPickItem[] = [];
        for (let i = 0; i < items.length; i++) {
            const comment = items[i];
            qpItems.push({
                label: `${comment.top ? "[置顶评论] " : ""}${
                    comment.nickname
                }: ${comment.content}`,
            });
            for (let j = 0; j < comment.replies.length; j++) {
                const reply = comment.replies[j];
                qpItems.push({
                    label: " | ",
                    description: `${reply.nickname}: ${reply.content}`,
                });
            }
            if (!comment.lastPage)
                qpItems.push({
                    label: " | > 查看更多回复",
                    description: "" + i,
                });
        }

        qpItems.push({
            label: "下一页",
            description: "加载下一页内容",
        });
        commentQp.items = qpItems;
        commentQp.busy = false;
    };

    commentQp.onDidAccept(async () => {
        switch (commentQp.activeItems[0].label) {
            case "下一页":
                page++;
                showComments().catch(e => {
                    err("无法获取评论:", e);
                });
                break;
            case " | > 查看更多回复":
                try {
                    commentQp.keepScrollPosition = true;
                    await showReplies(
                        +(commentQp.activeItems[0].description || -1)
                    );
                    commentQp.keepScrollPosition = false;
                } catch (e) {
                    err("无法获取回复:", e);
                    commentQp.busy = false;
                }
                break;
            default:
                vscode.window.showInformationMessage(
                    commentQp.activeItems[0].description ||
                        commentQp.activeItems[0].label
                );
                break;
        }
    });
    commentQp.onDidHide(() => commentQp.dispose());

    commentQp.show();
    showComments().catch(e => {
        err("无法获取评论:", e);
        commentQp.busy = false;
    });
}

export { showComments };

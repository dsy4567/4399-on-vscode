/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { comment } from ".";
import { createQuickPick, err, httpRequest, log } from "./utils";

/** 接口地址 */
const API_URLS = {
    /** 热门评论 */
    comment_hot: (gameId: number, page: number) =>
        `https://cdn.comment.4399pk.com/nhot-${gameId}-${page}.htm`,
    /** 最新评论 */
    comment_new: (gameId: number, page: number) =>
        `https://cdn.comment.4399pk.com/page-${gameId}-${page}.htm`,
    /** 回复 */ reply: (gameId: number, cid: number, page: number) =>
        `https://cdn.comment.4399pk.com/user_reply.php?fid=${gameId}&cid=${cid}&p=${page}&t=${Math.random()}`,
    /** 点赞 */ like: (gameId: number, cid: number, flag: "" | "reply") =>
        `https://cdn.comment.4399pk.com/flower_new.php?fid=${gameId}&cid=${cid}&flag=${flag}&t=${Math.random()}&_=${+new Date()}`,
};

/**
 * 显示热门评论
 * @param gameId 游戏 ID
 * @param title 游戏标题
 */
async function showComments(gameId: number, title: string) {
    let commentQp = createQuickPick<comment.CommentQuickPickItemData>({
            value: "",
            prompt: "",
        }),
        page = 1,
        hot = true,
        qpItems: comment.CommentQuickPickItem[] = [];

    const like = async (
        target: comment.Comment | comment.Reply | undefined,
        flag: "" | "reply"
    ) => {
        if (!target) return;
        if (target.liked)
            return vscode.window.showErrorMessage("您已点过赞了，不能重复点赞");
        target.liked = true;

        try {
            const data = await httpRequest.get(
                API_URLS.like(gameId, target?.cid || 0, flag),
                "json"
            );
            data.data.status === "failure"
                ? (err(data.data.msg), "")
                : vscode.window.showInformationMessage("点赞成功");
        } catch (e) {
            err("点赞失败");
            target.liked = false;
        }
    };
    const showComments = async () => {
        (commentQp.title = `${title} 的${hot ? "热门" : "最新"}评论`),
            (commentQp.busy = true);
        qpItems = [];
        const html = iconv.decode(
            (
                await httpRequest.get(
                    (hot ? API_URLS.comment_hot : API_URLS.comment_new)(
                        gameId,
                        page
                    ),
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
            const comment: comment.Comment = {
                nickname:
                    $(elem)
                        .children("div.zd_t")
                        .children("a")
                        .children("b")
                        .text() || "未知用户",
                content: $(elem).children("div.con").text(),
                top: true,
                repliesPage: 1,
                lastReplyIndex: -1,
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
                likes: +$(elem)
                    .children(".xq")
                    .children(".hf")
                    .children(".ding")
                    .children("em")
                    .text()
                    .replace(/\[|\]/g, ""),
            };
            qpItems.push({
                label: `${comment.top ? "[置顶评论] " : ""}${
                    comment.nickname
                }: ${comment.content}`,
                data: { comment },
                action(target) {
                    vscode.window.showInformationMessage(target.label);
                },
                buttons: [
                    {
                        tooltip: "点赞",
                        iconPath: new vscode.ThemeIcon("heart"),
                        action(_, qpItem) {
                            like(qpItem?.data?.comment, "");
                        },
                    },
                ],
            });

            // 回复
            $($(elem).siblings("span[id*='reply_']")[(i + 1) * 3 - 1])
                .children("div.hf1")
                .children("div.hf_le")
                .children("div.hf_ri1")
                .each((i, elem) => {
                    const reply: comment.Reply = {
                        nickname:
                            $(elem)
                                .children("div.hf_wj")
                                .children("b")
                                .children("a")
                                .text() || "未知用户",
                        content: $(elem).children("p").text(),
                        cid: +(
                            $(elem)
                                .children(".xq")
                                .children(".hf")
                                .children(".ding")
                                .children("em")
                                .attr("id")
                                ?.replace("tag_", "") || 0
                        ),
                        likes: +$(elem)
                            .children(".xq")
                            .children(".hf")
                            .children(".ding")
                            .children("em")
                            .text()
                            .replace(/\[|\]/g, ""),
                    };
                    qpItems.push({
                        label: " | ",
                        description: `${reply.nickname}: ${reply.content}`,
                        data: { reply },
                        action(target) {
                            vscode.window.showInformationMessage(
                                target.description || ""
                            );
                        },
                        buttons: [
                            {
                                tooltip: "点赞",
                                iconPath: new vscode.ThemeIcon("heart"),
                                action(_, qpItem) {
                                    like(qpItem?.data?.reply, "reply");
                                },
                            },
                        ],
                    });
                });
            if (!comment.lastPage) {
                const item = {
                    label: " | > 查看更多回复",
                    action: async () => {
                        try {
                            commentQp.keepScrollPosition = true;
                            await showReplies(
                                qpItems.indexOf(item),
                                comment.cid,
                                comment
                            );
                            commentQp.keepScrollPosition = false;
                        } catch (e) {
                            err("无法获取回复:", e);
                            commentQp.busy = false;
                        }
                    },
                };
                qpItems.push(item);
            }
        });
        // 普通评论
        $("#cntBox > div.lam > div.am_ri > div.lam").each((i, elem) => {
            let comment: comment.Comment = {
                nickname:
                    $(elem)
                        .children("div.lam_t")
                        .children("div.wj")
                        .children("b")
                        .children("a")
                        .text() || "未知用户",
                content: $(elem).children("div.tex").children("p").text(),
                lastReplyIndex: -1,
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
                likes: +$(elem)
                    .children(".xq")
                    .children(".hf")
                    .children(".ding")
                    .children("em")
                    .text()
                    .replace(/\[|\]/g, ""),
            };
            qpItems.push({
                label: `${comment.nickname}: ${comment.content}`,
                data: { comment },
                action(target) {
                    vscode.window.showInformationMessage(target.label);
                },
                buttons: [
                    {
                        tooltip: "点赞",
                        iconPath: new vscode.ThemeIcon("heart"),
                        action(_, qpItem) {
                            like(qpItem?.data?.comment, "");
                        },
                    },
                ],
            });

            // 回复
            $(elem)
                .children("span[id*='reply_']")
                .children("div.hf1")
                .children("div.hf_le")
                .children("div.hf_ri1")
                .each((i, elem) => {
                    const reply: comment.Reply = {
                        nickname:
                            $(elem)
                                .children("div.hf_wj")
                                .children("b")
                                .children("a")
                                .text() || "未知用户",
                        content: $(elem).children("p").text(),
                        cid: +(
                            $(elem)
                                .children(".xq")
                                .children(".hf")
                                .children(".ding")
                                .children("em")
                                .attr("id")
                                ?.replace("tag_", "") || 0
                        ),
                        likes: +$(elem)
                            .children(".xq")
                            .children(".hf")
                            .children(".ding")
                            .children("em")
                            .text()
                            .replace(/\[|\]/g, ""),
                    };
                    qpItems.push({
                        label: " | ",
                        description: `${reply.nickname}: ${reply.content}`,
                        action(target) {
                            vscode.window.showInformationMessage(
                                target.description || ""
                            );
                        },
                        data: { reply },
                        buttons: [
                            {
                                tooltip: "点赞",
                                iconPath: new vscode.ThemeIcon("heart"),
                                action(_, qpItem) {
                                    like(qpItem?.data?.reply, "reply");
                                },
                            },
                        ],
                    });
                });
            if (!comment.lastPage) {
                const item = {
                    label: " | > 查看更多回复",
                    action: async () => {
                        try {
                            commentQp.keepScrollPosition = true;
                            await showReplies(
                                qpItems.indexOf(item),
                                comment.cid,
                                comment
                            );
                            commentQp.keepScrollPosition = false;
                        } catch (e) {
                            err("无法获取回复:", e);
                            commentQp.busy = false;
                        }
                    },
                };
                qpItems.push(item);
            }
        });

        qpItems.push({
            label: "下一页",
            description: `第 ${page} 页`,
            action: () => {
                page++;
                showComments().catch(e => {
                    err("无法获取下一页评论:", e);
                });
            },
        });
        commentQp.items = qpItems;
        commentQp.busy = false;
    };
    const showReplies = async (
        qpIndex: number,
        cid: number,
        comment: comment.Comment
    ) => {
        commentQp.busy = true;

        const page = ++comment.repliesPage,
            json = (
                await httpRequest.get(API_URLS.reply(gameId, cid, page), "json")
            ).data;
        log("页码", page, "CommentIndex", qpIndex);
        if (!json.data) return err("无法获取评论页面: 响应为空");
        const $ = cheerio.load(json.data);

        let i = 0;
        $("div.hf1 > div.hf_le > div.hf_ri1").each((_, elem) => {
            const reply: comment.Reply = {
                nickname:
                    $(elem)
                        .children("div.hf_wj")
                        .children("b")
                        .children("a")
                        .text() || "未知用户",
                content: $(elem).children("p").text(),
                cid: +(
                    $(elem)
                        .children(".xq")
                        .children(".hf")
                        .children(".ding")
                        .children("em")
                        .attr("id")
                        ?.replace("tag_", "") || 0
                ),
                likes: +$(elem)
                    .children(".xq")
                    .children(".hf")
                    .children(".ding")
                    .children("em")
                    .text()
                    .replace(/\[|\]/g, ""),
            };
            qpItems.splice(qpIndex + i++, 0, {
                label: " | ",
                description: `${reply.nickname}: ${reply.content}`,
                data: { reply },
                action(target) {
                    vscode.window.showInformationMessage(
                        target.description || ""
                    );
                },
                buttons: [
                    {
                        tooltip: "点赞",
                        iconPath: new vscode.ThemeIcon("heart"),
                        action(_, qpItem) {
                            like(qpItem?.data?.reply, "reply");
                        },
                    },
                ],
            });
        });

        if ($("div.hf1").length < 5 || json.cur_page !== page) {
            comment.lastPage = true;
            qpItems.splice(qpIndex + i, 1);
        }

        commentQp.items = qpItems;
        commentQp.busy = false;
    };

    commentQp.onDidHide(() => commentQp.dispose());
    commentQp.buttons = [
        {
            tooltip: "切换热门/最新评论",
            iconPath: new vscode.ThemeIcon("arrow-swap"),
            action: () => {
                hot = !hot;
                page = 1;
                showComments().catch(e => {
                    err("无法获取评论:", e);
                });
            },
        },
    ];

    commentQp.show();
    showComments().catch(e => {
        err("无法获取评论:", e);
        commentQp.busy = false;
    });
}

export { showComments };

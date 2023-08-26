/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as vscode from "vscode";

import { my } from "./account";
import { showForums } from "./forums";
import {
    category,
    play,
    playWebGame,
    recommended,
    showGameDetail,
    showHistory,
} from "./game";
import { searchGames } from "./search";
import {
    globalStorage,
    init,
    log,
    moreAction,
    parseId,
    setContext,
} from "./utils";

/**
 * 入口
 * @param ctx 扩展上下文
 */
export async function activate(ctx: vscode.ExtensionContext) {
    setContext(ctx);

    const commands = {
        /** 试试手气(有几率失败) */ random: () => {
            play(
                "https://www.4399.com/flash/" +
                    (Math.floor(Math.random() * 10000) + 200000) +
                    ".htm"
            );
        },
        /** 输入游戏 ID (链接以 http(s)://www.4399.com/flash/ 开头) */ get: () => {
            let i = globalStorage(ctx).get("id1");
            vscode.window
                .showInputBox({
                    value: i ? String(i) : "222735",
                    title: "4399 on VSCode: 输入游戏 ID",
                    prompt: "输入游戏链接或 http(s)://www.4399.com/flash/ 后面的数字(游戏 ID)",
                })
                .then(id => {
                    if (id) {
                        log("用户输入 ", id);
                        globalStorage(ctx).set("id1", id);
                        play(
                            "https://www.4399.com/flash/" + parseId(id) + ".htm"
                        );
                    }
                });
        },
        /** 分类 */ category,
        /** 输入游戏 ID (链接以 http(s)://www.zxwyouxi.com/g/ 开头) */ "get-h5-web-game":
            () => {
                let i = globalStorage(ctx).get("id2");
                vscode.window
                    .showInputBox({
                        value: i ? String(i) : "100060323",
                        title: "4399 on VSCode: 输入游戏 ID",
                        prompt: "输入游戏链接或 http(s)://www.zxwyouxi.com/g/ 后面的数字(游戏 ID)",
                    })
                    .then(id => {
                        if (id) {
                            log("用户输入 ", id);
                            globalStorage(ctx).set("id2", id);
                            playWebGame(
                                "https://www.zxwyouxi.com/g/" + parseId(id)
                            );
                        }
                    });
            },
        /** 推荐 */ recommended,
        /** 搜索 */ search: () => {
            let s = globalStorage(ctx).get("kwd"); // 上次搜索词

            searchGames(s);
        }, // ,
        /** 我的 */ my,
        /** 游戏详情 */ detail: showGameDetail,
        /** 历史记录 */ history: showHistory,
        /** 逛群组 */ forums: showForums,
        /** 更多操作 */ "more-action": moreAction,
    };

    Object.entries(commands).forEach(c =>
        ctx.subscriptions.push(
            vscode.commands.registerCommand("4399-on-vscode." + c[0], c[1])
        )
    );

    await init();

    log("4399 on VSCode is active!");
}

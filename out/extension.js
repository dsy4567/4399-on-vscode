/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const account_1 = require("./account");
const forums_1 = require("./forums");
const game_1 = require("./game");
const search_1 = require("./search");
const utils_1 = require("./utils");
/** 入口 */
async function activate(ctx) {
    (0, utils_1.setContext)(ctx);
    const commands = {
        /** 试试手气(有几率失败) */ random: () => {
            (0, game_1.play)("https://www.4399.com/flash/" +
                (Math.floor(Math.random() * 10000) + 200000) +
                ".htm");
        },
        /** 输入游戏 ID (链接以 http(s)://www.4399.com/flash/ 开头) */ get: () => {
            let i = (0, utils_1.globalStorage)(ctx).get("id1");
            vscode.window
                .showInputBox({
                value: i ? String(i) : "222735",
                title: "4399 on VSCode: 输入游戏 ID",
                prompt: "输入游戏链接或 http(s)://www.4399.com/flash/ 后面的数字(游戏 ID)",
            })
                .then(id => {
                if (id) {
                    (0, utils_1.log)("用户输入 ", id);
                    (0, utils_1.globalStorage)(ctx).set("id1", id);
                    (0, game_1.play)("https://www.4399.com/flash/" + (0, utils_1.parseId)(id) + ".htm");
                }
            });
        },
        /** 分类 */ category: game_1.category,
        /** 输入游戏 ID (链接以 http(s)://www.zxwyouxi.com/g/ 开头) */ "get-h5-web-game": () => {
            let i = (0, utils_1.globalStorage)(ctx).get("id2");
            vscode.window
                .showInputBox({
                value: i ? String(i) : "100060323",
                title: "4399 on VSCode: 输入游戏 ID",
                prompt: "输入游戏链接或 http(s)://www.zxwyouxi.com/g/ 后面的数字(游戏 ID)",
            })
                .then(id => {
                if (id) {
                    (0, utils_1.log)("用户输入 ", id);
                    (0, utils_1.globalStorage)(ctx).set("id2", id);
                    (0, game_1.playWebGame)("https://www.zxwyouxi.com/g/" + (0, utils_1.parseId)(id));
                }
            });
        },
        /** 推荐 */ recommended: game_1.recommended,
        /** 搜索 */ search: () => {
            let s = (0, utils_1.globalStorage)(ctx).get("kwd"); // 上次搜索词
            (0, search_1.searchGames)(s);
        },
        /** 我的 */ my: // ,
        account_1.my,
        /** 游戏详情 */ detail: game_1.showGameInfo,
        /** 历史记录 */ history: game_1.showHistory,
        /** 逛群组 */ forums: forums_1.showForums,
        /** 更多操作 */ "more-action": utils_1.moreAction,
    };
    Object.entries(commands).forEach(c => ctx.subscriptions.push(vscode.commands.registerCommand("4399-on-vscode." + c[0], c[1])));
    await (0, utils_1.init)();
    console.log("4399 on VSCode is ready!");
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map
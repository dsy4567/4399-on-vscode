/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import * as cheerio from "cheerio";
import * as cookie from "cookie";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { play } from "./game";
import { err, getContext, httpRequest, loaded, objectToQuery } from "./utils";

let COOKIE: string;

/** 设置 cookie */
async function setCookie(c: string = ""): Promise<void> {
    COOKIE = c;
    return new Promise(async (resolve, reject) => {
        try {
            getContext().secrets.store("cookie", c);
            resolve();
        } catch (e) {
            err("无法设置 cookie", e);
            reject(e);
        }
    });
}
/** 获取 cookie */
async function getCookie(): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            resolve(
                (COOKIE = (await getContext().secrets.get("cookie")) || "")
            );
        } catch (e) {
            err("无法获取 cookie", e);
            reject(e);
        }
    });
}
/** 即时获取 cookie */
function getCookieSync() {
    if (typeof COOKIE === "undefined") {
        getCookie();
        return "";
    }
    return COOKIE;
}
/**
 * 登录, 如未登录则要求用户登录, 然后执行回调, 否则直接执行回调
 * @param callback 回调, 参数为 cookie
 * @param loginOnly 直接展示登录框, 不在右下角显示提示
 */
async function login(
    callback: (cookie: string) => void,
    loginOnly: boolean = false
) {
    loaded(true);
    if (getCookieSync()) {
        if (loginOnly)
            return vscode.window
                .showInformationMessage("是否退出登录?", "是", "否")
                .then(async value => {
                    if (value === "是") {
                        await setCookie();
                        vscode.window.showInformationMessage("退出登录成功");
                    }
                });
        return callback(getCookieSync());
    } else {
        if (!loginOnly) vscode.window.showInformationMessage("请登录后继续");
        const value = await vscode.window.showQuickPick([
            "🆔 使用账号密码登录",
            "🍪 使用 cookie 登录",
        ]);
        if (value?.includes("使用 cookie 登录")) {
            let c = await vscode.window.showInputBox({
                title: "4399 on VSCode: 登录(使用 cookie)",
                prompt: "请输入 cookie, 获取方法请见扩展详情页, 登录后, 您可以玩页游或者使用其它需要登录的功能",
            });
            if (c)
                try {
                    const parsedCookie = cookie.parse(c);
                    if (!parsedCookie["Pauth"])
                        return err("登录失败, cookie 没有 Pauth 值");

                    c = encodeURI(c);
                    await setCookie(c);

                    let welcomeMsg = "";
                    if (parsedCookie["Pnick"])
                        welcomeMsg = `亲爱的 ${parsedCookie["Pnick"]}, 您已`;

                    vscode.window.showInformationMessage(
                        welcomeMsg + "登录成功"
                    );
                    callback(c);
                } catch (e) {
                    return err("登录失败, 其它原因", String(e));
                }
        } else if (value?.includes("使用账号密码登录")) {
            const user = await vscode.window.showInputBox({
                title: "4399 on VSCode: 登录(使用账号密码)",
                prompt: "请输入 4399 账号",
            });
            if (user) {
                let pwd = await vscode.window.showInputBox({
                    title: "4399 on VSCode: 登录(使用账号密码)",
                    prompt: "请输入密码",
                    password: true,
                });
                if (pwd)
                    try {
                        const r = await httpRequest.post(
                            "https://ptlogin.4399.com/ptlogin/login.do?v=1",
                            `username=${user}&password=${pwd}`,
                            "arraybuffer",
                            true
                        );
                        const html = iconv.decode(r.data, "utf8");
                        const $ = cheerio.load(html);
                        const msg = $("#Msg");
                        if (msg.text())
                            return err(
                                "登录失败, ",
                                msg.text().replace(/[\n\r\t ]/gi, "")
                            );

                        let c: string[] | undefined = r.headers["set-cookie"];
                        let cookies: any = [];

                        // 合并多个 set-cookie
                        if (c && c[0]) {
                            c.forEach(co => {
                                cookies.push(cookie.parse(co));
                            });
                            cookies = Object.assign({}, ...cookies, {
                                Path: "/",
                                Domain: "4399.com",
                            });
                            cookies = objectToQuery(cookies);

                            const parsedCookie = cookie.parse(cookies);
                            if (!parsedCookie["Pauth"])
                                return err("登录失败, cookie 没有 Pauth 值");

                            cookies = encodeURI(cookies);
                            await setCookie(cookies);

                            let welcomeMsg = "";
                            if (parsedCookie["Pnick"])
                                welcomeMsg =
                                    "登录成功: " + parsedCookie["Pnick"];

                            vscode.window.showInformationMessage(
                                welcomeMsg || "登录成功"
                            );
                            callback(cookies);
                        } else return err("登录失败, 响应头没有 set-cookie");
                    } catch (e) {
                        return err("登录失败, 其它原因", String(e));
                    }
            }
        }
    }
}
/** 签到 */
function checkIn(quiet?: boolean) {
    login(async () => {
        try {
            const data: {
                code?: number;
                result?:
                    | null
                    | string
                    | {
                          days?: number;
                          credit?: number;
                      };
                msg?: string;
            } = (
                await httpRequest.get(
                    "https://my.4399.com/plugins/sign/set-t-" +
                        new Date().getTime(),
                    "json"
                )
            ).data;
            if (data.result === null) err("签到失败, 其他错误: " + data.msg);
            else if (typeof data.result === "string")
                !quiet && vscode.window.showInformationMessage(data.result);
            else if (typeof data.result === "object")
                !quiet &&
                    vscode.window.showInformationMessage(
                        `签到成功, 您已连续签到${data.result.days}天`
                    );
            else err("签到失败, 返回数据非法");
        } catch (e) {
            err("签到失败: ", String(e));
        }
    });
}
/** 我的 */
function my() {
    login(async c => {
        let Pnick = cookie.parse(c)["Pnick"] || "未知";
        Pnick = Pnick === "0" ? "未知" : Pnick;
        const value = await vscode.window.showQuickPick([
            "🆔 昵称: " + Pnick,
            "❤️ 我的收藏盒",
            "✨ 猜你喜欢",
            "🕒 我玩过的",
            "🖊 签到",
            "🚪 退出登录",
        ]);
        if (value) {
            const getGames = async (
                url: string,
                index: "recommends" | "games" | "played_gids" = "recommends"
            ) => {
                try {
                    const favorites: {
                        games: number[];
                        played_gids: { gid: number }[];
                        recommends: { gid: number }[];
                        game_infos: Record<
                            number,
                            { c_url: string; name: string }
                        >;
                    } = (await httpRequest.get(url, "json")).data;
                    let _favorites: Record<string, string> = {};
                    let names: string[] = [];
                    if (favorites && favorites.game_infos && favorites[index]) {
                        const info = favorites.game_infos;
                        favorites[index].forEach(o => {
                            let id: number = typeof o === "number" ? o : o.gid;
                            _favorites[info[id].name] = info[id].c_url;
                            names.push(info[id].name);
                        });
                        vscode.window.showQuickPick(names).then(game => {
                            if (game) play(_favorites[game]);
                        });
                    }
                } catch (e) {
                    err("获取失败", String(e));
                }
            };
            if (value.includes("我的收藏"))
                getGames(
                    "https://gprp.4399.com/cg/collections.php?page_size=999",
                    "games"
                );
            else if (value.includes("猜你喜欢"))
                getGames(
                    "https://gprp.4399.com/cg/recommend_by_both.php?page_size=100",
                    "recommends"
                );
            else if (value.includes("我玩过的"))
                getGames(
                    "https://gprp.4399.com/cg/get_gamehistory.php?page_size=100",
                    "played_gids"
                );
            else if (value.includes("签到")) checkIn();
            else if (value.includes("退出登录")) login(() => {}, true);
        }
    });
}

export { setCookie, getCookie, getCookieSync, login, checkIn, my };

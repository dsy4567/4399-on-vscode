/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as cookie from "cookie";
import * as fs from "fs";
import * as iconv from "iconv-lite";
import isLocalhost = require("is-localhost-ip");
import * as path from "path";
import * as vscode from "vscode";

import { login } from "./account";
import { getPort, initHttpServer, setData } from "./server";
import {
    DATA_DIR,
    DIRNAME,
    err,
    getCfg,
    getContext,
    globalStorage,
    httpRequest,
    is4399Domain,
    log,
    loaded,
    openUrl,
    parseId,
    showWebviewPanel,
} from "./utils";
import { showComments } from "./comment";

/** 接口地址 */
const API_URLS = {
    /** 登录页游 */
    webGame: (gameId: number, cookieValue: string) =>
        [
            "https://h.api.4399.com/intermodal/user/grant2",
            `gameId=${gameId}&authType=cookie&cookieValue=${cookieValue}`,
        ] as const,
    /** 添加到收藏盒 */
    addCollection: (gameId: string) =>
        `"https://gprp.4399.com/cg/add_collection.php?gid=${gameId}`,
};

/** 是否为 flash 游戏 */
let isFlashGame = false;
/** e.g. szhong.4399.com */
let server = "";
/** e.g. /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html */
let gamePath = "";
/** e.g. https://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html */
let gameUrl = "";
/** e.g. {"原始人部落": "https://www.4399.com/flash/230924.htm"} */
let gameInfoUrls: Record<string, string> = {};
/** e.g. https://client-zmxyol.3304399.net/client/?... */
let webGameUrl = "";

// 使用事先准备好的规则匹配难以添加支持的游戏
let supplements: Supplements = JSON.parse(
    fs
        .readFileSync(path.join(DIRNAME, "../resources/supplements.json"))
        .toString()
);
if (supplements._ver !== 1) supplements = {} as Supplements;

/**
 * 获取存放小游戏的服务器
 * @returns 一个兑现游戏资源服务器域名的 Promise
 */
async function parseServer(server_matched: RegExpMatchArray): Promise<string> {
    try {
        let res = await httpRequest.get(
            "https://www.4399.com" + server_matched[0].split('"')[1],
            "text",
            true
        );
        if (res.data) {
            log("成功获取到定义游戏服务器的脚本");
            return (res.data as string).split('"')[1].split("/")[2];
        } else
            throw new Error(
                "无法获取定义游戏服务器的脚本: 响应为空, 您可能需要配置 UA 或登录账号"
            );
    } catch (e) {
        console.error(e);
        return (
            server_matched[0]
                .split('"')[1]
                .replace("/js/server", "")
                .replace(".js", "") + ".4399.com"
        );
    }
}
/**
 * 启动 H5/flash 小游戏
 * @param url 游戏详情页链接
 */
async function play(url: string, download = false) {
    try {
        if (url.startsWith("//")) url = "https:" + url;
        else if (url.startsWith("/")) url = "https://www.4399.com" + url;

        loaded(false);

        let supplement = supplements[new URL(url).pathname];
        if (supplement) {
            let u = new URL(supplement.url);
            server = u.host;
            gamePath = u.pathname;
            gameUrl = "" + u;
            isFlashGame = supplement.type === "flash";
            setData((await httpRequest.get("" + u, "arraybuffer")).data);

            initHttpServer(() => {
                gameInfoUrls[supplement.title] = supplement.detailUrl;
                showWebviewPanel(
                    "http://127.0.0.1:" + getPort(),
                    supplement.title,
                    isFlashGame && "fl",
                    true
                );

                try {
                    let D = new Date();
                    updateHistory({
                        date: ` (${D.getFullYear()}年${
                            D.getMonth() + 1
                        }月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                        name: supplement.title,
                        webGame: false,
                        url: url,
                    });
                } catch (e) {
                    err("写入历史记录失败", String(e));
                }
            });
            return;
        }

        if (!/[0-9].+htm/i.test("" + url)) return err("不支持该类型的游戏");
        let res = (await httpRequest.get(url, "arraybuffer")) as AxiosResponse<
            Buffer | string
        >;

        if (!res.data) return err("无法获取游戏页面: 响应文本为空");
        res.data = iconv.decode(res.data as Buffer, "gb2312");
        log("成功获取到游戏页面");
        const $ = cheerio.load(res.data);
        const html = $.html();
        if (!html) return err("无法获取游戏页面: 游戏详情页 html 为空");

        let title: string | null = "";
        let m: RegExpMatchArray | null = null,
            $flash = $("iframe#flash22, iframe#CommFrame"),
            $flash_src = $flash.attr("src"),
            isFlashPage = false;

        m = html.match(/<title>.+<\/title>/i);
        if (!m) title = $("title").html();
        else
            try {
                title = m[0]
                    .replace(/<\/?title>/gi, "")
                    .split(/[-_ |，,¦]/gi)[0]
                    .replaceAll(/[\n ]/gi, "");
            } catch (e) {
                title = $("title").html();
                err("无法匹配游戏标题:", e);
            }

        title = title || url;
        if ($("title").text().includes("您访问的页面不存在！") && res.status)
            return err("无法获取游戏信息: 游戏可能因为某些原因被删除");

        if (
            $flash[0] &&
            $flash_src &&
            !$flash_src.includes("h.api.4399.com/")
        ) {
            let u = new URL($flash_src, "https://www.4399.com");
            gameUrl = "" + u;
            server = u.host;
            gamePath = u.pathname;
        } else {
            let server_matched = html
                .replaceAll(" ", "")
                .match(/src\=\"\/js\/((server|s[0-9]).*|nitrome)\.js\"/i);
            let gamePath_matched = html.match(
                /\_strGamePath\=\".+\.(swf|htm[l]?)(\?.+)?\"(,game_title|;)/i
            );
            if (!server_matched || !gamePath_matched) {
                // 游戏可能是 h5 页游
                let u1 = $("iframe#flash22").attr("src");
                let u2 = $("a.start-btn").attr("href");
                if (u1) return playWebGame(u1, download);

                if (u2) return playWebGame(u2, download);

                err("游戏类型不受支持, 已自动为您跳转至游戏详情页面");
                return showWebviewPanel(url, title);
            }
            let p = (gamePath_matched as RegExpMatchArray)[0]
                .replaceAll(" ", "")
                .replace("_strGamePath=", "")
                .replace(/"|,game_title|;/g, "");

            gamePath = p.includes("//")
                ? "" + new URL(p, "https://www.4399.com").pathname
                : "/4399swf" + p;

            if (gamePath.includes("gameId="))
                try {
                    let u = new URL(gamePath, "https://www.4399.com/");
                    let i = u.searchParams.get("gameId");
                    if (i && !isNaN(Number(i))) return playWebGame(i, download);
                } catch (e) {}

            let s = await parseServer(server_matched);
            server = s;
            log("服务器", s);
        }

        // 简单地判断域名是否有效
        if ((await isLocalhost(server)) || /[/:?#\\=&]/g.test(server))
            return err("游戏服务器域名 " + server + " 非法");

        if (
            !is4399Domain(server) &&
            (await vscode.window.showWarningMessage(
                "游戏服务器域名 " +
                    server +
                    " 不以 4399.com 结尾, 是否仍要开始游戏",
                "是",
                "否"
            )) !== "是"
        )
            return loaded(true);

        gameUrl = "https://" + server + gamePath;

        if (!gameUrl) return err("游戏真实地址为空");
        if (
            !$(
                "#skinbody > div:nth-child(7) > div.fl-box > div.intr.cf > div.eqwrap"
            )[0] &&
            !gamePath.includes(".swf")
        )
            isFlashPage = true;

        try {
            res = (await httpRequest.get(
                gameUrl,
                "arraybuffer"
            )) as AxiosResponse<Buffer | string>;

            if (!res.data) return err("无法获取游戏页面: html 为空");

            if (
                isFlashPage &&
                res.headers["content-type"].toLocaleLowerCase().includes("html")
            ) {
                let m = (
                    iconv.decode(res.data as Buffer, "gb2312") as string
                ).match(/<embed.+src=".+.swf/i);

                if (m) {
                    let fileName = m[0].split('"').at(-1) as string;
                    if (fileName.includes("gameloader.swf")) {
                        m = fileName.match(/gameswf=.+.swf/);
                        if (m) fileName = m[0].split("=").at(-1) as string;
                    }
                    gameUrl = gameUrl.replace(
                        gameUrl.split("/").at(-1) as string,
                        fileName
                    );
                    let u = new URL(gameUrl);
                    gamePath = u.pathname;
                    res.data = (
                        await httpRequest.get(gameUrl, "arraybuffer")
                    ).data;
                }
            }
            if (res.data)
                if (download) {
                    loaded(true);
                    if (!gamePath.includes(".swf"))
                        return err("无法下载游戏文件: 只能下载 Flash 游戏");

                    let p = path.join(
                        DATA_DIR,
                        `./downloads/${title}-${+new Date()}.swf`
                    );
                    fs.writeFile(p, res.data, e => {
                        if (e) return err("无法下载游戏文件:", e);
                        vscode.window.showInformationMessage(
                            "游戏文件已保存到 " + p
                        );
                    });
                } else {
                    log("成功获取到游戏真实页面", gameUrl);

                    initHttpServer(() => {
                        setData(res.data);
                        title = title || url;
                        gameInfoUrls[title] = url;
                        showWebviewPanel(
                            "http://127.0.0.1:" + getPort(),
                            title,
                            gamePath.includes(".swf") && "fl",
                            true
                        );

                        try {
                            let D = new Date();
                            updateHistory({
                                date: ` (${D.getFullYear()}年${
                                    D.getMonth() + 1
                                }月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                                name: title,
                                webGame: false,
                                url: url,
                            });
                        } catch (e) {
                            err("写入历史记录失败", String(e));
                        }
                    });
                }
            else err("无法获取游戏真实页面: 响应为空");
        } catch (e) {
            err("无法获取游戏真实页面: ", e);
        }
    } catch (e) {
        err("无法获取游戏页面: ", e);
    }
}
/**
 * 启动 h5 页游
 * @param urlOrId 游戏详情页链接或游戏 ID(字符串)
 */
function playWebGame(urlOrId: string, download = false) {
    if (download) {
        loaded(true);
        if (!gamePath.includes(".swf"))
            return err("无法下载游戏文件: 只能下载 Flash 游戏");
    }
    login(async (c: string) => {
        loaded(false);

        let gameId = parseId(urlOrId);
        if (!gameId || isNaN(gameId))
            return err("h5 页游链接格式不正确, 或该游戏类型不支持");

        try {
            let cookieValue = cookie.parse(c)["Pauth"];
            if (!cookieValue) return err("cookie 没有 Pauth 的值");

            let data: {
                data?: {
                    game?: {
                        mainId: number;
                        gameName: string;
                        gameUrl?: string;
                    };
                };
            } = (
                await httpRequest.post(
                    ...API_URLS.webGame(gameId, cookieValue),
                    "json"
                )
            ).data;
            if (
                !(
                    data.data?.game?.gameUrl &&
                    data.data.game.gameUrl !== "&addiction=0"
                )
            )
                return err("无法登录游戏, 或者根本没有这个游戏");

            log(data);
            let url = "https://www.zxwyouxi.com/g/" + gameId;
            let title = decodeURI(data.data.game.gameName);
            title = title || url;
            try {
                gameInfoUrls[title] =
                    "https://www.4399.com/flash/" +
                    data.data.game.mainId +
                    ".htm";
            } catch (e) {}
            try {
                let D = new Date();
                updateHistory({
                    date: ` (${D.getFullYear()}年${
                        D.getMonth() + 1
                    }月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                    name: title,
                    webGame: true,
                    url: url,
                });
            } catch (e) {
                err("写入历史记录失败", String(e));
            }

            showWebviewPanel(
                (webGameUrl = data.data.game.gameUrl),
                title,
                "",
                true,
                false
            );
        } catch (e) {
            err("无法获取游戏页面", String(e));
        }
    });
}
/**
 * 显示游戏详细信息
 * @param url 游戏详情页链接(可选, 留空则显示已打开的游戏)
 */
async function showGameDetail(url?: string) {
    let u = Object.keys(gameInfoUrls),
        title = "";

    if (url) {
    } else if (u.length === 1) url = gameInfoUrls[(title = u[0])];
    else if (u[1]) {
        title = (await vscode.window.showQuickPick(u)) || "";
        url = gameInfoUrls[title];
    }
    if (!url) return;
    let gameId = "" + parseId(url);

    try {
        url = "https://www.4399.com/flash/" + gameId + ".htm";

        const html = iconv.decode(
            (await httpRequest.get(url, "arraybuffer")).data,
            "gb2312"
        );
        if (!html) return err("无法获取游戏页面: html 为空");

        const $ = cheerio.load(html);
        const desc1 = $("#introduce > font").text().replaceAll(/[\n ]/gi, "");
        const desc2 = $(
            "body > div.waper > div.content > div > div.box1.cf > div.intro.fl > div"
        )
            .text()
            .replaceAll(/[\n ]/gi, "");
        const desc3 = $(
            "body > div.main > div.w3.mb10 > div > div.bd_bg > div > div.w3_con1.cf > div.fl.con_l > div.cf.con_l1 > div.m11.fl > p"
        )
            .text()
            .replaceAll(/[\n ]/gi, "");
        const desc4 = $("#cont").text().replaceAll(/[\n ]/gi, "");
        let desc = desc1 || desc2 || desc3 || desc4 || "未知";
        gameId = (isNaN(Number(gameId)) ? "未知" : gameId) || "未知";
        const item = await vscode.window.showQuickPick([
            "🎮 游戏名: " + title,
            "📜 简介: " + desc,
            "🆔 游戏 ID: " + gameId,
            "ℹ️ " + $("div.cls").text(),
            "❤️ 添加到收藏盒",
            "⬇️ 下载游戏（仅单文件 Flash 游戏）",
            "🌏 在浏览器中打开详情页面",
            "💬 热门评论",
        ]);
        if (!item) return;

        try {
            if (item === "❤️ 添加到收藏盒")
                login(async () => {
                    try {
                        await httpRequest.get(
                            API_URLS.addCollection(gameId),
                            "json"
                        );
                        vscode.window.showInformationMessage(
                            "添加到收藏盒成功"
                        );
                    } catch (e) {
                        err("添加到收藏盒失败", String(e));
                    }
                });
            else if (item === "⬇️ 下载游戏（仅单文件 Flash 游戏）")
                play(url, true);
            else if (item === "🌏 在浏览器中打开详情页面")
                openUrl(url as string);
            else if (item === "💬 热门评论") showComments(+gameId, title);
            else vscode.window.showInformationMessage(item);
        } catch (e) {
            err("无法获取游戏页面", String(e));
        }
    } catch (e) {
        err("无法获取游戏页面", String(e));
    }
}

/** 分类 */
async function category() {
    let res: AxiosResponse;
    try {
        res = await httpRequest.get("https://www.4399.com/", "arraybuffer");
    } catch (e) {
        return err("无法获取4399首页: ", e);
    }
    if (!res.data) return err("无法获取4399首页: 响应为空");

    res.data = iconv.decode(res.data, "gb2312");
    log("成功获取到4399分类页");

    let $ = cheerio.load(res.data),
        categories: Record<string, string> = {};
    $(
        "a[href*='/flash_fl/'][href*='.htm'], a[href*='/special/'][href*='.htm']"
    ).each((i, elem) => {
        let categoryName = $(elem).text().replaceAll(/ |\n/g, ""),
            href = $(elem).attr("href")?.replaceAll(/ |\n/g, "");
        if (
            !categoryName ||
            !href ||
            categoryName.includes("开服") ||
            categoryName.includes("网页") ||
            categoryName.includes("云游戏")
        )
            return;
        categories[categoryName] = href;
    });
    let categoryNames = Object.keys(categories);
    if (!categoryNames[0]) return err("一个分类也没有");

    let val = await vscode.window.showQuickPick(categoryNames);
    log("用户输入:", val);
    if (!val) return;

    let url = categories[val];
    log("游戏页面: ", url);
    if (!url) return err("变量 url 可能为 undefined");

    try {
        res = await httpRequest.get(
            "" + new URL(url, "https://www.4399.com/"),
            "arraybuffer"
        );
    } catch (e) {
        return err("无法获取分类页: ", e);
    }
    if (!res.data) return err("无法获取分类页: 响应为空");

    res.data = iconv.decode(res.data, "gb2312");
    log("成功获取到分类页");

    $ = cheerio.load(res.data);
    let games: Record<string, string> = {};

    $(".setlide, .slide_img").remove();
    $("a[href*='/flash/'][href*='.htm']:has(img)").each((i, elem) => {
        let gameName = $(elem)
                .children("img")
                .attr("alt")
                ?.replaceAll(/ |\n/g, ""),
            href = $(elem).attr("href")?.replaceAll(/ |\n/g, "");
        if (!gameName || !href || !/[0-9].+htm/i.test(href)) return;
        games[gameName] = href;
    });

    let gameNames = Object.keys(games);
    if (!gameNames[0]) return err("一个游戏也没有");

    val = await vscode.window.showQuickPick(gameNames);
    log("用户输入:", val);
    if (!val) return;

    url = games[val];
    log("游戏页面: ", url);
    if (!url) return err("变量 url 可能为 undefined");

    play(url);
}
/** 首页推荐 */
async function recommended() {
    let res: AxiosResponse;
    try {
        res = await httpRequest.get("https://www.4399.com/", "arraybuffer");
    } catch (e) {
        return err("无法获取4399首页: ", e);
    }
    if (!res.data) return err("无法获取4399首页: 响应为空");

    res.data = iconv.decode(res.data, "gb2312");
    log("成功获取到4399首页");

    const $ = cheerio.load(res.data);
    let games: Record<string, string> = {};

    $("a[href*='/flash/'][href*='.htm']")
        .has("img")
        .each((i, elem) => {
            let gameName = $(elem).text().replaceAll(/ |\n/g, ""),
                href = $(elem).attr("href")?.replaceAll(/ |\n/g, "");
            if (!gameName || !href || !/[0-9].+htm/i.test(href)) return;
            games[gameName] = href;
        });

    let gameNames = Object.keys(games);
    if (!gameNames[0]) return err("一个游戏也没有");

    const val = await vscode.window.showQuickPick(gameNames);
    log("用户输入:", val);
    if (!val) return;

    let url = games[val];
    log("游戏页面: ", url);
    if (!url) return err("变量 url 可能为 undefined");

    play(url);
}

/**
 * 获取 {@link server}
 * {@link gamePath}
 * {@link gameUrl}
 * {@link gameInfoUrls}
 * {@link webGameUrl}
 * {@link isFlashGame} 变量值
 */
function getGameInfo() {
    return {
        /** e.g. szhong.4399.com */
        server,
        /** e.g. /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html */
        gamePath,
        /** e.g. https://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html */
        gameUrl,
        /** e.g. {"原始人部落": "https://www.4399.com/flash/230924.htm"} */
        gameInfoUrls,
        /** e.g. https://client-zmxyol.3304399.net/client/?... */
        webGameUrl,
        isFlashGame,
    };
}
/** 设置 {@link server}
 * {@link gamePath}
 * {@link gameUrl}
 * {@link gameInfoUrls}
 * {@link webGameUrl}
 * {@link isFlashGame} 变量值
 */
function setGameInfo(
    Server?: string,
    GamePath?: string,
    GameUrl?: string,
    GameInfoUrls?: Record<string, string>,
    WebGameUrl?: string,
    IsFlashGame?: boolean
) {
    if (typeof Server !== "undefined") server = Server;
    if (typeof GamePath !== "undefined") gamePath = GamePath;
    if (typeof GameUrl !== "undefined") gameUrl = GameUrl;
    if (typeof GameInfoUrls !== "undefined") gameInfoUrls = GameInfoUrls;
    if (typeof WebGameUrl !== "undefined") webGameUrl = WebGameUrl;
    if (typeof IsFlashGame !== "undefined") isFlashGame = IsFlashGame;
    return;
}

/** 显示历史记录 */
async function showHistory() {
    try {
        let h: History[] = globalStorage(getContext()).get("history");
        if (!h || (typeof h === "object" && !h[0])) h = [];

        h.unshift({
            webGame: false,
            name: "🧹 清空历史记录",
            url: "",
            date: "",
        });

        let quickPickList: string[] = [];
        h.forEach(obj => {
            quickPickList.push(obj.name + obj.date);
        });
        const gameName = await vscode.window.showQuickPick(quickPickList);
        if (gameName === "🧹 清空历史记录")
            return globalStorage(getContext()).set("history", []);

        if (gameName)
            for (let index = 0; index < h.length; index++) {
                const item = h[index];
                if (item.name + item.date === gameName) {
                    if (item.webGame) playWebGame(item.url);
                    else play(item.url);

                    break;
                }
            }
    } catch (e) {
        err("无法读取历史记录", String(e));
    }
}
/** 写入历史记录 */
function updateHistory(history: History) {
    if (!getCfg("updateHistory", true)) return;

    let h: History[] = globalStorage(getContext()).get("history");
    if (!h || (typeof h === "object" && !h[0])) h = [];

    h.unshift(history);
    globalStorage(getContext()).set("history", h);
}

export {
    parseServer,
    play,
    playWebGame,
    showGameDetail,
    category,
    recommended,
    getGameInfo,
    setGameInfo,
    showHistory,
    updateHistory,
};

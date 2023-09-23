/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { play } from "./game";
import {
    createQuickPick,
    err,
    getContext,
    globalStorage,
    httpRequest,
    log,
} from "./utils";

/** 接口地址 */
const API_URLS = {
    /** 搜索结果 */
    result: (kwd: string = "", page: number) =>
        `https://so2.4399.com/search/search.php?k=${encodeURI(kwd)}&p=${page}`,
    /** 搜索建议 */
    suggest: (kwd: string = "") =>
        `https://so2.4399.com/search/lx.php?k=${encodeURI(kwd)}`,
};

// 搜索相关
let searchQp: vscode.QuickPick<vscode.QuickPickItem>;
let searchQpItems: vscode.QuickPickItem[] = [];
/** 已输入的搜索词 */
let searchValue: string;
/** 页码 */
let searchPage: number = 1;
/** e.g. searchData[0] == ["造梦无双", 210650] */
let searchedGames: [string, number][];
/** 延迟获取搜索建议 */
let searchTimeout: NodeJS.Timeout;
/** 正在展示搜索结果 */
let showingSearchResult = false;

/** 搜索关键词 */
async function searchByKwd(s: string) {
    if (searchQp.busy) return;

    searchQp.title = s + " 的搜索结果";
    searchQp.busy = true;
    log("页码 " + searchPage);

    let res;
    try {
        res = (await httpRequest.get(
            API_URLS.result(s, searchPage),
            "arraybuffer"
        )) as AxiosResponse<Buffer | string>;
    } catch (e) {
        searchQp.busy = false;
        return err("无法获取搜索页: ", e);
    }
    if (!res.data) return err("无法获取游戏真实页面: 响应为空");

    res.data = iconv.decode(res.data as Buffer, "gb2312");
    log("成功获取到4399搜索页面");
    const $ = cheerio.load(res.data);
    searchedGames = [];
    searchQpItems = [];

    $("#skinbody > div.w_980.cf > div.anim > div > div > div.pop > b > a").each(
        (i, elem) => {
            let h = $(elem).html();
            let u = $(elem).attr("href");
            if (!h || !u) return;

            let id = Number(u.split(/[/.]/gi).at(-2));
            let n = h
                .replace(/<font color=['"]?red['"]?>/, "")
                .replace("</font>", "");
            if (!id || isNaN(id) || !n) return;

            searchedGames.push([n, id]);
        }
    );

    searchedGames.forEach(g => {
        searchQpItems.push({
            label: g[0],
            description: "游戏 ID: " + g[1],
            alwaysShow: true,
        });
    });
    searchQpItems.push({
        label: "下一页",
        description: "加载下一页内容",
        alwaysShow: true,
    });
    searchQp.items = searchQpItems;
    showingSearchResult = true;
    searchQp.buttons = [vscode.QuickInputButtons.Back];
    searchQp.busy = false;
}
/**
 * 搜索游戏
 * @param s 默认搜索词
 */
async function searchGames(s: string) {
    if (searchQp) searchQp.value = s || searchValue;
    else {
        searchQp = createQuickPick({
            value: s || "",
            title: "4399 on VSCode: 搜索",
            prompt: "输入搜索词",
        });
        searchQp.onDidChangeValue(suggest);
        searchQp.onDidAccept(() => {
            if (searchQp.activeItems[0].description === "直接搜索")
                searchByKwd(searchQp.value).catch(e => {
                    searchQp.busy = false;
                    err(e);
                });
            else if (searchQp.activeItems[0].label === "下一页") {
                searchPage++;
                searchByKwd(searchQp.value).catch(e => {
                    searchQp.busy = false;
                    err(e);
                });
            } else if (
                searchQp.activeItems[0].description?.includes("游戏 ID: ")
            ) {
                play(
                    `https://www.4399.com/flash/${+searchQp.activeItems[0].description?.replace(
                        "游戏 ID: ",
                        ""
                    )}.htm`
                );
                searchQp.hide();
                globalStorage(getContext()).set("kwd", searchQp.value);
            }
        });
        searchQp.onDidTriggerButton(async b => {
            if (searchQp.busy) return;
            if (b === vscode.QuickInputButtons.Back)
                return suggest(searchQp.value);
        });
    }

    searchQp.buttons = showingSearchResult
        ? [vscode.QuickInputButtons.Back]
        : [];

    searchQp.items = searchQpItems;
    searchQp.show();
}
/** 获取搜索建议 */
async function suggest(kwd: string) {
    searchValue = kwd;
    searchQp.title = "4399 on VSCode: 搜索";

    searchPage = 1;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        searchQp.busy = true;
        searchQp.buttons = [];
        let res: AxiosResponse<Buffer | string>;
        try {
            res = await httpRequest.get(API_URLS.suggest(kwd), "arraybuffer");
        } catch (e) {
            return err("获取搜索建议失败", String(e));
        }
        if (!res.data) return err("获取搜索建议失败");

        res.data = iconv.decode(res.data as Buffer, "gb2312");
        let d: string = res.data;
        log(d);

        let m = d.split(" =")[1];
        searchedGames = [];
        searchQpItems = [];

        try {
            if (!m) throw new Error("");

            searchedGames = JSON.parse(m.replaceAll("'", '"'));
        } catch (e) {
            return err("解析搜索建议失败");
        }

        searchQpItems.push({
            label: searchQp.value,
            description: "直接搜索",
            alwaysShow: true,
        });
        searchedGames.forEach(g => {
            searchQpItems.push({
                label: g[0],
                description: "游戏 ID: " + g[1],
                alwaysShow: true,
            });
        });

        if (searchQpItems[0]) searchQp.items = searchQpItems;

        showingSearchResult = false;
        searchQp.busy = false;
    }, 1000);
}

export { searchGames };

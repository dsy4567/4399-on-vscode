/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { search, utils } from ".";
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
    suggestion: (kwd: string = "") =>
        `https://so2.4399.com/search/lx.php?k=${encodeURI(kwd)}`,
};

// 搜索相关
let searchQp: utils.QuickPick<search.SearchQuickPickItemData>;
let searchQpItems: search.SearchQuickPickItem[] = [];
/** 已输入的搜索词 */
let searchValue: string;
/** 页码 */
let searchPage: number = 1;
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

            searchQpItems.push({
                label: n,
                description: "游戏 ID: " + id,
                alwaysShow: true,
                action(target) {
                    play(`https://www.4399.com/flash/${target.data?.id}.htm`);
                    searchQp.hide();
                    globalStorage(getContext()).set("kwd", searchQp.value);
                },
                data: {
                    title: n,
                    id,
                },
            });
        }
    );

    searchQpItems.push({
        label: "下一页",
        description: `第 ${searchPage} 页`,
        alwaysShow: true,
        action() {
            searchPage++;
            searchByKwd(searchQp.value).catch(e => {
                searchQp.busy = false;
                err(e);
            });
        },
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
        searchQp.onDidTriggerButton(async b => {
            if (!searchQp.busy && b === vscode.QuickInputButtons.Back)
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
    searchQpItems = [
        {
            label: searchQp.value,
            description: "直接搜索",
            alwaysShow: true,
            action() {
                clearTimeout(searchTimeout);
                searchByKwd(searchQp.value).catch(e => {
                    searchQp.busy = false;
                    err(e);
                });
            },
        },
    ];
    searchQp.items = searchQpItems;

    searchPage = 1;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        searchQp.busy = true;
        searchQp.buttons = [];
        let res: AxiosResponse<Buffer | string>;
        try {
            res = await httpRequest.get(
                API_URLS.suggestion(kwd),
                "arraybuffer"
            );
        } catch (e) {
            return err("获取搜索建议失败", String(e));
        }
        if (!res.data) return err("获取搜索建议失败");

        res.data = iconv.decode(res.data as Buffer, "gb2312");
        let d: string = res.data;
        log(d);

        let m = d.split(" =")[1],
            suggestions: [string, number][] = [];

        try {
            if (!m) throw new Error("");

            suggestions = JSON.parse(m.replaceAll("'", '"'));
        } catch (e) {
            return err("解析搜索建议失败");
        }

        suggestions.forEach(g => {
            searchQpItems.push({
                label: g[0],
                description: "游戏 ID: " + g[1],
                alwaysShow: true,
                action(target) {
                    play(`https://www.4399.com/flash/${target.data?.id}.htm`);
                    searchQp.hide();
                    globalStorage(getContext()).set("kwd", searchQp.value);
                },
                data: {
                    title: g[0],
                    id: g[1],
                },
            });
        });

        searchQp.items = searchQpItems;

        showingSearchResult = false;
        searchQp.busy = false;
    }, 1000);
}

export { searchGames };

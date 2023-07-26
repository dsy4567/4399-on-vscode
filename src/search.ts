/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

import { play } from "./game";
import {
    createQuickPick,
    err,
    log,
    getContext,
    getReqCfg,
    globalStorage,
} from "./utils";

// 搜索相关
let searchQp: vscode.QuickPick<vscode.QuickPickItem>;
let searchQpItems: vscode.QuickPickItem[] = [];
/** 已输入的搜索词 */
let searchValue: string;
/** 页码 */
let searchPage: number = 1;
/** e.g. searchData[0] == ["造梦无双", 210650] */
let searchData: [string, number][];
/** e.g. searchedGames["造梦无双"] == 210650 */
let searchedGames: Record<string, number> = {};
/** 延迟获取搜索建议 */
let searchTimeout: NodeJS.Timeout;

/**
 * 搜索游戏
 * @param s 默认搜索词
 */
async function searchGames(s: string) {
    if (searchQp) searchQp.show();

    searchQp = createQuickPick({
        value: String(s) || "",
        title: "4399 on VSCode: 搜索",
        prompt: "输入搜索词",
    });

    const search = async (s: string) => {
        searchQp.title = s + " 的搜索结果";
        searchQp.busy = true;
        log("页码 " + searchPage);

        let res: AxiosResponse;
        try {
            res = await axios.get(
                "https://so2.4399.com/search/search.php?k=" +
                    encodeURI(s) +
                    "&p=" +
                    searchPage,
                getReqCfg("arraybuffer")
            );
        } catch (e) {
            return err("无法获取4399首页: ", e);
        }
        if (!res.data) return err("无法获取游戏真实页面: 响应为空");

        res.data = iconv.decode(res.data, "gb2312");
        log("成功获取到4399搜索页面");
        const $ = cheerio.load(res.data);
        searchedGames = {};
        searchData = [];
        searchQpItems = [];

        $(
            "#skinbody > div.w_980.cf > div.anim > div > div > div.pop > b > a"
        ).each((i, elem) => {
            let h = $(elem).html();
            let u = $(elem).attr("href");
            if (!h || !u) return;

            let id = Number(u.split(/[/.]/gi).at(-2));
            let n = h
                .replace(/<font color=['"]?red['"]?>/, "")
                .replace("</font>", "");
            if (!id || isNaN(id) || !n) return;

            searchData.push([n, id]);
            searchedGames[n] = id;
        });

        searchData.forEach(g => {
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
        searchQp.busy = false;
    };
    searchQp.onDidChangeValue(kwd => {
        if (kwd === searchValue) return (searchQp.items = searchQpItems);

        searchValue = kwd;
        searchQp.title = "4399 on VSCode: 搜索";

        searchPage = 1;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            searchQp.busy = true;
            let res: AxiosResponse;
            try {
                res = await axios.get(
                    "https://so2.4399.com/search/lx.php?k=" + encodeURI(kwd),
                    getReqCfg("arraybuffer")
                );
            } catch (e) {
                return err("获取搜索建议失败", String(e));
            }
            if (!res.data) return err("获取搜索建议失败");

            res.data = iconv.decode(res.data, "gb2312");
            let d: string = res.data;
            log(d);

            let m = d.split(" =")[1];
            searchedGames = {};
            searchData = [];
            searchQpItems = [];

            try {
                if (!m) throw new Error("");

                searchData = JSON.parse(m.replaceAll("'", '"'));
            } catch (e) {
                return err("解析搜索建议失败");
            }

            searchQpItems.push({
                label: searchQp.value,
                description: "直接搜索",
                alwaysShow: true,
            });
            searchData.forEach(g => {
                searchQpItems.push({
                    label: g[0],
                    description: "游戏 ID: " + g[1],
                    alwaysShow: true,
                });
                searchedGames[g[0]] = g[1];
            });

            if (searchQpItems[0]) searchQp.items = searchQpItems;

            searchQp.busy = false;
        }, 1000);
    });
    searchQp.onDidAccept(() => {
        if (searchQp.activeItems[0].description === "直接搜索")
            search(searchQp.value);
        else if (searchQp.activeItems[0].label === "下一页") {
            searchPage++;
            search(searchQp.value);
        } else {
            play(
                `https://www.4399.com/flash/${
                    searchedGames[searchQp.activeItems[0].label]
                }.htm`
            );
            searchQp.hide();
            globalStorage(getContext()).set("kwd", searchQp.value);
        }
    });
    searchQp.show();
}

export { searchGames };

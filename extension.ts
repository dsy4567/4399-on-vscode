/*

MIT License

Copyright (c) 2022 dsy4567(https://github.com/dsy4567/ ; dsy4567@outlook.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

"use strict";
// const vscode = require("vscode");
// const cheerio = require("cheerio");
// const axios = require("axios").default;
// const iconv = require("iconv-lite");
// const http = require("http");
import * as vscode from "vscode";
import * as cheerio from "cheerio";
import axios, { AxiosRequestConfig, ResponseType, AxiosStatic } from "axios";
import * as iconv from "iconv-lite";
import * as http from "http";

var httpServer: http.Server;
var DATA: ArrayBuffer;
var server = ""; // szhong.4399.com
var gamePath = ""; // /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var gameUrl = ""; // http://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
/**
 * @type {vscode.WebviewPanel}
 */
var panel: vscode.WebviewPanel;
const getWebviewHtml_h5 = (url: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>4399</title>
        <base target="_self" />
    </head>

    <body>
        <style>
            body {
                margin: 0;
                padding: 0;
            }

            iframe {
                width: 100%;
                height: 100vh;
            }
        </style>
        <iframe id="ifr" src="${url}" frameborder="0"></iframe>
        <script>
        </script>
    </body>
</html>

`;
const getWebviewHtml_flash = (url: string) => `
<!DOCTYPE html>
<html style="height: 100%;margin: 0;padding: 0;">
    <head>
        <meta charset="UTF-8" />
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0"
        />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>flash 播放器(Ruffle 引擎)</title>
        <script>
            window.play = function (url) {
                var html =
                    '<object id="flashgame" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0" width="100%" height="100%"><param id="game" name="movie" value="' +
                    url +
                    '" /><embed id="flashgame1" name="flashgame" src="' +
                    url +
                    '" quality="high" pluginspage="//www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" width="100%" height="100%" /> <param name="quality" value="high" /></object>';
                document.body.innerHTML =html
            };
        </script>
        <script src="https://unpkg.com/@ruffle-rs/ruffle"></script>
    </head>
    <body style="height: 100%;margin: 0;padding: 0;">
        <script>
            window.play("${url}");
        </script>
    </body>
</html>
`;
function initHttpServer(callback: Function) {
    httpServer
        ? callback()
        : (httpServer = http
            .createServer(function (request, response) {
                if (!request?.url) {
                    return response.end(null);
                }
                if (request.url.includes(gamePath)) {
                    response.writeHead(200, {
                        "content-security-policy":
                            "allow-pointer-lock allow-scripts",
                        "Content-Type": "text/html",
                        "access-control-allow-origin": "*",
                    });
                    response.end(DATA);
                } else {
                    axios
                        .get(
                            "http://" + server + request.url,
                            getReqCfg("arraybuffer")
                        )
                        .then((res) => {
                            let headers = res.headers;
                            headers["access-control-allow-origin"] = "*";
                            response.writeHead(200, headers);
                            response.end(res.data);
                        })
                        .catch((e) => {
                            //   log(request, request.url);
                            response.writeHead(500, {
                                "Content-Type": "text/html",
                                "access-control-allow-origin": "*",
                            });
                            response.statusMessage = e.message;
                            response.end(e.message);
                            if (
                                !String(e.message).includes(
                                    "Request failed with status code"
                                )
                            )
                                err("服务器出现错误: ", e.message);
                        });
                    //   response.end();
                }
            })
            .listen(44399, "localhost", function () {
                log("服务器已启动");
                callback();
            })
            .on("error", (e) => err(e.stack)));
}
function getReqCfg(responseType: ResponseType): AxiosRequestConfig {
    return {
        baseURL: "http://www.4399.com/",
        responseType: responseType,
        headers: {
            cookie: getCfg("cookie"),
            "user-agent": getCfg("user-agent"),
            referer: getCfg("referer"),
        },
    };
}
function log(a: any, b?: any) {
    if (!getCfg("outputLogs")) return;
    b
        ? console.log("[4399 on vscode]", a, b)
        : console.log("[4399 on vscode]", a);
}
function err(a: any, b?: any) {
    b
        ? vscode.window.showErrorMessage("" + a + b)
        : vscode.window.showErrorMessage("" + a);
    b
        ? console.error("[4399 on vscode]", a, b)
        : console.error("[4399 on vscode]", a);
}
function getCfg(name: string): any {
    return vscode.workspace
        .getConfiguration()
        .get("4399-on-vscode." + name, undefined);
}
function setCfg(name: string, val: any) {
    return vscode.workspace
        .getConfiguration()
        .update("4399-on-vscode." + name, val, true);
}
function getServer(
    server_matched: RegExpMatchArray,
    callback: (server: string) => void
) {
    axios
        .get(
            "http://www.4399.com" + server_matched[0].split('"')[1],
            getReqCfg("text")
        )
        .then((res) => {
            if (res.data) {
                log("成功获取到定义游戏服务器的脚本");
                callback((res.data as string).split('"')[1].split("/")[2]);
            } else {
                err(
                    "无法获取定义游戏服务器的脚本: 响应文本为空, 您可能需要配置 UA 和 Cookie"
                );
                log(res);
            }
        })
        .catch((e) => {
            console.error(e);
            callback(
                server_matched[0]
                    .split('"')[1]
                    .replace("/js/server", "")
                    .replace(".js", "") + ".4399.com"
            );
        });


}
function getPlayUrl(url: string, axios: AxiosStatic) {
    axios
        .get(url, getReqCfg("arraybuffer"))
        .then((res) => {
            if (res.data) {
                res.data = iconv.decode(res.data, "gb2312");
                log("成功获取到游戏页面");
                const $ = cheerio.load(res.data);
                const html = $.html();
                if (!html)
                    return err(
                        "无法获取游戏页面: html 为空, 您可能需要配置 UA 和 Cookie"
                    );

                let title: string | null = "";
                let m: RegExpMatchArray | null = null;
                try {
                    m = html.match(/<title>.+<\/title>/i);
                    if (!m) {
                        throw "";
                    }
                    title = m[0].replace(/<\/?title>/gi, "").split(/[,_]/)[0];
                } catch (e) {
                    title = $("title").html();
                }

                let server_matched = html.match(/src\=\"\/js\/server.*\.js\"/i);
                let gamePath_matched = html.match(
                    /\_strGamePath\=\".+\.(swf|htm[l]?)\"/i
                );
                if (!server_matched || !gamePath_matched) {
                    return err(
                        "正则匹配结果为空, 此扩展可能出现了问题, 也可能因为这个游戏是页游, 较新(约2006年6月以后或 AS3)的 flash 游戏或非 h5 游戏"
                    );
                }

                getServer(server_matched, (server) => {
                    gamePath =
                        "/4399swf" +
                        (gamePath_matched as RegExpMatchArray)[0]
                            .replace("_strGamePath=", "")
                            .replace(/["]/g, "");
                    gameUrl = "http://" + server + gamePath;

                    gameUrl
                        ? (() => {
                              setCfg("cookie", res.headers["set-cookie"]);
                              log("set-cookie: ", res.headers["set-cookie"]);

                              if (
                                  !$(
                                      "#skinbody > div:nth-child(7) > div.fl-box > div.intr.cf > div.eqwrap"
                                  )[0] &&
                                  !gamePath.includes(".swf")
                              ) {
                                  return err(
                                      "这个游戏可能是页游, 较新(约2006年6月以后或 AS3)的 flash 游戏或非 h5 游戏"
                                  );
                              }
                              axios
                                  .get(gameUrl, getReqCfg("arraybuffer"))
                                  .then((res) => {
                                      if (res.data) {
                                          log(
                                              "成功获取到游戏真实页面",
                                              gameUrl
                                          );

                                          initHttpServer(() => {
                                              DATA = res.data;
                                              showWebviewPanel(
                                                  "http://localhost:44399" +
                                                      gamePath,
                                                  title,
                                                  gamePath.includes(".swf")
                                                      ? "fl"
                                                      : undefined
                                              );
                                          });
                                          //   }
                                      }
                                  })
                                  .catch((e) => {
                                      err("无法获取游戏真实页面: ", e);
                                  });
                          })()
                        : (() => {
                              return err("游戏真实地址为空");
                          })();
                });
            } else {
                err(
                    "无法获取游戏页面: 响应文本为空, 您可能需要配置 UA 和 Cookie"
                );
                log(res);
            }
        })
        .catch((e) => {
            err("无法获取游戏页面: ", e);
        });
}
function searchGames(url: string) {
    axios
        .get(url, getReqCfg("arraybuffer"))
        .then((res) => {
            if (res.data) {
                res.data = iconv.decode(res.data, "gb2312");
                log("成功获取到4399搜索页面");
                const $ = cheerio.load(res.data);
                let gameNames: string[] | undefined[] = [],
                    urls: string[] | undefined[] = [];

                $(
                    "#skinbody > div.w_980.cf > div.anim > div > div > div.pop > b > a"
                ).each((i, elem) => {
                    let h = $(elem).html();
                    if (!h) {
                        return;
                    }
                    urls[i] = $(elem).attr("href");
                    gameNames[i] = h
                        .replace(/<font color=['"]?red['"]?>/, "")
                        .replace("</font>", "");
                });
                if (!gameNames[0] || !urls[0]) return err("一个游戏也没搜到");

                vscode.window
                    .showQuickPick(gameNames as string[])
                    .then((val) => {
                        log("用户输入 ", val);
                        if (!val) return;

                        let index = gameNames.indexOf(val as never);
                        if (index != -1) {
                            let url = urls[index];
                            if (!url) return err("变量 url 可能为 undefined");
                            if (url.startsWith("//")) url = "http:" + url;
                            log("游戏页面: ", url);
                            getPlayUrl(url,axios);
                        }
                    });
            }
        })
        .catch((e) => {
            err("无法获取4399首页: ", e);
        });
}
function showWebviewPanel(url: string, title: string | null, type?: string) {
    if (!getCfg("moreOpen"))
        try {
            panel.dispose();
        } catch (e) {}

    const customTitle = getCfg("title");
    panel = vscode.window.createWebviewPanel(
        "4399OnVscode",
        customTitle ? customTitle : title ? title : "4399 on vscode",
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    type == "fl"
        ? (panel.webview.html = getWebviewHtml_flash(url))
        : (panel.webview.html = getWebviewHtml_h5(url));
}

exports.activate = (ctx: vscode.ExtensionContext) => {
    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.get", () => {
            vscode.window
                .showInputBox({
                    value: "222735",
                    title: "4399 on vscode: 输入游戏 id",
                    prompt: "输入 http(s)://www.4399.com/flash/ 后面的数字(游戏 id)",
                })
                .then((id) => {
                    if (id) {
                        log("用户输入 ", id);
                        getPlayUrl("https://www.4399.com/flash/" + id + ".htm",axios);
                    }
                });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.special", () => {
            axios
                .get("https://www.4399.com/", getReqCfg("arraybuffer"))
                .then((res) => {
                    if (res.data) {
                        res.data = iconv.decode(res.data, "gb2312");
                        log("成功获取到4399首页");
                        const $ = cheerio.load(res.data);
                        let gameNames: string[] | undefined[] = [],
                            urls: string[] | undefined[] = [];

                        $(
                            "#skinbody > div.middle_3.cf > div.box_c > div.tm_fun.h_3 > ul > li > a[href*='/flash/']"
                        ).each((i, elem) => {
                            urls[i] = $(elem).attr("href");
                        });
                        $(
                            "#skinbody > div.middle_3.cf > div.box_c > div.tm_fun.h_3 > ul > li > a[href*='/flash/'] > img"
                        ).each((i, elem) => {
                            gameNames[i] = $(elem).attr("alt");
                        });
                        if (!gameNames[0] || !urls[0])
                            return err("一个推荐的游戏也没有");

                        vscode.window
                            .showQuickPick(gameNames as string[])
                            .then((val) => {
                                log("用户输入 ", val);
                                if (!val) return;

                                let index = gameNames.indexOf(val as never);
                                log("游戏页面: ", urls[index]);
                                if (index != -1) {
                                    let url = urls[index];
                                    if (!url)
                                        return err("变量 url 可能为 undefined");
                                    getPlayUrl(url,axios);
                                } else {
                                    log("用户似乎取消了操作");
                                }
                            });
                    }
                })
                .catch((e) => {
                    err("无法获取4399首页: ", e);
                });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.search", () => {
            vscode.window
                .showInputBox({
                    value: "人生重开模拟器",
                    title: "4399 on vscode: 搜索",
                    prompt: "输入搜索词",
                })
                .then((val) => {
                    if (!val) return;
                    searchGames(
                        "https://so2.4399.com/search/search.php?k=" +
                            encodeURI(val) +
                            "&view=list&sort=thetime"
                    );
                });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand(
            "4399-on-vscode.old-flash-games",
            () => {
                searchGames(
                    "https://so2.4399.com/search/search.php?k=flash&view=list&sort=thetime"
                );
            }
        )
    );

    console.log("4399 on vscode is ready!");
};

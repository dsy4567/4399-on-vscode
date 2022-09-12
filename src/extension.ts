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

----------

Copyright (c) 2022 dsy4567(https://github.com/dsy4567/ ; dsy4567@outlook.com)

"Anti 996" License Version 1.0 (Draft)

Permission is hereby granted to any individual or legal entity
obtaining a copy of this licensed work (including the source code,
documentation and/or related items, hereinafter collectively referred
to as the "licensed work"), free of charge, to deal with the licensed
work for any purpose, including without limitation, the rights to use,
reproduce, modify, prepare derivative works of, distribute, publish
and sublicense the licensed work, subject to the following conditions:

1. The individual or the legal entity must conspicuously display,
without modification, this License and the notice on each redistributed
or derivative copy of the Licensed Work.

2. The individual or the legal entity must strictly comply with all
applicable laws, regulations, rules and standards of the jurisdiction
relating to labor and employment where the individual is physically
located or where the individual was born or naturalized; or where the
legal entity is registered or is operating (whichever is stricter). In
case that the jurisdiction has no such laws, regulations, rules and
standards or its laws, regulations, rules and standards are
unenforceable, the individual or the legal entity are required to
comply with Core International Labor Standards.

3. The individual or the legal entity shall not induce, suggest or force
its employee(s), whether full-time or part-time, or its independent
contractor(s), in any methods, to agree in oral or written form, to
directly or indirectly restrict, weaken or relinquish his or her
rights or remedies under such laws, regulations, rules and standards
relating to labor and employment as mentioned above, no matter whether
such written or oral agreements are enforceable under the laws of the
said jurisdiction, nor shall such individual or the legal entity
limit, in any methods, the rights of its employee(s) or independent
contractor(s) from reporting or complaining to the copyright holder or
relevant authorities monitoring the compliance of the license about
its violation(s) of the said license.

THE LICENSED WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN ANY WAY CONNECTION WITH THE
LICENSED WORK OR THE USE OR OTHER DEALINGS IN THE LICENSED WORK.

*/

"use strict";
import * as vscode from "vscode";
import * as cheerio from "cheerio";
import axios, { AxiosRequestConfig, ResponseType } from "axios";
import * as iconv from "iconv-lite";
import * as http from "http";
// import * as open from "open";
import * as cookie from "cookie";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as mime from "mime";

interface History {
    date: string;
    webGame: boolean;
    name: string;
    url: string;
}

var httpServer: http.Server | undefined;
var DATA: Buffer | string;
var server = ""; // szhong.4399.com
var gamePath = ""; // /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var gameUrl = ""; // http://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var gameInfoUrl = "";
var alerted = false;
var port = 44399;
var panel: vscode.WebviewPanel;
var context: vscode.ExtensionContext;
const getScript = (cookie: string = "") => `
<script>
// 强制设置 referrer
Object.defineProperty(document, "referrer", {
    value: "http://www.4399.com/",
    writable: true,
});
// 强制设置 cookie
Object.defineProperty(document, "cookie", {
    value: \`${cookie.replaceAll(";", "; ")}\`,
    writable: false,
});
// 设置 document.domain 不会报错
Object.defineProperty(document, "domain", {
    value: "4399.com",
    writable: true,
});
</script>
`;
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
            try{ var vscode = acquireVsCodeApi(); } catch (e) {}
            // 打开链接
            Object.defineProperty(window, "open", {
                value: (url) => {
                    console.log(url);
                    vscode.postMessage({ open: new URL(url, location.href).href })
                },
                writable: true,
            });
        </script>
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
const GlobalStorage = (context: vscode.ExtensionContext) => {
    return {
        get: (key: string) =>
            JSON.parse(context.globalState.get(key) || "null"),
        set: (key: string, value: any) =>
            context.globalState.update(key, JSON.stringify(value)),
    };
};
function initHttpServer(callback: Function) {
    let onRequest: http.RequestListener = (request, response) => {
        if (!request?.url) {
            response.end(null);
        } else if (request.url === "/") {
            // 访问根目录直接跳转到游戏
            response.writeHead(302, {
                Location: gamePath,
            });
            response.end();
        } else if (request.url.includes(gamePath)) {
            // 访问游戏入口页面直接返回数据
            let t = mime.getType(request.url ? request.url : "");
            t = t ? t : "text/html";
            response.writeHead(200, {
                "content-security-policy": "allow-pointer-lock allow-scripts",
                "content-type": t,
                "access-control-allow-origin": "*",
            });
            response.end(DATA);
        } else {
            // 向 4399 服务器请求游戏文件
            axios
                .get("http://" + server + request.url, getReqCfg("arraybuffer"))
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
                    ) {
                        // 忽略 4xx, 5xx 错误
                        err("本地服务器出现错误: ", e.message);
                    }
                });
            //   response.end();
        }
    };
    if (httpServer) {
        callback();
    } else {
        port = Number(getCfg("port", 44399));
        if (isNaN(port)) {
            port = 44399;
        }
        try {
            httpServer = http
                .createServer(onRequest)
                .listen(port, "localhost", function () {
                    log("本地服务器已启动");
                    callback();
                })
                .on("error", (e) => {
                    err(
                        "本地服务器启动时出错(第一次出现端口占用问题请忽略): ",
                        e.stack
                    );
                    port += 1; // 端口第一次被占用时自动 +1
                    httpServer = http
                        .createServer(onRequest)
                        .listen(port, "localhost", function () {
                            log("本地服务器已启动");
                            callback();
                        })
                        .on("error", (e) => {
                            err(e.stack);
                            httpServer = undefined;
                        });
                });
        } catch (e) {
            err(String(e));
            httpServer = undefined;
        }
    }
}
function getReqCfg(
    responseType?: ResponseType,
    noCookie: boolean = false
): AxiosRequestConfig<any> {
    let c = GlobalStorage(context).get("cookie");
    return {
        baseURL: "http://www.4399.com",
        responseType: responseType,
        headers: {
            "user-agent": getCfg("user-agent"),
            referer: getCfg("referer"),
            cookie: c && !noCookie ? c : "",
        },
    };
}
function log(a: any, b?: any) {
    if (!getCfg("outputLogs")) {
        return;
    }
    b
        ? console.log("[4399 on VSCode]", a, b)
        : console.log("[4399 on VSCode]", a);
}
function err(a: any, b?: any) {
    b
        ? vscode.window.showErrorMessage("" + a + b)
        : vscode.window.showErrorMessage("" + a);
    b
        ? console.error("[4399 on VSCode]", a, b)
        : console.error("[4399 on VSCode]", a);
}
function createQuickPick(o: {
    value?: string;
    title?: string;
    prompt?: string;
}): Promise<vscode.QuickPick<vscode.QuickPickItem>> {
    return new Promise((resolve, reject) => {
        let qp = vscode.window.createQuickPick();
        qp.title = o.title;
        qp.value = o.value || "";
        qp.placeholder = o.prompt;
        qp.canSelectMany = false;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        qp.ignoreFocusOut = true;
        resolve(qp);
    });
}
// 获取工作区配置
function getCfg(name: string, defaultValue: any = undefined): any {
    return vscode.workspace
        .getConfiguration()
        .get("4399-on-vscode." + name, defaultValue);
}
function setCfg(name: string, val: any) {
    return vscode.workspace
        .getConfiguration()
        .update("4399-on-vscode." + name, val, true);
}
async function getServer(server_matched: RegExpMatchArray): Promise<string> {
    try {
        let res = await axios.get(
            "http://www.4399.com" + server_matched[0].split('"')[1],
            getReqCfg("text")
        );
        if (res.data) {
            log("成功获取到定义游戏服务器的脚本");
            return (res.data as string).split('"')[1].split("/")[2];
        } else {
            throw new Error(
                "无法获取定义游戏服务器的脚本: 响应文本为空, 您可能需要配置 UA 或登录账号"
            );
        }
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
// 获取 h5 页游的真实地址
function getPlayUrlForWebGames(urlOrId: string) {
    login(async (cookie: string) => {
        let i = urlOrId.split("/").at(-1);
        if (i && !isNaN(Number(i))) {
            urlOrId = i;
        } else {
            let i = urlOrId.split("gameId=").at(-1);
            if (i && !isNaN(Number(i))) {
                urlOrId = i;
            } else {
                return err("h5 页游链接格式不正确");
            }
        }

        let gameId: number = Number(urlOrId);
        if (isNaN(gameId)) {
            return err("h5 页游链接格式不正确");
        }

        try {
            let m = cookie.match(/Pauth=.+;/i);
            let cookieValue = "";
            if (m) {
                cookieValue = m[0].split("=")[1].split(";")[0];
            }
            if (!cookieValue) {
                return err("cookie 没有 Pauth 的值");
            }
            let data: {
                data?: {
                    game?: {
                        mainId: number;
                        gameName: string;
                        gameUrl?: string;
                    };
                };
            } = (
                await axios.post(
                    "https://h.api.4399.com/intermodal/user/grant2",
                    "gameId=" +
                        gameId +
                        "&authType=cookie&cookieValue=" +
                        cookieValue,
                    getReqCfg("json")
                )
            ).data;
            if (
                data.data?.game?.gameUrl &&
                data.data.game.gameUrl !== "&addiction=0"
            ) {
                try {
                    gameInfoUrl =
                        "http://www.4399.com/flash/" +
                        data.data.game.mainId +
                        ".htm";
                } catch (e) {}
                let url = "https://www.zxwyouxi.com/g/" + urlOrId;
                let title = decodeURI(data.data.game.gameName);
                try {
                    let D = new Date();
                    updateHistory({
                        date: ` (${D.getFullYear()}年${
                            D.getMonth() + 1
                        }月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                        name: title ? title : url,
                        webGame: true,
                        url: url,
                    });
                } catch (e) {
                    err("写入历史记录失败", String(e));
                }

                showWebviewPanel(data.data.game.gameUrl, title, "", true);
            } else {
                err("无法登录游戏, 或者根本没有这个游戏");
            }
        } catch (e) {
            err("无法获取游戏页面", String(e));
        }
    });
}
// 获取普通小游戏的真实地址
async function getPlayUrl(url: string) {
    if (url.startsWith("/") && !url.startsWith("//")) {
        url = getReqCfg().baseURL + url;
    }
    try {
        let res = await axios.get(url, getReqCfg("arraybuffer"));

        if (res.data) {
            res.data = iconv.decode(res.data, "gb2312");
            log("成功获取到游戏页面");
            const $ = cheerio.load(res.data);
            const html = $.html();
            if (!html) {
                return err(
                    "无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏详情页阶段)"
                );
            }

            let title: string | null = "";
            let m: RegExpMatchArray | null = null;

            m = html.match(/<title>.+<\/title>/i);
            if (!m) {
                title = $("title").html();
            } else {
                title = m[0].replace(/<\/?title>/gi, "").split(/[,_]/)[0];
            }

            let server_matched = html.match(/src\=\"\/js\/server.*\.js\"/i);
            let gamePath_matched = html.match(
                /\_strGamePath\=\".+\.(swf|htm[l]?)\"/i
            );
            gameInfoUrl = url;
            if (
                $("title").text().includes("您访问的页面不存在！") &&
                res.status
            ) {
                gameInfoUrl = "";
                return err("无法获取游戏信息: 游戏可能因为某些原因被删除");
            }
            if (!server_matched || !gamePath_matched) {
                // 游戏可能是 h5 页游
                let u1 = $("iframe#flash22").attr("src");
                let u2 = $("a.start-btn").attr("href");
                if (u1) {
                    return getPlayUrlForWebGames(u1);
                }
                if (u2) {
                    return getPlayUrlForWebGames(u2);
                }
                gameInfoUrl = "";
                return err(
                    "正则匹配结果为空, 此扩展可能出现了问题, 也可能因为这个游戏是页游, 较新(约2006年6月以后或 AS3)的 flash 游戏或非 h5 游戏"
                );
            }
            try {
                let D = new Date();
                updateHistory({
                    date: ` (${D.getFullYear()}年${
                        D.getMonth() + 1
                    }月${D.getDate()}日${D.getHours()}时${D.getMinutes()}分)`,
                    name: title ? title : url,
                    webGame: false,
                    url: url,
                });
            } catch (e) {
                err("写入历史记录失败", String(e));
            }

            let s = await getServer(server_matched);
            let isFlashPage = false;
            server = s;
            gamePath =
                "/4399swf" +
                (gamePath_matched as RegExpMatchArray)[0]
                    .replace("_strGamePath=", "")
                    .replace(/["]/g, "");
            gameUrl = "http://" + s + gamePath;

            gameUrl
                ? (async () => {
                      if (
                          !$(
                              "#skinbody > div:nth-child(7) > div.fl-box > div.intr.cf > div.eqwrap"
                          )[0] &&
                          !gamePath.includes(".swf")
                      ) {
                          isFlashPage = true;
                      }
                      try {
                          res = await axios.get(
                              gameUrl,
                              getReqCfg("arraybuffer")
                          );

                          if (!res.data) {
                              return err(
                                  "无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号 (错误发生在处理游戏真实页面阶段)"
                              );
                          }

                          if (
                              isFlashPage &&
                              res.headers["content-type"]
                                  .toLocaleLowerCase()
                                  .includes("html")
                          ) {
                              let m = (
                                  iconv.decode(res.data, "gb2312") as string
                              ).match(/<embed.+src=".+.swf/i);

                              if (m) {
                                  let fileName = m[0]
                                      .split('"')
                                      .at(-1) as string;
                                  if (fileName.includes("gameloader.swf")) {
                                      m = fileName.match(/gameswf=.+.swf/);
                                      if (m) {
                                          fileName = m[0]
                                              .split("=")
                                              .at(-1) as string;
                                      }
                                  }
                                  gameUrl = gameUrl.replace(
                                      gameUrl.split("/").at(-1) as string,
                                      fileName
                                  );
                                  let u = new URL(gameUrl);
                                  gamePath = u.pathname;
                                  res.data = (
                                      await axios.get(
                                          gameUrl,
                                          getReqCfg("arraybuffer")
                                      )
                                  ).data;
                              }
                          }
                          if (res.data) {
                              log("成功获取到游戏真实页面", gameUrl);

                              initHttpServer(() => {
                                  DATA = res.data;
                                  let u = new URL(
                                      gamePath,
                                      "http://localhost/"
                                  );
                                  u.port = String(port);
                                  showWebviewPanel(
                                      u.toString(),
                                      title,
                                      gamePath.includes(".swf")
                                          ? "fl"
                                          : undefined,
                                      true
                                  );
                              });
                          }
                      } catch (e) {
                          err("无法获取游戏真实页面: ", e);
                      }
                  })()
                : (() => {
                      return err("游戏真实地址为空");
                  })();
        } else {
            err("无法获取游戏页面: 响应文本为空, 您可能需要配置 UA 或登录账号");
            log(res);
        }
    } catch (e) {
        err("无法获取游戏页面: ", e);
    }
}
function searchGames(s: string) {
    let data: [string, number][];
    let items: vscode.QuickPickItem[] = [];
    let games: Record<string, number> = {};
    let timeout: NodeJS.Timeout;

    createQuickPick({
        value: s ? String(s) : "",
        title: "4399 on VSCode: 搜索",
        prompt: "输入搜索词",
    }).then((qp) => {
        const search = (s: string) => {
            qp.busy = true;
            axios
                .get(
                    "https://so2.4399.com/search/search.php?k=" + encodeURI(s),
                    getReqCfg("arraybuffer")
                )
                .then((res) => {
                    if (res.data) {
                        res.data = iconv.decode(res.data, "gb2312");
                        log("成功获取到4399搜索页面");
                        const $ = cheerio.load(res.data);
                        games = {};
                        data = [];
                        items = [];

                        $(
                            "#skinbody > div.w_980.cf > div.anim > div > div > div.pop > b > a"
                        ).each((i, elem) => {
                            let h = $(elem).html();
                            let u = $(elem).attr("href");
                            if (!h || !u) {
                                return;
                            }
                            let id = Number(u.split(/[/.]/gi).at(-2));
                            let n = h
                                .replace(/<font color=['"]?red['"]?>/, "")
                                .replace("</font>", "");
                            if (!id || isNaN(id) || !n) {
                                return;
                            }
                            data.push([n, id]);
                            games[n] = id;
                        });

                        data.forEach((g) => {
                            items.push({
                                label: g[0],
                                description: "游戏 id: " + g[1],
                                alwaysShow: true,
                            });
                        });
                        qp.items = items;
                        qp.busy = false;
                    }
                })
                .catch((e) => {
                    err("无法获取4399首页: ", e);
                });
        };
        qp.onDidChangeValue((kwd) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                qp.busy = true;
                axios
                    .get(
                        "https://so2.4399.com/search/lx.php?k=" +
                            encodeURI(kwd),
                        getReqCfg("arraybuffer")
                    )
                    .then((res) => {
                        res.data = iconv.decode(res.data, "gb2312");
                        let d: string = res.data;
                        if (!d) {
                            return err("获取搜索建议失败");
                        }
                        log(d);

                        let m = d.split(" =")[1];
                        games = {};
                        data = [];
                        items = [];

                        try {
                            if (!m) {
                                throw new Error("");
                            }
                            data = JSON.parse(m.replaceAll("'", '"'));
                        } catch (e) {
                            return err("解析搜索建议失败");
                        }

                        items.push({
                            label: qp.value,
                            description: "直接搜索",
                            alwaysShow: true,
                        });
                        data.forEach((g) => {
                            items.push({
                                label: g[0],
                                description: "游戏 id: " + g[1],
                                alwaysShow: true,
                            });
                            games[g[0]] = g[1];
                        });

                        if (items[0]) {
                            qp.items = items;
                        }
                        qp.busy = false;
                    })
                    .catch((e) => {
                        return err("获取搜索建议失败", String(e));
                    });
            }, 1000);
        });
        qp.onDidAccept(() => {
            if (qp.activeItems[0].description === "直接搜索") {
                search(qp.value);
            } else {
                getPlayUrl(
                    `http://www.4399.com/flash/${
                        games[qp.activeItems[0].label]
                    }.htm`
                );
                qp.dispose();
                GlobalStorage(context).set("kwd", qp.value);
            }
        });
        qp.show();
    });
}
async function showGameInfo(url = gameInfoUrl) {
    if (!url) {
        return vscode.window.showErrorMessage(
            "无法显示这个游戏的详细信息, 或者未在玩游戏"
        );
    }
    try {
        if (url.startsWith("/") && !url.startsWith("//")) {
            url = getReqCfg().baseURL + url;
        }

        const html = iconv.decode(
            (await axios.get(url, getReqCfg("arraybuffer"))).data,
            "gb2312"
        );
        if (!html) {
            return err(
                "无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏详情页阶段)"
            );
        }

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
        let title = $("title")
            .text()
            .split(/[-_ |，,¦]/gi)[0]
            .replaceAll(/[\n ]/gi, "");
        let gameId = url.split(/[/.]/gi).at(-2);
        title = title ? title : "未知";
        gameId = !gameId || isNaN(Number(gameId)) ? "未知" : gameId;
        vscode.window
            .showQuickPick([
                "🎮 游戏名: " + title,
                "📜 简介: " + desc,
                "🆔 游戏 id: " + gameId,
                "❤️ 添加到收藏盒",
                "🌏 在浏览器中打开详情页面",
                "💬 热门评论",
            ])
            .then(async (item) => {
                if (item) {
                    try {
                        if (item.includes("添加到收藏盒")) {
                            login(async () => {
                                try {
                                    await axios.get(
                                        "https://gprp.4399.com/cg/add_collection.php?gid=" +
                                            gameId,
                                        getReqCfg("json")
                                    );
                                    vscode.window.showInformationMessage(
                                        "添加到收藏盒成功"
                                    );
                                } catch (e) {
                                    err("添加到收藏盒失败", String(e));
                                }
                            });
                        } else if (item.includes("在浏览器中打开详情页面")) {
                            vscode.env.openExternal(vscode.Uri.parse(url));
                        } else if (item.includes("热门评论")) {
                            const html = iconv.decode(
                                (
                                    await axios.get(
                                        "https://cdn.comment.4399pk.com/nhot-" +
                                            gameId +
                                            "-1.htm",
                                        getReqCfg("arraybuffer")
                                    )
                                ).data,
                                "utf8"
                            );
                            if (!html) {
                                return err(
                                    "无法获取游戏页面: html 为空, 您可能需要配置 UA 或登录账号(错误发生在获取游戏评论页阶段)"
                                );
                            }

                            const $ = cheerio.load(html);
                            let items: string[] = [],
                                tops: string[] = [];
                            $("#cntBox > div.zd > div.con").each((i, elem) => {
                                tops[i] = "[置顶评论] " + $(elem).text();
                            });
                            $(".lam .tex").each((i, elem) => {
                                items[i] = $(elem).text();
                            });
                            items.unshift(...tops);
                            vscode.window.showQuickPick(items).then((item) => {
                                if (item) {
                                    vscode.window.showInformationMessage(item);
                                }
                            });
                        } else {
                            vscode.window.showInformationMessage(item);
                        }
                    } catch (e) {
                        err("无法获取游戏页面", String(e));
                    }
                }
            });
    } catch (e) {
        err("无法获取游戏页面", String(e));
    }
}
function showWebviewPanel(
    url: string,
    title: string | null,
    type?: "fl" | "",
    hasIcon?: boolean
) {
    // try {
    //     panel.dispose();
    // } catch (e) {}

    const customTitle = getCfg("title");
    panel = vscode.window.createWebviewPanel(
        "4399OnVscode",
        customTitle ? customTitle : title ? title : "4399 on VSCode",
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
    );

    let iconPath: vscode.Uri | undefined;
    let setIcon = () => {
        if (iconPath) {
            panel.iconPath = {
                light: iconPath,
                dark: iconPath,
            };
        }
    };

    // 注入脚本
    if (type !== "fl" && getCfg("injectionScript", true)) {
        try {
            if (url.endsWith(".html") || url.endsWith(".htm")) {
                const $ = cheerio.load(iconv.decode(DATA as Buffer, "utf8"));
                $("head").append(
                    getScript(GlobalStorage(context).get("cookie"))
                );
                DATA = $.html();
            }
        } catch (e) {
            err("无法为游戏页面注入优化脚本");
        }
    }
    // 获取游戏图标
    if (hasIcon && getCfg("showIcon", true)) {
        try {
            let gameId = gameInfoUrl.split(/[/.]/gi).at(-2);
            if (gameId) {
                if (
                    fs.existsSync(
                        path.join(
                            os.userInfo().homedir,
                            `.4ov-data/cache/icon/${gameId}.jpg`
                        )
                    )
                ) {
                    iconPath = vscode.Uri.file(
                        path.join(
                            os.userInfo().homedir,
                            `.4ov-data/cache/icon/${gameId}.jpg`
                        )
                    );
                    setIcon();
                } else {
                    axios
                        .get(
                            `https://imga1.5054399.com/upload_pic/minilogo/${gameId}.jpg`,
                            getReqCfg("arraybuffer")
                        )
                        .then((res) => {
                            if (res.data) {
                                fs.writeFile(
                                    path.join(
                                        os.userInfo().homedir,
                                        `.4ov-data/cache/icon/${gameId}.jpg`
                                    ),
                                    res.data,
                                    (e) => {
                                        if (e) {
                                            console.error(String(e));
                                        }
                                        try {
                                            if (
                                                fs.existsSync(
                                                    path.join(
                                                        os.userInfo().homedir,
                                                        `.4ov-data/cache/icon/${gameId}.jpg`
                                                    )
                                                )
                                            ) {
                                                iconPath = vscode.Uri.file(
                                                    path.join(
                                                        os.userInfo().homedir,
                                                        `.4ov-data/cache/icon/${gameId}.jpg`
                                                    )
                                                );
                                                setIcon();
                                            }
                                        } catch (e) {
                                            console.error(String(e));
                                        }
                                    }
                                );
                            }
                        })
                        .catch((e) => {
                            console.error(String(e));
                        });
                }
            }
        } catch (e) {
            console.error(String(e));
        }
    }

    // 打开外链
    panel.webview.onDidReceiveMessage(
        (m) => {
            log(m);
            if (m.open && getCfg("openUrl", true)) {
                vscode.env.openExternal(vscode.Uri.parse(m.open));
            }
        },
        undefined,
        context.subscriptions
    );

    type === "fl"
        ? (panel.webview.html = getWebviewHtml_flash(url))
        : (panel.webview.html = getWebviewHtml_h5(url));
    if (!alerted) {
        alerted = true;
        vscode.window.showInformationMessage(
            "温馨提示: **请在使用快捷键前使游戏失去焦点**, 道路千万条, 谨慎第一条, 摸鱼不适度, 工资两行泪"
        );
    }
}
function login(callback: (cookie: string) => void, loginOnly: boolean = false) {
    if (GlobalStorage(context).get("cookie")) {
        if (loginOnly) {
            return vscode.window
                .showInformationMessage("是否退出登录?", "是", "否")
                .then((value) => {
                    if (value === "是") {
                        GlobalStorage(context).set("cookie", "");
                        vscode.window.showInformationMessage("退出登录成功");
                    }
                });
        }
        return callback(GlobalStorage(context).get("cookie"));
    }
    if (!GlobalStorage(context).get("cookie")) {
        if (!loginOnly) {
            vscode.window.showInformationMessage("请登录后继续");
        }
        vscode.window
            .showQuickPick(["🆔 使用账号密码登录", "🍪 使用 cookie 登录"])
            .then((value) => {
                if (value?.includes("使用 cookie 登录")) {
                    vscode.window
                        .showInputBox({
                            title: "4399 on VSCode: 登录(使用 cookie)",
                            prompt: "请输入 cookie, 获取方法请见扩展详情页, 登录后, 您可以玩页游或者使用其它需要登录的功能",
                        })
                        .then((c) => {
                            if (c) {
                                try {
                                    let parsedCookie = cookie.parse(c);
                                    if (!parsedCookie["Pauth"]) {
                                        return err(
                                            "登录失败, cookie 没有 Pauth 值"
                                        );
                                    }
                                    GlobalStorage(context).set(
                                        "cookie",
                                        encodeURI(c)
                                    );

                                    let welcomeMsg = "";
                                    if (parsedCookie["Pnick"]) {
                                        welcomeMsg = `亲爱的 ${parsedCookie["Pnick"]}, 您已`;
                                    }
                                    vscode.window.showInformationMessage(
                                        welcomeMsg +
                                            "登录成功, 请注意定期更新 cookie"
                                    );
                                    callback(encodeURI(c));
                                } catch (e) {
                                    return err("登录失败, 其它原因", String(e));
                                }
                            }
                        });
                } else if (value?.includes("使用账号密码登录")) {
                    vscode.window
                        .showInputBox({
                            title: "4399 on VSCode: 登录(使用账号密码)",
                            prompt: "请输入 4399 账号",
                        })
                        .then((user) => {
                            if (user) {
                                vscode.window
                                    .showInputBox({
                                        title: "4399 on VSCode: 登录(使用账号密码)",
                                        prompt: "请输入密码",
                                        password: true,
                                    })
                                    .then(async (pwd) => {
                                        if (pwd) {
                                            try {
                                                const r = await axios.post(
                                                    "https://ptlogin.4399.com/ptlogin/login.do?v=1",
                                                    `username=${user}&password=${pwd}`,
                                                    getReqCfg("arraybuffer")
                                                );
                                                const html = iconv.decode(
                                                    r.data,
                                                    "utf8"
                                                );
                                                const $ = cheerio.load(html);
                                                const msg = $("#Msg");
                                                if (msg.text()) {
                                                    return err(
                                                        "登录失败, ",
                                                        msg
                                                            .text()
                                                            .replace(
                                                                /[\n\r\t ]/gi,
                                                                ""
                                                            )
                                                    );
                                                }
                                                let c: string[] | undefined =
                                                    r.headers["set-cookie"];
                                                let cookies: any = [];

                                                // 合并多个 set-cookie
                                                if (c && c[0]) {
                                                    c.forEach((co) => {
                                                        cookies.push(
                                                            cookie.parse(co)
                                                        );
                                                    });
                                                    cookies = Object.assign(
                                                        {},
                                                        ...cookies,
                                                        {
                                                            Path: "/",
                                                            Domain: "4399.com",
                                                        }
                                                    );
                                                    cookies =
                                                        objectToQuery(cookies);

                                                    let parsedCookie =
                                                        cookie.parse(cookies);
                                                    if (
                                                        !parsedCookie["Pauth"]
                                                    ) {
                                                        return err(
                                                            "登录失败, cookie 没有 Pauth 值"
                                                        );
                                                    }
                                                    GlobalStorage(context).set(
                                                        "cookie",
                                                        encodeURI(cookies)
                                                    );

                                                    let welcomeMsg = "";
                                                    if (parsedCookie["Pnick"]) {
                                                        welcomeMsg = `亲爱的 ${parsedCookie["Pnick"]}, 您已`;
                                                    }
                                                    vscode.window.showInformationMessage(
                                                        welcomeMsg +
                                                            "登录成功, 请注意定期重新登录"
                                                    );
                                                    callback(
                                                        encodeURI(cookies)
                                                    );
                                                } else {
                                                    return err(
                                                        "登录失败, 响应头没有 set-cookie"
                                                    );
                                                }
                                            } catch (e) {
                                                return err(
                                                    "登录失败, 其它原因",
                                                    String(e)
                                                );
                                            }
                                        }
                                    });
                            }
                        });
                }
            });
    }
}
function updateHistory(history: History) {
    if (!getCfg("updateHistory", true)) {
        return;
    }
    let h: History[] = GlobalStorage(context).get("history");
    if (!h || (typeof h === "object" && !h[0])) {
        h = [];
    }
    h.unshift(history);
    GlobalStorage(context).set("history", h);
}
function objectToQuery(obj: any, prefix?: string) {
    if (typeof obj !== "object") {
        return "";
    }
    const attrs = Object.keys(obj);
    return attrs.reduce((query, attr, index) => {
        // 判断是否是第一层第一个循环
        if (index === 0 && !prefix) {
            query += "";
        }
        if (typeof obj[attr] === "object") {
            const subPrefix = prefix ? `${prefix}[${attr}]` : attr;
            query += objectToQuery(obj[attr], subPrefix);
        } else {
            if (prefix) {
                query += `${prefix}[${attr}]=${obj[attr]}`;
            } else {
                query += `${attr}=${obj[attr]}`;
            }
        }
        // 判断是否是第一层最后一个循环
        if (index !== attrs.length - 1) {
            query += ";";
        }
        return query;
    }, "");
}

exports.activate = (ctx: vscode.ExtensionContext) => {
    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.random", () => {
            getPlayUrl(
                "https://www.4399.com/flash/" +
                    String(Math.floor(Math.random() * 10000) + 200000) +
                    ".htm"
            );
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.get", () => {
            let i = GlobalStorage(ctx).get("id1");
            vscode.window
                .showInputBox({
                    value: i ? String(i) : "222735",
                    title: "4399 on VSCode: 输入游戏 id",
                    prompt: "输入 http(s)://www.4399.com/flash/ 后面的数字(游戏 id)",
                })
                .then((id) => {
                    if (id) {
                        log("用户输入 ", id);
                        GlobalStorage(ctx).set("id1", id);
                        getPlayUrl("https://www.4399.com/flash/" + id + ".htm");
                    }
                });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand(
            "4399-on-vscode.get-h5-web-game",
            () => {
                let i = GlobalStorage(ctx).get("id2");
                vscode.window
                    .showInputBox({
                        value: i ? String(i) : "100060323",
                        title: "4399 on VSCode: 输入游戏 id",
                        prompt: "输入 http(s)://www.zxwyouxi.com/g/ 后面的数字(游戏 id)",
                    })
                    .then((id) => {
                        if (id) {
                            log("用户输入 ", id);
                            GlobalStorage(ctx).set("id2", id);
                            getPlayUrlForWebGames(
                                "https://www.zxwyouxi.com/g/" + id
                            );
                        }
                    });
            }
        )
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
                        if (!gameNames[0] || !urls[0]) {
                            return err("一个推荐的游戏也没有");
                        }

                        vscode.window
                            .showQuickPick(gameNames as string[])
                            .then((val) => {
                                log("用户输入 ", val);
                                if (!val) {
                                    return;
                                }

                                let index = gameNames.indexOf(val as never);
                                log("游戏页面: ", urls[index]);
                                if (index !== -1) {
                                    let url = urls[index];
                                    if (!url) {
                                        return err("变量 url 可能为 undefined");
                                    }
                                    getPlayUrl(url);
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
            let s = GlobalStorage(ctx).get("kwd");

            searchGames(s);
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.my", () => {
            login((c) => {
                let Pnick = cookie.parse(c)["Pnick"] || "未知";
                Pnick = Pnick === "0" ? "未知" : Pnick;
                vscode.window
                    .showQuickPick([
                        "🆔 您的昵称: " + Pnick,
                        "❤️ 我的收藏盒",
                        "🖊 签到",
                        "🚪 退出登录",
                    ])
                    .then(async (value) => {
                        if (value) {
                            if (value.includes("我的收藏")) {
                                try {
                                    let favorites: {
                                        games: number[];
                                        game_infos: Record<
                                            number,
                                            { c_url: string; name: string }
                                        >;
                                    } = (
                                        await axios.get(
                                            "https://gprp.4399.com/cg/collections.php?page_size=999",
                                            getReqCfg("json")
                                        )
                                    ).data;
                                    let _favorites: Record<string, string> = {};
                                    let names: string[] = [];
                                    if (
                                        favorites &&
                                        favorites.game_infos &&
                                        favorites.games
                                    ) {
                                        let info = favorites.game_infos;
                                        favorites.games.forEach((id) => {
                                            _favorites[info[id].name] =
                                                info[id].c_url;
                                            names.push(info[id].name);
                                        });
                                        vscode.window
                                            .showQuickPick(names)
                                            .then((game) => {
                                                if (game) {
                                                    getPlayUrl(
                                                        _favorites[game]
                                                    );
                                                }
                                            });
                                    }
                                } catch (e) {
                                    return err("无法获取我的收藏, ", String(e));
                                }
                            } else if (value.includes("签到")) {
                                try {
                                    let data: {
                                        code: number;
                                        result:
                                            | string
                                            | {
                                                  days: number;
                                                  credit: number;
                                              };
                                        msg: string;
                                    } = (
                                        await axios.get(
                                            "https://my.4399.com/plugins/sign/set-t-" +
                                                new Date().getTime(),
                                            getReqCfg("json")
                                        )
                                    ).data;
                                    if (typeof data.result === "string") {
                                        vscode.window.showInformationMessage(
                                            data.result
                                        );
                                    } else if (
                                        typeof data.result === "object"
                                    ) {
                                        vscode.window.showInformationMessage(
                                            `签到成功, 您已连续签到${data.result.days}天`
                                        );
                                    } else {
                                        err("签到失败, 返回数据格式不正确");
                                    }
                                } catch (e) {
                                    err("签到失败: ", String(e));
                                }
                            } else if (value.includes("退出登录")) {
                                login(() => {}, true);
                            }
                        }
                    });
            });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.info", () => {
            showGameInfo();
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.history", () => {
            try {
                let h: History[] = GlobalStorage(ctx).get("history");
                if (!h || (typeof h === "object" && !h[0])) {
                    h = [];
                }
                h.unshift({
                    webGame: false,
                    name: "🧹 清空历史记录",
                    url: "",
                    date: "",
                });

                let quickPickList: string[] = [];
                h.forEach((obj) => {
                    quickPickList.push(obj.name + obj.date);
                });
                vscode.window.showQuickPick(quickPickList).then((gameName) => {
                    if (gameName === "🧹 清空历史记录") {
                        return GlobalStorage(ctx).set("history", []);
                    }
                    if (gameName) {
                        for (let index = 0; index < h.length; index++) {
                            const item = h[index];
                            if (item.name + item.date === gameName) {
                                if (item.webGame) {
                                    getPlayUrlForWebGames(item.url);
                                } else {
                                    getPlayUrl(item.url);
                                }
                                break;
                            }
                        }
                    }
                });
            } catch (e) {
                err("无法读取历史记录", String(e));
            }
        })
    );

    context = ctx;
    fs.mkdir(
        path.join(os.userInfo().homedir, ".4ov-data/cache/icon"),
        { recursive: true },
        (err) => {}
    );
    console.log("4399 on VSCode is ready!");
};

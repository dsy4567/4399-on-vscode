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

interface History {
    date: string;
    webGame: boolean;
    name: string;
    url: string;
}

var httpServer: http.Server;
var DATA: Buffer | string;
var server = ""; // szhong.4399.com
var gamePath = ""; // /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var gameUrl = ""; // http://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var alerted = false;
var panel: vscode.WebviewPanel;
var context: vscode.ExtensionContext;
const getScript = (cookie: string) => `
<script>
// 强制设置 cookie
Object.defineProperty(document, "cookie", {
    value: \`${cookie}\`,
    writable: false,
});
// 强制在当前标签页打开
Object.defineProperty(window, "open", {
    value: (url) => { location.href = url; },
    writable: false,
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
            // 强制在当前标签页打开
            Object.defineProperty(window, "open", {
                value: (url) => { location.href = url; },
                writable: false,
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
                              ) {
                                  err("本地服务器出现错误: ", e.message);
                              }
                          });
                      //   response.end();
                  }
              })
              .listen(Number(getCfg("port", 44399)), "localhost", function () {
                  log("本地服务器已启动");
                  callback();
              })
              .on("error", (e) => err(e.stack)));
}
function getReqCfg(responseType?: ResponseType): AxiosRequestConfig<any> {
    let c = GlobalStorage(context).get("cookie");
    return {
        baseURL: "http://www.4399.com/",
        responseType: responseType,
        headers: {
            "user-agent": getCfg("user-agent"),
            referer: getCfg("referer"),
            cookie: c ? c : "",
        },
    };
}
function log(a: any, b?: any) {
    if (!getCfg("outputLogs")) {
        return;
    }
    b
        ? console.log("[4399 On VSCode]", a, b)
        : console.log("[4399 On VSCode]", a);
}
function err(a: any, b?: any) {
    b
        ? vscode.window.showErrorMessage("" + a + b)
        : vscode.window.showErrorMessage("" + a);
    b
        ? console.error("[4399 On VSCode]", a, b)
        : console.error("[4399 On VSCode]", a);
}
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

                showWebviewPanel(data.data.game.gameUrl, title);
            } else {
                err("好像没有这个游戏");
            }
        } catch (e) {
            err("无法获取游戏页面", String(e));
        }
    });
}
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
            if (!server_matched || !gamePath_matched) {
                let u1 = $("iframe#flash22").attr("src");
                let u2 = $("a.start-btn").attr("href");
                if (u1) {
                    return getPlayUrlForWebGames(u1);
                }
                if (u2) {
                    return getPlayUrlForWebGames(u2);
                }
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

                              if (m !== null) {
                                  let fileName = m[0]
                                      .split('"')
                                      .at(-1) as string;
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
                                  showWebviewPanel(
                                      "http://localhost:" +
                                          getCfg("port", 44399) +
                                          gamePath,
                                      title,
                                      gamePath.includes(".swf")
                                          ? "fl"
                                          : undefined
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
                if (!gameNames[0] || !urls[0]) {
                    return err("一个游戏也没搜到");
                }

                vscode.window
                    .showQuickPick(gameNames as string[])
                    .then((val) => {
                        log("用户输入 ", val);
                        if (!val) {
                            return;
                        }

                        let index = gameNames.indexOf(val as never);
                        if (index !== -1) {
                            let url = urls[index];
                            if (!url) {
                                return err("变量 url 可能为 undefined");
                            }
                            if (url.startsWith("//")) {
                                url = "http:" + url;
                            }
                            log("游戏页面: ", url);
                            getPlayUrl(url);
                        }
                    });
            }
        })
        .catch((e) => {
            err("无法获取4399首页: ", e);
        });
}
function showWebviewPanel(url: string, title: string | null, type?: "fl") {
    if (!getCfg("moreOpen")) {
        try {
            panel.dispose();
        } catch (e) {}
    }

    const customTitle = getCfg("title");
    panel = vscode.window.createWebviewPanel(
        "4399OnVscode",
        customTitle ? customTitle : title ? title : "4399 On VSCode",
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    if (type !== "fl") {
        try {
            if (url.endsWith(".html") || url.endsWith(".htm")) {
                const $ = cheerio.load(iconv.decode(DATA as Buffer, "utf8"));
                $("head").append(
                    getScript(GlobalStorage(context).get("cookie"))
                );
                DATA = $.html();
            }
        } catch (e) {
            err("无法为游戏页面设置 document.cookie");
        }
    }

    type === "fl"
        ? (panel.webview.html = getWebviewHtml_flash(url))
        : (panel.webview.html = getWebviewHtml_h5(url));
    if (!alerted) {
        alerted = true;
        vscode.window.showInformationMessage(
            "温馨提示: 道路千万条, 谨慎第一条, 摸鱼不适度, 钱包两行泪"
        );
    }
}
function login(callback: (cookie: string) => void, loginOnly: boolean = false) {
    if (GlobalStorage(context).get("cookie")) {
        if (loginOnly) {
            return vscode.window
                .showInformationMessage("您已登录, 是否退出登录?", "是", "否")
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
        vscode.window
            .showInputBox({
                title: "4399 On VSCode: 登录(cookie)",
                prompt: "请输入 cookie, 获取方法请见扩展详情页, 登录后, 您可以玩页游, 评论您喜欢的游戏或者使用其它需要登录的功能",
            })
            .then((c) => {
                if (c) {
                    let m = c.match(/Pauth=.+;/i);
                    let cookieValue = "";
                    if (m) {
                        cookieValue = m[0].split("=")[1].split(";")[0];
                    }
                    if (!cookieValue) {
                        return err("登录失败, cookie 没有 Pauth 值");
                    }
                    GlobalStorage(context).set("cookie", c);
                    vscode.window.showInformationMessage(
                        "登录成功, 请注意定期更新 cookie"
                    );
                    callback(c);
                }
            });
    }
}
function updateHistory(history: History) {
    let h: History[] = GlobalStorage(context).get("history");
    if (!h || (typeof h === "object" && !h[0])) {
        h = [];
    }
    h.unshift(history);
    GlobalStorage(context).set("history", h);
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
            vscode.window
                .showInputBox({
                    value: "222735",
                    title: "4399 On VSCode: 输入游戏 id",
                    prompt: "输入 http(s)://www.4399.com/flash/ 后面的数字(游戏 id)",
                })
                .then((id) => {
                    if (id) {
                        log("用户输入 ", id);
                        getPlayUrl("https://www.4399.com/flash/" + id + ".htm");
                    }
                });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand(
            "4399-on-vscode.get-h5-web-game",
            () => {
                vscode.window
                    .showInputBox({
                        value: "100060323",
                        title: "4399 On VSCode: 输入游戏 id",
                        prompt: "输入 http(s)://www.zxwyouxi.com/g/ 后面的数字(游戏 id)",
                    })
                    .then((id) => {
                        if (id) {
                            log("用户输入 ", id);
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
            vscode.window
                .showInputBox({
                    value: "人生重开模拟器",
                    title: "4399 On VSCode: 搜索",
                    prompt: "输入搜索词",
                })
                .then((val) => {
                    if (!val) {
                        return;
                    }
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

    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.login", () => {
            login(() => {}, true);
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
    console.log("4399 On VSCode is ready!");
};

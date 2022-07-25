const vscode = require("vscode");
const cheerio = require("cheerio");
const axios = require("axios").default;
const iconv = require("iconv-lite");
// const { parse } = require("path");
const http = require("http");

var getUrlTimes = 0;
var httpServer;
var serverHtml = "";
var server = ""; // szhong.4399.com
var gamePath = ""; // /4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
var gameUrl = ""; // http://szhong.4399.com/4399swf/upload_swf/ftp39/cwb/20220706/01a/index.html
const getWebviewHtml = (url) => `
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
function initHttpServer(callback) {
    httpServer
        ? callback()
        : (httpServer = http
              .createServer(function (request, response) {
                  if (request.url.includes(gamePath)) {
                      response.writeHead(200, {
                        "content-security-policy":"allow-pointer-lock allow-scripts",
                          "Content-Type": "text/html",
                          "access-control-allow-origin": "*",
                      });
                      response.end(serverHtml);
                  } else {
                      axios
                          .get(
                              "http://" + server + request.url,
                              getReqCfg("arraybuffer")
                          )
                          .then((res) => {
                              let headers = res.headers["content-type"];
                              headers["access-control-allow-origin"] = "*";
                              response.writeHead(200, headers);
                              response.end(res.data);
                          })
                          .catch((e) => {
                              //   getUrlTimes = 0;
                              log(request, request.url);
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
                                  err("服务器出现错误: 其它原因: ", e.message);
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
function getReqCfg(responseType) {
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
function log(a, b) {
    b
        ? console.log("[4399 on vscode]", a, b)
        : console.log("[4399 on vscode]", a);
}
function err(a, b) {
    b
        ? vscode.window.showErrorMessage("(详细信息请见控制台) " + a + b)
        : vscode.window.showErrorMessage("(详细信息请见控制台) " + a);
    b
        ? console.error("[4399 on vscode]", a, b)
        : console.error("[4399 on vscode]", a);
}
function getCfg(name) {
    return vscode.workspace
        .getConfiguration()
        .get("4399-on-vscode." + name, undefined);
}
function setCfg(name, val) {
    return vscode.workspace
        .getConfiguration()
        .update("4399-on-vscode." + name, val, true);
}
function getPlayUrl(url) {
    getUrlTimes++;
    if (getUrlTimes > 3) {
        getUrlTimes = 0;
        throw new Error(
            "[4399 on vscode] 获取地址次数过多, 已重置获取地址次数, 请再试一次"
        );
    }

    axios
        .get(url, getReqCfg("arraybuffer"))
        .then((res) => {
            res.data = iconv.decode(res.data, "gb2312");
            if (res.data) {
                log("成功获取到游戏页面");
                const $ = cheerio.load(res.data);
                const html = $.html();

                let title = "";
                try {
                    title = html
                        .match(/<title>.+<\/title>/i)[0]
                        .replace(/<\/?title>/gi, "")
                        .split(/[,_]/)[0];
                } catch (e) {
                    title = $("title").html();
                }
                let server_matched = html.match(/src\=\"\/js\/server.+\.js\"/i);
                let gamePath_matched = html.match(
                    /\_strGamePath\=\".+\.htm[l]?\"/i
                );
                if (!server_matched || !gamePath_matched) {
                    // debugger;
                    throw new Error(
                        "[4399 on vscode] 字符串匹配结果为空, 此扩展可能出现了问题, 或不支持此游戏"
                    );
                }
                server =
                    server_matched[0]
                        .split('"')[1]
                        .replace("/js/server", "")
                        .replace(".js", "") + ".4399.com";
                gamePath =
                    "/4399swf" +
                    gamePath_matched[0]
                        .replace("_strGamePath=", "")
                        .replace(/["]/g, "");
                gameUrl = "http://" + server + gamePath;

                getUrlTimes = 0;
                gameUrl
                    ? (() => {
                          setCfg("cookie", res.headers["set-cookie"]);
                          log("set-cookie: ", res.headers["set-cookie"]);

                          axios
                              .get(gameUrl, getReqCfg("text"))
                              .then((res) => {
                                  //   res.data = iconv.decode(res.data, "gb2312");
                                  if (res.data) {
                                      log("成功获取到游戏真实页面", gameUrl);
                                      //   const $ = cheerio.load(res.data);
                                      //   const base_href = gameUrl.replace(
                                      //       parse(new URL(gameUrl).pathname).base,
                                      //       ""
                                      //   );

                                      //   if (!$("base")[0]) {
                                      //       log("base_href: ", base_href);
                                      //       $("head").append(
                                      //           `<base href="${base_href}" target="_self" />`
                                      //       );

                                      initHttpServer(() => {
                                          serverHtml = res.data;
                                          showWebviewPanel(
                                              "http://localhost:44399" +
                                                  gamePath,
                                              title
                                          );
                                      });
                                      //   }
                                  }
                              })
                              .catch((e) => {
                                  getUrlTimes = 0;
                                  err("无法获取游戏真实页面: 其它原因: ", e);
                              });
                      })()
                    : (() => {
                          throw new Error("[4399 on vscode] 游戏真实地址为空");
                      })();
            } else {
                getUrlTimes = 0;
                err(
                    "无法获取游戏页面: 响应文本为空, 您可能需要配置 UA 和 Cookie"
                );
                console.log("[4399 on vscode] ", res);
            }
        })
        .catch((e) => {
            getUrlTimes = 0;
            err("无法获取游戏页面: 其它原因: ", e);
        });
}
function showWebviewPanel(url, title) {
    const panel = vscode.window.createWebviewPanel(
        "4399OnVscode",
        title ? title : "4399 on vscode",
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    panel.webview.html = getWebviewHtml(url);
}

/**
 * @param {vscode.ExtensionContext} ctx
 */
exports.activate = function (ctx) {
    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.get", () => {
            vscode.window
                .showInputBox({
                    value: "https://www.4399.com/flash/223745.htm",
                    title: "4399 on vscode: 输入游戏链接",
                    prompt: "输入 http(s)://www.4399.com/flash/ 后面的数字()",
                })
                .then((url) => {
                    log("用户输入的链接", url);
                    if (url) {
                        getPlayUrl(url);
                    }
                });
        })
    );
    ctx.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.special", () => {
            // vscode.window.showQuickPick(["ggg", "hhh"]).then((值) => {
                vscode.window.showInformationMessage("功能待开发, 敬请期待");
            // });
        })
    );
    log("配置: ", getReqCfg());
    console.log("4399 on vscode is ready!");
};

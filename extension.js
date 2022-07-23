const vscode = require("vscode");
const cheerio = require("cheerio");
const axios = require("axios").default;
const iconv = require("iconv-lite");
const { parse } = require("path");

var getUrlTimes = 0;
const getWebviewHtml = (url) => `
<!DOCTYPE html>
<html lang="zh-CN">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="referrer" content="origin-when-crossorigin">
        <meta
            http-equiv="Content-Security-Policy"
            content="allow-same-origin allow-pointer-lock allow-scripts"
        />
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
        <iframe id="ifr" src="http://www.4399.com/" referrerpolicy="http://www.4399.com/" frameborder="0"></iframe>
        <script>
            setTimeout(() => { ifr.src=\`${url}?\`; }, 3000)
        </script>
    </body>
</html>

`;
function getReqCfg() {
    return {
        baseURL: "http://www.4399.com/",
        responseType: "arraybuffer",
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
        ? vscode.window.showErrorMessage(a + b)
        : vscode.window.showErrorMessage(a);
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
        .get(url, getReqCfg())
        .then((res) => {
            res.data = iconv.decode(res.data, "gb2312");
            if (res.data) {
                log("成功获取到游戏页面");
                setCfg("cookie", res.headers["set-cookie"]);
                log("set-cookie: ", res.headers["set-cookie"]);
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
                let server = html.match(/src\=\"\/js\/server.+\.js\"/i);
                let gamePath = html.match(/\_strGamePath\=\".+\.htm[l]?\"/i);
                if (!server || !gamePath) {
                    // debugger;
                    throw new Error(
                        "[4399 on vscode] 字符串匹配结果为空, 此扩展可能出现了问题, 或不支持此游戏"
                    );
                }
                server =
                    "http://" +
                    html
                        .match(/src\=\"\/js\/server.+\.js\"/i)[0]
                        .split('"')[1]
                        .replace("/js/server", "")
                        .replace(".js", "") +
                    ".4399.com/4399swf";
                gamePath =
                    server +
                    gamePath[0]
                        .replace("_strGamePath=", "")
                        .replace(/["]/g, "");

                getUrlTimes = 0;
                gamePath
                    ? (() => {
                          axios.get(gamePath, getReqCfg());
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
        vscode.ViewColumn.Two,
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
                    prompt: "输入 http(s)://www.4399.com/flash/ 开头的链接",
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
        vscode.commands.registerCommand("4399-on-vscode.search", () => {
            vscode.window.showQuickPick(["ggg", "hhh"]).then((值) => {
                vscode.window.showInformationMessage(值);
            });
        })
    );

    console.log("4399 on vscode is ready!");
};

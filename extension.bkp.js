const vscode = require("vscode");
const http = require("http");
const webviewHtml = `

<!DOCTYPE html>
<html lang="zh-CN">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
            http-equiv="Content-Security-Policy"
            content="allow-same-origin allow-pointer-lock allow-scripts allow-downloads allow-forms"
        />
        <title>4399</title>
        <base target="_self" />
    </head>

    <body>
        <style>
            @media (prefers-color-scheme: dark) {
                body,
                button,
                input {
                    background-color: rgb(30, 30, 30);
                    color: white;
                }
            }

            @media (prefers-color-scheme: light) {
                body,
                button,
                input {
                    color: black;
                    background-color: rgb(255, 255, 255);
                }
            }

            body {
                margin: 0;
                padding: 0;
            }

            iframe {
                width: 100%;
                height: 100vh;
            }
            button {
                width: 75px;
            }
            input {
                width: 99%;
            }
        </style>
        <input
            placeholder="手动输入以 4399.com/flash 开头的链接, 或将链接拖拽至这里"
            id="inp"
            type="text"
        />
        <button onclick="确定()">确定</button>
        <button onclick="inp.value = '';">清空</button>
        <button onclick="ifra.src = ifra.src;">重新加载</button>
        <iframe id="ifra" src="http://www.4399.com/" frameborder="0"></iframe>
        <script>
            const vscode = acquireVsCodeApi();
            // /**
            //  *
            //  * @param {String} 开始
            //  * @param {String} 结束
            //  * @param {String} 值
            //  * @param {String} 类型 "1": url, "2": 字母+数字, "3": 数字
            //  * @returns {String}
            //  */
            // function 获取中间(开始, 结束, 值, 类型) {
            //     if (开始 && !值.indexOf(开始) != -1) {
            //         值 = 值.substring(值.indexOf(开始) + 开始.length);
            //     }
            //     if (结束) {
            //         值 = decodeURI(值.substring(0, 值.indexOf(结束)));
            //     }
            //     switch (类型) {
            //         case "1":
            //             if (
            //                 !(
            //                     值.substring(0, 2) == "//" ||
            //                     值.substring(0, 7) == "http://" ||
            //                     值.substring(0, 8) == "https://"
            //                 )
            //             ) {
            //                 return null;
            //             }
            //             break;
            //         case "2":
            //             if (!/^[0-9a-zA-Z]*$/g.test(值)) {
            //                 return null;
            //             }
            //             break;
            //         case "3":
            //             if (isNaN(Number(值))) {
            //                 return null;
            //             }
            //             break;

            //         default:
            //             break;
            //     }
            //     return 值;
            // }
            // function 获取真实4399游戏地址(游戏地址, 回调) {
            //     // http://www.4399.com/flash/223745.htm
            //     let xhr = new XMLHttpRequest();
            //     xhr.onload = () => {
            //         let 游戏地址2 = 获取中间(
            //             '<a class="btn" href="',
            //             '" target="_self"></a>',
            //             xhr.responseText,
            //             "1"
            //         ); // http://www.4399.com/flash/223745_2.htm
            //         if (游戏地址2) {
            //             let xhr2 = new XMLHttpRequest();
            //             xhr2.onload = () => {
            //                 let 游戏真实地址 = 获取中间(
            //                     'var _strGamePath="',
            //                     '";',
            //                     xhr.responseText
            //                 );
            //                 if (游戏真实地址) {
            //                     回调("//sxiao.4399.com/4399swf" + 游戏真实地址); // //sxiao.4399.com/4399swf/upload_swf/ftp37/cwb/20211115/01a/index.htm
            //                 }
            //             };
            //             xhr2.open("GET", 游戏地址2);
            //             xhr2.send();
            //         }
            //     };
            //     xhr.open("GET", 游戏地址);
            //     xhr.send();
            // }
            function 确定() {
                // 获取真实4399游戏地址, (u) => {
                //     inp.value = u;
                // });
                vscode.postMessage({gameUrl:inp.value});
            }

            window.addEventListener("message", (event) => {
                const u = event.data.gameUrl;
                if (u) ifra.src = u;
            });
        </script>
    </body>
</html>

`;
/**
 *
 * @param {String} 开始
 * @param {String} 结束
 * @param {String} 值
 * @param {String} 类型 "1": url, "2": 字母+数字, "3": 数字
 * @returns {String}
 */
function 获取中间(开始, 结束, 值, 类型) {
    if (开始 && !值.indexOf(开始) != -1) {
        值 = 值.substring(值.indexOf(开始) + 开始.length);
    }
    if (结束) {
        值 = decodeURI(值.substring(0, 值.indexOf(结束)));
    }
    if ((!开始 && !结束) || !值.includes(开始) || !值.includes(结束)) {
        return null;
    }

    switch (类型) {
        case "1":
            if (
                !(
                    值.substring(0, 2) == "//" ||
                    值.substring(0, 7) == "http://" ||
                    值.substring(0, 8) == "https://"
                )
            ) {
                return null;
            }
            break;
        case "2":
            if (!/^[0-9a-zA-Z]*$/g.test(值)) {
                return null;
            }
            break;
        case "3":
            if (isNaN(Number(值))) {
                return null;
            }
            break;

        default:
            break;
    }
    return 值;
}
function 获取真实4399游戏地址(游戏地址, 回调) {
    // http://www.4399.com/flash/223745.htm || https://www.4399.com/flash/222591.htm || ...
    res(游戏地址, (html) => {
        console.log(html);
        let 游戏真实地址 = 获取中间('_strGamePath="', '";', html);
        console.log(游戏真实地址);
        if (游戏真实地址 && html.includes("js/serversxiao.js")) {
            回调("//sxiao.4399.com/4399swf" + 游戏真实地址); // //sxiao.4399.com/4399swf/upload_swf/ftp37/cwb/20211115/01a/index.htm
        } else if (游戏真实地址 && html.includes("js/serverszhong.js")) {
            回调("//szhong.4399.com/4399swf" + 游戏真实地址); // //szhong.4399.com/4399swf/upload_swf/ftp36/huangcijin/20210915/06/index.html
        } else if (游戏真实地址 && html.includes("js/serversda.js")) {
            回调("//sda.4399.com/4399swf" + 游戏真实地址); // //sda.4399.com/4399swf/...
        }
    });
}
function res(url, callback) {
    request(url, { headers: {} }, (err, res, html) => {
        if (err) {
            callback("");
        }
        callback(html);
    });
    const req = https.request(options, (res) => {
        console.log(`状态码: ${res.statusCode}`);

        res.on("data", (d) => {
            process.stdin.write(d);
        });
    });
}

exports.activate = function (context) {
    console.log("Hello, 4399 on vscode!");

    // const server = http.createServer();

    // server.on("request", (req, res) => {
    //     res.setHeader("Content-Type", "text/html;charset=utf-8");
    //     res.setHeader("Access-Control-Allow-Origin", "*");
    //     res.setHeader("Access-Control-Allow-Headers", "content-type");
    //     res.setHeader("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    //     res.write(html);
    //     res.end();
    // });

    // server.listen(4399, () => {
    //     console.log("服务器启动成功");
    // });

    // context.subscriptions.push(
        vscode.commands.registerCommand("4399-on-vscode.play", () => {
            // Create and show panel
            const panel = vscode.window.createWebviewPanel(
                "4399-on-vscode",
                "4399 on vscode",
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = webviewHtml;
            // "<iframe sandbox='allow-same-origin allow-pointer-lock allow-scripts allow-downloads allow-forms' width='100%' height='100%' src='http://localhost:4399/'></iframe>";

            panel.webview.onDidReceiveMessage(
                (message) => {
                    console.log(message);
                    if (message.gameUrl)
                        获取真实4399游戏地址(message, (u) => {
                            panel.webview.postMessage({ gameUrl: u });
                        });
                },
                undefined,
                context.subscriptions
            );
        })
    // );

    console.log("4399 on vscode is ready!");
};

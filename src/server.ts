/** Copyright (c) 2022-2023 dsy4567. See License in the project root for license information. */

import * as fs from "fs";
import * as http from "http";
import * as mime from "mime";
import isLocalhost = require("is-localhost-ip");
import * as path from "path";
import * as vscode from "vscode";
import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";

import { getCookieSync } from "./account";
import { getGameInfo, play } from "./game";
import { getWebviewHtml_flash } from "./scripts";
import {
    DIRNAME,
    err,
    log,
    getCfg,
    getContext,
    getReqCfg,
    globalStorage,
    is4399Domain,
    openUrl,
} from "./utils";

let DATA: Buffer | string;
let HTTP_SERVER: http.Server | undefined;
let PORT = 44399;
/** 覆盖用户设置的 referer, 尽量使用 initHttpServer() 函数设置该值 */
let REF: string | undefined;

/**
 * 启动本地服务器, 包含本地服务器运行时的相关代码
 * @param callback 服务器启动后要执行的回调
 * @param ref 覆盖用户设置的 referer
 */
async function initHttpServer(callback: Function, ref?: string) {
    REF = ref;
    let onRequest: http.RequestListener = async (request, response) => {
        function log(...p: any) {} // NOTE: 在需要输出网络请求相关日志时需要注释掉这行代码

        log(request.url, request);
        try {
            if (!request?.url) return response.end(null);
            let U = new URL(request.url, "http://127.0.0.1:" + PORT);
            if (U.pathname.includes("_4ov-flash-player.htm")) {
                response.writeHead(200, {
                    "content-type": "text/html;charset=utf8",
                });
                response.end(
                    getWebviewHtml_flash(
                        await vscode.env.asExternalUri(
                            vscode.Uri.parse(
                                `http://127.0.0.1:${PORT}/_4ov/flash`
                            )
                        ),
                        getGameInfo().server
                    )
                );
            } else if (U.pathname === "/_4ov/webGame") {
                response.writeHead(302, {
                    Location: getGameInfo().webGameUrl,
                });
                response.end();
            } else if (U.pathname === "/_4ov/flash") {
                response.writeHead(302, {
                    Location: getGameInfo().gamePath,
                });
                response.end();
            } else if (U.pathname === "/") {
                log("访问根目录直接跳转到游戏入口页面");
                getGameInfo().gamePath !== "/"
                    ? response.writeHead(302, {
                          Location: getGameInfo().isFlashGame
                              ? new URL(
                                    "./_4ov-flash-player.html",
                                    getGameInfo().gameUrl
                                ).pathname
                              : getGameInfo().gamePath,
                      })
                    : response.writeHead(500, {}); // 防止重复重定向
                response.end();
            } else if (U.pathname.startsWith("/_4ov/stop/")) {
                if (
                    U.pathname.startsWith(
                        "/_4ov/stop/" +
                            globalStorage(getContext()).get("stop-secret")
                    )
                ) {
                    response.end(null);
                    HTTP_SERVER?.close();
                    HTTP_SERVER = undefined;
                    log("本地服务器已停止");
                }
            } else if (U.pathname.startsWith("/_4ov/proxy/")) {
                log("代理请求", REF);
                let u = new URL(
                    request.url.substring("/_4ov/proxy/".length),
                    "https://www.4399.com"
                );
                if (await isLocalhost(u.hostname)) {
                    response.writeHead(403);
                    return response.end(null);
                }
                if (!getCfg("enableProxy", true)) {
                    response.writeHead(302, {
                        Location: "" + u,
                    });
                    return response.end(null);
                }

                let data = "";
                request.on("data", function (chunk) {
                    data += chunk;
                });
                request.on("end", function () {
                    let config = {
                        data,
                        url: "" + u,
                        method: request.method,
                        responseType: "arraybuffer",
                        headers: (request.headers as AxiosRequestHeaders) || {},
                        validateStatus: () => true,
                    };
                    config.headers["user-agent"] = getCfg("user-agent");
                    config.headers["referer"] =
                        REF || "https://" + getGameInfo().server + "/";
                    config.headers["cookie"] =
                        is4399Domain(u.hostname) &&
                        getCfg("requestWithCookieOn4399Domain")
                            ? getCookieSync()
                            : "";
                    axios
                        .request(config as AxiosRequestConfig<any>)
                        .then(res => {
                            let headers = res.headers;
                            headers["access-control-allow-origin"] = "";
                            headers["content-length"] = "";
                            response.writeHead(res.status, headers);
                            response.statusMessage = res.statusText;
                            response.end(res.data);
                        })
                        .catch(e => {
                            response.writeHead(500, {
                                "content-type": "text/plain",
                            });
                            response.statusMessage = e.message;
                            response.end(e.message);
                        });
                });
            } else if (U.pathname.startsWith("/_4ov/openUrl/")) {
                log("打开外链/推荐游戏");
                response.end(null);
                if (!getCfg("openUrl", true)) return;
                let u;
                try {
                    u = new URL(
                        request.url
                            .substring("/_4ov/openUrl/".length)
                            .replaceAll(
                                "127.0.0.1%3A" + PORT,
                                getGameInfo().server
                            )
                            .replaceAll(
                                "127.0.0.1:" + PORT,
                                getGameInfo().server
                            )
                    );
                } catch (e) {
                    openUrl(request.url.substring("/_4ov/openUrl/".length));
                    return;
                }

                if (
                    u.hostname.endsWith(".4399.com") &&
                    u.pathname.startsWith("/flash/")
                )
                    play(u.href);
                else if (
                    u.hostname === "sbai.4399.com" &&
                    u.searchParams.get("4399id")
                )
                    play(
                        "https://www.4399.com/flash/" +
                            u.searchParams.get("4399id") +
                            ".htm"
                    );
                else openUrl("" + u);
            } else if (U.pathname.startsWith("/sw-4ov.js")) {
                response.writeHead(200, {
                    "content-type": "text/javascript;charset=utf-8",
                });
                response.end(
                    fs.readFileSync(path.join(DIRNAME, "../resources/sw.js"))
                );
            } else if (U.pathname === "/favicon.ico") {
                response.writeHead(200, { "content-type": "image/png" });
                response.end(
                    fs.readFileSync(path.join(DIRNAME, "../icon.png"))
                );
            } else if (U.pathname === getGameInfo().gamePath) {
                log("访问游戏入口页面直接返回数据");
                response.writeHead(200, {
                    "content-type":
                        mime.getType(U.pathname || "") ||
                        "text/html" + "; charset=utf-8",
                    "access-control-allow-origin": "",
                });
                response.end(DATA);
            } else {
                log("向 4399 服务器请求游戏文件");
                let config = getReqCfg("arraybuffer", true, REF);
                config.validateStatus = () => true;

                axios
                    .get("http://" + getGameInfo().server + request.url, config)
                    .then(res => {
                        let headers = res.headers;
                        headers["access-control-allow-origin"] = "";
                        response.writeHead(res.status, headers);
                        response.statusMessage = res.statusText;
                        response.end(res.data);
                    })
                    .catch(e => {
                        log(request, request.url);
                        response.writeHead(500, {
                            "content-type": "text/plain",
                        });
                        response.statusMessage = e.message;
                        response.end(e.message);
                    });
            }
        } catch (e) {
            response.writeHead(500, {
                "content-type": "text/plain",
            });
            response.end(String(e));
        }
    };

    if (HTTP_SERVER) callback();
    else {
        PORT = Number(getCfg("port", 44399));
        if (isNaN(PORT)) PORT = 44399;

        try {
            HTTP_SERVER = http
                .createServer(onRequest)
                .listen(PORT, "127.0.0.1", function () {
                    log("本地服务器已启动");
                    callback();
                })
                .on("error", async e => {
                    log("正在尝试关闭已启动的服务器");
                    try {
                        await axios.get(
                            "http://127.0.0.1:" +
                                PORT +
                                "/_4ov/stop/" +
                                globalStorage(getContext()).get("stop-secret"),
                            {
                                timeout: 3000,
                            }
                        );
                    } catch (e) {}
                    await (async () => {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve(null);
                            }, 500);
                        });
                    })();
                    HTTP_SERVER = http
                        .createServer(onRequest)
                        .listen(PORT, "127.0.0.1", function () {
                            log("本地服务器已启动");
                            callback();
                        })
                        .on("error", e => {
                            err(e.stack);
                            HTTP_SERVER = undefined;
                        });
                });
        } catch (e) {
            err(String(e));
            HTTP_SERVER = undefined;
        }
    }
}
function getData() {
    return DATA;
}
function setData(data: Buffer | string) {
    DATA = data;
}
function getPort() {
    return PORT;
}

export { initHttpServer, getData, setData, getPort };

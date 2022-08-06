

function getRealUrl(url) {
    if (url.startsWith("/") && !url.startsWith("//")) {
        url = getReqCfg().baseURL + url;
    }
    const axios_1 = require("axios");
    axios_1
        .get("http://www.baidu.com/", )
        .then((res) => {
            if (res.data) {
                res.data = iconv.decode(res.data, "gb2312");
                log("成功获取到游戏页面");
                const $ = cheerio.load(res.data);
                const html = $.html();

                /**
                 * @type {string | null}
                 */
                let title = "";
                /**
                 * @type {RegExpMatchArray | null}
                 */
                let m = null;
                try {
                    m = html.match(/<title>.+<\/title>/i);
                    if (!m) {
                        throw new Error();
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
                        "正则匹配结果为空, 此扩展可能出现了问题, 也可能因为这个游戏是页游, 较新(约2006年6月以后)的 flash 游戏或非 h5 游戏"
                    );
                }
                server = getServer(server_matched);
                gamePath =
                    "/4399swf" +
                    gamePath_matched[0]
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
                                  "这个游戏可能是页游, 较新(约2006年6月以后)的 flash 游戏或非 h5 游戏"
                              );
                          }
                          axios
                              .get(gameUrl, getReqCfg("arraybuffer"))
                              .then((res) => {
                                  if (res.data) {
                                      log("成功获取到游戏真实页面", gameUrl);

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
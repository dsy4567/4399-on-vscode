/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

"use strict";

const whiteList = [
    "cdnjs.cloudflare.com",
    "jsdelivr.net",
    "onmicrosoft.cn",
    "ruffle",
    "unpkg.com",
];
self.addEventListener("activate", ev => {
    ev.waitUntil(clients.claim());
});
self.addEventListener("install", ev => {
    self.skipWaiting();
});
self.addEventListener("fetch", ev => {
    let u = new URL(ev.request.url),
        req = ev.request;

    if (
        (u.protocol !== "http:" && u.protocol !== "https:") ||
        u.host === location.host ||
        u.pathname.startsWith("/_4ov/") ||
        u.pathname === "/sw-4ov.js" ||
        (() => {
            let r = false;
            for (let i = 0; i < whiteList.length; i++) {
                r = u.href.includes(whiteList[i]);
                if (r) break;
            }
            return r;
        })()
    )
        return;
    u = "/_4ov/proxy/" + u;
    ev.respondWith(
        (async () => {
            try {
                let c;
                if (req.body) {
                    let reader = req.body.getReader();
                    c = [];
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        c.push(value);
                    }
                    c = new Blob(c);
                }
                return await fetch(u, {
                    body: c,
                    cache: req.cache,
                    headers: req.headers,
                    method: req.method,
                    referrer: req.referrer,
                    referrerPolicy: req.referrerPolicy,
                });
            } catch (e) {
                console.log(e, ev);
                return new Response(
                    '<p style="color: #888;">[4399 on VSCode] service worker在发出请求时遇到了错误，请检查您的网络连接，或<a href="javascript:navigator.serviceWorker.getRegistrations().then((r)=>{r.forEach(sw=>sw.unregister())})">注销 service worker</a>并禁用设置项<abbr title="控制是否启用 ServiceWorker, 以便发起跨域请求(不推荐禁用)"><code>4399-on-vscode.enableServiceWorker</code></abbr></p>',
                    {
                        status: 408,
                        headers: {
                            "content-type": "text/html;charset=utf8",
                        },
                    }
                );
            }
        })()
    );
});

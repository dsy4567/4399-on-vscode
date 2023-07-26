type CfgNames =
    | "user-agent"
    | "referer"
    | "port"
    | "printLogs"
    | "title"
    | "injectionScripts"
    | "scripts"
    | "showIcon"
    | "openUrl"
    | "updateHistory"
    | "background"
    | "alert"
    | "automaticCheckIn"
    | "enableProxy"
    | "requestWithCookieOn4399Domain"
    | "enableServiceWorker"
    | "RuffleSource";
type Comment = {
    nickname: string;
    content: string;
    top?: boolean;
    replies: Reply[];
    repliesPage: number;
    cid: number;
    lastPage: boolean;
};
type Reply = {
    nickname: string;
    content: string;
};
type GlobalStorage = {
    get(key: "history"): History[];
    get(key: "cookie" | "kwd" | "kwd-forums" | "stop-secret"): string;
    get(key: "id1" | "id2"): number | string;

    set(key: "history", value: History[]): Thenable<void>;
    set(
        key: "cookie" | "kwd" | "kwd-forums" | "stop-secret",
        value: string
    ): Thenable<void>;
    set(key: "id1" | "id2", value: number | string): Thenable<void>;
};
type History = {
    date: string;
    webGame: boolean;
    name: string;
    url: string;
};
type Supplements = Record<"_ver", number> &
    Record<
        string,
        { type: "flash"; url: string; title: string; detailUrl: string }
    >;

interface History {
    date: string;
    webGame: boolean;
    name: string;
    url: string;
}
interface GlobalStorage {
    get(key: "history"): History[];
    get(key: "cookie" | "kwd" | "kwd-forums" | "stop-secret"): string;
    get(key: "id1" | "id2"): number | string;

    set(key: "history", value: History[]): Thenable<void>;
    set(
        key: "cookie" | "kwd" | "kwd-forums" | "stop-secret",
        value: string
    ): Thenable<void>;
    set(key: "id1" | "id2", value: number | string): Thenable<void>;
}
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
    | "enableServiceWorker";
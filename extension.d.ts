declare class myReqCfgType {
    baseURL: string;
    responseType:
        | "arraybuffer"
        | "blob"
        | "document"
        | "json"
        | "text"
        | "stream"
        | undefined;
    headers: {
        cookie: string;
        "user-agent": string;
        referer: string;
    };
}

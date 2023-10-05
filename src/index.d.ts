/**
 * Copyright (c) 2022-2023 dsy4567, and all contributors.
 * <https://github.com/dsy4567/4399-on-vscode/graphs/contributors>
 * See COPYING in the project root for license information.
 */

import * as vscode from "vscode";

export namespace comment {
    export type CommentQuickPickItem =
        utils.QuickPickItemWithActionAndData<CommentQuickPickItemData>;
    export type CommentQuickPickItemData = {
        comment?: Comment;
        reply?: Reply;
        showMore?: {
            cid: number;
        };
    };
    export type Comment = {
        nickname: string;
        content: string;
        top?: boolean;
        repliesPage: number;
        lastReplyIndex: number;
        cid: number;
        lastPage: boolean;
        likes: number;
        liked?: boolean;
    };
    export type Reply = {
        nickname: string;
        content: string;
        cid: number;
        likes: number;
        liked?: boolean;
    };
}

export namespace forums {
    export type ForumsQuickPickItem =
        utils.QuickPickItemWithActionAndData<ForumsQuickPickItemData>;
    export type ForumsQuickPickItemData = {
        title: string;
        id: number;
    };
}

export namespace game {
    export type History = {
        date: string;
        webGame: boolean;
        name: string;
        url: string;
    };
    export type Supplements = Record<"_ver", number> &
        Record<
            string,
            { type: "flash"; url: string; title: string; detailUrl: string }
        >;
}

export namespace scripts {
    export type ScriptConfig = {
        filename: string;
        displayName: string;
        enabled: boolean;
    };
    export type OnlineScriptQpItemData = {
        filename: string;
        displayName: string;
    };
    export type ScriptsQuickPickItem = utils.QuickPickItemWithActionAndData<
        ScriptConfig | OnlineScriptQpItemData
    >;
    export type InstalledScriptQuickPickItem =
        utils.QuickPickItemWithActionAndData<ScriptConfig>;
    export type OnlineScriptQuickPickItem =
        utils.QuickPickItemWithActionAndData<OnlineScriptQpItemData>;
}

export namespace search {
    export type SearchQuickPickItem =
        utils.QuickPickItemWithActionAndData<SearchQuickPickItemData>;
    export type SearchQuickPickItemData = {
        title: string;
        id: number;
    };
}

export namespace utils {
    export type CfgNames =
        | "user-agent"
        | "referer"
        | "port"
        | "printLogs"
        | "title"
        | "injectionScripts"
        | "htmlScripts"
        | "showIcon"
        | "openUrl"
        | "updateHistory"
        | "background"
        | "alert"
        | "automaticSign"
        | "enableProxy"
        | "requestWithCookieOn4399Domain"
        | "enableServiceWorker"
        | "RuffleSource"
        | "confirm";
    export type GlobalStorage = {
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
    export interface QuickPick<
        D = any,
        I extends QuickPickItemWithActionAndData = utils.QuickPickItemWithActionAndData<D>
    > extends vscode.QuickPick<I> {
        activeItems: readonly I[];
        buttons: readonly QuickInputButtonWithActionAndData<D>[];
        readonly onDidTriggerButton: vscode.Event<
            QuickInputButtonWithActionAndData<D>
        >;
        readonly onDidTriggerItemButton: vscode.Event<
            QuickPickItemWithActionAndDataButtonEvent<
                I,
                QuickInputButtonWithActionAndData<D>
            >
        >;
    }
    export interface QuickPickItemWithActionAndDataButtonEvent<
        T extends QuickPickItemWithActionAndData,
        B extends QuickInputButtonWithActionAndData
    > {
        readonly button: B;
        readonly item: T;
    }
    export interface QuickInputButtonWithActionAndData<D = any>
        extends vscode.QuickInputButton {
        action?: (
            button: QuickInputButtonWithActionAndData<D>,
            qpItem?: QuickPickItemWithActionAndData<D>
        ) => any | Promise<any>;
        data?: D;
    }
    export interface QuickPickItemWithActionAndData<D = any>
        extends vscode.QuickPickItem {
        action?: (
            target: QuickPickItemWithActionAndData<D>
        ) => any | Promise<any>;
        data?: D;
        buttons?: readonly QuickInputButtonWithActionAndData<D>[];
    }
    export type RTypes = {
        arraybuffer: Buffer;
        blob: any;
        document: any;
        json: any;
        text: string;
        stream: any;
    };
}

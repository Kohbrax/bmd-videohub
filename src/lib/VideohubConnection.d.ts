/// <reference types="node" />
import { EventEmitter } from "events";
export interface VideohubConnectionErrror extends Error {
}
export interface VideohubConnectionEvent {
    on(type: 'error', cb: (err: VideohubConnectionErrror) => void): void;
}
export declare type VideohubEventType = "error" | "update";
export declare type VideohubEventCallback = (data: any) => void;
export interface VideohubDeviceStatus {
    devicePresent: boolean;
    modelName: string;
    friendlyName: string;
    uniqueId: string;
    videoInputs: number;
    videoProcessingUnits: number;
    videoOutputs: number;
    videoMonitoringOutputs: number;
    serialPorts: number;
}
export interface VideohubStatus {
    deviceInfo: VideohubDeviceStatus;
    inputLabels: {
        [index: number]: string;
    };
    outputLabels: {
        [index: number]: string;
    };
    outputLocks: {
        [index: number]: boolean;
    };
    outputRouting: {
        [index: number]: number;
    };
}
export declare class VideohubConnection implements VideohubConnectionEvent {
    private host;
    private port;
    private socket;
    private event;
    private toParseStr;
    private parsers;
    private currentStatus;
    private version;
    constructor(host: string, port: number);
    init(): Promise<unknown>;
    on(name: VideohubEventType, cb: VideohubEventCallback): Promise<EventEmitter>;
    off(name: VideohubEventType, cb: VideohubEventCallback): Promise<void>;
    private parse;
    parseProtocolPreamble(header: string, lines: string[]): void;
    parseVideohubDevice(header: string, lines: string[]): void;
    parseLables(header: string, lines: string[]): void;
    parseVideoOutputLocks(header: string, lines: string[]): void;
    parseVideoOutputRouting(header: string, lines: string[]): void;
    parseAck(header: string, lines: string[]): void;
    getVersion(): string;
    send(data: Buffer): void;
}

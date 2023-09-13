import { Request as ERequest, Response as EResponse } from "express";

export declare interface Accountability {
    user: any;
    role: any;
}

export declare interface Request extends ERequest {
    accountability?: Accountability;
    // params?: any;
}

export declare interface Response extends EResponse {

}

export interface GenericResult<T> {
    status: boolean;
    data?: T,
    message?: string
}

export interface Query {
    fields?: string[];
    filter?: any;
    sort?: any[];
}

export interface GenericContext {
    services: any;
    exceptions: any;
    env: any;
    database: any;
    getSchema: any;
}

export interface IUser {
    id?:string,
    first_name?: string,
    last_name?: string,
    email: string
}

export namespace Directus {
    export interface Role {
        id: string,
        name: string
    }
}
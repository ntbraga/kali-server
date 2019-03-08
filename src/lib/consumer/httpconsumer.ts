import * as doRequest from 'request';
import { Response } from 'request';
import { Observable } from 'rxjs';
import { HttpError } from './../main/http';

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export interface HttpOptions {
    url: string;
    observe?: 'response' | 'body';
    method: HttpMethod
}

export class HttpClient {

    get<RES>(url: string, init?: RequestInit) {
        
    }

    post<REQ, RES>(url: string, body: REQ, options?: any) {

    }

    request<RES>(options: HttpOptions) {
        return new Observable<RES>((subscriber) => {
            const req = doRequest(options, () => {});

            req.on('complete', (res: Response) => {
                if (Math.round(res.statusCode / 100) != 2) {
                    subscriber.error(new HttpError(res.statusCode, res.statusMessage, new Error(res.statusMessage)));
                } else {
                    const isJson = (res.headers["content-type"] || '').split(';').map((str) => str.toLowerCase().trim()).includes('application/json');
                    subscriber.next(options.observe == 'body' ? (res.body != undefined ? (isJson ? JSON.parse(res.body) : res.body) : undefined) : res);
                    subscriber.complete();
                }
            });

            if (options.observe == 'response') {
                req.on('response', (res: any) => {
                    if (Math.round(res.statusCode / 100) == 2) {
                        subscriber.next(<RES>res);
                    }
                })
            }

            req.on('error', (err: Error) => {
                subscriber.error(err);
            })

            return () => {
                req.abort();
            };
        });
    }

}
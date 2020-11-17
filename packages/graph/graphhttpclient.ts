import {
    assign,
    IRequestClient,
    mergeHeaders,
    IFetchOptions,
    IHttpClientImpl,
    getCtxCallback,
} from "@pnp/common";
import { GraphRuntimeConfig } from "./graphlibconfig";

export class GraphHttpClient implements IRequestClient {

    private _impl: IHttpClientImpl;

    constructor() {

        this._impl = GraphRuntimeConfig.fetchClientFactory();
    }

    public fetch(url: string, options: IFetchOptions = {}): Promise<Response> {

        const headers = new Headers();

        // first we add the global headers so they can be overwritten by any passed in locally to this call
        mergeHeaders(headers, GraphRuntimeConfig.headers);

        // second we add the local options so we can overwrite the globals
        mergeHeaders(headers, options.headers);

        if (!headers.has("Content-Type")) {
            headers.append("Content-Type", "application/json");
        }

        if (!headers.has("SdkVersion")) {
            // this marks the requests for understanding by the service
            headers.append("SdkVersion", "PnPCoreJS/$$Version$$");
        }

        const opts = assign(options, { headers: headers });

        return this.fetchRaw(url, opts);
    }

    public fetchRaw(url: string, options: IFetchOptions = {}): Promise<Response> {

        // here we need to normalize the headers
        const rawHeaders = new Headers();
        mergeHeaders(rawHeaders, options.headers);
        options = assign(options, { headers: rawHeaders });

        const retry = (ctx: RetryContext): void => {

            this._impl.fetch(url, options).then((response) => ctx.resolve(response)).catch((response) => {

                // Check if request was throttled - http status code 429
                // Check if request failed due to server unavailable - http status code 503
                // Check if request failed due to gateway timeout - http status code 504
                if (response.status !== 429 && response.status !== 503 && response.status !== 504) {
                    ctx.reject(response);
                }

                // grab our current delay
                const delay = ctx.delay;

                // Increment our counters.
                ctx.delay *= 2;
                ctx.attempts++;

                // If we have exceeded the retry count, reject.
                if (ctx.retryCount <= ctx.attempts) {
                    ctx.reject(response);
                }

                // Set our retry timeout for {delay} milliseconds.
                setTimeout(getCtxCallback(this, retry, ctx), delay);
            });
        };

        return new Promise((resolve, reject) => {

            const retryContext: RetryContext = {
                attempts: 0,
                delay: 100,
                reject: reject,
                resolve: resolve,
                retryCount: 7,
            };

            retry.call(this, retryContext);
        });
    }

    public get(url: string, options: IFetchOptions = {}): Promise<Response> {
        const opts = assign(options, { method: "GET" });
        return this.fetch(url, opts);
    }

    public post(url: string, options: IFetchOptions = {}): Promise<Response> {
        const opts = assign(options, { method: "POST" });
        return this.fetch(url, opts);
    }

    public patch(url: string, options: IFetchOptions = {}): Promise<Response> {
        const opts = assign(options, { method: "PATCH" });
        return this.fetch(url, opts);
    }

    public delete(url: string, options: IFetchOptions = {}): Promise<Response> {
        const opts = assign(options, { method: "DELETE" });
        return this.fetch(url, opts);
    }
}

interface RetryContext {
    attempts: number;
    delay: number;
    reject: (reason?: any) => void;
    resolve: (value?: Response | PromiseLike<Response>) => void;
    retryCount: number;
}

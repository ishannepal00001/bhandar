// Wraps every request to the fetchr download service: signs it with the client id and the current rolling code,
// stores the code fetchr hands back, and turns the reply into parsed data or a FetchrError.
// Fetchr(): Takes the Worker bindings from wrangler.jsonc and the store that keeps the rolling code.
// Fetchr.request(): fetchr keeps one rolling code per client and replaces it on every request, so requests go out
//   one at a time and each reply's code is stored before the next request reads it.
// Fetchr.send(): DOWNLOADER_SEED_CODE is only used until the first rotation. fetchr rotates the code on every
//   request it authenticates, errors included; the header is missing on a 401, where the code was rejected and
//   didn't rotate. With no reply there's no new code, so the old one is sent again and fetchr accepts it once within
//   its grace window.

import type { z } from "zod";
import type { FetchrCodeStore, FetchrEnv } from "./fetchr.types";
import { FetchrError } from "./fetchr.error";

export class Fetchr {
  private readonly base: string;
  private readonly clientId: string;
  private readonly seedCode: string;
  private readonly timeoutMs: number;
  private lock: Promise<unknown> = Promise.resolve();

  constructor(
    env: FetchrEnv,
    private readonly codes: FetchrCodeStore,
  ) {
    const {
      DOWNLOADER_URL,
      DOWNLOADER_CLIENT_ID,
      DOWNLOADER_SEED_CODE,
      DOWNLOADER_TIMEOUT_SECONDS,
    } = env;
    if (!DOWNLOADER_URL || !DOWNLOADER_CLIENT_ID || !DOWNLOADER_SEED_CODE) {
      throw new FetchrError("Download service is not configured");
    }
    this.base = DOWNLOADER_URL;
    this.clientId = DOWNLOADER_CLIENT_ID;
    this.seedCode = DOWNLOADER_SEED_CODE;
    this.timeoutMs = DOWNLOADER_TIMEOUT_SECONDS * 1000;
  }

  request<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const result = this.lock.then(() => this.send(path, init, schema));
    this.lock = result.catch(() => {});
    return result;
  }

  private async send<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const code = this.codes.get() ?? this.seedCode;

    let res: Response;
    try {
      res = await fetch(new URL(path, this.base), {
        ...init,
        headers: {
          "X-Client-Id": this.clientId,
          "X-Fetchr-Code": code,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new FetchrError("Download service is unreachable", undefined, {
        cause: err,
      });
    }

    const nextCode = res.headers.get("X-Fetchr-Next-Code");
    if (nextCode) this.codes.put(nextCode);

    if (!res.ok)
      throw new FetchrError(
        `Download service answered ${res.status}`,
        res.status,
      );
    if (!nextCode)
      throw new FetchrError("Download service sent no next code", res.status);

    const parsed = schema.safeParse(await res.json().catch(() => undefined));
    if (!parsed.success) {
      throw new FetchrError(
        "Download service sent an unexpected response",
        res.status,
        { cause: parsed.error },
      );
    }
    return parsed.data;
  }
}

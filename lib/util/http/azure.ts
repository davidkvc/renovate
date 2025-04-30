import is from '@sindresorhus/is';
import { type infer as Infer, type ZodType, z } from 'zod';
import { logger } from '../../logger';
import { parseUrl } from '../url';
import type { InternalJsonUnsafeOptions } from './http';
import { HttpBase } from './http';
import type { HttpMethod, HttpOptions, HttpResponse } from './types';

export class AzureHttp extends HttpBase<HttpOptions> {
  constructor(type = 'azure', options?: HttpOptions) {
    super(type, options);
  }

  async getJsonPaged<Schema extends ZodType<any, any, any>>(
    url: string,
    schema: Schema,
  ): Promise<HttpResponse<Infer<Schema>[]>> {
    const pagedResponseSchema = z.union([
      z.object({
        value: z.array(schema),
      }),
      z.array(schema),
    ]);
    const items: z.infer<Schema>[] = [];

    let continuationToken = '';
    const resolvedUrl = parseUrl(url);
    if (is.nullOrUndefined(resolvedUrl)) {
      logger.error({ url }, 'Azure: cannot parse url');
      throw new Error(`Azure: cannot parse path ${url}`);
    }

    while (true) {
      resolvedUrl.searchParams.set('continuationToken', continuationToken);

      const res = await this.getJson(
        resolvedUrl.toString(),
        pagedResponseSchema,
      );

      let newItems: z.infer<Schema>[] = [];
      if (Array.isArray(res.body)) {
        newItems = res.body;
      } else {
        newItems = res.body.value;
      }
      items.push(...newItems);

      const continuationTokenHeader = res.headers['x-ms-continuationtoken'];
      if (
        !is.nonEmptyStringAndNotWhitespace(continuationTokenHeader) ||
        newItems.length === 0
      ) {
        return {
          ...res,
          body: items,
        };
      }
      continuationToken = continuationTokenHeader;
    }
  }

  protected override async requestJsonUnsafe<T>(
    method: HttpMethod,
    { url, httpOptions: options }: InternalJsonUnsafeOptions<HttpOptions>,
  ): Promise<HttpResponse<T>> {
    const opts = {
      ...options,
      throwHttpErrors: true,
    };
    opts.headers ??= {};
    opts.headers['x-tfs-fedauthredirect'] = 'Suppress';

    const resolvedUrl = parseUrl(url);

    // istanbul ignore if: this should never happen
    if (is.nullOrUndefined(resolvedUrl)) {
      logger.error({ url }, 'Azure: cannot parse url');
      throw new Error(`Azure: cannot parse path ${url}`);
    }

    const result = await super.requestJsonUnsafe<T>(method, {
      url: resolvedUrl.toString(),
      httpOptions: opts,
    });
    return result;
  }
}

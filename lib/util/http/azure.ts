import is from '@sindresorhus/is';
import { logger } from '../../logger';
import { parseUrl } from '../url';
import type { InternalJsonUnsafeOptions } from './http';
import { HttpBase } from './http';
import type { HttpMethod, HttpOptions, HttpResponse } from './types';

export class AzureHttp extends HttpBase<HttpOptions> {
  constructor(type = 'azure', options?: HttpOptions) {
    super(type, options);
  }

  protected override async requestJsonUnsafe<T>(
    method: HttpMethod,
    { url, httpOptions: options }: InternalJsonUnsafeOptions<HttpOptions>,
  ): Promise<HttpResponse<T>> {
    const opts = {
      ...options,
      throwHttpErrors: true,
    };

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
    // const continuationToken = result.headers['x-ms-continuationtoken'] ?? '';
    // if (continuationToken && isPagedResult(result.body)) {
    //   resolvedUrl.searchParams.set('continuationToken', continuationToken);
    //   const nextResult = await this.requestJsonUnsafe<PagedResult<T>>(method, {
    //     url: resolvedUrl.toString(),
    //     httpOptions: opts,
    //   });
    //   if (isPagedResult(result.body)) {
    //     result.body.value.push(...nextResult.body.value);
    //   }
    // }
    return result;
  }
}

// function isPagedResult(obj: any): obj is PagedResult {
//   return is.nonEmptyObject(obj) && Array.isArray(obj.value);
// }

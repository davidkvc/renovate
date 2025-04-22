import { cache } from '../../../util/cache/package/decorator';
import { AzureHttp } from '../../../util/http/azure';
import { ensureTrailingSlash } from '../../../util/url';
import { Datasource } from '../datasource';
import type { GetReleasesConfig, ReleaseResult } from '../types';
import { AzureTagSchema } from './schema';

export class AzureTagsDatasource extends Datasource {
  static readonly id = 'azure-tags';
  static readonly cacheNamespace =
    `datasource-${AzureTagsDatasource.id}` as const;

  azureHttp = new AzureHttp(AzureTagsDatasource.id);

  constructor() {
    super(AzureTagsDatasource.id);
  }

  static getCacheKey(registryUrl: string, repo: string, type: string): string {
    return `${registryUrl}:${repo}:${type}`;
  }

  static getSourceUrl(packageName: string, registryUrl: string): string {
    const normalizedUrl = ensureTrailingSlash(registryUrl);
    return `${normalizedUrl}/${packageName}`;
  }

  @cache({
    namespace: AzureTagsDatasource.cacheNamespace,
    key: ({ registryUrl, packageName }: GetReleasesConfig) =>
      AzureTagsDatasource.getCacheKey(registryUrl!, packageName, 'tags'),
  })
  async getReleases({
    registryUrl,
    packageName: repo,
  }: GetReleasesConfig): Promise<ReleaseResult | null> {
    const url = `${registryUrl!}/git/repositories/${repo}/refs?filter=tags&$top=100&api-version=7.0`;
    const azureTags = (await this.azureHttp.getJsonPaged(url, AzureTagSchema))
      .body;

    const dependency: ReleaseResult = {
      sourceUrl: AzureTagsDatasource.getSourceUrl(repo, registryUrl!),
      registryUrl,
      releases: azureTags.map(({ name }) => ({
        version: name,
        gitRef: name,
        releaseTimestamp: null,
      })),
    };

    return dependency;
  }
}

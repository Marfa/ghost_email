declare module '@tryghost/admin-api' {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  interface BrowseOptions {
    filter?: string;
    fields?: string;
    include?: string;
    order?: string;
    limit?: number | string;
  }

  interface AddOptions {
    source?: string;
  }

  export default class GhostAdminAPI {
    constructor(options: GhostAdminAPIOptions);
    posts: {
      browse(options?: BrowseOptions): Promise<unknown[]>;
      add(data: Record<string, unknown>, options?: AddOptions): Promise<Record<string, unknown>>;
    };
  }
}

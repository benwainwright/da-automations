interface RequestParams {
  method: "GET";
  path: string;
  params?: Record<string, string>;
}

const BASE_URL = `https://api.nuki.io`;

export class ApiClient {
  public constructor(private readonly token: string) {}

  private generateUrl(path: string, params?: Record<string, string>) {
    const url = path.startsWith("/") ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;

    if (!params) {
      return url;
    }

    const queryString = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      queryString.set(key, value);
    });

    return `${url}?${queryString.toString()}`;
  }

  private async request<TResponse>({ path, method, params }: RequestParams) {
    const finalUrl = this.generateUrl(path, params);

    const headers = new Headers();

    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${this.token}`);

    console.log({ finalUrl, headers, method });

    const result = await fetch(finalUrl, {
      method,
      headers,
    });

    if (!result.ok) {
      throw new Error(
        `Returned error response with status ${result.status}: ${result.statusText} - ${await result.text()}`,
      );
    }

    return (await result.json()) as TResponse;
  }

  public async get<TResponse>(path: string, params?: Record<string, string>) {
    return await this.request<TResponse>({
      method: "GET",
      path,
      params,
    });
  }
}

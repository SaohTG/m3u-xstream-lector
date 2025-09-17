import { XtreamServerInfo, XtreamUserInfo } from './types';

// These are common ports used by Xtream Codes providers.
const XTREAM_COMMON_PORTS = [80, 8080, 8000, 2052, 2086, 2095, 2179];

interface DiscoveryResult {
  host: string;
  chosenBaseUrl: string;
  serverInfo: XtreamServerInfo;
  userInfo: XtreamUserInfo;
}

// A generic fetch function type to allow passing axios from the backend
type Fetcher = (url: string, params?: Record<string, any>) => Promise<{ data: any }>;

/**
 * Discovers the correct base URL for an Xtream Codes provider and validates credentials.
 *
 * @param hostOrUrl The user-provided host (e.g., my-provider.com) or full URL.
 * @param username The Xtream username.
 * @param password The Xtream password.
 * @param fetcher An axios-like function to perform the HTTP GET request.
 * @returns The discovered and validated base URL and server/user info.
 * @throws An error if no valid endpoint is found.
 */
export async function discoverAndValidateXtream(
  hostOrUrl: string,
  username: string,
  password: string,
  fetcher: Fetcher,
): Promise<DiscoveryResult> {
  const url = new URL(hostOrUrl.includes('://') ? hostOrUrl : `http://${hostOrUrl}`);
  const host = url.hostname;
  const initialPort = url.port ? parseInt(url.port, 10) : null;
  const initialProtocol = url.protocol.replace(':', '') as 'http' | 'https';

  const protocols: ('http' | 'https')[] = ['http', 'https'];
  const portsToTry = initialPort ? [initialPort] : XTREAM_COMMON_PORTS;

  console.log(`[XTREAM] Starting discovery for host: ${host}`);

  for (const protocol of protocols) {
    // If a full URL was provided, only try the specified protocol and port first.
    if (initialPort && protocol !== initialProtocol) continue;

    for (const port of portsToTry) {
      // Skip http on 443 and https on 80
      if ((protocol === 'http' && port === 443) || (protocol === 'https' && port === 80)) {
        continue;
      }

      const portString = (port === 80 || port === 443) ? '' : `:${port}`;
      const baseUrl = `${protocol}://${host}${portString}`;
      const apiUrl = `${baseUrl}/player_api.php`;

      try {
        console.log(`[XTREAM] Trying endpoint: ${apiUrl}`);
        const { data } = await fetcher(apiUrl, {
          username,
          password,
        });

        if (data.user_info && data.server_info && data.user_info.auth === 1) {
          console.log(`[XTREAM] Discovery OK. Valid endpoint found: ${baseUrl}`);
          return {
            host,
            chosenBaseUrl: baseUrl,
            userInfo: data.user_info as XtreamUserInfo,
            serverInfo: data.server_info as XtreamServerInfo,
          };
        }
      } catch (error: any) {
        const statusCode = error.response?.status;
        console.log(`[XTREAM] Endpoint ${apiUrl} failed. Status: ${statusCode || 'N/A'}`);
      }
    }
  }

  throw new Error(`[XTREAM] Discovery failed. Could not find a valid Xtream API endpoint for host: ${host}`);
}

/**
 * Builds the stream URL for an Xtream movie.
 * @param baseUrl The discovered base URL of the Xtream server.
 * @param username The username.
 * @param password The password.
 * @param streamId The movie's stream ID.
 * @param extension The container extension (e.g., 'mp4', 'mkv').
 * @returns The full, playable stream URL.
 */
export function buildXtreamMovieUrl(
  baseUrl: string,
  username: string,
  password: string,
  streamId: number,
  extension: string,
): string {
  return `${baseUrl}/movie/${username}/${password}/${streamId}.${extension}`;
}

/**
 * Builds the stream URL for an Xtream series episode.
 * @param baseUrl The discovered base URL of the Xtream server.
 * @param username The username.
 * @param password The password.
 * @param episodeId The episode's stream ID.
 * @param extension The container extension (e.g., 'mp4', 'mkv').
 * @returns The full, playable stream URL.
 */
export function buildXtreamSeriesUrl(
  baseUrl: string,
  username: string,
  password: string,
  episodeId: number,
  extension: string,
): string {
  return `${baseUrl}/series/${username}/${password}/${episodeId}.${extension}`;
}

/**
 * Builds the stream URL for an Xtream live channel.
 * @param baseUrl The discovered base URL of the Xtream server.
 * @param username The username.
 * @param password The password.
 * @param streamId The channel's stream ID.
 * @returns The full, playable stream URL.
 */
export function buildXtreamLiveUrl(
    baseUrl: string,
    username: string,
    password: string,
    streamId: number,
): string {
    return `${baseUrl}/${username}/${password}/${streamId}`;
}

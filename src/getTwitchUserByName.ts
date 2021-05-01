import { ApiClient } from "twitch";

export async function getTwitchUserByName(name: string, apiClient: ApiClient) {
  const login = name
    .normalize("NFD") // split accented characters : è => e`
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const twitchUser = await apiClient.helix.users.getUserByName(login);
  return twitchUser ? twitchUser : undefined;
}

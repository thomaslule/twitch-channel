import { ApiClient } from "twitch";
import { ClientCredentialsAuthProvider } from "twitch-auth";
import { Config } from "./Config";

export async function getTwitchUserByName(config: Config, name: string) {
  const authProvider = new ClientCredentialsAuthProvider(
    config.client_id,
    config.client_secret
  );
  const api = new ApiClient({ authProvider });
  const login = name
    .normalize("NFD") // split accented characters : è => e`
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const twitchUser = await api.helix.users.getUserByName(login);
  return twitchUser ? twitchUser : undefined;
}

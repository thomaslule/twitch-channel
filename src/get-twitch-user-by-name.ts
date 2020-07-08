import TwitchClient from "twitch";
import { Config } from "./config";

export async function getTwitchUserByName(config: Config, name: string) {
  const twitchClient = TwitchClient.withClientCredentials(
    config.client_id,
    config.client_secret
  );
  const login = name
    .normalize("NFD") // split accented characters : è => e`
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const twitchUser = await twitchClient.helix.users.getUserByName(login);
  return twitchUser ? twitchUser : undefined;
}

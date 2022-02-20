export function getWithDefault(config: MandatoryConfig): Config {
  return { ...config };
}

export type Config = MandatoryConfig & Partial<OptionalConfig>;

export interface MandatoryConfig {
  channel: string;
  clientId: string;
  clientSecret: string;
}

export interface OptionalConfig {
  botName: string;
  botToken: string;
  callbackUrl: string;
  port: number;
}

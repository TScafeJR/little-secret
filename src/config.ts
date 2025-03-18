export enum Environments {
  LOCAL = "local",
  PROD = "prod",
}

export interface AppOptions {
  env?: Environments;
  backendUrl: string;
}

export const config: AppOptions = {
  env: Environments.LOCAL,
  backendUrl: "localhost:8080",
};

export default config;

namespace NodeJS {
  interface ProcessEnv extends NodeJS.ProcessEnv {
    APP_URL: string;
    DATABASE_URL: string;
  }
}

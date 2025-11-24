namespace NodeJS {
  // biome-ignore lint/correctness/noUnusedVariables: true
  interface ProcessEnv extends NodeJS.ProcessEnv {
    APP_URL: string;
    DATABASE_URL: string;
    LLM_PROVIDER?: "openai" | "gemini";
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_CHANNEL_SECRET: string;
    // HTTP Sitemap DocumentSource
    DOCUMENT_SITEMAP_URL: string;
    DOCUMENT_CONTENT_SELECTOR: string;
    DOCUMENT_TITLE_SELECTOR: string;
  }
}

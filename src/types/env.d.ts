namespace NodeJS {
  // biome-ignore lint/correctness/noUnusedVariables: true
  interface ProcessEnv extends NodeJS.ProcessEnv {
    PORT?: string;

    // Application Settings
    SYNC_BATCH_SIZE?: string;

    // Database
    DATABASE_URL: string;

    // Google Gemini
    GEMINI_API_KEY: string;
    GEMINI_EMBEDDING_MODEL: string;
    GEMINI_LLM_MODEL: string;

    // LLM Common Settings
    LLM_CHUNK_SIZE?: string;
    LLM_CHUNK_OVERLAP?: string;

    // Vector Store
    VECTOR_TABLE_NAME?: string;
    VECTOR_SCHEMA_NAME?: string;
    INDEX_BUILDER_MAX_RETRIES?: string;
    INDEX_BUILDER_RETRY_DELAY?: string;

    // LINE Messaging API
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_CHANNEL_SECRET: string;
    LINE_MAX_RETRIES?: string;
    LINE_RETRY_DELAY?: string;
    LINE_MAX_DELAY_MS?: string;
    LINE_BACKOFF_MULTIPLIER?: string;

    // HTTP Sitemap DocumentSource
    DOCUMENT_SITEMAP_URL: string;
    DOCUMENT_CONTENT_SELECTOR: string;
    DOCUMENT_TITLE_SELECTOR: string;
    DOCUMENT_FETCH_TIMEOUT?: string;
    DOCUMENT_ON_ERROR?: "throw" | "skip" | "warn";
    DOCUMENT_REQUEST_DELAY?: string;
    DOCUMENT_MAX_RETRIES?: string;
    DOCUMENT_RETRY_DELAY?: string;
  }
}

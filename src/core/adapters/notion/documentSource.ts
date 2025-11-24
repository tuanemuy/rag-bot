import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { Document } from "@/core/domain/document/entity";
import { createDocument } from "@/core/domain/document/entity";
import type { DocumentSource } from "@/core/domain/document/ports/documentSource";
import {
  createDocumentUrl,
  type DocumentMetadata,
} from "@/core/domain/document/valueObject";
import { createDocumentId } from "@/core/domain/shared";

/**
 * ドキュメント取得エラー時の振る舞い
 */
export type OnDocumentError = "throw" | "skip" | "warn";

/**
 * NotionDocumentSource の設定
 */
export type NotionDocumentSourceConfig = Readonly<{
  /** Notion API トークン */
  apiToken: string;
  /** 取得対象のデータベースID */
  databaseId: string;
  /** リクエストタイムアウト（ミリ秒） */
  timeout?: number;
  /** ドキュメント取得エラー時の振る舞い */
  onError?: OnDocumentError;
  /** リトライ回数（デフォルト: 3） */
  maxRetries?: number;
}>;

// Notion API レスポンス型
type NotionPage = {
  id: string;
  url: string;
  properties: Record<string, NotionProperty>;
};

type NotionProperty = {
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  // 他のプロパティタイプは必要に応じて追加
};

type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text: Array<{ plain_text: string }> };
  heading_1?: { rich_text: Array<{ plain_text: string }> };
  heading_2?: { rich_text: Array<{ plain_text: string }> };
  heading_3?: { rich_text: Array<{ plain_text: string }> };
  bulleted_list_item?: { rich_text: Array<{ plain_text: string }> };
  numbered_list_item?: { rich_text: Array<{ plain_text: string }> };
  toggle?: { rich_text: Array<{ plain_text: string }> };
  quote?: { rich_text: Array<{ plain_text: string }> };
  callout?: { rich_text: Array<{ plain_text: string }> };
  code?: { rich_text: Array<{ plain_text: string }>; language?: string };
  column_list?: Record<string, unknown>;
  column?: Record<string, unknown>;
};

type NotionQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

type NotionBlocksResponse = {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
};

/**
 * Notion APIからドキュメントを取得するDocumentSource実装
 */
export class NotionDocumentSource implements DocumentSource {
  private readonly config: Required<NotionDocumentSourceConfig>;
  private readonly baseUrl = "https://api.notion.com/v1";

  constructor(config: NotionDocumentSourceConfig) {
    this.config = {
      apiToken: config.apiToken,
      databaseId: config.databaseId,
      timeout: config.timeout ?? 30000,
      onError: config.onError ?? "throw",
      maxRetries: config.maxRetries ?? 3,
    };
  }

  async *iterate(): AsyncIterable<Document> {
    // データベースからすべてのページを取得
    const pages = await this.fetchAllPages();

    // 各ページの内容を取得
    for (const page of pages) {
      try {
        const document = await this.fetchPageContent(page);
        yield document;
      } catch (error) {
        if (this.config.onError === "throw") {
          throw error;
        }
        if (this.config.onError === "warn") {
          console.warn(
            `[NotionDocumentSource] Skipping page due to error: ${page.id}`,
            error instanceof Error ? error.message : error,
          );
        }
        // onError === "skip" の場合は何もせず次のページへ
      }
    }
  }

  /**
   * データベースからすべてのページを取得（ページネーション対応）
   */
  private async fetchAllPages(): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.queryDatabase(cursor);
      pages.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor !== null);

    return pages;
  }

  /**
   * データベースをクエリ
   */
  private async queryDatabase(
    startCursor: string | null,
  ): Promise<NotionQueryResponse> {
    const url = `${this.baseUrl}/databases/${this.config.databaseId}/query`;
    const body: Record<string, unknown> = {};

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SystemError(
        SystemErrorCode.NetworkError,
        `Failed to query Notion database: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json() as Promise<NotionQueryResponse>;
  }

  /**
   * ページのコンテンツを取得
   */
  private async fetchPageContent(page: NotionPage): Promise<Document> {
    // ページタイトルを取得
    const title = this.extractTitle(page);

    // ページの全ブロックを取得
    const content = await this.fetchAllBlocks(page.id);

    if (!content.trim()) {
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        `Empty content for page ${page.id}`,
      );
    }

    const metadata: DocumentMetadata = {
      sourceUrl: createDocumentUrl(page.url),
      additionalData: {
        notionPageId: page.id,
      },
    };

    return createDocument({
      id: createDocumentId(page.id),
      title,
      content,
      metadata,
      fetchedAt: new Date(),
    });
  }

  /**
   * ページタイトルを抽出
   */
  private extractTitle(page: NotionPage): string {
    for (const property of Object.values(page.properties)) {
      if (property.type === "title" && property.title) {
        const titleText = property.title
          .map((t) => t.plain_text)
          .join("")
          .trim();
        if (titleText) {
          return titleText;
        }
      }
    }

    // タイトルが見つからない場合はページIDを使用
    return `Untitled (${page.id})`;
  }

  /**
   * ページの全ブロックを取得してテキストに変換
   */
  private async fetchAllBlocks(pageId: string): Promise<string> {
    const blocks = await this.fetchBlocksRecursively(pageId);
    return this.blocksToText(blocks);
  }

  /**
   * ブロックを再帰的に取得（子ブロックを含む）
   */
  private async fetchBlocksRecursively(
    blockId: string,
  ): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.fetchBlocks(blockId, cursor);

      for (const block of response.results) {
        blocks.push(block);

        // 子ブロックがある場合は再帰的に取得
        if (block.has_children) {
          const childBlocks = await this.fetchBlocksRecursively(block.id);
          blocks.push(...childBlocks);
        }
      }

      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor !== null);

    return blocks;
  }

  /**
   * ブロックを取得
   */
  private async fetchBlocks(
    blockId: string,
    startCursor: string | null,
  ): Promise<NotionBlocksResponse> {
    let url = `${this.baseUrl}/blocks/${blockId}/children`;

    if (startCursor) {
      url += `?start_cursor=${startCursor}`;
    }

    const response = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SystemError(
        SystemErrorCode.NetworkError,
        `Failed to fetch Notion blocks: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json() as Promise<NotionBlocksResponse>;
  }

  /**
   * ブロック配列をテキストに変換
   */
  private blocksToText(blocks: NotionBlock[]): string {
    const textParts: string[] = [];
    let numberedListCounter = 0;

    for (const block of blocks) {
      // 番号付きリストの連番管理
      if (block.type === "numbered_list_item") {
        numberedListCounter++;
      } else {
        numberedListCounter = 0;
      }

      const text = this.blockToText(block, numberedListCounter);
      if (text) {
        textParts.push(text);
      }
    }

    return textParts.join("\n\n");
  }

  /**
   * 単一ブロックをテキストに変換
   */
  private blockToText(block: NotionBlock, numberedListIndex = 0): string {
    const richTextContent = (
      richText: Array<{ plain_text: string }> | undefined,
    ): string => {
      if (!richText) return "";
      return richText.map((t) => t.plain_text).join("");
    };

    switch (block.type) {
      case "paragraph":
        return richTextContent(block.paragraph?.rich_text);
      case "heading_1":
        return `# ${richTextContent(block.heading_1?.rich_text)}`;
      case "heading_2":
        return `## ${richTextContent(block.heading_2?.rich_text)}`;
      case "heading_3":
        return `### ${richTextContent(block.heading_3?.rich_text)}`;
      case "bulleted_list_item":
        return `• ${richTextContent(block.bulleted_list_item?.rich_text)}`;
      case "numbered_list_item":
        return `${numberedListIndex}. ${richTextContent(block.numbered_list_item?.rich_text)}`;
      case "toggle":
        return richTextContent(block.toggle?.rich_text);
      case "quote":
        return `> ${richTextContent(block.quote?.rich_text)}`;
      case "callout":
        return richTextContent(block.callout?.rich_text);
      case "code": {
        const code = richTextContent(block.code?.rich_text);
        const lang = block.code?.language ?? "";
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }
      default:
        return "";
    }
  }

  /**
   * 共通ヘッダーを取得
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };
  }

  /**
   * タイムアウト・リトライ付きfetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        // 429 (Rate Limit) の場合はリトライ
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter
            ? Number.parseInt(retryAfter, 10) * 1000
            : Math.min(1000 * 2 ** attempt, 30000);

          if (attempt < this.config.maxRetries) {
            await this.sleep(delay);
            continue;
          }

          throw new SystemError(
            SystemErrorCode.NetworkError,
            `Rate limit exceeded for ${url} after ${this.config.maxRetries} retries`,
          );
        }

        // 5xx エラーの場合もリトライ
        if (response.status >= 500 && attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 30000);
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof SystemError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          lastError = error;
          if (attempt < this.config.maxRetries) {
            const delay = Math.min(1000 * 2 ** attempt, 30000);
            await this.sleep(delay);
            continue;
          }

          throw new SystemError(
            SystemErrorCode.NetworkError,
            `Request timeout for ${url} after ${this.config.maxRetries} retries`,
            error,
          );
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 30000);
          await this.sleep(delay);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new SystemError(
      SystemErrorCode.NetworkError,
      `Failed to fetch ${url}: ${lastError?.message ?? "Unknown error"}`,
      lastError,
    );
  }

  /**
   * 指定ミリ秒待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

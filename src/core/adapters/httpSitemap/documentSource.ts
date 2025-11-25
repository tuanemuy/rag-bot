import { selectAll } from "css-select";
import type { Document as DomNode } from "domhandler";
import * as domutils from "domutils";
import { parseDocument } from "htmlparser2";
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
 * HttpSitemapDocumentSource の設定
 */
export type HttpSitemapDocumentSourceConfig = Readonly<{
  /** Sitemap XMLのURL */
  sitemapUrl: string;
  /** コンテンツを抽出するCSSセレクタ */
  contentSelector: string;
  /** タイトルを抽出するCSSセレクタ */
  titleSelector: string;
  /** リクエストタイムアウト（ミリ秒） */
  timeout?: number;
  /** ドキュメント取得エラー時の振る舞い */
  onError?: OnDocumentError;
  /** リクエスト間の待機時間（ミリ秒） */
  requestDelay?: number;
  /** 最大再試行回数 */
  maxRetries?: number;
  /** 再試行時の初期待機時間（ミリ秒） */
  retryDelay?: number;
}>;

/**
 * SitemapからHTMLドキュメントを取得し、CSSセレクタでパースするDocumentSource実装
 */
export class HttpSitemapDocumentSource implements DocumentSource {
  private readonly config: Required<HttpSitemapDocumentSourceConfig>;

  constructor(config: HttpSitemapDocumentSourceConfig) {
    this.config = {
      sitemapUrl: config.sitemapUrl,
      contentSelector: config.contentSelector,
      titleSelector: config.titleSelector,
      timeout: config.timeout ?? 30000,
      onError: config.onError ?? "throw",
      requestDelay: config.requestDelay ?? 0,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };
  }

  async *iterate(): AsyncIterable<Document> {
    // Sitemapを取得してURLリストを抽出
    const urls = await this.fetchSitemapUrls();

    // 各URLから順次ドキュメントを取得
    for (const url of urls) {
      try {
        const document = await this.fetchAndParseDocument(url);
        yield document;

        // レート制限
        if (this.config.requestDelay > 0) {
          await this.delay(this.config.requestDelay);
        }
      } catch (error) {
        if (this.config.onError === "throw") {
          throw error;
        }
        if (this.config.onError === "warn") {
          console.warn(
            `[HttpSitemapDocumentSource] Skipping URL due to error: ${url}`,
            error instanceof Error ? error.message : error,
          );
        }
        // onError === "skip" の場合は何もせず次のURLへ
      }
    }
  }

  /**
   * SitemapからURLリストを取得
   */
  private async fetchSitemapUrls(): Promise<string[]> {
    return this.fetchSitemapUrlsRecursively(this.config.sitemapUrl);
  }

  /**
   * Sitemapを再帰的に処理してURLリストを取得（sitemap index対応）
   */
  private async fetchSitemapUrlsRecursively(
    sitemapUrl: string,
  ): Promise<string[]> {
    const response = await this.fetchWithRetry(sitemapUrl);

    if (!response.ok) {
      throw new SystemError(
        SystemErrorCode.NetworkError,
        `Failed to fetch sitemap: ${response.status} ${response.statusText}`,
      );
    }

    const xml = await response.text();
    const dom = parseDocument(xml, { xmlMode: true });

    // sitemap indexかどうかを確認
    const sitemapElements = selectAll("sitemapindex > sitemap > loc", dom);
    if (sitemapElements.length > 0) {
      // sitemap indexの場合は各sitemapを再帰的に処理
      const urls: string[] = [];
      for (const element of sitemapElements) {
        const childSitemapUrl = domutils.textContent(element).trim();
        if (childSitemapUrl) {
          const childUrls =
            await this.fetchSitemapUrlsRecursively(childSitemapUrl);
          urls.push(...childUrls);
        }
      }

      if (urls.length === 0) {
        throw new SystemError(
          SystemErrorCode.DataInconsistency,
          "No URLs found in sitemap index",
        );
      }

      return urls;
    }

    // 通常のsitemapの場合
    const urlElements = selectAll("url > loc", dom);
    const urls = urlElements
      .map((element) => domutils.textContent(element).trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        "No URLs found in sitemap",
      );
    }

    return urls;
  }

  /**
   * 指定URLからHTMLを取得してドキュメントをパース
   */
  private async fetchAndParseDocument(url: string): Promise<Document> {
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      throw new SystemError(
        SystemErrorCode.NetworkError,
        `Failed to fetch document from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const dom = parseDocument(html);

    const title = this.extractText(dom, this.config.titleSelector);
    const content = this.extractText(dom, this.config.contentSelector);

    if (!title) {
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        `Title not found for selector "${this.config.titleSelector}" at ${url}`,
      );
    }

    if (!content) {
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        `Content not found for selector "${this.config.contentSelector}" at ${url}`,
      );
    }

    const metadata: DocumentMetadata = {
      sourceUrl: createDocumentUrl(url),
      additionalData: {},
    };

    return createDocument({
      id: createDocumentId(url),
      title,
      content,
      metadata,
      fetchedAt: new Date(),
    });
  }

  /**
   * CSSセレクタでテキストを抽出
   */
  private extractText(dom: DomNode, selector: string): string | null {
    const elements = selectAll(selector, dom);
    if (elements.length === 0) {
      return null;
    }

    return elements.map((el) => domutils.textContent(el).trim()).join("\n\n");
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 再試行付きfetch
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.fetchWithTimeout(url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          // exponential backoff
          const delayMs = this.config.retryDelay * 2 ** attempt;
          await this.delay(delayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * タイムアウト付きfetch
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "line-bot-rag/1.0",
        },
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new SystemError(
          SystemErrorCode.NetworkError,
          `Request timeout for ${url}`,
          error,
        );
      }
      throw new SystemError(
        SystemErrorCode.NetworkError,
        `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

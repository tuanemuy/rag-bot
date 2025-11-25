import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
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
 * FileSystemDocumentSource の設定
 */
export type FileSystemDocumentSourceConfig = Readonly<{
  /** 走査対象のディレクトリパス */
  rootDir: string;
  /** 対象ファイルの拡張子（例: [".md", ".txt"]） */
  extensions: string[];
  /** 再帰的に走査するかどうか */
  recursive?: boolean;
  /** 除外するディレクトリ名のパターン */
  excludeDirs?: string[];
  /** ドキュメント取得エラー時の振る舞い */
  onError?: OnDocumentError;
}>;

/**
 * ファイルシステムからドキュメントを取得するDocumentSource実装
 */
export class FileSystemDocumentSource implements DocumentSource {
  private readonly config: Required<FileSystemDocumentSourceConfig>;

  constructor(config: FileSystemDocumentSourceConfig) {
    this.config = {
      rootDir: config.rootDir,
      extensions: config.extensions,
      recursive: config.recursive ?? true,
      excludeDirs: config.excludeDirs ?? [
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
      ],
      onError: config.onError ?? "throw",
    };
  }

  async *iterate(): AsyncIterable<Document> {
    // ディレクトリの存在確認
    await this.validateRootDir();

    // ファイルを逐次的に走査して順次取得（メモリ効率化）
    yield* this.iterateFiles(this.config.rootDir);
  }

  /**
   * ディレクトリを再帰的に走査してファイルを逐次的にyield
   */
  private async *iterateFiles(dirPath: string): AsyncIterable<Document> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 除外ディレクトリをスキップ
        if (this.config.excludeDirs.includes(entry.name)) {
          continue;
        }

        // 再帰的に走査
        if (this.config.recursive) {
          yield* this.iterateFiles(fullPath);
        }
      } else if (entry.isFile()) {
        // 拡張子でフィルタリング
        const ext = path.extname(entry.name).toLowerCase();
        if (this.config.extensions.includes(ext)) {
          try {
            const document = await this.readAndParseFile(fullPath);
            yield document;
          } catch (error) {
            if (this.config.onError === "throw") {
              throw error;
            }
            if (this.config.onError === "warn") {
              console.warn(
                `[FileSystemDocumentSource] Skipping file due to error: ${fullPath}`,
                error instanceof Error ? error.message : error,
              );
            }
            // onError === "skip" の場合は何もせず次のファイルへ
          }
        }
      }
    }
  }

  /**
   * ルートディレクトリの存在確認
   */
  private async validateRootDir(): Promise<void> {
    try {
      const stat = await fs.stat(this.config.rootDir);
      if (!stat.isDirectory()) {
        throw new SystemError(
          SystemErrorCode.DataInconsistency,
          `Path is not a directory: ${this.config.rootDir}`,
        );
      }
    } catch (error) {
      if (error instanceof SystemError) {
        throw error;
      }
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        `Directory not accessible: ${this.config.rootDir}`,
        error,
      );
    }
  }

  /**
   * ファイルを読み込んでドキュメントに変換
   */
  private async readAndParseFile(filePath: string): Promise<Document> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const stat = await fs.stat(filePath);

      if (!content.trim()) {
        throw new SystemError(
          SystemErrorCode.DataInconsistency,
          `Empty file: ${filePath}`,
        );
      }

      const title = this.extractTitle(filePath, content);
      const cleanContent = this.cleanContent(content, filePath);

      // ファイルパスをfile://形式のURLに変換
      const fileUrl = `file://${path.resolve(filePath)}`;

      const metadata: DocumentMetadata = {
        sourceUrl: createDocumentUrl(fileUrl),
        additionalData: {
          filePath,
          fileName: path.basename(filePath),
          extension: path.extname(filePath),
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        },
      };

      // ファイルパスをIDとして使用
      const documentId = this.generateDocumentId(filePath);

      return createDocument({
        id: createDocumentId(documentId),
        title,
        content: cleanContent,
        metadata,
        fetchedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof SystemError) {
        throw error;
      }
      throw new SystemError(
        SystemErrorCode.DataInconsistency,
        `Failed to read file: ${filePath}`,
        error,
      );
    }
  }

  /**
   * タイトルを抽出
   */
  private extractTitle(filePath: string, content: string): string {
    const ext = path.extname(filePath).toLowerCase();

    // Markdownの場合は最初のh1を探す
    if (ext === ".md" || ext === ".markdown") {
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        return h1Match[1].trim();
      }
    }

    // HTMLの場合はtitleタグを探す
    if (ext === ".html" || ext === ".htm") {
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }

    // 見つからない場合はファイル名（拡張子なし）を使用
    return path.basename(filePath, ext);
  }

  /**
   * コンテンツをクリーンアップ
   */
  private cleanContent(content: string, filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    // Markdownの場合はそのまま返す
    if (ext === ".md" || ext === ".markdown") {
      return content.trim();
    }

    // テキストファイルはそのまま返す
    if (ext === ".txt") {
      return content.trim();
    }

    // その他の形式は改行を正規化
    return content.replace(/\r\n/g, "\n").trim();
  }

  /**
   * ファイルパスからドキュメントIDを生成
   * SHA-256ハッシュを使用して一意性を保証
   */
  private generateDocumentId(filePath: string): string {
    // 相対パスを使用してIDを生成
    const relativePath = path.relative(this.config.rootDir, filePath);
    // SHA-256ハッシュを生成して一意性を保証
    const hash = crypto
      .createHash("sha256")
      .update(relativePath)
      .digest("hex")
      .slice(0, 16);
    // 可読性のためにファイル名も含める
    const fileName = path
      .basename(filePath, path.extname(filePath))
      .replace(/[^a-zA-Z0-9\-_]/g, "_")
      .slice(0, 32);
    return `${fileName}-${hash}`;
  }
}

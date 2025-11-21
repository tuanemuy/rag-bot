# Example Implementation

## Entities example

```typescript
// app/core/domain/post/entity.ts

import { validate } from "@/lib/validation";
import { BusinessRuleError } from "@/core/domain/error";
import { UserErrorCode } from "./errorCode";
import type { UserId } from "@/core/domain/user/valueObject";
import {
  type PostId,
  type PostContent,
  type PostStatus,
  generatePostId,
  createPostContent,
} from "./valueObject";

export type PostBase = Readonly<{
  id: PostId;
  userId: UserId;
  content: PostContent;
  createdAt: Date;
  updatedAt: Date;
}>;
export type DraftPost = PostBase & {
  status: "draft";
};
export type PublishedPost = PostBase & {
  status: "published";
};
export type Post = DraftPost | PublishedPost;

export type CreatePostParams = {
  userId: UserId;
  content: string;
};

export function createPost(params: CreatePostParams): DraftPost {
  const now = new Date();
  return {
    id: generatePostId(),
    userId: params.userId,
    content: createPostContent(params.content),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePostContent(post: Post, newContent: string): Post {
  return {
    ...post,
    content: createPostContent(newContent),
    updatedAt: new Date(),
  };
}

// Other methods or entities...
```

## Value Objects example

```typescript
// app/core/domain/post/valueObject.ts

import { v7 as uuidv7 } from "uuid";
import { UserErrorCode } form "./errorCode";

const POST_CONTENT_MAX_LENGTH = 5000;

export type PostId = string & { readonly brand: "PostId" };

export function createPostId(id: string): PostId {
  // Add validation if necessary
  return id as PostId;
}

export function generatePostId(): PostId {
  return uuidv7() as PostId;
}

export type PostContent = string & { readonly brand: "PostContent" };

export function createPostContent(content: string): PostContent {
  if (content.length === 0) {
    throw new BusinessRuleError(UserErrorCode.PostContentEmpty, "Post content cannot be empty");
  }
  if (content.length > POST_CONTENT_MAX_LENGTH) {
    throw new BusinessRuleError(UserErrorCode.PostContentTooLong, "Post content exceeds maximum length");
  }
  return content as PostContent;
}

export type PostStatus = "draft" | "published";

export function createPostStatus(status: string): PostStatus {
  if (status !== "draft" && status !== "published") {
    throw new BusinessRuleError(UserErrorCode.InvalidPostStatus, "Invalid post status");
  }
  return status as PostStatus;
}

// Other methods or value objects...

```

## Ports example

```typescript
// app/core/domain/post/ports/postRepository.ts

import type { Pagination, PaginationResult } from "@/lib/pagination";
import type { RepositoryError } from "@/core/error/adapter";
import type { Post } from "@/core/domain/post/entity";
import type { UserId } from "@/core/domain/user/valueObject";

export interface PostRepository {
  save(post: Post): Promise<void>;
  findByUserId(userId: UserId, pagination: Pagination): Promise<PaginationResult<Post>>;
  // Other repository methods...
}
```

```typescript
// app/core/domain/file/ports/storageManager.ts

export interface StorageManager {
  uploadFile(/* Arguments */): Promise</* ReturnType */>;
  // Other storage management methods...
}
```

## Adapters example

```typescript
// app/core/adapters/drizzleSqlite/postRepository.ts

import type { InferSelectModel } from "drizzle-orm";
import type { Pagination, PaginationResult } from "@/lib/pagination";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import type { UserId } from "@/core/domain/user/valueObject";
import type { Post } from "@/core/domain/post/entity";
import type { PostId, PostContent, PostStatus } from "@/core/domain/post/valueObject";
import type { PostRepository } from "@/core/domain/post/ports/postRepository";
import { posts } from "@/core/adapters/drizzleSqlite/schema";
import type { Executor } from "./database";

type PostDataModel = InferSelectModel<typeof posts>;

export class DrizzleSqlitePostRepository implements PostRepository {
  constructor(
    private readonly executor: Executor) {}

  into(data: PostDataModel): Post {
    return {
      id: data.id as PostId,
      userId: data.userId as UserId,
      content: data.content as PostContent,
      status: data.status as PostStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async save(post: Post): Promise<void> {
    try {
      await this.executor
        .insert(posts)
        .values(post)
        .onConflictDoUpdate({
          target: posts.id,
          set: {
            userId: post.userId,
            content: post.content,
            status: post.status,
          },
        });
    } catch (error) {
      // Handle errors, possibly mapping database errors to specific errors or codes
      throw new SystemError(SystemErrorCode.DatabaseError, "Failed to save post", error);
    }
  }

  async findByUserId(userId: UserId, pagination: Pagination): Promise<PaginationResult<Post>> {
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    try {
      const [items, countResult] = await Promise.all([
        this.executor
          .select()
          .from(posts)
          .where(eq(posts.userId, userId))
          .limit(limit)
          .offset(offset),
        this.executor
          .select({ count: sql`count(*)` })
          .from(posts)
          .where(eq(posts.userId, userId)),
      ]);

      return {
        items: items.map((item) => this.into(item)),
        count: Number(countResult[0].count),
      };
    } catch (error) {
      // Handle errors, possibly mapping database errors to specific errors or codes
      throw new SystemError(SystemErrorCode.DatabaseError, "Failed to find posts", error);
    }
  }
}
```

## Database schema example

```typescript
// app/core/adapters/drizzleSqlite/schema.ts

import { v7 as uuidv7 } from "uuid";

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    // Other fields...
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
);
```

## Application Service example

```typescript
// app/core/application/post/createPost.ts

import { type DraftPost, createPost } from "@/core/domain/post/entity";
import type { PostContent, PostStatus } from "@/core/domain/post/valueObject";
import type { PostRepository } from "@/dore/domain/post/ports/postRepository";
import type { Context } from "../context";
import type { Repositories } from "../unitOfWork";
import {
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ForbiddenError,
  ForbiddenErrorCode
} from "../error";

export type CreatePostInput = {
  content: PostContent;
};

export async function createPost(
  context: Context,
  input: CreatePostInput
): Promise<DraftPost> {
  const userId = context.authProvider.getUserId();

  if (!userId) {
    throw new UnauthenticatedError(UnauthenticatedErrorCode.AuthenticationRequired, "Authentication required");
  }

  const post = createPost({
    userId,
    content: input.content,
  });

  await context.unitOfWork.run(async (repositories) => {
    await repositories.postRepository.save(post);
  });

  return post;
}
```

## DI Container example

```typescript
// DI Container for specific environment
// ex: app/container.ts

import { getDatabase } from "@/core/adapters/drizzleSqlite/client";

const databaseUrl = env.data.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const db = getDatabase(databaseUrl);

export const container = {
  unitOfWorkProvider: DrizzleSqliteUnitOfWorkProvider(db),
  authProvider: new BetterAuthAuthProvider(/* Config */),
  storageManager: new S3StorageManager(/* S3 client */),
  // Other adapters...
};
```

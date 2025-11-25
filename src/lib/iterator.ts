/**
 * AsyncIterableをバッチ単位で処理するジェネレーター
 * @param iterable - 処理対象のAsyncIterable
 * @param size - バッチサイズ
 * @returns バッチ単位で要素を返すAsyncGenerator
 */
export async function* batchIterate<T>(
  iterable: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[]> {
  let batch: T[] = [];
  for await (const item of iterable) {
    batch.push(item);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) {
    yield batch;
  }
}

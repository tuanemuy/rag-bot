import { MAX_TEXT_LENGTH } from "../valueObject";

const MAX_MESSAGES = 5;
const TRUNCATION_MESSAGE = "\n\n...続きは省略されました";

/**
 * 長文メッセージをLINE APIの制限（5000文字）に合わせて分割する
 *
 * @param text - 分割対象のテキスト
 * @returns 分割されたメッセージの配列（最大5件）、空文字の場合は空配列
 *
 * 分割アルゴリズム:
 * 1. 5000文字を超える場合、直前の句点（。）または改行（\n）で分割
 * 2. 句点も改行もない場合は5000文字で強制分割
 * 3. 分割後も5000文字を超える場合は再帰的に分割
 * 4. 5メッセージを超える場合は末尾に「...続きは省略されました」を付与して打ち切り
 */
export function splitLongMessage(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  if (text.length <= MAX_TEXT_LENGTH) {
    return [text];
  }

  const messages: string[] = [];
  let remaining = text;

  while (remaining.length > 0 && messages.length < MAX_MESSAGES) {
    if (remaining.length <= MAX_TEXT_LENGTH) {
      messages.push(remaining);
      break;
    }

    // 分割位置を探す
    const searchRange = remaining.substring(0, MAX_TEXT_LENGTH);
    const lastPeriod = searchRange.lastIndexOf("。");
    const lastNewline = searchRange.lastIndexOf("\n");
    const splitPos = Math.max(lastPeriod, lastNewline);

    if (splitPos > 0) {
      messages.push(remaining.substring(0, splitPos + 1));
      remaining = remaining.substring(splitPos + 1);
    } else {
      // 区切り文字がない場合は強制分割
      messages.push(remaining.substring(0, MAX_TEXT_LENGTH));
      remaining = remaining.substring(MAX_TEXT_LENGTH);
    }
  }

  // 残りがある場合は省略メッセージを付与
  if (remaining.length > 0 && messages.length === MAX_MESSAGES) {
    let lastMessage = messages[MAX_MESSAGES - 1];
    // 省略メッセージ用のスペースを確保
    const allowedLength = MAX_TEXT_LENGTH - TRUNCATION_MESSAGE.length;
    if (lastMessage.length > allowedLength) {
      lastMessage = lastMessage.substring(0, allowedLength);
    }
    messages[MAX_MESSAGES - 1] = `${lastMessage}${TRUNCATION_MESSAGE}`;
  }

  return messages;
}

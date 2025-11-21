# テスト結果に対応する

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}/usecases.md` にユースケースを定義した
- `spec/domains/${domain}/testcases/${usecase}.tsv` にユースケースごとのテストケースを定義した
- `docs/implementation_example.md` にコアアーキテクチャの実装例を記載した
- `TEST_DOMAIN=${domain(lowercase)} pnpm test:domain` でドメインごとのテストを実行できる

## タスク

- テスト結果を実行する
- 実装に誤りがあれば修正する

## 条件

- テストを通すことを目的とした実装は行わない
- テストに誤りがあることが明らかな場合は、テストを修正する
- テストの実行は最低限に留める

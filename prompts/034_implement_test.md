# アプリケーションサービスのテストを実装する

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}.md` にドメインモデルの詳細を記載した
- `spec/testcases/${domain}/${usecase}.tsv` にユースケースごとのテストケースを定義した
- `docs/implementation_example.md` にコアアーキテクチャの実装例を記載した
- `docs/test.md` にテストの実装例を記載した
- `spec/usecases.tsv` にユースケースをリスト化した

## タスク

- アプリケーションサービスのテストを実装する

## ワークフロー

1. `spec/usecases.tsv` でテストが未実装のユースケースを確認する
2. `spec/testcases/${domain}/${usecase}.tsv` を参照して必要なテストを洗い出す
3. テストを実装する
4. 型チェックとリンターを実行し、問題がなくなるまで修正を続ける
5. `spec/usecases.tsv` を更新して進捗を記録する

## 条件

- 実装に合わせず、仕様に合わせたテストを作成する
- やむを得ずリンタールールに違反する場合は、直前の行に `// biome-ignore lint/${rule}: ${reason}` コメントを追加する
- テストは実行しない

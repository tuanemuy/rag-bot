# コアアーキテクチャの実装を行う

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}.md` にドメインモデルの詳細を記載した
- `spec/database.md` にデータベース設計を記載した
- `docs/implementation_example.md` にコアアーキテクチャの実装例を記載した
- `src/core/domain/${domain}/` 以下にドメインモデルを実装した
- `spec/usecases.tsv` にユースケースをリスト化した

## タスク

1. `spec/usecases.tsv` を参照し、未実装のユースケースを確認する
2. 設計に従ってユースケースの実装を続ける
3. 型チェックとリンターを実行し、問題がなくなるまで修正を続ける
4. 実装が完了したユースケースについて、 `spec/usecases.tsv` の実装ステータスを更新する

## 条件

- 実装過程で仕様に矛盾がある場合は、ドキュメントを変更しても良い

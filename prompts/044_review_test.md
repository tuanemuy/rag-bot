# テストのコードをレビューする

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}.md` にドメインモデルの詳細を記載した
- `spec/testcases/${domain}/${usecase}.tsv` にユースケースごとのテストケースを定義した
- `docs/implementation_example.md` にコアアーキテクチャの実装例を記載した
- `docs/test.md` にテストの実装例を記載した

## タスク

- テストの実装が設計に従っているか確認する
- テストの品質をレビューし、 `logs/${yyyyMMddHHmm}_review_${domain}_test.md` に記録する

## 備考

- 現在の日時を取得してファイル名に反映する
- 作業対象のドメインを決めた上で作業を進める
- テストが仕様を表していることを確認する
- 実装に合わせたテストになっていないことを確認する
- ドキュメントの責任範囲を「テストコードのレビュー」に限定する

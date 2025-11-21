# フロントエンドの実装を行う

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/pages.md` にページ構成とその詳細を記載した
- `spec/pages.list.tsv` に実装すべきページをリスト化した

## タスク

- 設計に従ってフロントエンドの実装を続ける
- アプリケーションサービスが足りない場合は、Server Actionsをモック実装にしておく

## ワークフロー

1. `spec/pages.list.tsv` で未実装のページを確認する
2. `spec/page.md` でページの詳細を確認する
3. ページを実装する
4. 型チェックとリンターを実行し、問題がなくなるまで修正を続ける
5. `spec/pages.list.tsv` を更新して進捗を記録する

## 条件

- 適切な粒度でコンポーネントを分割する
- Context APIでCore ArchitectureのContextを提供し、各コンポーネントからアプリケーションサービスを呼び出せるようにする

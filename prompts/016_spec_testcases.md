# テストケースを定義する

## 背景

- `spec/scenario.md` に利用シナリオを定義した
- `spec/requirements.md` に要件を定義した
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}.md` にドメインモデルの詳細を記載した
- `docs/implementation_example.md` にコアアーキテクチャの実装例を記載した

## タスク

- すべてのユースケースについて、TSV形式でテストケースを定義する

## 条件

- 対象ファイルは `spec/testcases/${domain}/${usecase}.tsv`
- カラム構成は以下の通り
    - テスト内容
        - 条件と結果を簡潔に記載する
        - 例）有効な〇〇で〇〇できる／無効な〇〇で例外が発生する
    - テストタイプ
        - 正常系
        - 異常系
        - 境界値
        - etc...
    - 実装ステータス
- 必要なテストを網羅する

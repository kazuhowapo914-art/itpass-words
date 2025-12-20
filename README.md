# ITパスポート単語学習アプリ（単語帳＋6択クイズ）

ITパスポート試験対策のための単語学習アプリ。  
単語帳学習・6択クイズ・進捗管理（定着度）・トロフィー・犬マスコットで学習を継続しやすくする。

---

## 1. コンセプト
- ITパスポート用語を「単語帳」と「クイズ」で学べる
- 進捗（定着度）を保存して、苦手を潰せる
- ゆるかわUI＋犬キャラで、学習のハードルを下げる

---

## 2. 使用技術
- Next.js（App Router）
- TypeScript / React
- localStorage（進捗・条件・統計）
- データ：JSON（`public/words.json`）
- スタイル：CSS Modules（`*.module.css`）

---

## 3. データ仕様（words.json）

配置：`public/words.json`  
形式：配列（JSON Array）

### 3.1 Word構造
```json
{
  "id": 1,
  "term": "RAG",
  "meaning": "検索で取り出した情報をLLMに渡して回答精度を上げる手法",
  "detail": "詳細解説（任意）",
  "categoryId": "TECHNOLOGY.SOFTWARE",
  "tags": ["AI", "検索"]
}
3.2 フィールド
id：number（ユニーク）

term：string（用語）

meaning：string（意味／クイズ選択肢に使用）

detail?：string（任意：Study/Quizで折りたたみ表示）

categoryId：string（MAJOR.MINOR 形式）

tags?：string[]（任意：検索対象）

3.3 制約（重要）
meaning は全単語で 重複しないように設計・運用する

目的：6択クイズの選択肢重複（成立しない/正解が複数に見える）を防止する

推奨：起動時/読み込み時にバリデーションで検出する

4. カテゴリ仕様（2段階）
管理：src/constants/categories.ts

MAJOR：STRATEGY / MANAGEMENT / TECHNOLOGY

MINOR：各major配下の小分類

表示：categoryIdLabel(categoryId) で
例：テクノロジ系 / ソフトウェア

データ側は categoryId で統一し、表記ゆれを抑える。

5. 進捗（定着度）仕様
5.1 定着度（5段階・数値）
内部値（localStorage保存値）：0..4

値	表示
0	未学習
1	覚えてない
2	覚えかけ
3	覚えた
4	完璧

progress未保存（キーが無い単語）は 0（未学習） 扱い

表示/ボタン/フィルタは共通定義 LEVEL を参照する

5.2 保存先（localStorage）
progress_v1：Record<number, Level>

select_preset_v1：前回条件（SelectPreset）

quiz_correct_total_v1：クイズ累計正解数

resetAll()：上記すべてを一括削除

6. 画面構成とルーティング
画面	パス	内容
ホーム	/	学習/前回条件で開始/進捗確認
条件選択	/select	絞り込み・順序・形式選択
単語帳	/study	1件ずつ学習（ループ）
テスト	/quiz	6択クイズ（1周で終了）
進捗	/progress	完璧割合＋トロフィー

共通UI
全画面に固定ヘッダー（sticky）

左：🏠ホーム

中：ページタイトル

右：サマリ（study: 周回/位置、quiz: スコア、select/progress: 空）

7. デザイン方針（UI/UX）
7.1 テーマ
ゆるかわ（犬＋パステル＋丸い）

余白広め、触りたくなるUI

7.2 色の役割
成功（正解/完璧）：黄緑系

注意（もうちょい）：薄オレンジ系

警告（わからない）：赤系

ベース：薄いピンク＋濃いピンク（全体うっすらピンク）

7.3 犬マスコット
昨日作成した犬イラストを採用

表情は最低2〜3種類（通常/喜び/しょんぼり等）

表情切り替えは **クイズ終了時（正答率）**で判定

吹き出し文言は「柔らか標準語＋関西ニュアンス（たまに関西弁）」

登場場所：ホーム（大）＋ヘッダー（小）＋クイズ結果（吹き出し）

8. 条件選択 /select
8.1 機能
出題範囲（カテゴリ）絞り込み：minor複数選択可

majorカード（チェック＋配下minor）

majorチェックで配下minor全選択（indeterminate対応）

画面上部に「全解除」

定着度絞り込み：常時表示、複数選択（OR）

出題順序（必須・単一）

順番どおり：id昇順

ランダム：1周ごとにシャッフル

出題形式（必須・単一）

単語帳 / テスト

学習開始ボタン：画面下固定

選択カテゴリ数 / 単語数をサマリ表示

8.2 条件保存
URLクエリに反映（再現性）

localStorageにも保存（前回条件として使用）

保存タイミングは「学習開始」押下時のみ

9. 単語帳 /study
表示
categoryIdLabel / term / meaning（初期は非表示）

detail（任意：折りたたみ）

現在の定着度（バッジ）

操作
「意味を見る/隠す」

評価：わからない / 覚えかけ / 覚えた

スキップ（定着度変更なし）

前の単語に戻る（評価は保持、押したときだけ上書き）

選択範囲を最後まで表示したら先頭に戻る（ループ）

周回数はヘッダー右に表示（1周目…）

10. テスト /quiz（4択）
出題
問題：term

選択肢：meaning（4択）

誤答候補優先：同categoryId → 同major → 全体

選択範囲を1周したら終了（重複なし）

中断は可能（ホームへ）。再開時は最初から（スコア/進行は復元しない）

正誤判定と解説
解答後に正解/不正解表示

detailがあれば折りたたみで表示

「次へ」ボタンで次問題へ（即次へはしない）

進捗更新
正解：定着度1段階UP（最大4）

不正解：定着度1段階DOWN（最低1）

スコア：正解数/解答数

スコアリセット可能

正答率コメント：セッション中は固定（最初に1つ決める）

11. 進捗 /progress
全体 / major / minor ごとの「完璧割合」を表示

表示は「%」＋「完璧数/総数」

majorカードをアコーディオン表示し、minorを展開

トロフィー：

クイズ累計正解数が10問増えるごとに1つ解放

最大20個、以降は「20+」表示

全進捗リセットボタン（confirm必須）

progress / 前回条件 / クイズ累計正解数 を一括削除

12. 開発方法
bash
コードをコピーする
npm run dev
http://localhost:3000 を開く。

13. 参考：実装の責務分離（推奨）
lib/words.ts：words.json読み込み＋バリデーション（meaning重複チェック含む）

lib/storage.ts：localStorage I/O（load/save/resetAll）

lib/engine.ts：プール生成、順序生成、クイズ選択肢生成

components/Header.tsx：固定ヘッダー

components/DogMascot.tsx：犬の表情＋吹き出し
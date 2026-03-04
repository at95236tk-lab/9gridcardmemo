# 9gridcardmemo (React + TypeScript)

## 概要

`9gridcardmemo` は、A4 用紙の中央に 3x3（9分割）カードを配置し、各マスに文字を入力して印刷・画像出力できるメモ作成アプリです。  
`ver.html` ベースの UI / 機能を、React + TypeScript + Vite で再実装しています。

主な用途:

- 9マス自己整理メモ
- 単語カード / 暗記カードの下書き
- 手帳リフィル用の簡易レイアウト作成

## 技術スタック

- React 18
- TypeScript
- Vite
- jsPDF（印刷用 PDF 生成）

## セットアップ

```bash
npm install
npm run dev
```

### Supabase 連携（任意）

Supabase を設定すると、メモがクラウド保存され、作成・切り替え・削除が端末をまたいで同期されます。

1. `.env.example` を `.env` にコピーして値を設定

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

2. Supabase SQL Editor でテーブルを作成

```sql
create table if not exists public.memos (
  id text primary key,
  owner_key text not null,
  name text not null,
  snapshot jsonb not null,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists memos_owner_key_updated_at_idx
  on public.memos (owner_key, updated_at desc);
```

`.env` 未設定時は従来どおり `localStorage` のみで動作します。

## 使い方（基本）

1. 左側パネルで「内側の用紙サイズ」を選ぶ（A/B 系、はがき、手帳、またはカスタム）
2. 各カードをクリックして直接入力、または右側の「まとめて入力」パネルから9マスを一括入力する
3. ページタイトルを編集し、表示 ON/OFF と位置（6方向）を調整する
4. 書体（ゴシック / 明朝）とフォントサイズを調整する
5. 上部バーの「ブラウザ保存」から新規作成・複製・JSON インポート・切り替えを行う
6. 必要に応じて表示倍率を変更し、プレビュー位置をパン移動する
7. 「Web 用 PNG」または「印刷用 PDF」で書き出す

## 機能詳細

### レイアウト

- 外枠は A4 固定（プレビューおよび出力基準）
- 内側は 3x3 グリッドで中央配置
- テキストは各マス左寄せ・複数行入力可（`contentEditable`）

### 用紙サイズ

プリセット:

- A 系: A4 / A5 / A6 / A7
- B 系（JIS）: B5 / B6 / B7
- 写真・はがき: はがき / L判
- 手帳: バイブル / M5 / ほぼ日

カスタム入力:

- px 指定: 最小 50px
- mm 指定: 最小 5mm
- A4 以上のサイズは設定不可

### タイトル

- 文字列編集（最大 80 文字）
- 表示 ON/OFF
- 位置: 左上 / 中央上 / 右上 / 左下 / 中央下 / 右下
- カード本文と同じ書体・フォントサイズに連動

### 表示操作

- ズーム: 50%〜300%（スライダー / 数値入力）
- パン: 余白部分のドラッグ、または Space 押下でグラブ移動
- タッチ操作: 1本指パン、2本指ピンチズーム

### 履歴（Undo / Redo）

- 編集履歴は最大 200 ステップ
- `Ctrl+Z` / `Cmd+Z` で Undo
- `Ctrl+Y` または `Ctrl+Shift+Z`（Mac は `Cmd+Shift+Z`）で Redo

### メモ保存（Supabase + localStorage）

- 9マスメモを複数作成し、一覧から切り替え可能
- 対応操作: 新規作成 / 複製 / JSON インポート / 削除 / 切り替え / 名前変更
- 編集内容はアクティブなメモに自動保存
- Supabase 設定済みなら、メモ単位で作成・更新・削除を同期
- 未設定時は `localStorage` のみで保存（従来動作）
- 管理ポップアップでメモ一覧を行単位で表示
- 各行でメモ名を直接編集、切り替え、削除が可能
- 2件以上選択で複数選択モードになり、まとめて削除が有効化
- 並び順は「最近使った順（デフォルト）」と「五十音順」を切り替え可能
- 削除はポップアップでメモ一覧から複数選択可能
- 削除実行前に再確認ポップアップを表示
- JSON インポートはポップアップ入力式（テンプレート付き）
- JSON インポート時は「新規作成」または「上書き」を選択可能
- 反映対象は `title` と 9マス (`cards` / `cells`) のみ
- ID やその他設定値はアプリ側で自動管理

### 出力

- Web 用 PNG: 72dpi ベース（4x 高精細レンダリング）
- 印刷用 PDF: 300dpi 相当で生成（A4）
- ブラウザ印刷にも対応（印刷時は操作 UI 非表示）

### モバイル対応

- 画面幅 900px 以下で「設定」ドロワーと「入力」ドロワーを個別表示
- 「入力」ドロワーからページタイトルと9マスをまとめて入力可能
- オーバーレイタップ / `Esc` でドロワーを閉じる

## スクリプト

- `npm run dev`: 開発サーバー起動
- `npm run build`: TypeScript チェック + 本番ビルド
- `npm run preview`: ビルド結果のローカル確認

## 補足

- 日本語フォントは Google Fonts（`Noto Sans JP` / `Noto Serif JP`）を利用
- 出力ファイル名:
  - `card-layout-web-72dpi.png`
  - `card-layout-print-300dpi.pdf`

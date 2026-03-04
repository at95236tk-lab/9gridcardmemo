# 9gridcardmemo (React + TypeScript)

`ver.html` を元に、同等機能を React + TypeScript + Vite で移植した版です。

## セットアップ

```bash
npm install
npm run dev
```

## 主な機能

- 3x3カードレイアウト（A4中央配置）
- カード内テキスト編集（編集モード切替）
- 内側サイズ変更（A/B系、はがき・手帳、カスタム）
- フォント切替（ゴシック / 明朝）
- フォントサイズ調整（ページタイトル連動）
- ページタイトルの位置変更・表示/非表示
- ズーム（スライダー / 数値入力 / Ctrl・Cmdショートカット）
- パン移動（Space + 左ドラッグ）
- PDF出力（Web用72dpi / 印刷用300dpi）
- スマホ向けドロワーパネル

## スクリプト

- `npm run dev`: 開発サーバー起動
- `npm run build`: TypeScriptチェック + 本番ビルド
- `npm run preview`: ビルド結果のプレビュー

# 9gridcardmemo コンポーネント分割計画（React Best Practices）

## 1. 目的

`src/App.tsx` に集約されている UI・状態管理・永続化・出力処理を、責務ごとに分離し、以下を達成する。

- 可読性と変更容易性の向上
- バグ混入リスクの低減（影響範囲の局所化）
- テストしやすい構造への移行
- 将来機能追加（例: 入力UI追加、保存方式追加）への耐性向上

---

## 2. 現状の主要課題

- `App.tsx` が巨大で、**表示・ロジック・データ永続化・エクスポート**が密結合
- 型・定数・ユーティリティが同居し、再利用しにくい
- UIセクション（トップバー、サイドバー、9カード、一括入力）が分割されていない
- `localStorage` 操作が UI コンポーネントに近く、責務が曖昧

---

## 3. リファクタの原則

1. **挙動を変えない**（まずは構造改善のみ）
2. **小さく分割して都度動作確認**
3. **型定義を先に分離**して依存関係を安定化
4. `App` は最終的に「画面構成 + フック接続」のみを担当
5. 副作用（保存、エクスポート、イベント購読）は `hooks` / `services` 側へ寄せる

---

## 4. 目標ディレクトリ構成（案）

```txt
src/
  App.tsx
  main.tsx
  styles.css

  components/
    layout/
      AppShell.tsx
      TopBar.tsx
      LeftSidebar.tsx
      RightBulkPanel.tsx
    editor/
      GridEditor.tsx
      GridCard.tsx
      TitleOverlay.tsx
      ZoomControls.tsx
    memo/
      MemoSelector.tsx
      MemoManageDialog.tsx
      ImportDialog.tsx

  hooks/
    useEditorState.ts
    useHistory.ts
    useMemoStore.ts
    usePanelResize.ts
    useViewportPanZoom.ts

  services/
    memoStorage.ts
    exportPdf.ts
    exportPng.ts

  utils/
    snapshot.ts
    size.ts
    text.ts

  constants/
    sizes.ts
    groups.ts
    titlePositions.ts
    sampleTexts.ts

  types/
    editor.ts
    memo.ts
```

---

## 5. フェーズ別実行計画

## Phase 0: 安全網の準備

- 目的: リファクタ中に挙動破壊を検知しやすくする
- 作業:
  - 主要操作の手動確認チェックリスト作成（編集、Undo/Redo、保存、JSON import、PDF/PNG出力）
  - `npm run build` の通過を分割の各節目で実施
- 完了条件:
  - チェックリストが文書化されている
  - 現行コードで build 成功

## Phase 1: 型・定数・純関数の分離（低リスク）

- 目的: UI 依存のない領域を先に切り離す
- 作業:
  - `types/editor.ts`, `types/memo.ts` へ型を移動
  - `constants/*` へサイズ・グループ・タイトル位置・サンプル文言を移動
  - `utils/snapshot.ts` へ正規化・比較ロジックを移動
- 完了条件:
  - `App.tsx` の先頭宣言が大幅に削減
  - import のみで同等動作

## Phase 2: 永続化ロジックのサービス化

- 目的: `localStorage` 関連を UI から隔離
- 作業:
  - `services/memoStorage.ts` に read/write/normalize 関数を集約
  - `hooks/useMemoStore.ts` で保存状態管理を提供
  - `App.tsx` から `localStorage` 直接参照を除去
- 完了条件:
  - 保存/切替/削除/複製/import が現状通り動作

## Phase 3: 履歴・編集状態のフック化

- 目的: 状態遷移と履歴責務の分離
- 作業:
  - `hooks/useHistory.ts` に Undo/Redo ロジック移管
  - `hooks/useEditorState.ts` に cards/title/font/size の更新APIを集約
- 完了条件:
  - `App.tsx` 内の `useState` / `useCallback` の密度が低下
  - Undo/Redo キーボード操作が維持

## Phase 4: UI コンポーネント分割

- 目的: レイアウトと機能UIを部位ごとに分離
- 作業:
  - `layout` 系（TopBar, Sidebar, BulkPanel）を切り出し
  - `editor` 系（GridEditor, GridCard, TitleOverlay）を切り出し
  - props は「表示に必要最小限 + イベントハンドラ」のみに限定
- 完了条件:
  - `App.tsx` は主に構成定義（JSXの組み立て）になる
  - 既存 CSS クラスを維持して見た目を不変化

## Phase 5: 出力機能の分離

- 目的: PDF/PNG 出力をサービス化し再利用可能にする
- 作業:
  - `services/exportPdf.ts`, `services/exportPng.ts` に描画・生成処理を移動
  - UI はサービス呼び出しのみ担当
- 完了条件:
  - 出力ファイル内容・ファイル名が現状互換

## Phase 6: 最終整理

- 目的: 依存整理と命名統一
- 作業:
  - import 循環の確認
  - 未使用コード除去
  - README に簡易アーキテクチャ追記
- 完了条件:
  - build 成功
  - 主機能手動チェックがすべてOK

---

## 6. コンポーネント分割ルール（運用）

- 1コンポーネント1責務
- 200行超のコンポーネントは再分割を検討
- props は「データ」と「イベント」に分けて命名
- 副作用を含む処理は原則 hooks/services へ
- 子コンポーネントはドメイン知識を持たせすぎない

---

## 7. リスクと回避策

- リスク: 分割時にイベント伝播・フォーカス制御が崩れる
  - 回避: Phaseごとに操作チェック（特に入力・ドラッグ・ショートカット）
- リスク: 依存関係が逆転し import 循環が発生
  - 回避: `types`/`constants`/`utils` を下位層として固定
- リスク: 出力機能（PDF/PNG）の見た目差分
  - 回避: 既存出力との比較確認（文字位置/改行/余白）

---

## 8. Definition of Done

- `App.tsx` が「画面統合層」として読めるサイズに縮小
- 状態管理ロジックが hooks/services に分離されている
- 既存機能（編集/履歴/保存/import/export）が維持される
- `npm run build` が通る
- README に構成追記済み

---

## 9. 実行用エージェント指示（そのまま利用可）

以下を Copilot/Coding Agent に渡して段階実行する。

```md
目的: 9gridcardmemo の `src/App.tsx` を、挙動を変えずに React ベストプラクティスでコンポーネント分割する。

制約:
- まずは構造改善のみ。UI仕様・文言・CSSクラス名を変更しない。
- 1フェーズごとに `npm run build` を実行し、成功を確認する。
- 変更は最小差分で行い、既存機能（Undo/Redo, localStorage保存, JSON import, PNG/PDF出力）を壊さない。

実行順序:
1) types/constants/utils を分離
2) localStorage を services + hooks に分離
3) 履歴と編集状態を hooks に分離
4) TopBar/Sidebar/BulkPanel/GridEditor を components 化
5) export 処理を services 化
6) README更新と不要コード整理

各ステップ完了時の報告フォーマット:
- 変更ファイル一覧
- 変更内容の要約（3行以内）
- build結果
- 残課題（あれば）
```

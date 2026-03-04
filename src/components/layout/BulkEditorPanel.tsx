type BulkEditorPanelProps = {
  titleText: string;
  titleMaxLength: number;
  onTitleChange: (value: string) => void;
  cards: string[];
  onCardChange: (index: number, value: string) => void;
  onFocusInput: () => void;
};

export function BulkEditorPanel({
  titleText,
  titleMaxLength,
  onTitleChange,
  cards,
  onCardChange,
  onFocusInput,
}: BulkEditorPanelProps) {
  return (
    <div className="bulk-editor-panel">
      <div className="bulk-title">まとめて入力</div>
      <div className="bulk-input-group">
        <label className="bulk-input-label">ページタイトル</label>
        <input className="bulk-title-input" type="text" value={titleText} onChange={(event) => onTitleChange(event.target.value)} maxLength={titleMaxLength} />
      </div>

      <div className="bulk-input-grid">
        {cards.map((text, index) => (
          <div key={index} className="bulk-input-card">
            <label className="bulk-input-label">カード {index + 1}</label>
            <textarea
              className="bulk-textarea"
              value={text}
              onChange={(event) => onCardChange(index, event.target.value)}
              onFocus={onFocusInput}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

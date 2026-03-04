import type { PaperSize, SizeGroup, TitlePos } from '../../types/editor';
import { Button } from '../atoms/Button';

type LeftSidebarProps = {
  infoInner: string;
  infoFont: string;
  currentPt: number;
  titleText: string;
  titleMaxLength: number;
  onTitleTextChange: (value: string) => void;
  titleVisible: boolean;
  onToggleTitleVisible: () => void;
  titlePos: TitlePos;
  titlePositions: { value: TitlePos; label: string }[];
  onSelectTitlePos: (value: TitlePos) => void;
  groups: { key: SizeGroup; label: string }[];
  sizeByGroup: Map<SizeGroup, PaperSize[]>;
  currentSizeKey: string;
  onSelectSize: (size: PaperSize) => void;
  customW: string;
  customH: string;
  customMmW: string;
  customMmH: string;
  onChangeCustomW: (value: string) => void;
  onChangeCustomH: (value: string) => void;
  onChangeCustomMmW: (value: string) => void;
  onChangeCustomMmH: (value: string) => void;
  onApplyCustomPx: () => void;
  onApplyCustomMm: () => void;
  currentFont: 'sans' | 'serif';
  onSelectFont: (font: 'sans' | 'serif') => void;
  fontPtMin: number;
  fontPtMax: number;
  fontPtStep: number;
  onChangePt: (value: number) => void;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  scalePct: number;
  onChangeScale: (value: number) => void;
  onExportWebPng: () => void;
  onExportPrintPdf: () => void;
  onCopyPlainText: () => void;
  onCopyJson: () => void;
  onPrintBrowser: () => void;
  customPxMin: number;
  customMmMin: number;
  customMmStep: number;
};

export function LeftSidebar({
  infoInner,
  infoFont,
  currentPt,
  titleText,
  titleMaxLength,
  onTitleTextChange,
  titleVisible,
  onToggleTitleVisible,
  titlePos,
  titlePositions,
  onSelectTitlePos,
  groups,
  sizeByGroup,
  currentSizeKey,
  onSelectSize,
  customW,
  customH,
  customMmW,
  customMmH,
  onChangeCustomW,
  onChangeCustomH,
  onChangeCustomMmW,
  onChangeCustomMmH,
  onApplyCustomPx,
  onApplyCustomMm,
  currentFont,
  onSelectFont,
  fontPtMin,
  fontPtMax,
  fontPtStep,
  onChangePt,
  zoomMin,
  zoomMax,
  zoomStep,
  scalePct,
  onChangeScale,
  onExportWebPng,
  onExportPrintPdf,
  onCopyPlainText,
  onCopyJson,
  onPrintBrowser,
  customPxMin,
  customMmMin,
  customMmStep,
}: LeftSidebarProps) {
  return (
    <aside className="sidebar" id="sidePanel">
      <div className="sidebar-inner">
        <div>
          <div className="app-title">A4 カードレイアウト</div>
          <div className="app-info">
            ページタイトル：<em>{titleText.trim() || '無題メモ'}</em>
            <br />
            外：A4　内：<em>{infoInner}</em>
            <br />
            書体：<em>{infoFont}</em>　<em>{currentPt}pt</em>
          </div>
        </div>

        <div className="section">
          <div className="sec-label">ページタイトル</div>
          <input className="title-input" type="text" value={titleText} onChange={(event) => onTitleTextChange(event.target.value)} maxLength={titleMaxLength} />
          <div className="toggle-row">
            <Button className={`toggle-btn${titleVisible ? ' active' : ''}`} onClick={onToggleTitleVisible} type="button">
              タイトル表示: {titleVisible ? 'ON' : 'OFF'}
            </Button>
          </div>
          <div className="pos-grid">
            {titlePositions.map((item) => (
              <Button key={item.value} className={`pos-btn${titlePos === item.value ? ' active' : ''}`} onClick={() => onSelectTitlePos(item.value)} type="button">
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="sec-label">内側の用紙サイズ</div>
          {groups.map((group) => (
            <div className="group-block" key={group.key}>
              <div className="group-name">{group.label}</div>
              <div className="btn-row">
                {sizeByGroup.get(group.key)?.map((size) => (
                  <Button
                    key={size.key}
                    type="button"
                    className={`s-btn${currentSizeKey === size.key ? ' active' : ''}`}
                    title={`${size.mm}mm`}
                    onClick={() => onSelectSize(size)}
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div className="custom-block">
            <div className="input-line">
              <span>px W</span>
              <input className="nano" type="number" min={customPxMin} value={customW} onChange={(event) => onChangeCustomW(event.target.value)} />
              <span>×</span>
              <input className="nano" type="number" min={customPxMin} value={customH} onChange={(event) => onChangeCustomH(event.target.value)} />
              <Button className="apply-btn" onClick={onApplyCustomPx} type="button">
                適用
              </Button>
            </div>
            <div className="input-line">
              <span>mm W</span>
              <input className="nano" type="number" min={customMmMin} step={customMmStep} value={customMmW} onChange={(event) => onChangeCustomMmW(event.target.value)} />
              <span>×</span>
              <input className="nano" type="number" min={customMmMin} step={customMmStep} value={customMmH} onChange={(event) => onChangeCustomMmH(event.target.value)} />
              <Button className="apply-btn" onClick={onApplyCustomMm} type="button">
                適用
              </Button>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="sec-label">タイポグラフィ</div>
          <div className="group-name">書体</div>
          <div className="toggle-row">
            <Button className={`toggle-btn${currentFont === 'sans' ? ' active' : ''}`} onClick={() => onSelectFont('sans')} type="button">
              ゴシック
            </Button>
            <Button className={`toggle-btn${currentFont === 'serif' ? ' active' : ''}`} onClick={() => onSelectFont('serif')} type="button">
              明朝
            </Button>
          </div>
          <div className="group-name">フォントサイズ</div>
          <div className="slider-row">
            <input
              className="ui-range"
              type="range"
              min={fontPtMin}
              max={fontPtMax}
              step={fontPtStep}
              value={currentPt}
              onChange={(event) => onChangePt(Number.parseFloat(event.target.value))}
            />
            <span className="slider-val">{currentPt} pt</span>
          </div>
        </div>

        <div className="section">
          <div className="sec-label">表示倍率</div>
          <div className="slider-row">
            <input
              className="ui-range"
              type="range"
              min={zoomMin}
              max={zoomMax}
              step={zoomStep}
              value={scalePct}
              onChange={(event) => onChangeScale(Number.parseInt(event.target.value, 10))}
            />
            <span className="slider-val">{scalePct}%</span>
          </div>
        </div>

        <div className="section">
          <div className="pdf-group">
            <div className="pdf-label">データ書き出し</div>
            <Button className="action-btn" onClick={onExportWebPng} type="button">
              ⬇ Web 用 PNG（72dpi）
            </Button>
            <Button className="action-btn" onClick={onExportPrintPdf} type="button">
              ⬇ 印刷用（300dpi）
            </Button>
            <div className="export-copy-row">
              <Button className="action-btn" onClick={onCopyPlainText} type="button">
                テキスト
              </Button>
              <Button className="action-btn" onClick={onCopyJson} type="button">
                JSON
              </Button>
            </div>
            <Button className="action-btn dim" onClick={onPrintBrowser} type="button">
              🖨 ブラウザ印刷
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

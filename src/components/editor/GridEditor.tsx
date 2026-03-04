import type { TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent, MutableRefObject, RefObject } from 'react';
import { FONT_FAMILY } from '../../constants/editor';

type GridEditorProps = {
  canvasAreaRef: RefObject<HTMLElement>;
  cardTextRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  titleTextRef: RefObject<HTMLDivElement>;
  spacePanReady: boolean;
  isPanning: boolean;
  onMouseDownCanvas: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseMoveCanvas: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseUpCanvas: () => void;
  onWheelCanvas: (event: ReactWheelEvent<HTMLElement>) => void;
  onTouchStartCanvas: (event: ReactTouchEvent<HTMLElement>) => void;
  onTouchMoveCanvas: (event: ReactTouchEvent<HTMLElement>) => void;
  onTouchEndCanvas: (event: ReactTouchEvent<HTMLElement>) => void;
  panOffset: { x: number; y: number };
  a4Width: number;
  a4Height: number;
  scale: number;
  currentSize: { w72: number; h72: number };
  innerTop: number;
  innerLeft: number;
  cards: string[];
  activeEditIndex: number | null;
  currentFont: 'sans' | 'serif';
  onStartCardEdit: (index: number) => void;
  onBlurCardEdit: (index: number) => void;
  onInputCard: (index: number, value: string) => void;
  titlePos: string;
  titleEditing: boolean;
  titleVisible: boolean;
  cardMargin: number;
  onStartTitleEdit: () => void;
  onBlurTitleEdit: () => void;
  onInputTitle: (value: string) => void;
  titleText: string;
  scalePct: number;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  onChangeScale: (value: number) => void;
  normalizeScale: (value: number) => number;
};

export function GridEditor({
  canvasAreaRef,
  cardTextRefs,
  titleTextRef,
  spacePanReady,
  isPanning,
  onMouseDownCanvas,
  onMouseMoveCanvas,
  onMouseUpCanvas,
  onWheelCanvas,
  onTouchStartCanvas,
  onTouchMoveCanvas,
  onTouchEndCanvas,
  panOffset,
  a4Width,
  a4Height,
  scale,
  currentSize,
  innerTop,
  innerLeft,
  cards,
  activeEditIndex,
  currentFont,
  onStartCardEdit,
  onBlurCardEdit,
  onInputCard,
  titlePos,
  titleEditing,
  titleVisible,
  cardMargin,
  onStartTitleEdit,
  onBlurTitleEdit,
  onInputTitle,
  titleText,
  scalePct,
  zoomMin,
  zoomMax,
  zoomStep,
  onChangeScale,
  normalizeScale,
}: GridEditorProps) {
  return (
    <main
      ref={canvasAreaRef}
      className={`canvas-area${spacePanReady ? ' space-pan-ready' : ''}${isPanning ? ' is-panning' : ''}`}
      onMouseDown={onMouseDownCanvas}
      onMouseMove={onMouseMoveCanvas}
      onMouseUp={onMouseUpCanvas}
      onMouseLeave={onMouseUpCanvas}
      onWheel={onWheelCanvas}
      onTouchStart={onTouchStartCanvas}
      onTouchMove={onTouchMoveCanvas}
      onTouchEnd={onTouchEndCanvas}
      onTouchCancel={onTouchEndCanvas}
    >
      <div
        className="scale-outer"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          width: `${Math.round(a4Width * scale)}px`,
          height: `${Math.round(a4Height * scale)}px`,
        }}
      >
        <div className="a4" style={{ transform: `scale(${scale})` }}>
          <div
            id="inner-grid"
            style={{
              width: `${currentSize.w72}px`,
              height: `${currentSize.h72}px`,
              top: `${innerTop}px`,
              left: `${innerLeft}px`,
            }}
          >
            {cards.map((text, index) => (
              <div key={index} className="card">
                <div
                  ref={(element) => {
                    cardTextRefs.current[index] = element;
                  }}
                  className="card-text"
                  data-placeholder="テキストを入力"
                  suppressContentEditableWarning
                  contentEditable={activeEditIndex === index}
                  style={{ fontFamily: FONT_FAMILY[currentFont] }}
                  onMouseDown={() => onStartCardEdit(index)}
                  onTouchStart={() => onStartCardEdit(index)}
                  onBlur={() => onBlurCardEdit(index)}
                  onInput={(event) => {
                    const value = (event.currentTarget.textContent ?? '').replace(/\r/g, '');
                    onInputCard(index, value);
                  }}
                >
                  {text}
                </div>
              </div>
            ))}

            <div
              ref={titleTextRef}
              id="page-title"
              className={titlePos}
              suppressContentEditableWarning
              contentEditable={titleEditing}
              style={{
                display: titleVisible ? '' : 'none',
                fontFamily: FONT_FAMILY[currentFont],
                padding: `0 ${cardMargin}px`,
                top: titlePos.startsWith('bottom') ? 'auto' : `${cardMargin}px`,
                bottom: titlePos.startsWith('bottom') ? `${cardMargin}px` : 'auto',
              }}
              onMouseDown={onStartTitleEdit}
              onTouchStart={onStartTitleEdit}
              onBlur={onBlurTitleEdit}
              onInput={(event) => {
                const value = (event.currentTarget.textContent ?? '').replace(/\r/g, '');
                onInputTitle(value);
              }}
            >
              {titleText}
            </div>
          </div>
        </div>
      </div>

      <div className="preview-zoom" id="previewZoom">
        <input
          className="ui-range"
          type="range"
          min={zoomMin}
          max={zoomMax}
          step={zoomStep}
          value={scalePct}
          onChange={(event) => onChangeScale(normalizeScale(Number.parseInt(event.target.value, 10)))}
        />
        <div className="preview-zoom-input-wrap">
          <input
            type="number"
            min={zoomMin}
            max={zoomMax}
            step={zoomStep}
            value={scalePct}
            onChange={(event) => onChangeScale(normalizeScale(Number.parseInt(event.target.value, 10)))}
          />
          <span>%</span>
        </div>
      </div>
    </main>
  );
}

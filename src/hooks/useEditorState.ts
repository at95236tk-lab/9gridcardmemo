import { useCallback, useState } from 'react';
import type { EditorSnapshot, FontType, PaperSize, TitlePos } from '../types/editor';

export function useEditorState(initialSnapshot: EditorSnapshot) {
  const [currentSize, setCurrentSize] = useState<PaperSize>(initialSnapshot.currentSize);
  const [currentPt, setCurrentPt] = useState(initialSnapshot.currentPt);
  const [currentFont, setCurrentFont] = useState<FontType>(initialSnapshot.currentFont);
  const [cards, setCards] = useState<string[]>(initialSnapshot.cards);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleText, setTitleText] = useState(initialSnapshot.titleText);
  const [titleVisible, setTitleVisible] = useState(initialSnapshot.titleVisible);
  const [titlePos, setTitlePos] = useState<TitlePos>(initialSnapshot.titlePos);

  const createSnapshot = useCallback(
    (): EditorSnapshot => ({
      currentSize: { ...currentSize },
      currentPt,
      currentFont,
      cards: [...cards],
      titleText,
      titleVisible,
      titlePos,
    }),
    [cards, currentFont, currentPt, currentSize, titlePos, titleText, titleVisible],
  );

  const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
    setCurrentSize({ ...snapshot.currentSize });
    setCurrentPt(snapshot.currentPt);
    setCurrentFont(snapshot.currentFont);
    setCards([...snapshot.cards]);
    setTitleText(snapshot.titleText);
    setTitleVisible(snapshot.titleVisible);
    setTitlePos(snapshot.titlePos);
    setActiveEditIndex(null);
    setTitleEditing(false);
  }, []);

  const updateCard = useCallback((index: number, value: string) => {
    setCards((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  }, []);

  return {
    currentSize,
    setCurrentSize,
    currentPt,
    setCurrentPt,
    currentFont,
    setCurrentFont,
    cards,
    setCards,
    activeEditIndex,
    setActiveEditIndex,
    titleEditing,
    setTitleEditing,
    titleText,
    setTitleText,
    titleVisible,
    setTitleVisible,
    titlePos,
    setTitlePos,
    createSnapshot,
    applySnapshot,
    updateCard,
  };
}

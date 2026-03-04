import type { RefObject } from 'react';
import type { MemoRecord } from '../../types/memo';
import { Button } from '../atoms/Button';

type TopBarProps = {
  topbarDropdownRef: RefObject<HTMLDivElement>;
  topbarDropdownOpen: boolean;
  activeMemoId: string;
  activeMemoName: string;
  memoRecords: MemoRecord[];
  onToggleDropdown: () => void;
  onSwitchMemo: (memoId: string) => void;
  onDeleteMemo: (memoId: string) => void;
  onOpenManage: () => void;
  onOpenCreateNew: () => void;
  onOpenDuplicate: () => void;
  onOpenImport: () => void;
};

export function TopBar({
  topbarDropdownRef,
  topbarDropdownOpen,
  activeMemoId,
  activeMemoName,
  memoRecords,
  onToggleDropdown,
  onSwitchMemo,
  onDeleteMemo,
  onOpenManage,
  onOpenCreateNew,
  onOpenDuplicate,
  onOpenImport,
}: TopBarProps) {
  return (
    <header className="memo-topbar" aria-label="メモ管理バー">
      <div className="memo-topbar-dropdown" ref={topbarDropdownRef}>
        <Button
          className="memo-topbar-select"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={topbarDropdownOpen}
          aria-label="メモ切り替え"
          onClick={onToggleDropdown}
        >
          <span className="memo-topbar-select-text">{activeMemoName}</span>
          <span className="memo-topbar-caret">▾</span>
        </Button>

        <div className={`memo-topbar-dropdown-menu${topbarDropdownOpen ? ' show' : ''}`} role="listbox" aria-label="メモ一覧">
          {memoRecords.map((record) => (
            <div key={record.id} className={`memo-topbar-option${record.id === activeMemoId ? ' active' : ''}`}>
              <Button className="memo-topbar-option-name" type="button" onClick={() => onSwitchMemo(record.id)}>
                {record.name}
              </Button>
              <Button className="memo-topbar-option-delete" type="button" aria-label="このメモを削除" title="削除" onClick={() => onDeleteMemo(record.id)}>
                🗑
              </Button>
            </div>
          ))}
        </div>
      </div>
      <Button className="toggle-btn memo-topbar-btn" onClick={onOpenManage} type="button">
        管理
      </Button>
      <Button className="toggle-btn memo-topbar-btn" onClick={onOpenCreateNew} type="button">
        新規
      </Button>
      <Button className="toggle-btn memo-topbar-btn" onClick={onOpenDuplicate} type="button">
        複製
      </Button>
      <Button className="toggle-btn memo-topbar-btn" onClick={onOpenImport} type="button">
        JSON
      </Button>
    </header>
  );
}

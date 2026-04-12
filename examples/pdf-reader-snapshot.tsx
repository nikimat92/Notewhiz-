/**
 * PDF Reader — Snapshot Tool
 *
 * Dual-mode component for capturing content from the PDF reader:
 *   - Text mode: captures selected text with optional tags and notes
 *   - Area mode: delegates to AreaSelectionTool (canvas-based region capture)
 *
 * The component works as either controlled (parent manages mode) or
 * uncontrolled (manages its own mode state).
 *
 * Chat integration uses a custom DOM event so this component stays
 * decoupled from the ChatPanel across the component tree.
 *
 * Source: src/components/Reader/SnapshotTool.tsx
 */

'use client';

import { useState, useRef, useEffect } from 'react';

// --- Types ---

type Mode = 'text' | 'area';
type SaveState = 'default' | 'loading' | 'success';

interface SnapshotToolProps {
  /** Called when the user saves a snapshot */
  onSnapshot: (content: string, notes: string, imageUrl?: string) => Promise<void>;
  summaryId: string;
  containerRef?: React.RefObject<HTMLDivElement>;
  /** Text selected in the PDF viewer (parent-controlled) */
  selectedText?: string;
  /** Controlled mode (if parent manages it) */
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
  isSelectingArea?: boolean;
  onSelectingAreaChange?: (isSelecting: boolean) => void;
  /** Routes snapshot to ChatPanel if chat is open */
  onAskAI?: (data: { content: string; imageUrl?: string; notes?: string }) => void;
}

const QUICK_TAGS = [
  { id: 'important', icon: '📌', label: 'Important' },
  { id: 'unclear',   icon: '❓', label: 'Unclear' },
  { id: 'question',  icon: '🤔', label: 'Question' },
  { id: 'summary',   icon: '📝', label: 'Summary' },
];

export function SnapshotTool({
  onSnapshot,
  summaryId,
  containerRef,
  selectedText: parentSelectedText,
  mode: externalMode,
  onModeChange: externalOnModeChange,
  isSelectingArea: externalIsSelectingArea,
  onSelectingAreaChange,
  onAskAI: externalOnAskAI,
}: SnapshotToolProps) {
  const [internalMode, setInternalMode] = useState<Mode>('text');

  // Controlled/uncontrolled pattern — works both ways
  const mode    = externalMode       !== undefined ? externalMode       : internalMode;
  const setMode = externalOnModeChange             ? externalOnModeChange : setInternalMode;

  const [selectedText,  setSelectedText]  = useState('');
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [notes,         setNotes]         = useState('');
  const [selectedTags,  setSelectedTags]  = useState<string[]>([]);
  const [saveState,     setSaveState]     = useState<SaveState>('default');
  const [feedbackMsg,   setFeedbackMsg]   = useState('');
  const [showFeedback,  setShowFeedback]  = useState(false);

  const isSelectingArea    = externalIsSelectingArea !== undefined ? externalIsSelectingArea : false;
  const setIsSelectingArea = onSelectingAreaChange ?? (() => {});

  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const notesInputRef      = useRef<HTMLTextAreaElement>(null);

  // Sync parent-selected text into local state (text mode only)
  useEffect(() => {
    if (parentSelectedText && mode === 'text') setSelectedText(parentSelectedText);
  }, [parentSelectedText, mode]);

  // Auto-start area selection when mode switches to 'area'
  useEffect(() => {
    if (mode === 'area' && !isSelectingArea) {
      setIsSelectingArea(true);
      setSnapshotImage(null);
    } else if (mode !== 'area' && isSelectingArea) {
      setIsSelectingArea(false);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps -- setIsSelectingArea is a stable callback ref; including it would cause infinite re-renders when the parent re-renders

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'text') setSnapshotImage(null);
    else setSelectedText('');
  };

  const toggleTag = (tagId: string) =>
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId],
    );

  const showFeedbackToast = (message: string) => {
    setFeedbackMsg(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };

  const handleSave = async () => {
    const hasContent = mode === 'text' ? selectedText.trim() : snapshotImage;
    if (!hasContent) return;

    setSaveState('loading');
    try {
      const tagsText = selectedTags
        .map(id => QUICK_TAGS.find(t => t.id === id))
        .filter(Boolean)
        .map(t => `#${t!.label}`)
        .join(' ');

      await onSnapshot(
        mode === 'text' ? selectedText : '',
        tagsText + (notes ? `\n${notes}` : ''),
        mode !== 'text' ? (snapshotImage ?? undefined) : undefined,
      );

      setSaveState('success');
      showFeedbackToast('✓ Saved to Study Library!');
      setTimeout(() => {
        setSelectedText('');
        setSnapshotImage(null);
        setNotes('');
        setSelectedTags([]);
        setSaveState('default');
      }, 2000);
    } catch {
      showFeedbackToast('Failed to save');
      setSaveState('default');
    }
  };

  const handleAskAI = () => {
    const hasContent = mode === 'text' ? selectedText.trim() : snapshotImage;
    if (!hasContent) {
      showFeedbackToast(mode === 'text' ? 'Select text first' : 'Capture an area first');
      return;
    }

    if (externalOnAskAI) {
      // Route to ChatPanel if open (preferred path)
      externalOnAskAI({
        content:  mode === 'text' ? selectedText : 'Can you explain what this shows?',
        imageUrl: mode !== 'text' ? (snapshotImage ?? undefined) : undefined,
        notes:    notes || undefined,
      });
      showFeedbackToast('Sending to AI chat...');
      return;
    }

    // Fallback: custom DOM event lets ChatDock respond without a direct ref
    window.dispatchEvent(new CustomEvent('chatdock:open', {
      detail: {
        ctx: {
          type: 'summary',
          summaryId,
          snapshotContent:  mode === 'text' ? selectedText : '',
          snapshotImageUrl: mode !== 'text' ? snapshotImage : undefined,
          snapshotNotes:    notes || undefined,
          seedMessage: mode === 'text'
            ? `Can you explain this text?\n\n"${selectedText}"`
            : 'Can you explain what this shows?',
          autoSend: true,
        },
        snapToPill: true,
      },
    }));
    showFeedbackToast('Opening AI chat...');
  };

  const hasContent = mode === 'text' ? selectedText.trim() : snapshotImage;

  return (
    <div className="space-y-4 p-3 rounded-xl bg-card/50">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['text', 'area'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {m === 'text' ? '✏️ Text' : '📦 Area'}
          </button>
        ))}
      </div>

      {/* Content area (text mode) */}
      {mode === 'text' && (
        <textarea
          ref={contentTextareaRef}
          value={selectedText}
          onChange={e => setSelectedText(e.target.value)}
          placeholder="Select text from the PDF..."
          className="w-full min-h-[80px] p-2 rounded-lg border text-xs font-mono resize-none"
        />
      )}

      {/* Area mode: shows active selection state or captured image */}
      {mode === 'area' && (
        isSelectingArea ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            📍 Drag on the PDF to select an area
          </p>
        ) : snapshotImage ? (
          <div className="relative">
            <img src={snapshotImage} alt="Captured area" className="w-full rounded-lg" />
            <button
              onClick={() => setSnapshotImage(null)}
              className="absolute top-1 right-1 text-xs text-destructive font-medium"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSelectingArea(true)}
            className="w-full py-6 rounded-lg border-2 border-dashed text-base"
          >
            🎯 Select Area from PDF
          </button>
        )
      )}

      {/* Quick tags */}
      <div className="flex flex-wrap gap-2">
        {QUICK_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              selectedTags.includes(tag.id)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {tag.icon} {tag.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      <textarea
        ref={notesInputRef}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add notes (optional)..."
        className="w-full min-h-[60px] p-2 rounded-lg border text-sm resize-none"
      />

      {/* Actions */}
      <button
        onClick={handleSave}
        disabled={!hasContent || saveState !== 'default'}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {saveState === 'loading' ? '⏳ Saving...'
          : saveState === 'success' ? '✓ Saved!'
          : '📚 Save to Study Library'}
      </button>

      <button
        onClick={handleAskAI}
        disabled={!hasContent}
        className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-medium disabled:opacity-50"
      >
        🤖 Ask AI About This
      </button>

      {showFeedback && (
        <p className="text-sm text-green-600 text-center">{feedbackMsg}</p>
      )}
    </div>
  );
}

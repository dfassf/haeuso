import { useState } from 'react';
import { getComfortSource } from './comfort-service';
import ComfortModal from './components/ComfortModal';
import EmojiTimeline from './components/EmojiTimeline';
import EmotionSelector from './components/EmotionSelector';
import FlushSlider from './components/FlushSlider';
import Header from './components/Header';
import TextInput from './components/TextInput';
import UndoToast from './components/UndoToast';
import { useComfort } from './hooks/useComfort';
import { useFlushSlider } from './hooks/useFlushSlider';
import { useJournal } from './hooks/useJournal';
import type { Emotion } from './types';

export default function App() {
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('calm');

  const journal = useJournal();
  const comfort = useComfort();
  const flush = useFlushSlider(comfort.comfortLoading);

  const privacyHint =
    getComfortSource() === 'api'
      ? '입력한 글은 저장되지 않고 바로 사라져요.'
      : '입력한 글은 저장되지 않고, 이 기기 안에서만 잠깐 처리돼요.';

  async function handleRelease() {
    await comfort.requestRelease(content, selectedEmotion, journal.addEntry);
    setContent('');
  }

  function handleDeleteEntry(id: string) {
    journal.removeEntryWithUndo(id);
    comfort.clearLastEntryId(id);
  }

  return (
    <main className="page">
      <section className="card">
        <Header />
        <section className="section">
          <EmotionSelector selected={selectedEmotion} onSelect={setSelectedEmotion} />
          <TextInput content={content} onChange={setContent} privacyHint={privacyHint} />
          <FlushSlider {...flush} onRelease={handleRelease} />
          {comfort.comfortError ? <p className="error">{comfort.comfortError}</p> : null}
          <EmojiTimeline
            entries={journal.recentEntries}
            totalCount={journal.entries.length}
            onDelete={handleDeleteEntry}
          />
        </section>
      </section>

      <ComfortModal
        comfort={comfort.comfort}
        onKeep={comfort.handleKeepTemporarily}
        onDelete={() => comfort.handleDeleteNow(journal.removeEntryWithUndo)}
      />
      <UndoToast visible={!!journal.undoEntry} onUndo={journal.handleUndoDelete} />
    </main>
  );
}

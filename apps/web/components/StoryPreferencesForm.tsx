'use client';
import { useState } from 'react';
import { storyPreferencesOf, type ChildResponse } from '@just-imagine/protocol';
import { api } from '../lib/api';

export function StoryPreferencesForm({ child }: { child: ChildResponse }) {
  const [value, setValue] = useState(() => storyPreferencesOf(child));
  const [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="story-parent-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus('');
        try {
          await api('updateChild', { childId: child.id }, { storyPreferences: value });
          setStatus('Saved. These goals guide new stories; saved books keep their original goals.');
        } catch (error) {
          setStatus(error instanceof Error ? error.message : 'Could not save. Try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{child.firstName}’s stories</h3>
      <label>
        What would you like them to learn?
        <textarea
          rows={3}
          maxLength={1000}
          value={value.learningGoals}
          onChange={(e) => setValue((v) => ({ ...v, learningGoals: e.target.value }))}
          placeholder="For example: taking turns, caring for teeth, or why planets orbit the Sun."
        />
      </label>
      <label>
        Topics to leave out <span className="subtle">(optional)</span>
        <input
          maxLength={500}
          value={value.avoidTopics}
          onChange={(e) => setValue((v) => ({ ...v, avoidTopics: e.target.value }))}
        />
      </label>
      <label>
        Story length
        <select
          value={value.length}
          onChange={(e) => setValue((v) => ({ ...v, length: e.target.value as 'short' | 'long' }))}
        >
          <option value="long">A longer adventure · 6 scenes</option>
          <option value="short">A little adventure · 3 scenes</option>
        </select>
      </label>
      <p>
        The child chooses the topic and the story’s actions. Your goals shape what they discover.
        Illustrations are generated; science and health stories are learning material, not personal
        advice.
      </p>
      <button className="button primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save story goals'}
      </button>
      <p role="status">{status}</p>
    </form>
  );
}

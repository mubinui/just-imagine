'use client';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useEffect, useRef, useState } from 'react';
import type { ChildResponse, StoryDoc } from '@just-imagine/protocol';
import { ensureChildVoice, getVoice } from '../../lib/voice';

export function useStoryNarration(
  child: ChildResponse | undefined,
  onTopic: (topic: string) => void,
  onFinished: () => void,
) {
  const [state, setState] = useState<'idle' | 'connecting' | 'reading' | 'listening' | 'paused'>(
    'idle',
  );
  const [caption, setCaption] = useState(''),
    [error, setError] = useState('');
  const current = useRef<string | undefined>(undefined),
    generation = useRef(0),
    started = useRef(false);
  const callbacks = useRef({ onTopic, onFinished });
  useEffect(() => {
    callbacks.current = { onTopic, onFinished };
  });
  useEffect(() => {
    const voice = getVoice();
    const off = voice.subscribe((message) => {
      if (message.type === 'storyTopic') callbacks.current.onTopic(message.topic);
      if (message.type === 'transcript' && message.role === 'character') setCaption(message.text);
      if (message.type === 'storyCue' && message.readId === current.current) {
        if (message.status === 'started') {
          started.current = true;
          setState('reading');
          setCaption('');
        }
        if (message.status === 'finished') {
          const readId = current.current,
            version = generation.current;
          void voice.audio.whenPlaybackIdle().then((done) => {
            if (!done || readId !== current.current || version !== generation.current) return;
            current.current = undefined;
            setState('paused');
            callbacks.current.onFinished();
          });
        }
      }
      if (message.type === 'interrupted') {
        // The initial handoff is allowed; an established read must never auto-advance after interruption.
        if (current.current && started.current) {
          generation.current++;
          current.current = undefined;
          setState('paused');
        }
      }
      if (message.type === 'bye' || message.type === 'error') {
        generation.current++;
        current.current = undefined;
        setState('paused');
        if (message.type === 'error') setError(uiError(message.message));
      }
    });
    const offStatus = voice.subscribeStatus((status) => {
      if (status === 'reconnecting' || status === 'closed' || status === 'error') {
        generation.current++;
        current.current = undefined;
        setState('paused');
        setError(
          status === 'reconnecting'
            ? uiText('The call is reconnecting. Press Continue when it returns.')
            : uiText('The call ended. Your page is saved; you can read or call again.'),
        );
      }
    });
    const epoch = generation;
    return () => {
      epoch.current++;
      current.current = undefined;
      off();
      offStatus();
      if (voice.session) voice.send({ type: 'hangUp' });
      voice.audio.flush();
    };
  }, []);
  async function connect() {
    if (!child) throw new Error('Choose an explorer first.');
    const voice = getVoice();
    if (!voice.audio.unlocked) await voice.unlockAudio();
    await ensureChildVoice(child);
    if (voice.status !== 'connected')
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          off();
          reject(new Error('The call is taking too long. Try again.'));
        }, 15000);
        const off = voice.subscribeStatus((status) => {
          if (status === 'connected') {
            clearTimeout(timer);
            off();
            resolve();
          }
        });
      });
    return voice;
  }
  function pause() {
    generation.current++;
    current.current = undefined;
    getVoice().audio.flush();
    if (getVoice().session) getVoice().send({ type: 'storyPause' });
    setState('paused');
  }
  async function read(book: StoryDoc, scene: number, beat: number, choiceId?: string) {
    const version = ++generation.current;
    current.current = undefined;
    setError('');
    setState('connecting');
    try {
      const voice = await connect();
      if (version !== generation.current) return;
      // Set the id only after the existing handoff audio has been cleared.
      voice.audio.flush();
      const readId = `read_${crypto.randomUUID()}`;
      started.current = false;
      current.current = readId;
      voice.send({
        type: 'storyRead',
        storyId: book.id,
        scene,
        beat,
        readId,
        ...(choiceId ? { choiceId } : {}),
      });
    } catch (e) {
      if (version === generation.current) {
        current.current = undefined;
        setState('paused');
        setError(uiError(e, 'Please try the call again.'));
      }
    }
  }
  async function ask(book?: StoryDoc) {
    pause();
    setState('connecting');
    setError('');
    const version = generation.current;
    try {
      const voice = await connect();
      if (version !== generation.current) return;
      voice.send({ type: 'storySetup', ...(book ? { storyId: book.id } : {}) });
      setState('listening');
    } catch (e) {
      setState('paused');
      setError(uiError(e, 'Could not call Katha.'));
    }
  }
  return { state, caption, error, read, pause, ask };
}

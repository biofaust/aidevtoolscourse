import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

const LANGUAGE_SNIPPETS = {
  javascript: `function fizzBuzz(n) {
  for (let i = 1; i <= n; i++) {
    const tag = i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : i;
    console.log(tag);
  }
}

fizzBuzz(10);`,
  typescript: `type Pair = [number, number];

function swap(pair: Pair): Pair {
  const [a, b] = pair;
  return [b, a];
}

console.log(swap([1, 2]));`,
  python: `def twosum(nums, target):
    seen = {}
    for idx, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], idx]
        seen[num] = idx
    return []

print(twosum([2,7,11,15], 9))`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "C++ editing with sync. Execution runs in WASM." << endl;
    return 0;
}`,
};

const LANGUAGE_EXTENSIONS = {
  javascript: javascript,
  typescript: () => javascript({ typescript: true }),
  python: python,
  cpp: cpp,
};

const languages = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
];

function App() {
  const [sessionId, setSessionId] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    return search.get('session') || '';
  });
  const [code, setCode] = useState(LANGUAGE_SNIPPETS.javascript);
  const [language, setLanguage] = useState('javascript');
  const [status, setStatus] = useState('Disconnected');
  const [runOutput, setRunOutput] = useState('Run code to see output here.');
  const [joinId, setJoinId] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const socketRef = useRef(null);
  const executorRef = useRef(null);

  const extensions = useMemo(() => {
    const lang = LANGUAGE_EXTENSIONS[language];
    return lang ? [lang()] : [];
  }, [language]);

  useEffect(() => {
    if (!sessionId) return undefined;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    setStatus('Connecting...');

    socket.on('connect', () => {
      setStatus('Connected');
      socket.emit('join-session', { sessionId });
      window.history.replaceState({}, '', `?session=${sessionId}`);
      setShareMessage('');
    });

    socket.on('disconnect', () => setStatus('Disconnected'));

    socket.on('session-state', (payload) => {
      if (!payload) return;
      if (payload.code) setCode(payload.code);
      if (payload.language) setLanguage(payload.language);
    });

    socket.on('code-update', ({ code: incomingCode, language: incomingLanguage }) => {
      if (typeof incomingCode === 'string') {
        setCode(incomingCode);
      }
      if (incomingLanguage) {
        setLanguage(incomingLanguage);
      }
    });

    socket.on('run-result', ({ output }) => {
      if (typeof output === 'string') {
        setRunOutput(`From collaborator:\n${output}`);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const ensureWorker = () => {
    if (executorRef.current) return executorRef.current;
    executorRef.current = new Worker(new URL('./workers/executor.js', import.meta.url), { type: 'module' });
    return executorRef.current;
  };

  const resetWorker = () => {
    if (executorRef.current) {
      executorRef.current.terminate();
      executorRef.current = null;
    }
  };

  const createSession = async () => {
    try {
      setStatus('Creating session...');
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error('Unable to create session');
      }

      const data = await response.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setJoinId(data.sessionId);
        setShareMessage('Session created. Share the link below.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Could not create session');
    }
  };

  const joinSession = () => {
    if (!joinId) return;
    setSessionId(joinId.trim());
  };

  const copyLink = async () => {
    if (!sessionId) return;
    const link = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage('Link copied to clipboard');
    } catch {
      setShareMessage('Copy failed. You can share the URL manually.');
    }
  };

  const onCodeChange = (value) => {
    setCode(value);
    if (socketRef.current && sessionId) {
      socketRef.current.emit('code-update', { sessionId, code: value, language });
    }
  };

  const onLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (!code.trim() && LANGUAGE_SNIPPETS[newLanguage]) {
      setCode(LANGUAGE_SNIPPETS[newLanguage]);
    }
    if (socketRef.current && sessionId) {
      socketRef.current.emit('code-update', { sessionId, code, language: newLanguage });
    }
  };

  const runCode = () => {
    if (!code.trim()) {
      setRunOutput('Nothing to run yet.');
      return;
    }

    const worker = ensureWorker();
    setRunOutput('Running in browser sandbox...');

    const timeout = setTimeout(() => {
      resetWorker();
      setRunOutput('Execution stopped (timeout).');
    }, 4000);

    worker.onmessage = (event) => {
      clearTimeout(timeout);
      const output = event.data?.payload || 'No output.';
      setRunOutput(output);
      if (socketRef.current && sessionId) {
        socketRef.current.emit('broadcast-run', { sessionId, output });
      }
    };

    worker.postMessage({ code, language });
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Realtime coding rooms</p>
          <h1>Interview-ready collaboration workspace</h1>
          <p className="lede">
            Spin up a room, share the link, and edit code together with live syntax highlighting. Execute JavaScript/TypeScript, Python, and C++ safely in-browser via WASM runtimes.
          </p>
          <div className="actions">
            <button className="primary" onClick={createSession}>Create new room</button>
            <div className="join">
              <input
                type="text"
                placeholder="Session ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
              />
              <button onClick={joinSession}>Join</button>
            </div>
          </div>
          <div className="status">
            <span className={`dot ${status === 'Connected' ? 'online' : 'offline'}`} />
            {sessionId ? `Session: ${sessionId}` : 'No session yet'}
            <span className="status-text">{status}</span>
            {shareMessage && <span className="share-note">{shareMessage}</span>}
          </div>
          {sessionId && (
            <div className="share-bar">
              <span>{`${window.location.origin}${window.location.pathname}?session=${sessionId}`}</span>
              <button onClick={copyLink}>Copy link</button>
            </div>
          )}
        </div>
      </header>

      <main className="workspace">
        <section className="controls">
          <label htmlFor="language">Language</label>
          <div className="select">
            <select
              id="language"
              value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
            <span className="hint">Highlighting for multiple languages. Browser + WASM execution for JS/TS/Python/C++.</span>
          </div>
          <div className="run-controls">
            <button className="primary" onClick={runCode}>Run in sandbox</button>
            <p className="muted">Results are shared to everyone in the room.</p>
          </div>
        </section>

        <section className="panels">
          <div className="panel">
            <div className="panel-header">
              <span>Editor</span>
              <span className="badge">{language}</span>
            </div>
            <CodeMirror
              value={code}
              height="480px"
              theme={oneDark}
              extensions={extensions}
              onChange={onCodeChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
              }}
            />
          </div>
          <div className="panel output-panel">
            <div className="panel-header">
              <span>Sandbox output</span>
            </div>
            <pre className="output">{runOutput}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

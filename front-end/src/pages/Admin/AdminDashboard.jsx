// src/pages/Admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpenText,
  Clock,
  Download,
  Edit,
  Image as ImageIcon,
  PlusCircle,
  Shuffle,
  Users
} from 'lucide-react';

const DEFAULT_DISTRIBUTION = {
  BC: 3,
  LC: 2,
  HCC: 2,
  Other: 3
};

const buildId = (label = '') =>
  `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to read ${key}`, err);
    return fallback;
  }
};

const getStoredEvents = () => readLocal('adminEvents', []);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isAuthenticated = useMemo(
    () => Boolean(sessionStorage.getItem('adminSession')),
    []
  );

  const [events, setEvents] = useState(getStoredEvents);
  const [selectedEventId, setSelectedEventId] = useState(() => getStoredEvents()[0]?.eventId || '');
  const [eventForm, setEventForm] = useState({
    name: '',
    eventId: '',
    type: 'quiz',
    timed: true,
    duration: 10,
    questionTarget: 10,
    groupPlay: true,
    difficulty: '3x3'
  });

  const [distribution, setDistribution] = useState(DEFAULT_DISTRIBUTION);

  const [questionBank, setQuestionBank] = useState(() => readLocal('questionBank', []));
  const [questionForm, setQuestionForm] = useState({
    id: null,
    text: '',
    ta: 'BC',
    options: ['', '', '', ''],
    answerIndex: 0,
    timeLimit: 30
  });

  const [previewSet, setPreviewSet] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/admin/login', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    localStorage.setItem('adminEvents', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('questionBank', JSON.stringify(questionBank));
  }, [questionBank]);

  const handleEventSubmit = (e) => {
    e.preventDefault();
    const eventId = eventForm.eventId || buildId(eventForm.name || 'event');
    const nextEvent = {
      ...eventForm,
      eventId,
      createdAt: new Date().toISOString(),
      questionSet: previewSet.map((q) => q.id)
    };

    setEvents((prev) => {
      const remaining = prev.filter((evt) => evt.eventId !== eventId);
      return [...remaining, nextEvent];
    });
    setSelectedEventId(eventId);
    setEventForm({ ...eventForm, eventId: '' });
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    const id = questionForm.id || buildId('q');
    const newQuestion = { ...questionForm, id };

    setQuestionBank((prev) => {
      const remaining = prev.filter((q) => q.id !== id);
      return [...remaining, newQuestion];
    });
    setQuestionForm({ id: null, text: '', ta: 'BC', options: ['', '', '', ''], answerIndex: 0, timeLimit: 30 });
  };

  const generateQuestionSet = () => {
    const selected = [];
    const usedIds = new Set();

    Object.entries(distribution).forEach(([ta, count]) => {
      const pool = questionBank.filter((q) => q.ta === ta);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      shuffled.slice(0, count).forEach((q) => {
        if (!usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
        }
      });
    });

    const target = eventForm.questionTarget || 10;
    if (selected.length < target) {
      const remainingPool = questionBank.filter((q) => !usedIds.has(q.id));
      const shuffled = [...remainingPool].sort(() => Math.random() - 0.5);
      shuffled.slice(0, target - selected.length).forEach((q) => selected.push(q));
    }

    setPreviewSet(selected);

    if (selectedEventId) {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.eventId === selectedEventId ? { ...evt, questionSet: selected.map((q) => q.id) } : evt
        )
      );
    }
  };

  const editQuestion = (questionId) => {
    const found = questionBank.find((q) => q.id === questionId);
    if (found) setQuestionForm(found);
  };

  const editEvent = (eventId) => {
    const found = events.find((evt) => evt.eventId === eventId);
    if (found) {
      setEventForm(found);
      setSelectedEventId(eventId);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('adminSession');
    navigate('/admin/login');
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeEvent = events.find((evt) => evt.eventId === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Control Room</h1>
            <p className="text-sm text-gray-500">Login guarded. Compose events, puzzles and quizzes with TA-aware banks.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadJson(events, 'events.json')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Download size={16} /> Export Events
            </button>
            <button
              onClick={() => downloadJson(questionBank, 'question-bank.json')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <BookOpenText size={16} /> Export Bank
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-semibold"><Users size={18} /> Lobby via QR</div>
            <p className="text-sm text-blue-700/80 mt-1">Share the join QR from the monitor page. Mobile players log name, hospital, mobile.</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-purple-700 font-semibold"><ImageIcon size={18} /> Photo puzzle</div>
            <p className="text-sm text-purple-700/80 mt-1">Upload an image, select 4x4 / 6x6, set time bound, and monitor live moves.</p>
          </div>
          <div className="bg-green-50 border border-green-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-green-700 font-semibold"><Shuffle size={18} /> Question bank</div>
            <p className="text-sm text-green-700/80 mt-1">Capture TA category, shuffle 100-set banks, and pin curated 10/20 question sets.</p>
          </div>
        </div>

        {/* Event composer */}
        <div className="bg-white shadow rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Create / edit an event</h2>
              <p className="text-sm text-gray-500">Mix quiz and puzzle controls. Everything stays editable.</p>
            </div>
            {activeEvent && (
              <Link
                to={`/admin/monitor/${activeEvent.eventId}`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
              >
                Monitor {activeEvent.eventId}
              </Link>
            )}
          </div>
          <form className="grid md:grid-cols-2 gap-6 p-6" onSubmit={handleEventSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event name</label>
                <input
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g. Liver Summit Finals"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event ID / room slug</label>
                <input
                  value={eventForm.eventId}
                  onChange={(e) => setEventForm({ ...eventForm, eventId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Optional. Autogenerated if empty."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="quiz">Quiz (shuffled bank)</option>
                    <option value="puzzle">Photo puzzle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Group play</label>
                  <select
                    value={eventForm.groupPlay ? 'yes' : 'no'}
                    onChange={(e) => setEventForm({ ...eventForm, groupPlay: e.target.value === 'yes' })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="yes">Requires moderator</option>
                    <option value="no">Single player</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                    <Clock size={14} /> Time bound?
                  </label>
                  <select
                    value={eventForm.timed ? 'yes' : 'no'}
                    onChange={(e) => setEventForm({ ...eventForm, timed: e.target.value === 'yes' })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={eventForm.duration}
                    onChange={(e) => setEventForm({ ...eventForm, duration: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Puzzle difficulty (default 3x3)</label>
                <select
                  value={eventForm.difficulty}
                  onChange={(e) => setEventForm({ ...eventForm, difficulty: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="3x3">3 x 3</option>
                  <option value="4x4">4 x 4</option>
                  <option value="6x6">6 x 6</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Shuffle size={14} /> Number of quiz questions
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={eventForm.questionTarget}
                  onChange={(e) => setEventForm({ ...eventForm, questionTarget: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Use 10 or 20 to mirror the TA recipe (BC/LC/HCC mix).</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-800 mb-1">Join link preview</p>
                <p>Players scan the monitor QR and are taken to:</p>
                <p className="font-mono text-xs break-all text-indigo-700 mt-1">/join/{selectedEventId || 'your-event'}</p>
                <p className="mt-1">Shortest time + accuracy determines rank. Live leaderboard updates on the monitor.</p>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold"
              >
                <PlusCircle size={18} /> Save event
              </button>
            </div>
          </form>
        </div>

        {/* Question bank */}
        <div className="bg-white shadow rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Question bank (TA aware)</h2>
              <p className="text-sm text-gray-500">Capture BC / LC / HCC split. Keep everything editable.</p>
            </div>
            <button
              onClick={generateQuestionSet}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <Shuffle size={16} /> Build shuffled set
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 p-6">
            <form className="md:col-span-1 space-y-4" onSubmit={handleQuestionSubmit}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Question</label>
                <textarea
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">TA / Category</label>
                  <select
                    value={questionForm.ta}
                    onChange={(e) => setQuestionForm({ ...questionForm, ta: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="BC">BC</option>
                    <option value="LC">LC</option>
                    <option value="HCC">HCC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time limit (sec)</label>
                  <input
                    type="number"
                    min="5"
                    value={questionForm.timeLimit}
                    onChange={(e) => setQuestionForm({ ...questionForm, timeLimit: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...questionForm.options];
                      next[idx] = e.target.value;
                      setQuestionForm({ ...questionForm, options: next });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 border rounded-lg px-3 py-2"
                    required
                  />
                  <input
                    type="radio"
                    name="answer"
                    checked={questionForm.answerIndex === idx}
                    onChange={() => setQuestionForm({ ...questionForm, answerIndex: idx })}
                    className="accent-indigo-600"
                  />
                </div>
              ))}

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
              >
                {questionForm.id ? 'Update question' : 'Add question'}
              </button>
            </form>

            <div className="md:col-span-2 space-y-4">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(distribution).map(([ta, count]) => (
                  <div key={ta} className="border rounded-lg p-3 bg-gray-50">
                    <label className="text-xs font-semibold text-gray-700">{ta} questions</label>
                    <input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(e) => setDistribution({ ...distribution, [ta]: Number(e.target.value) })}
                      className="w-full border rounded px-2 py-1 mt-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Use this mix to auto-generate 10/20 question sets (e.g. BC:3, LC:2, HCC:2).</p>

              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3">TA</th>
                      <th className="p-3">Question</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {questionBank.map((q) => (
                      <tr key={q.id}>
                        <td className="p-3 font-semibold">{q.ta}</td>
                        <td className="p-3 truncate max-w-xs" title={q.text}>{q.text}</td>
                        <td className="p-3">{q.timeLimit}s</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => editQuestion(q.id)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            <Edit size={14} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {questionBank.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-gray-500">No questions yet. Add a few to build the bank.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {previewSet.length > 0 && (
                <div className="border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-800">Preview set ({previewSet.length} questions)</h3>
                      <p className="text-xs text-green-700">Saved against the selected event for immediate deployment.</p>
                    </div>
                    {activeEvent && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Event: {activeEvent.name}</span>
                    )}
                  </div>
                  <ol className="mt-2 space-y-1 text-sm text-green-900 list-decimal list-inside">
                    {previewSet.map((q) => (
                      <li key={q.id}>
                        [{q.ta}] {q.text}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved events */}
        <div className="bg-white shadow rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">All events</h2>
            <p className="text-sm text-gray-500">Edit anything: event meta, TA recipe, time bounds, difficulty.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Event</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Timed</th>
                  <th className="p-3">Questions</th>
                  <th className="p-3">Puzzle grid</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((evt) => (
                  <tr key={evt.eventId} className={selectedEventId === evt.eventId ? 'bg-indigo-50/60' : ''}>
                    <td className="p-3">
                      <p className="font-semibold text-gray-800">{evt.name}</p>
                      <p className="text-xs text-gray-500">/join/{evt.eventId}</p>
                    </td>
                    <td className="p-3 uppercase">{evt.type}</td>
                    <td className="p-3">{evt.timed ? `${evt.duration} min` : 'No limit'}</td>
                    <td className="p-3">{evt.questionTarget || '-'} (set: {evt.questionSet?.length || 0})</td>
                    <td className="p-3">{evt.difficulty}</td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => editEvent(evt.eventId)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        Edit
                      </button>
                      <Link
                        to={`/admin/monitor/${evt.eventId}`}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Monitor
                      </Link>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500">No events yet. Create one above to produce a QR lobby.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

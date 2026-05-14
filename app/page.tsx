"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Note = { id: string; text: string };
type Task = { id: string; text: string; done: boolean; category: string };

const categories = ["Genel", "Alınacaklar", "Yapılacaklar", "Kişisel"];

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [taskInput, setTaskInput] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("notes");
  const [selectedCategory, setSelectedCategory] = useState("Genel");

  // 🔥 REALTIME NOTES + TASKS
  useEffect(() => {
    const qNotes = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    return () => {
      unsubNotes();
      unsubTasks();
    };
  }, []);

  // ➕ NOTE EKLE
  const addNote = async () => {
    if (!noteInput.trim()) return;

    await addDoc(collection(db, "notes"), {
      text: noteInput,
      createdAt: Date.now(),
    });

    setNoteInput("");
  };

  // ➕ TASK EKLE
  const addTask = async () => {
    if (!taskInput.trim()) return;

    await addDoc(collection(db, "tasks"), {
      text: taskInput,
      done: false,
      category: selectedCategory,
      createdAt: Date.now(),
    });

    setTaskInput("");
  };

  // ✔ TASK TOGGLE
  const toggleTask = async (task: Task) => {
    await updateDoc(doc(db, "tasks", task.id), {
      done: !task.done,
    });
  };

  // ❌ DELETE NOTE
  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
  };

  // ❌ DELETE TASK
  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  return (
    <div className="min-h-screen bg-black text-white flex">

      {/* SIDEBAR */}
      <div className={`${menuOpen ? "w-64" : "w-16"} transition-all bg-zinc-900 border-r p-2`}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl">
          ☰
        </button>

        {menuOpen && (
          <div className="mt-4 space-y-2">
            <button onClick={() => setView("notes")}>📝 Notlar</button>
            <button onClick={() => setView("tasks")}>✅ Görevler</button>

            <div className="text-xs mt-4 text-zinc-400">Kategoriler</div>

            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setView("tasks");
                  setSelectedCategory(c);
                }}
              >
                📂 {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        {/* NOTES */}
        {view === "notes" && (
          <div>
            <h2>📝 Notlar</h2>

            <div className="flex gap-2">
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="bg-zinc-800 p-2"
              />
              <button onClick={addNote}>Ekle</button>
            </div>

            {notes.map((n) => (
              <div key={n.id} className="flex justify-between">
                <span>{n.text}</span>
                <button onClick={() => deleteNote(n.id)}>❌</button>
              </div>
            ))}
          </div>
        )}

        {/* TASKS */}
        {view === "tasks" && (
          <div>
            <h2>✅ Görevler ({selectedCategory})</h2>

            <div className="flex gap-2">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                className="bg-zinc-800 p-2"
              />
              <button onClick={addTask}>Ekle</button>
            </div>

            {tasks
              .filter((t) => t.category === selectedCategory)
              .map((t) => (
                <div key={t.id} className="flex justify-between">
                  <label>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t)}
                    />
                    <span style={{ textDecoration: t.done ? "line-through" : "" }}>
                      {t.text}
                    </span>
                  </label>

                  <button onClick={() => deleteTask(t.id)}>❌</button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
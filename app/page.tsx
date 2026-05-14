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
import { Trash2, Plus, CheckCircle2, Circle, Menu, X, BookOpen, CheckSquare } from "lucide-react"; // İkonlar için

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

  useEffect(() => {
    const qNotes = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => {
      unsubNotes();
      unsubTasks();
    };
  }, []);

  const addNote = async () => {
    if (!noteInput.trim()) return;
    await addDoc(collection(db, "notes"), { text: noteInput, createdAt: Date.now() });
    setNoteInput("");
  };

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

  const toggleTask = async (task: Task) => {
    await updateDoc(doc(db, "tasks", task.id), { done: !task.done });
  };

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      
      {/* SIDEBAR */}
      <div className={`${menuOpen ? "w-72" : "w-20"} transition-all duration-300 bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 p-4 flex flex-col items-center`}>
        <button 
          onClick={() => setMenuOpen(!menuOpen)} 
          className="p-3 hover:bg-zinc-800 rounded-xl transition-colors mb-8 text-zinc-400 hover:text-white"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`w-full space-y-2 ${!menuOpen && "hidden"}`}>
          <button 
            onClick={() => setView("notes")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${view === "notes" ? "bg-blue-600 text-white" : "hover:bg-zinc-800 text-zinc-400"}`}
          >
            <BookOpen size={20} />
            <span className="font-medium">Notlar</span>
          </button>
          
          <button 
            onClick={() => setView("tasks")}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${view === "tasks" ? "bg-emerald-600 text-white" : "hover:bg-zinc-800 text-zinc-400"}`}
          >
            <CheckSquare size={20} />
            <span className="font-medium">Görevler</span>
          </button>

          <div className="pt-6 pb-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3">Kategoriler</div>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => { setView("tasks"); setSelectedCategory(c); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${selectedCategory === c && view === "tasks" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              • {c}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 max-w-4xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            {view === "notes" ? "Notlarım" : `Görevler: ${selectedCategory}`}
          </h1>
          <p className="text-zinc-500 text-sm">Bugün neler yapıyoruz?</p>
        </header>

        {/* INPUT AREA */}
        <div className="relative group mb-10">
          <input
            value={view === "notes" ? noteInput : taskInput}
            onChange={(e) => view === "notes" ? setNoteInput(e.target.value) : setTaskInput(e.target.value)}
            placeholder={view === "notes" ? "Yeni bir not yazın..." : "Yeni bir görev ekleyin..."}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-2xl"
            onKeyDown={(e) => e.key === "Enter" && (view === "notes" ? addNote() : addTask())}
          />
          <button 
            onClick={view === "notes" ? addNote : addTask}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-xl hover:bg-zinc-200 transition-all active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* LIST AREA */}
        <div className="grid gap-3">
          {view === "notes" ? (
            notes.map((n) => (
              <div key={n.id} className="group flex justify-between items-center bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-xl hover:border-zinc-700 transition-all">
                <span className="text-zinc-300 leading-relaxed">{n.text}</span>
                <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            tasks.filter((t) => t.category === selectedCategory).map((t) => (
              <div key={t.id} className={`group flex justify-between items-center p-4 rounded-xl border transition-all ${t.done ? "bg-zinc-900/20 border-zinc-900/50" : "bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700"}`}>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(t)}>
                  <div className="text-emerald-500">
                    {t.done ? <CheckCircle2 size={22} /> : <Circle size={22} className="text-zinc-600" />}
                  </div>
                  <span className={`transition-all ${t.done ? "line-through text-zinc-600" : "text-zinc-200"}`}>
                    {t.text}
                  </span>
                </div>
                <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
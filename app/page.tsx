"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, Plus, Calendar, Clock, LayoutGrid, PenTool, Eye, User } from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
};

const categories = ["Teknoloji", "Yaşam", "Yazılım", "Genel"];

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [isAdmin, setIsAdmin] = useState(false); // Admin modu kontrolü

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const addPost = async () => {
    if (!title.trim() || !content.trim()) return;
    await addDoc(collection(db, "posts"), {
      title,
      content,
      category,
      createdAt: Date.now(),
    });
    setTitle("");
    setContent("");
  };

  const deletePost = async (id: string) => {
    if (confirm("Bu yazıyı silmek istediğine emin misin?")) {
      await deleteDoc(doc(db, "posts", id));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-lg italic">B</div>
            BLOGUM
          </div>
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${isAdmin ? "bg-red-500/10 border-red-500/50 text-red-400" : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}
          >
            {isAdmin ? "Admin: AÇIK" : "Admin Girişi"}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        
        {/* YAZI EKLEME PANELİ (Sadece Admin Görebilir) */}
        {isAdmin && (
          <div className="mb-16 bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-6 text-emerald-400 font-medium">
              <PenTool size={20} /> Yeni Blog Yazısı Oluştur
            </div>
            <div className="space-y-4">
              <input
                placeholder="Yazı Başlığı..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              />
              <div className="flex gap-4">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <textarea
                placeholder="Yazı içeriğini buraya dökün..."
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all resize-none"
              />
              <button 
                onClick={addPost}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Yazıyı Yayınla
              </button>
            </div>
          </div>
        )}

        {/* BAŞLIK ALANI */}
        {!isAdmin && (
          <header className="mb-16 text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter">DÜŞÜNCELER.</h1>
            <p className="text-zinc-500 max-w-lg mx-auto italic">Teknoloji, hayat ve aradaki her şey üzerine tutulmuş ufak notlar.</p>
          </header>
        )}

        {/* BLOG YAZILARI LİSTESİ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <article 
              key={post.id} 
              className="group relative bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                  {post.category}
                </span>
                <span className="text-zinc-600 text-xs flex items-center gap-1">
                  <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-4 group-hover:text-emerald-400 transition-colors leading-tight">
                {post.title}
              </h2>
              
              <p className="text-zinc-400 line-clamp-3 text-sm leading-relaxed mb-6">
                {post.content}
              </p>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <User size={14} /> Admin
                  <span className="flex items-center gap-1 ml-2"><Clock size={12}/> 3 dk okuma</span>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={() => deletePost(post.id)}
                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-600">Henüz bir yazı paylaşılmadı.</p>
          </div>
        )}

      </main>
    </div>
  );
}
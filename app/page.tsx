"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Trash2, Plus, Calendar, LogOut, PenTool, User as UserIcon, X, Save, Rss, Copy, Check } from "lucide-react";

type BlogPost = { id: string; title: string; content: string; category: string; createdAt: number; userId: string; };
const categories = ["Genel", "Teknoloji", "Yaşam", "Yazılım"];

export default function MultiUserBlog() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [feedPosts, setFeedPosts] = useState<BlogPost[]>([]);
  const [activeTab, setActiveTab] = useState<"my" | "feed">("my");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form stateleri
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubAuth();
  }, []);

  // Yazılarım ve Akış Verilerini Çek
  useEffect(() => {
    if (!user) return;

    // 1. Yazılarım
    const qMy = query(collection(db, "posts"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(qMy, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(fetched);
    });

    // 2. Akış (Takip edilenler)
    const fetchFeed = async () => {
      const qFollows = query(collection(db, "follows"), where("followerId", "==", user.uid));
      const followSnap = await getDocs(qFollows);
      const followingIds = followSnap.docs.map(d => d.data().followingId);

      if (followingIds.length > 0) {
        // Takip edilenlerin yazılarını getir
        const qFeed = query(collection(db, "posts"), where("userId", "in", followingIds));
        onSnapshot(qFeed, (snap) => {
          const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          fetched.sort((a, b) => b.createdAt - a.createdAt);
          setFeedPosts(fetched);
        });
      }
    };
    fetchFeed();

    return () => unsubMy();
  }, [user]);

  const copyProfileLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/u/${user.uid}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ... (addPost, deletePost, saveEditedPost fonksiyonları aynı kalıyor)
  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { title, content, category, createdAt: Date.now(), userId: user.uid });
    setTitle(""); setContent("");
  };

  const deletePost = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", id));
  };

  const saveEditedPost = async () => {
    if (!editingPost) return;
    await updateDoc(doc(db, "posts", editingPost.id), { title, content, category });
    setEditingPost(null);
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 uppercase text-xs tracking-widest">Sistem Hazırlanıyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic tracking-tighter">BAYIR'S</div>
        {user && (
          <div className="flex items-center gap-4">
            <button onClick={copyProfileLink} className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all">
              {copied ? <><Check size={14} className="text-emerald-500" /> Kopyalandı</> : <><Copy size={14} /> Profili Paylaş</>}
            </button>
            <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400"><LogOut size={20} /></button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-20">
            <h1 className="text-6xl font-black mb-8 tracking-tighter">DÜNYAYA ANLAT.</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-10 py-4 rounded-2xl font-bold">Google ile Başla</button>
          </div>
        ) : (
          <>
            {/* YAZI EKLEME FORMU AYNI KALIYOR */}
            <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
               <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-bold mb-4 outline-none placeholder:text-zinc-800" />
               <textarea placeholder="Neler oluyor?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none placeholder:text-zinc-800" rows={3} />
               <div className="flex justify-between items-center">
                 <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-xs px-3 py-1.5 rounded-lg outline-none uppercase font-bold tracking-widest text-zinc-400">
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <button onClick={addPost} className="bg-emerald-600 px-6 py-2 rounded-xl font-bold text-sm">Paylaş</button>
               </div>
            </div>

            {/* SEKME SEÇİCİ */}
            <div className="flex gap-8 mb-8 border-b border-zinc-800/50">
              <button onClick={() => setActiveTab("my")} className={`pb-4 text-sm font-bold tracking-widest uppercase transition-all ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
              <button onClick={() => setActiveTab("feed")} className={`pb-4 text-sm font-bold tracking-widest uppercase transition-all ${activeTab === "feed" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Akış (Takip)</button>
            </div>

            {/* İÇERİK LİSTESİ */}
            <div className="grid grid-cols-1 gap-6">
              {(activeTab === "my" ? posts : feedPosts).map(post => (
                <article key={post.id} onClick={() => activeTab === "my" && setEditingPost(post)} className={`bg-zinc-900/20 border border-zinc-800/50 p-6 rounded-2xl transition-all ${activeTab === "my" ? "cursor-pointer hover:bg-zinc-900/40" : ""}`}>
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/50">{post.category}</span>
                    {activeTab === "my" && <button onClick={(e) => deletePost(e, post.id)} className="text-zinc-800 hover:text-red-500"><Trash2 size={16} /></button>}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-2">{post.content}</p>
                </article>
              ))}
              {(activeTab === "feed" && feedPosts.length === 0) && <div className="text-center py-20 text-zinc-700 text-xs uppercase tracking-widest italic">Henüz takip ettiğin kimse yok veya arkadaşların bir şey paylaşmamış.</div>}
            </div>
          </>
        )}
      </main>

      {/* DÜZENLEME MODALI (Modal kodları buraya gelecek - Bir önceki kodun aynısı) */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-2xl relative">
            <button onClick={() => setEditingPost(null)} className="absolute top-6 right-6 text-zinc-500"><X /></button>
            <h2 className="text-2xl font-bold mb-6 text-emerald-500">Yazıyı Düzenle</h2>
            <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-zinc-800 p-4 rounded-xl mb-4 outline-none" />
            <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-zinc-800 p-4 rounded-xl mb-4 outline-none" rows={6} />
            <button onClick={async () => {
              await updateDoc(doc(db, "posts", editingPost.id), { title: editingPost.title, content: editingPost.content });
              setEditingPost(null);
            }} className="w-full bg-emerald-600 py-4 rounded-xl font-bold">Değişiklikleri Kaydet</button>
          </div>
        </div>
      )}
    </div>
  );
}
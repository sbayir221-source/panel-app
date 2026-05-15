"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc, // Güncelleme için yeni eklendi
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Trash2, Plus, Calendar, LogOut, PenTool, User as UserIcon, X, Save } from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  userId: string;
};

const categories = ["Genel", "Teknoloji", "Yaşam", "Yazılım"];

export default function MultiUserBlog() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni yazı ekleme stateleri
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");

  // Düzenleme (Modal) stateleri
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("Genel");

  // 🔐 KULLANICI DURUMUNU TAKİP ET
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // 📝 SADECE KULLANICIYA AİT YAZILARI ÇEK
  useEffect(() => {
    if (!user) {
      setPosts([]);
      return;
    }

    // orderBy şimdilik kapalı, indeks sorunu olmaması için
    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid)
    );

    const unsubPosts = onSnapshot(q, (snap) => {
      // Yazıları tarihe göre manuel sıralıyoruz (En yeni en üstte)
      const fetchedPosts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      fetchedPosts.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(fetchedPosts);
    });

    return () => unsubPosts();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), {
      title,
      content,
      category,
      createdAt: Date.now(),
      userId: user.uid,
    });
    setTitle("");
    setContent("");
  };

  const deletePost = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Karta tıklama olayını durdurur, sadece siler
    if (confirm("Bu yazıyı silmek istediğine emin misin?")) {
      await deleteDoc(doc(db, "posts", id));
    }
  };

  // Düzenleme penceresini aç
  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
  };

  // Değişiklikleri Firebase'e kaydet
  const saveEditedPost = async () => {
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;
    
    const postRef = doc(db, "posts", editingPost.id);
    await updateDoc(postRef, {
      title: editTitle,
      content: editContent,
      category: editCategory,
    });
    
    setEditingPost(null); // Modalı kapat
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 bg-emerald-500 text-black flex items-center justify-center rounded-lg italic">B</div>
            Bayir's
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <img src={user.photoURL || ""} alt="" className="w-5 h-5 rounded-full" />
                <span className="hidden md:inline">{user.displayName}</span>
              </div>
              <button onClick={logout} className="text-zinc-500 hover:text-red-400 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button onClick={login} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all">
              Google ile Giriş
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-12 relative">
        {!user ? (
          <div className="text-center py-20">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">KENDİ BLOGUNU OLUŞTUR.</h1>
            <button onClick={login} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-900/20">
              Hemen Başla
            </button>
          </div>
        ) : (
          <>
            <div className="mb-16 bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-2 mb-6 text-emerald-400 font-medium">
                <PenTool size={20} /> Yeni Bir Şeyler Paylaş
              </div>
              <div className="space-y-4">
                <input
                  placeholder="Başlık..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all"
                />
                <textarea
                  placeholder="İçerik..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
                <div className="flex justify-between items-center">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2">
                    <Plus size={20} /> Kaydet
                  </button>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <UserIcon size={24} className="text-zinc-500" /> Yazıların
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <article 
                  key={post.id} 
                  onClick={() => openEditModal(post)} // Karta tıklayınca modalı aç
                  className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all group cursor-pointer hover:bg-zinc-900/60"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-500">{post.category}</span>
                    <button 
                      onClick={(e) => deletePost(e, post.id)} // Sadece bu butona tıklanınca sil
                      className="text-zinc-700 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{post.title}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-3 mb-6">{post.content}</p>
                  <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {/* DÜZENLEME MODALI (Açılır Pencere) */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Kapat Butonu */}
            <button 
              onClick={() => setEditingPost(null)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-2 rounded-full"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-6 pr-10 text-emerald-400">Yazıyı Düzenle</h2>
            
            <div className="space-y-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all text-xl font-semibold"
              />
              <textarea
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                <select 
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  onClick={saveEditedPost} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <Save size={20} /> Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
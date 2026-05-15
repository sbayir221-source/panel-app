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
import { Trash2, Plus, Calendar, LogOut, PenTool, User as UserIcon, Google as GoogleIcon } from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  userId: string; // Yazının kime ait olduğunu tutacağız
};

export default function MultiUserBlog() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [loading, setLoading] = useState(true);

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

    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid), // Kritik nokta: Sadece benimkiler!
      orderBy("createdAt", "desc")
    );

    const unsubPosts = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
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
      userId: user.uid, // Yazıyı kullanıcının kimliğiyle mühürle
    });
    setTitle("");
    setContent("");
  };

  const deletePost = async (id: string) => {
    await deleteDoc(doc(db, "posts", id));
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 bg-emerald-500 text-black flex items-center justify-center rounded-lg italic">B</div>
            YAZAR.APP
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
            <button 
              onClick={login}
              className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              Google ile Giriş
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        {!user ? (
          /* GİRİŞ YAPILMAMIŞSA GÖSTERİLECEK EKRAN */
          <div className="text-center py-20">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">KENDİ BLOGUNU OLUŞTUR.</h1>
            <p className="text-zinc-500 mb-10 max-w-lg mx-auto">Hemen giriş yap ve sadece senin görebileceğin, sana özel yazılarını yazmaya baş.</p>
            <button onClick={login} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl shadow-emerald-900/20">
              Hemen Başla
            </button>
          </div>
        ) : (
          /* GİRİŞ YAPILMIŞSA PANEL VE YAZILAR */
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
                <button 
                  onClick={addPost}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Kaydet
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <UserIcon size={24} className="text-zinc-500" /> Yazıların
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <article key={post.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-500">{post.category}</span>
                    <button onClick={() => deletePost(post.id)} className="text-zinc-700 hover:text-red-500 transition-colors">
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
            
            {posts.length === 0 && <div className="text-center py-10 text-zinc-600">Henüz bir yazın yok.</div>}
          </>
        )}
      </main>
    </div>
  );
}
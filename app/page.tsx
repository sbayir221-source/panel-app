"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, getDocs, limit 
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Plus, Calendar, LogOut, PenTool, 
  User as UserIcon, X, Save, Rss, Copy, Check, Globe, UserPlus, UserCheck 
} from "lucide-react";

type BlogPost = { 
  id: string; 
  title: string; 
  content: string; 
  category: string; 
  createdAt: number; 
  userId: string; 
  userEmail?: string;
};

const categories = ["Genel", "Teknoloji", "Yaşam", "Yazılım"];

export default function MultiUserBlog() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]); // Benim yazılarım
  const [feedPosts, setFeedPosts] = useState<BlogPost[]>([]); // Takip ettiklerim
  const [explorePosts, setExplorePosts] = useState<BlogPost[]>([]); // Herkes
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<"my" | "feed" | "explore">("explore");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form stateleri
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
      if(u) setActiveTab("explore"); // Giriş yapınca Keşfet'ten başla
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Yazılarım
    const qMy = query(collection(db, "posts"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(qMy, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(fetched);
    });

    // 2. Takip Ettiklerimin Listesini Al
    const qFollows = query(collection(db, "follows"), where("followerId", "==", user.uid));
    const unsubFollows = onSnapshot(qFollows, (snap) => {
      const ids = snap.docs.map(d => d.data().followingId);
      setFollowingIds(ids);
      
      // Takip edilenlerin yazılarını getir
      if (ids.length > 0) {
        const qFeed = query(collection(db, "posts"), where("userId", "in", ids));
        onSnapshot(qFeed, (fSnap) => {
          const fItems = fSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          fItems.sort((a, b) => b.createdAt - a.createdAt);
          setFeedPosts(fItems);
        });
      } else {
        setFeedPosts([]);
      }
    });

    // 3. Keşfet (Tüm yazılar - son 50 yazı)
    const qExplore = query(collection(db, "posts"), limit(50));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setExplorePosts(fetched);
    });

    return () => {
      unsubMy();
      unsubFollows();
      unsubExplore();
    };
  }, [user]);

  const copyProfileLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/u/${user.uid}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { 
      title, 
      content, 
      category, 
      createdAt: Date.now(), 
      userId: user.uid,
      userEmail: user.email // Kimin yazdığını anlamak için
    });
    setTitle(""); setContent("");
  };

  const deletePost = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", id));
  };

  const followUser = async (e: any, targetId: string) => {
    e.stopPropagation();
    if (!user || user.uid === targetId) return;
    await addDoc(collection(db, "follows"), {
      followerId: user.uid,
      followingId: targetId,
      createdAt: Date.now()
    });
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 uppercase text-xs tracking-widest">Sistem Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic tracking-tighter text-emerald-500">BAYIR'S BLOG</div>
        {user && (
          <div className="flex items-center gap-4">
            <button onClick={copyProfileLink} className="hidden md:flex text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg items-center gap-2 hover:bg-zinc-800 transition-all">
              {copied ? <><Check size={14} className="text-emerald-500" /> Kopyalandı</> : <><Copy size={14} /> Linkimi Kopyala</>}
            </button>
            <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400"><LogOut size={20} /></button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-24">
            <h1 className="text-7xl font-black mb-8 tracking-tighter bg-gradient-to-b from-white to-zinc-800 bg-clip-text text-transparent">KEŞFET. YAZ. PAYLAŞ.</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-900/20">Google ile Giriş Yap</button>
          </div>
        ) : (
          <>
            <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
               <input placeholder="Başlık girin..." value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-bold mb-4 outline-none placeholder:text-zinc-800" />
               <textarea placeholder="Bugün neler anlatmak istersin?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none placeholder:text-zinc-800" rows={3} />
               <div className="flex justify-between items-center">
                 <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-1.5 rounded-lg outline-none uppercase font-black tracking-widest text-zinc-500">
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"><Plus size={18}/> Paylaş</button>
               </div>
            </div>

            <div className="flex gap-8 mb-8 border-b border-zinc-800/50">
              <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><Globe size={14}/> Keşfet</button>
              <button onClick={() => setActiveTab("feed")} className={`pb-4 text-[11px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${activeTab === "feed" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><Rss size={14}/> Akış</button>
              <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><UserIcon size={14}/> Yazılarım</button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {(activeTab === "my" ? posts : activeTab === "feed" ? feedPosts : explorePosts).map(post => {
                const isMyPost = post.userId === user.uid;
                const isFollowing = followingIds.includes(post.userId);

                return (
                  <article 
                    key={post.id} 
                    onClick={() => isMyPost && setEditingPost(post)} 
                    className={`group bg-zinc-900/20 border border-zinc-800/50 p-6 rounded-2xl transition-all relative ${isMyPost ? "cursor-pointer hover:bg-zinc-900/40" : "hover:bg-zinc-900/30"}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/50">{post.category}</span>
                        {!isMyPost && <span className="text-[10px] text-zinc-600 mt-1 uppercase font-bold">{post.userEmail?.split('@')[0] || "Anonim"}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Takip Et Butonu (Keşfet'te ve başkasının yazısıysa görünür) */}
                        {!isMyPost && !isFollowing && (
                          <button 
                            onClick={(e) => followUser(e, post.userId)}
                            className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:bg-emerald-600 hover:text-white transition-all"
                          >
                            <UserPlus size={12} /> Takip Et
                          </button>
                        )}
                        {isFollowing && !isMyPost && <span className="text-zinc-700 text-[10px] font-black uppercase flex items-center gap-1"><UserCheck size={12}/> Takipte</span>}
                        {isMyPost && <button onClick={(e) => deletePost(e, post.id)} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                    <div className="mt-6 pt-4 border-t border-zinc-800/30 flex justify-between items-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </article>
                )
              })}
              {activeTab === "feed" && feedPosts.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
                  <p className="text-zinc-600 text-sm italic">Takip ettiğin kimse henüz bir şey paylaşmamış.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* DÜZENLEME MODALI */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-2xl relative shadow-2xl">
            <button onClick={() => setEditingPost(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X /></button>
            <h2 className="text-2xl font-black mb-8 text-emerald-500 tracking-tighter">YAZIYI DÜZENLE</h2>
            <div className="space-y-4">
              <input 
                value={editingPost.title} 
                onChange={e => setEditingPost({...editingPost, title: e.target.value})} 
                className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-xl outline-none focus:border-emerald-500 transition-all font-bold" 
              />
              <textarea 
                value={editingPost.content} 
                onChange={e => setEditingPost({...editingPost, content: e.target.value})} 
                className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-xl outline-none focus:border-emerald-500 transition-all resize-none" 
                rows={8} 
              />
              <button 
                onClick={async () => {
                  await updateDoc(doc(db, "posts", editingPost.id), { title: editingPost.title, content: editingPost.content });
                  setEditingPost(null);
                }} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black tracking-widest text-sm transition-all"
              >
                GÜNCELLEMEYİ KAYDET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, limit 
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Plus, Calendar, LogOut, PenTool, 
  User as UserIcon, X, Globe, UserPlus, UserCheck, Copy, Check, Rss 
} from "lucide-react";
import { useRouter } from "next/navigation"; // Yeni eklendi

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
const ADMIN_UID = "jVRQixwQyWWGhg0i9i5s88xjK6u1";

export default function MultiUserBlog() {
  const router = useRouter(); // Yönlendirme için tanımladık
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]); 
  const [feedPosts, setFeedPosts] = useState<BlogPost[]>([]); 
  const [explorePosts, setExplorePosts] = useState<BlogPost[]>([]); 
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<"my" | "feed" | "explore">("explore");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
      if(u) setActiveTab("explore");
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qMy = query(collection(db, "posts"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(qMy, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(fetched);
    });

    const qFollows = query(collection(db, "follows"), where("followerId", "==", user.uid));
    const unsubFollows = onSnapshot(qFollows, (snap) => {
      const ids = snap.docs.map(d => d.data().followingId);
      setFollowingIds(ids);
      
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

    const qExplore = query(collection(db, "posts"), limit(100));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setExplorePosts(fetched);
    });

    return () => { unsubMy(); unsubFollows(); unsubExplore(); };
  }, [user]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { 
      title, content, category, createdAt: Date.now(), 
      userId: user.uid, userEmail: user.email 
    });
    setTitle(""); setContent("");
  };

  const deletePost = async (e: any, id: string, isFromAdmin: boolean) => {
    e.stopPropagation();
    const message = isFromAdmin ? "ADMIN YETKİSİYLE bu yazıyı silmek istiyor musunuz?" : "Yazıyı silmek istediğinize emin misiniz?";
    if (confirm(message)) {
      await deleteDoc(doc(db, "posts", id));
    }
  };

  const followUser = async (e: any, targetId: string) => {
    e.stopPropagation();
    if (!user || user.uid === targetId) return;
    await addDoc(collection(db, "follows"), {
      followerId: user.uid, followingId: targetId, createdAt: Date.now()
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/u/${user?.uid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-mono text-xs uppercase tracking-widest">Sistem Hazırlanıyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 selection:bg-emerald-500/30 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic tracking-tighter text-emerald-500 cursor-pointer" onClick={() => router.push("/")}>BAYIR'S BLOG</div>
        {user && (
          <div className="flex items-center gap-4">
            <button onClick={copyLink} className="hidden md:flex text-[10px] font-black uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg items-center gap-2 hover:bg-zinc-800 transition-all">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? "Kopyalandı" : "Linkim"}
            </button>
            <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-32">
            <h1 className="text-7xl font-black mb-8 tracking-tighter bg-gradient-to-b from-white to-zinc-800 bg-clip-text text-transparent italic">ÖZGÜRCE PAYLAŞ.</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-105 transition-all">Google ile Bağlan</button>
          </div>
        ) : (
          <>
            <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] shadow-2xl">
               <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
               <textarea placeholder="Neler oluyor?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-6 outline-none resize-none placeholder:text-zinc-800 leading-relaxed" rows={3} />
               <div className="flex justify-between items-center pt-4 border-t border-zinc-800/30">
                 <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-2 rounded-lg outline-none uppercase font-black tracking-widest text-zinc-500">
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2">Paylaş <Plus size={16}/></button>
               </div>
            </div>

            <div className="flex gap-8 mb-10 border-b border-zinc-800/50 overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black tracking-[0.25em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><Globe size={14}/> Keşfet</button>
              <button onClick={() => setActiveTab("feed")} className={`pb-4 text-[11px] font-black tracking-[0.25em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "feed" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><Rss size={14}/> Akış</button>
              <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black tracking-[0.25em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}><UserIcon size={14}/> Yazılarım</button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {(activeTab === "my" ? posts : activeTab === "feed" ? feedPosts : explorePosts).map(post => {
                const isMyPost = post.userId === user.uid;
                const isFollowing = followingIds.includes(post.userId);

                return (
                  <article 
                    key={post.id} 
                    onClick={() => {
                      if (isMyPost) {
                        setEditingPost(post);
                      } else {
                        router.push(`/u/${post.userId}`);
                      }
                    }}
                    className={`group bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-3xl transition-all relative cursor-pointer ${isMyPost ? "hover:bg-zinc-900/50" : "hover:bg-zinc-900/40 hover:border-emerald-500/30"}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{post.category}</span>
                        {!isMyPost && <span className="text-[11px] text-zinc-500 font-bold lowercase hover:text-emerald-400">@{post.userEmail?.split('@')[0]} • Profili Gör</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isMyPost && !isFollowing && (
                          <button onClick={(e) => followUser(e, post.userId)} className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"><UserPlus size={12}/></button>
                        )}
                        {isFollowing && !isMyPost && <UserCheck size={14} className="text-zinc-700" />}
                        {(isMyPost || isAdmin) && (
                          <button onClick={(e) => deletePost(e, post.id, !isMyPost && isAdmin)} className={`p-2 rounded-lg transition-colors ${!isMyPost && isAdmin ? "text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white" : "text-zinc-700 hover:text-red-500"}`}><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4 leading-tight group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{post.content}</p>
                    <div className="mt-8 pt-4 border-t border-zinc-800/50 flex items-center gap-1 text-[10px] text-zinc-600 font-black uppercase">
                       <Calendar size={12}/> {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* DÜZENLEME MODALI */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-2xl relative shadow-2xl">
            <button onClick={() => setEditingPost(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            <h2 className="text-2xl font-black mb-8 text-emerald-500 italic uppercase">Düzenle</h2>
            <div className="space-y-6">
              <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl" />
              <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed" rows={8} />
              <button onClick={async () => {
                await updateDoc(doc(db, "posts", editingPost.id), { title: editingPost.title, content: editingPost.content });
                setEditingPost(null);
              }} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl font-black tracking-[0.2em] text-xs transition-all shadow-xl shadow-emerald-900/20 uppercase">Değişiklikleri Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
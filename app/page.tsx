"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, limit 
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Plus, Calendar, LogOut, User as UserIcon, X, Globe, 
  UserPlus, UserCheck, Copy, Check, Rss, Image as ImageIcon 
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- BBCODE ÇÖZÜCÜ ---
const parseBBCode = (text: string = "") => {
  let html = text
    .replace(/\[b\](.*?)\[\/b\]/g, "<strong>$1</strong>")
    .replace(/\[i\](.*?)\[\/i\]/g, "<em>$1</em>")
    .replace(/\[u\](.*?)\[\/u\]/g, "<span class='underline'>$1</span>")
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/g, "<span style='color: $1'>$2</span>")
    .replace(/\[size=(.*?)\](.*?)\[\/size\]/g, "<span style='font-size: $1px'>$2</span>")
    .replace(/\[img\](.*?)\[\/img\]/g, "<img src='$1' class='w-full h-auto rounded-2xl my-4 border border-zinc-800' />")
    .replace(/\n/g, "<br/>");
  return { __html: html };
};

const categories = ["Genel", "Teknoloji", "Yaşam", "Yazılım"];
const ADMIN_UID = "jVRQixwQyWWGhg0i9i5s88xjK6u1";

export default function MultiUserBlog() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<any[]>([]); 
  const [explorePosts, setExplorePosts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "explore">("explore");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);
  
  // DÜZENLEME STATELERİ
  const [editingPost, setEditingPost] = useState<any>(null);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
      if(u) setActiveTab("explore"); 
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qMy = query(collection(db, "posts"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(qMy, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(fetched.sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    const qExplore = query(collection(db, "posts"), limit(50));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExplorePosts(fetched.sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    return () => { unsubMy(); unsubExplore(); };
  }, [user]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { 
        title, content, category, 
        imageUrl: imageUrl || null, 
        createdAt: Date.now(), 
        userId: user.uid, 
        userEmail: user.email 
    });
    setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    await updateDoc(doc(db, "posts", editingPost.id), {
      title: editingPost.title,
      content: editingPost.content,
      category: editingPost.category,
      imageUrl: editingPost.imageUrl || null
    });
    setEditingPost(null);
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs uppercase tracking-widest italic">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer" onClick={() => router.push("/")}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-32">
            <h1 className="text-7xl font-black mb-8 tracking-tighter italic">KEŞFET. PAYLAŞ.</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase hover:scale-105 transition-all">Bağlan</button>
          </div>
        ) : (
          <>
            {/* PAYLAŞIM FORMU */}
            <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem] shadow-2xl">
               <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
               <div className="flex gap-2 mb-4">
                  <button onClick={() => setContent(content + "[b][/b]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-zinc-500 uppercase">Bold</button>
                  <button onClick={() => setContent(content + "[img][/img]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-emerald-500 uppercase">Img</button>
               </div>
               <textarea placeholder="Mesajını yaz..." value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none placeholder:text-zinc-800 text-lg" rows={4} />
               
               {showImageInput && (
                 <input placeholder="Kapak Resmi URL'si..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl mb-4 text-sm outline-none" />
               )}

               <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
                 <div className="flex items-center gap-4">
                   <button onClick={() => setShowImageInput(!showImageInput)} className={`p-2 rounded-xl transition-all ${imageUrl ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-600'}`}><ImageIcon size={22}/></button>
                   <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-2 rounded-lg uppercase font-black text-zinc-500 tracking-widest">
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">PAYLAŞ</button>
               </div>
            </div>

            <div className="flex gap-8 mb-10 border-b border-zinc-800/50">
              <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Keşfet</button>
              <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {(activeTab === "my" ? posts : explorePosts).map((post:any) => {
                const isMyPost = post.userId === user.uid;
                return (
                  <article 
                    key={post.id} 
                    onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}
                    className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden hover:bg-zinc-900/30 transition-all cursor-pointer group"
                  >
                    {post.imageUrl && <img src={post.imageUrl} className="w-full h-72 object-cover border-b border-zinc-800/50" />}
                    <div className="p-8">
                      <div className="flex justify-between mb-4">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">{post.category}</span>
                        {(isMyPost || isAdmin) && (
                          <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-4 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                      <div className="text-zinc-400 text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                      <div className="flex justify-between items-center pt-4 border-t border-zinc-800/30 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
                        <span>@{post.userEmail?.split('@')[0]} {isMyPost && "(Sen)"}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* DÜZENLEME MODALI (GERİ GELDİ!) */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-2xl relative shadow-2xl">
            <button onClick={() => setEditingPost(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            <h2 className="text-2xl font-black mb-8 text-emerald-500 uppercase italic">Düzenle</h2>
            <div className="space-y-6">
              <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-xl text-white" />
              <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed text-white" rows={8} />
              <input placeholder="Kapak Resmi URL" value={editingPost.imageUrl || ""} onChange={e => setEditingPost({...editingPost, imageUrl: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm text-white" />
              <button onClick={saveEdit} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl font-black tracking-widest text-xs transition-all uppercase shadow-xl shadow-emerald-900/20">Değişiklikleri Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
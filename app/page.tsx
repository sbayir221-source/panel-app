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

// --- BBCODE ÇÖZÜCÜ FONKSİYON (Görsel Desteği Eklendi) ---
const parseBBCode = (text: string) => {
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
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "feed" | "explore">("explore");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); // Resim linki için state
  const [showImageInput, setShowImageInput] = useState(false);
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

    // 1. Yazılarım
    const qMy = query(collection(db, "posts"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(qMy, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a:any, b:any) => b.createdAt - a.createdAt);
      setPosts(fetched);
    });

    // 2. Takip & Keşfet
    const qExplore = query(collection(db, "posts"), limit(100));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a:any, b:any) => b.createdAt - a.createdAt);
      setExplorePosts(fetched);
    });

    return () => { unsubMy(); unsubExplore(); };
  }, [user]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { 
      title, content, category, imageUrl, createdAt: Date.now(), 
      userId: user.uid, userEmail: user.email 
    });
    setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs tracking-tighter">YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer" onClick={() => router.push("/")}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {user && (
          <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem] shadow-2xl">
            <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-6 outline-none placeholder:text-zinc-800" />
            
            {/* BBCODE ARAÇ ÇUBUĞU */}
            <div className="flex flex-wrap gap-2 mb-4">
               <button onClick={() => setContent(content + "[b][/b]")} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-zinc-400 transition-all">Bold</button>
               <button onClick={() => setContent(content + "[i][/i]")} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-zinc-400 transition-all">Italic</button>
               <button onClick={() => setContent(content + "[color=red][/color]")} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-zinc-400 transition-all">Color</button>
               <button onClick={() => setContent(content + "[img]RESİM_LİNKİ_BURAYA[/img]")} className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all">Img BBCode</button>
            </div>

            <textarea placeholder="Mesajını yaz... [b]kalın[/b] gibi BBCode'lar kullanabilirsin." value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-6 outline-none resize-none placeholder:text-zinc-800 leading-relaxed text-lg" rows={5} />
            
            {/* RESİM LİNKİ GİRİŞİ */}
            {showImageInput && (
              <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex gap-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded-2xl">
                  <input placeholder="Kapak Resmi Linki (URL)..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
                  <button onClick={() => setShowImageInput(false)} className="p-2 text-zinc-500"><X size={16}/></button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowImageInput(!showImageInput)} 
                  className={`p-2 rounded-xl transition-all ${imageUrl ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                >
                  <ImageIcon size={20}/>
                </button>
                <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-4 py-2.5 rounded-xl outline-none uppercase font-black text-zinc-500 tracking-widest">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/20">PAYLAŞ</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10">
          {(activeTab === "my" ? posts : explorePosts).map((post:any) => {
            const isMyPost = post.userId === user?.uid;
            return (
              <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem] overflow-hidden hover:bg-zinc-900/30 transition-all group">
                {/* KAPAK RESMİ */}
                {post.imageUrl && (
                  <div className="w-full h-80 overflow-hidden border-b border-zinc-800/50">
                    <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                )}
                
                <div className="p-10">
                  <div className="flex justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">{post.category}</span>
                    {(isMyPost || isAdmin) && (
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          if(confirm("Bu yazı silinecek, emin misin?")) await deleteDoc(doc(db, "posts", post.id)); 
                        }} 
                        className="text-zinc-800 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>

                  <h3 className="text-3xl font-black mb-6 leading-tight tracking-tighter">{post.title}</h3>
                  
                  {/* BBCODE RENDER */}
                  <div 
                    className="text-zinc-400 text-base leading-relaxed mb-8 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={parseBBCode(post.content)}
                  />

                  <div className="flex items-center justify-between pt-6 border-t border-zinc-800/30 text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[8px] text-emerald-500">
                        {post.userEmail?.charAt(0).toUpperCase()}
                      </div>
                      <span>@{post.userEmail?.split('@')[0]}</span>
                    </div>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
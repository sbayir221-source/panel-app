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

// --- BBCODE ÇÖZÜCÜ (Hata vermemesi için kontrol eklendi) ---
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
  const [activeTab, setActiveTab] = useState<"my" | "explore">("explore"); // Sorun çıkmaması için şimdilik Akış'ı basitleştirdik
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);

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
      setPosts(fetched.sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    // 2. Keşfet
    const qExplore = query(collection(db, "posts"), limit(50));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExplorePosts(fetched.sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    return () => { unsubMy(); unsubExplore(); };
  }, [user]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) {
        alert("Lütfen başlık ve içerik doldurun!");
        return;
    }
    try {
        await addDoc(collection(db, "posts"), { 
            title, content, category, 
            imageUrl: imageUrl || null, 
            createdAt: Date.now(), 
            userId: user.uid, 
            userEmail: user.email 
        });
        setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
    } catch (e) {
        alert("Paylaşım yapılamadı!");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs">YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer" onClick={() => router.push("/")}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-32">
            <h1 className="text-6xl font-black mb-8 tracking-tighter italic">GİRİŞ YAP VE PAYLAŞ.</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase hover:scale-105 transition-all">Google ile Bağlan</button>
          </div>
        ) : (
          <>
            <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem]">
               <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
               <div className="flex gap-2 mb-4">
                  <button onClick={() => setContent(content + "[b][/b]")} className="text-[9px] bg-zinc-800 px-2 py-1 rounded font-bold uppercase text-zinc-500">Bold</button>
                  <button onClick={() => setContent(content + "[img]LİNK[/img]")} className="text-[9px] bg-zinc-800 px-2 py-1 rounded font-bold uppercase text-zinc-500 text-emerald-500">Image</button>
               </div>
               <textarea placeholder="Neler oluyor? BBCode kullanabilirsin." value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none placeholder:text-zinc-800 text-lg" rows={4} />
               
               {showImageInput && (
                 <input placeholder="Kapak Resmi URL..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full bg-zinc-800/50 border border-zinc-700 p-3 rounded-xl mb-4 text-sm outline-none" />
               )}

               <div className="flex justify-between items-center pt-4 border-t border-zinc-800/30">
                 <div className="flex items-center gap-3">
                   <button onClick={() => setShowImageInput(!showImageInput)} className={`p-2 rounded-lg ${imageUrl ? 'text-emerald-500' : 'text-zinc-600'}`}><ImageIcon size={20}/></button>
                   <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-2 rounded-lg uppercase font-black text-zinc-500">
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <button onClick={addPost} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all">PAYLAŞ</button>
               </div>
            </div>

            <div className="flex gap-6 mb-10 border-b border-zinc-800/50">
              <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Keşfet</button>
              <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {(activeTab === "my" ? posts : explorePosts).map((post:any) => (
                <article key={post.id} onClick={() => post.userId !== user.uid && router.push(`/u/${post.userId}`)} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden hover:bg-zinc-900/30 transition-all cursor-pointer">
                  {post.imageUrl && <img src={post.imageUrl} className="w-full h-64 object-cover" />}
                  <div className="p-8">
                    <div className="flex justify-between mb-4">
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">{post.category}</span>
                      {(post.userId === user.uid || isAdmin) && (
                        <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500"><Trash2 size={16}/></button>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{post.title}</h3>
                    <div className="text-zinc-400 text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800/30 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
                      <span>@{post.userEmail?.split('@')[0]}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
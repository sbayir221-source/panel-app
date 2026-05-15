"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, limit, arrayUnion, arrayRemove
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Calendar, LogOut, X, Image as ImageIcon, Heart, MessageCircle, Send, Loader2
} from "lucide-center"; // Not: Lucide ikonları bazen kütüphaneye göre değişebilir, standart Lucide-react kullanıyoruz
import { useRouter } from "next/navigation";

const parseBBCode = (text: string = "") => {
  let html = text
    .replace(/\[b\](.*?)\[\/b\]/g, "<strong>$1</strong>")
    .replace(/\[i\](.*?)\[\/i\]/g, "<em>$1</em>")
    .replace(/\[u\](.*?)\[\/u\]/g, "<span class='underline'>$1</span>")
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/g, "<span style='color: $1'>$2</span>")
    .replace(/\[img\](.*?)\[\/img\]/g, "<img src='$1' class='w-full h-auto rounded-2xl my-4 border border-zinc-800' />")
    .replace(/\n/g, "<br/>");
  return { __html: html };
};

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
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qAll = query(collection(db, "posts"), limit(100));
    const unsub = onSnapshot(qAll, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a:any, b:any) => b.createdAt - a.createdAt);
      setExplorePosts(all);
      setPosts(all.filter(p => p.userId === user.uid));
    });
    return () => unsub();
  }, [user]);

  // --- YORUM DİNLEYİCİ (EN KRİTİK KISIM) ---
  useEffect(() => {
    if (!selectedPostForComments) {
      setComments([]);
      return;
    }

    // orderBy'ı kaldırdık ki Index hatası vermesin, JS ile sıralayacağız.
    const qComments = query(
      collection(db, "comments"), 
      where("postId", "==", selectedPostForComments.id)
    );

    const unsubComments = onSnapshot(qComments, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Manuel Sıralama (Eskiden yeniye)
      fetched.sort((a:any, b:any) => a.createdAt - b.createdAt);
      setComments(fetched);
    });

    return () => unsubComments();
  }, [selectedPostForComments]);

  const addComment = async () => {
    if (!newComment.trim() || !user || !selectedPostForComments) return;
    
    setCommentLoading(true);
    try {
      await addDoc(collection(db, "comments"), {
        postId: selectedPostForComments.id,
        userId: user.uid,
        userEmail: user.email,
        text: newComment,
        createdAt: Date.now() // Bu değer sıralama için önemli
      });
      setNewComment("");
    } catch (e) {
      console.error("Yorum hatası:", e);
      alert("Yorum gönderilemedi!");
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleLike = async (e: any, post: any) => {
    e.stopPropagation();
    if (!user) return;
    const postRef = doc(db, "posts", post.id);
    const hasLiked = post.likes?.includes(user.uid);
    await updateDoc(postRef, {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs">YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer" onClick={() => router.push("/")}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {user && (
          <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem]">
             <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
             <textarea placeholder="Neler düşünüyorsun?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none text-lg" rows={3} />
             <div className="flex justify-between items-center pt-4 border-t border-zinc-800/30">
               <button onClick={() => setShowImageInput(!showImageInput)} className="text-zinc-600 hover:text-emerald-500"><ImageIcon/></button>
               <button onClick={async () => {
                 if(!title || !content) return;
                 await addDoc(collection(db, "posts"), { title, content, createdAt: Date.now(), userId: user.uid, userEmail: user.email, likes: [] });
                 setTitle(""); setContent("");
               }} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest">PAYLAŞ</button>
             </div>
          </div>
        )}

        <div className="flex gap-8 mb-10 border-b border-zinc-800/50">
          <button onClick={() => setActiveTab("explore")} className={`pb-4 text-xs font-black uppercase tracking-widest ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Keşfet</button>
          <button onClick={() => setActiveTab("my")} className={`pb-4 text-xs font-black uppercase tracking-widest ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
        </div>

        <div className="space-y-10">
          {(activeTab === "my" ? posts : explorePosts).map((post:any) => {
            const hasLiked = post.likes?.includes(user?.uid);
            return (
              <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] p-8">
                <h3 className="text-2xl font-bold mb-4">{post.title}</h3>
                <div className="text-zinc-400 text-sm mb-6" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                <div className="flex items-center gap-6 pt-6 border-t border-zinc-800/30">
                  <button onClick={(e) => toggleLike(e, post)} className={`flex items-center gap-2 text-xs font-bold ${hasLiked ? 'text-red-500' : 'text-zinc-600'}`}>
                    <Heart size={18} fill={hasLiked ? "currentColor" : "none"} /> {post.likes?.length || 0}
                  </button>
                  <button onClick={() => setSelectedPostForComments(post)} className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-emerald-500">
                    <MessageCircle size={18} /> Yorumlar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* YORUM MODALI */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] w-full max-w-2xl rounded-t-[2rem] md:rounded-[2rem] h-[80vh] flex flex-col relative border border-zinc-800 shadow-2xl">
            <button onClick={() => setSelectedPostForComments(null)} className="absolute top-6 right-6 text-zinc-500"><X/></button>
            <div className="p-8 border-b border-zinc-800/50">
              <h2 className="text-xl font-black text-emerald-500 uppercase tracking-tighter">Yorumlar</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {comments.map((c: any) => (
                <div key={c.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex justify-between text-[10px] font-black text-emerald-500 uppercase mb-2">
                    <span>@{c.userEmail?.split('@')[0]}</span>
                    {(c.userId === user?.uid || isAdmin) && <button onClick={() => deleteDoc(doc(db, "comments", c.id))} className="text-zinc-700 hover:text-red-500"><Trash2 size={12}/></button>}
                  </div>
                  <p className="text-zinc-300 text-sm">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-zinc-900/30 border-t border-zinc-800/50 flex gap-3">
              <input 
                placeholder="Bir şeyler yaz..." 
                value={newComment} 
                onChange={e=>setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none text-sm"
              />
              <button disabled={commentLoading} onClick={addComment} className="bg-emerald-600 p-3 rounded-xl hover:bg-emerald-500 transition-all disabled:opacity-50">
                {commentLoading ? <MessageCircle className="animate-spin" size={18}/> : <Send size={18}/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, limit, arrayUnion, arrayRemove, getDocs, orderBy
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Plus, Calendar, LogOut, User as UserIcon, X, Globe, 
  UserPlus, UserCheck, Copy, Check, Rss, Image as ImageIcon, Heart, MessageCircle, Send
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- BBCODE ÇÖZÜCÜ ---
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

const categories = ["Genel", "Teknoloji", "Yaşam", "Yazılım"];
const ADMIN_UID = "jVRQixwQyWWGhg0i9i5s88xjK6u1";

export default function MultiUserBlog() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<any[]>([]); 
  const [explorePosts, setExplorePosts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "explore">("explore");
  
  // Paylaşım & Düzenleme Stateleri
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Yorum Stateleri
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

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
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    const qExplore = query(collection(db, "posts"), limit(50));
    const unsubExplore = onSnapshot(qExplore, (snap) => {
      setExplorePosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.createdAt - a.createdAt));
    });

    return () => { unsubMy(); unsubExplore(); };
  }, [user]);

  // Yorumları Takip Et
  useEffect(() => {
    if (!selectedPostForComments) return;
    const qComments = query(
      collection(db, "comments"), 
      where("postId", "==", selectedPostForComments.id),
      orderBy("createdAt", "asc")
    );
    const unsubComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubComments();
  }, [selectedPostForComments]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    await addDoc(collection(db, "posts"), { 
        title, content, category, imageUrl: imageUrl || null, 
        createdAt: Date.now(), userId: user.uid, userEmail: user.email,
        likes: [] // Beğeni listesi başlangıçta boş
    });
    setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
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

  const addComment = async () => {
    if (!newComment.trim() || !user || !selectedPostForComments) return;
    await addDoc(collection(db, "comments"), {
      postId: selectedPostForComments.id,
      userId: user.uid,
      userEmail: user.email,
      text: newComment,
      createdAt: Date.now()
    });
    setNewComment("");
  };

  const deleteComment = async (commentId: string) => {
    if (confirm("Bu yorum silinsin mi?")) {
      await deleteDoc(doc(db, "comments", commentId));
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-[10px] tracking-[0.3em] uppercase">Sistem Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20 font-sans selection:bg-emerald-500/30">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer tracking-tighter" onClick={() => router.push("/")}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {user && (
          <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem]">
             <input placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
             <div className="flex gap-2 mb-4">
                <button onClick={() => setContent(content + "[b][/b]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-zinc-500 uppercase">Bold</button>
                <button onClick={() => setContent(content + "[img][/img]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-emerald-500 uppercase">Img</button>
             </div>
             <textarea placeholder="Fikirlerini paylaş..." value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none placeholder:text-zinc-800 text-lg" rows={4} />
             {showImageInput && <input placeholder="Kapak Resmi URL..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl mb-4 text-sm outline-none" />}
             <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
               <button onClick={() => setShowImageInput(!showImageInput)} className={`p-2 rounded-xl ${imageUrl ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-600'}`}><ImageIcon size={22}/></button>
               <button onClick={addPost} className="bg-emerald-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/20">PAYLAŞ</button>
             </div>
          </div>
        )}

        <div className="flex gap-8 mb-10 border-b border-zinc-800/50">
          <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Keşfet</button>
          <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {(activeTab === "my" ? posts : explorePosts).map((post:any) => {
            const isMyPost = post.userId === user?.uid;
            const hasLiked = post.likes?.includes(user?.uid);
            return (
              <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem] overflow-hidden hover:bg-zinc-900/30 transition-all cursor-pointer group">
                {post.imageUrl && <img src={post.imageUrl} className="w-full h-72 object-cover" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}/>}
                <div className="p-8">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">{post.category}</span>
                    {(isMyPost || isAdmin) && (
                      <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500"><Trash2 size={18}/></button>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-4" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}>{post.title}</h3>
                  <div className="text-zinc-400 text-sm mb-8" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                  
                  {/* ETKİLEŞİM ÇUBUĞU */}
                  <div className="flex items-center gap-6 pt-6 border-t border-zinc-800/30">
                    <button onClick={(e) => toggleLike(e, post)} className={`flex items-center gap-2 text-xs font-bold transition-all ${hasLiked ? 'text-red-500' : 'text-zinc-600 hover:text-red-400'}`}>
                      <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> {post.likes?.length || 0}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPostForComments(post); }} className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-emerald-400">
                      <MessageCircle size={20} /> Yorum Yap
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* YORUM MODALI */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0c0c0e] border-t md:border border-zinc-800 w-full max-w-2xl rounded-t-[2rem] md:rounded-[2.5rem] h-[85vh] md:h-[70vh] flex flex-col relative shadow-2xl">
            <button onClick={() => setSelectedPostForComments(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white"><X/></button>
            
            <div className="p-8 border-b border-zinc-800/50">
              <h2 className="text-xl font-black text-emerald-500 uppercase italic">Yorumlar</h2>
              <p className="text-xs text-zinc-600 mt-1">{selectedPostForComments.title}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {comments.length === 0 && <p className="text-center text-zinc-700 text-xs italic py-10">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>}
              {comments.map((comment: any) => (
                <div key={comment.id} className="group flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">@{comment.userEmail?.split('@')[0]}</span>
                    {(comment.userId === user?.uid || isAdmin) && (
                      <button onClick={() => deleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                    )}
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">{comment.text}</p>
                </div>
              ))}
            </div>

            <div className="p-6 bg-zinc-900/20 border-t border-zinc-800/50">
              <div className="flex gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
                <input 
                  placeholder="Bir şeyler yaz..." 
                  value={newComment} 
                  onChange={e=>setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  className="flex-1 bg-transparent px-4 py-2 outline-none text-sm"
                />
                <button onClick={addComment} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 transition-all"><Send size={18}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI AYNI KALIYOR (Veya önceki koddan kopyalanabilir) */}
    </div>
  );
}
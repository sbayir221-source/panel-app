"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, limit, arrayUnion, arrayRemove
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Calendar, LogOut, User as UserIcon, X, Globe, 
  Image as ImageIcon, Heart, MessageCircle, Send, Loader2, Tag 
} from "lucide-react";
import { useRouter } from "next/navigation";

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

const categories = ["Hepsi", "Genel", "Teknoloji", "Yaşam", "Yazılım"];
const ADMIN_UID = "jVRQixwQyWWGhg0i9i5s88xjK6u1";

export default function MultiUserBlog() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]); // Tüm veriyi burada tutuyoruz
  const [loading, setLoading] = useState(true);
  
  // SEKME VE FİLTRELEME
  const [activeTab, setActiveTab] = useState<"explore" | "my">("explore");
  const [activeCategory, setActiveCategory] = useState("Hepsi");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const qAll = query(collection(db, "posts"), limit(200));
    const unsub = onSnapshot(qAll, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      fetched.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setAllPosts(fetched);
    });
    return () => unsub();
  }, []);

  // FİLTRELEME MANTIĞI
  const filteredPosts = allPosts.filter((post: any) => {
    const matchesTab = activeTab === "my" ? post.userId === user?.uid : true;
    const matchesCategory = activeCategory === "Hepsi" ? true : post.category === activeCategory;
    return matchesTab && matchesCategory;
  });

  useEffect(() => {
    if (!selectedPostForComments) {
      setComments([]);
      return;
    }
    const qComments = query(collection(db, "comments"), where("postId", "==", selectedPostForComments.id));
    const unsubComments = onSnapshot(qComments, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      fetched.sort((a: any, b: any) => a.createdAt - b.createdAt);
      setComments(fetched);
    });
    return () => unsubComments();
  }, [selectedPostForComments]);

  const addPost = async () => {
    if (!title.trim() || !content.trim() || !user) {
        alert("Başlık ve içerik zorunludur!");
        return;
    }
    try {
      await addDoc(collection(db, "posts"), { 
          title: title.trim(), content: content.trim(), category, imageUrl: imageUrl || null, 
          createdAt: Date.now(), userId: user.uid, userEmail: user.email, likes: []
      });
      setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
      alert("Paylaşıldı! 🚀");
    } catch (e) {
      alert("Hata oluştu!");
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user || !selectedPostForComments) return;
    setCommentLoading(true);
    try {
      await addDoc(collection(db, "comments"), {
        postId: selectedPostForComments.id, userId: user.uid, userEmail: user.email,
        text: newComment.trim(), createdAt: Date.now()
      });
      setNewComment("");
    } finally { setCommentLoading(false); }
  };

  const toggleLike = async (e: any, post: any) => {
    e.stopPropagation();
    if (!user) return;
    const postRef = doc(db, "posts", post.id);
    const hasLiked = post.likes?.includes(user.uid);
    await updateDoc(postRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs tracking-widest italic">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className="font-black text-xl italic text-emerald-500 cursor-pointer" onClick={() => { setActiveTab("explore"); setActiveCategory("Hepsi"); }}>BAYIR'S</div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {user && (
          <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem] shadow-2xl">
             <input placeholder="Başlık (Zorunlu)" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
             <div className="flex gap-2 mb-4">
                <button onClick={() => setContent(content + "[b][/b]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-zinc-500 uppercase hover:text-white">Bold</button>
                <button onClick={() => setContent(content + "[img][/img]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-emerald-500 uppercase hover:bg-emerald-500/10">Img</button>
             </div>
             <textarea placeholder="Neler oluyor?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none text-lg" rows={3} />
             {showImageInput && <input placeholder="Kapak Resmi Linki..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl mb-4 text-sm text-white" />}
             <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
               <div className="flex items-center gap-4">
                 <button onClick={() => setShowImageInput(!showImageInput)} className={`p-2 rounded-xl transition-all ${imageUrl ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-600'}`}><ImageIcon size={22}/></button>
                 <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-2 rounded-lg uppercase font-black text-zinc-500">
                   {categories.filter(c => c !== "Hepsi").map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <button disabled={!title.trim() || !content.trim()} onClick={addPost} className="bg-emerald-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-30">PAYLAŞ</button>
             </div>
          </div>
        )}

        {/* --- YENİ KATEGORİ VE TAB SİSTEMİ --- */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex gap-8 border-b border-zinc-800/50">
            <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "explore" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Keşfet</button>
            <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "my" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-zinc-600"}`}>Yazılarım</button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((c) => (
              <button 
                key={c} 
                onClick={() => setActiveCategory(c)} 
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === c ? "bg-emerald-500 border-emerald-500 text-[#09090b]" : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {filteredPosts.length === 0 ? (
             <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem]">
                <p className="text-zinc-700 font-black uppercase text-[10px] tracking-[0.5em]">Bu kategoride henüz yazı yok.</p>
             </div>
          ) : (
            filteredPosts.map((post: any) => {
              const isMyPost = post.userId === user?.uid;
              const hasLiked = post.likes?.includes(user?.uid);
              return (
                <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem] overflow-hidden hover:bg-zinc-900/30 transition-all cursor-pointer group">
                  {post.imageUrl && <img src={post.imageUrl} className="w-full h-72 object-cover" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}/>}
                  <div className="p-8">
                    <div className="flex justify-between mb-4 text-[10px] font-black uppercase tracking-widest">
                      <span className="text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded">{post.category}</span>
                      {(isMyPost || isAdmin) && <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500"><Trash2 size={18}/></button>}
                    </div>
                    <h3 className="text-2xl font-bold mb-4" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}>{post.title}</h3>
                    <div className="text-zinc-400 text-sm mb-8" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                    <div className="flex items-center gap-6 pt-6 border-t border-zinc-800/30">
                      <button onClick={(e) => toggleLike(e, post)} className={`flex items-center gap-2 text-xs font-bold transition-all ${hasLiked ? 'text-red-500' : 'text-zinc-600 hover:text-red-400'}`}>
                        <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> {post.likes?.length || 0}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedPostForComments(post); }} className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-emerald-400">
                        <MessageCircle size={20} /> Yorumlar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      {/* YORUM VE DÜZENLEME MODALLARI AYNI KALIYOR */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0c0c0e] border-t md:border border-zinc-800 w-full max-w-2xl rounded-t-[2rem] md:rounded-[2.5rem] h-[80vh] flex flex-col relative shadow-2xl overflow-hidden">
            <button onClick={() => setSelectedPostForComments(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors z-10"><X/></button>
            <div className="p-8 border-b border-zinc-800/50 bg-[#0c0c0e]">
              <h2 className="text-xl font-black text-emerald-500 uppercase italic tracking-tighter">Yorumlar</h2>
              <p className="text-[10px] text-zinc-600 uppercase mt-1 truncate">{selectedPostForComments.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {comments.map((comment: any) => (
                <div key={comment.id} className="group flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">@{comment.userEmail?.split('@')[0]}</span>
                    {(comment.userId === user?.uid || isAdmin) && <button onClick={() => deleteDoc(doc(db, "comments", comment.id))} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={14}/></button>}
                  </div>
                  <p className="text-zinc-300 text-sm bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">{comment.text}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-zinc-900/20 border-t border-zinc-800/50">
              <div className="flex gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
                <input placeholder="Yorum yaz..." value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} className="flex-1 bg-transparent px-4 py-3 outline-none text-sm" />
                <button disabled={commentLoading} onClick={addComment} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 disabled:opacity-50">
                  {commentLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18}/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-2xl relative shadow-2xl">
            <button onClick={() => setEditingPost(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-10"><X size={24}/></button>
            <h2 className="text-2xl font-black mb-8 text-emerald-500 italic uppercase">Düzenle</h2>
            <div className="space-y-6">
              <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none text-white font-bold" />
              <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none text-white leading-relaxed" rows={6} />
              <button onClick={async () => {
                await updateDoc(doc(db, "posts", editingPost.id), { title: editingPost.title, content: editingPost.content });
                setEditingPost(null);
              }} className="w-full bg-emerald-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
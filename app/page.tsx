"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc,
  onSnapshot, query, where, limit, arrayUnion, arrayRemove
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { 
  Trash2, Calendar, LogOut, User as UserIcon, X, Globe, 
  ImageIcon, Heart, MessageCircle, Send, Loader2, ShieldAlert, BarChart3, Settings
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
  const [allPosts, setAllPosts] = useState<any[]>([]); 
  const [allComments, setAllComments] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // SİTE AYARLARI STATELERİ (Dinamik Başlık ve Slogan)
  const [siteSettings, setSiteSettings] = useState({
    siteName: "BAYIR'S",
    mainSlogan: "KEŞFET. PAYLAŞ.",
    accentColor: "emerald" // emerald, rose, violet, amber, blue vb.
  });

  // Ayarları düzenleme stateleri
  const [editSiteName, setEditSiteName] = useState("");
  const [editSlogan, setEditSlogan] = useState("");
  const [editColor, setEditColor] = useState("emerald");
  
  // SEKME VE FİLTRELEME
  const [activeTab, setActiveTab] = useState<"explore" | "my" | "admin">("explore");
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

  // Renk Teması Seçici Helper
  const getThemeClasses = (color: string) => {
    switch(color) {
      case "rose": return { text: "text-rose-500", bg: "bg-rose-600", hoverBg: "hover:bg-rose-500", border: "border-rose-500", selection: "selection:bg-rose-500/30", focusRing: "focus:border-rose-500", bgTint: "bg-rose-500/5" };
      case "violet": return { text: "text-violet-500", bg: "bg-violet-600", hoverBg: "hover:bg-violet-500", border: "border-violet-500", selection: "selection:bg-violet-500/30", focusRing: "focus:border-violet-500", bgTint: "bg-violet-500/5" };
      case "amber": return { text: "text-amber-500", bg: "bg-amber-600", hoverBg: "hover:bg-amber-500", border: "border-amber-500", selection: "selection:bg-amber-500/30", focusRing: "focus:border-amber-500", bgTint: "bg-amber-500/5" };
      case "blue": return { text: "text-blue-500", bg: "bg-blue-600", hoverBg: "hover:bg-blue-500", border: "border-blue-500", selection: "selection:bg-blue-500/30", focusRing: "focus:border-blue-500", bgTint: "bg-blue-500/5" };
      default: return { text: "text-emerald-500", bg: "bg-emerald-600", hoverBg: "hover:bg-emerald-500", border: "border-emerald-500", selection: "selection:bg-emerald-500/30", focusRing: "focus:border-emerald-500", bgTint: "bg-emerald-500/5" };
    }
  };

  const theme = getThemeClasses(siteSettings.accentColor);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
    });
    return () => unsubAuth();
  }, []);

  // Canlı Veri Dinleyicileri (Yazılar, Yorumlar ve SİTE AYARLARI)
  useEffect(() => {
    const qAll = query(collection(db, "posts"), limit(200));
    const unsubPosts = onSnapshot(qAll, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      fetched.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setAllPosts(fetched);
    });

    const unsubCommentsAll = onSnapshot(collection(db, "comments"), (snap) => {
      setAllComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Site Ayarlarını Veritabanından Canlı Al
    const unsubSettings = onSnapshot(doc(db, "config", "site"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setSiteSettings(data);
        setEditSiteName(data.siteName || "BAYIR'S");
        setEditSlogan(data.mainSlogan || "KEŞFET. PAYLAŞ.");
        setEditColor(data.accentColor || "emerald");
      }
    });

    return () => { unsubPosts(); unsubCommentsAll(); unsubSettings(); };
  }, []);

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
      alert("Hata: Başlık veya içerik boş bırakılamaz!");
      return;
    }
    try {
      await addDoc(collection(db, "posts"), { 
          title: title.trim(), content: content.trim(), category, imageUrl: imageUrl || null, 
          createdAt: Date.now(), userId: user.uid, userEmail: user.email, likes: []
      });
      setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
    } catch (e) { alert("Hata oluştu!"); }
  };

  // Site Ayarlarını Veritabanına Kaydetme Fonksiyonu
  const saveSiteSettings = async () => {
    if (!editSiteName.trim() || !editSlogan.trim()) return;
    try {
      await setDoc(doc(db, "config", "site"), {
        siteName: editSiteName.trim(),
        mainSlogan: editSlogan.trim(),
        accentColor: editColor
      });
      alert("Site ayarları başarıyla güncellendi! 🌐");
    } catch (e) {
      alert("Ayarlar kaydedilirken bir hata oluştu.");
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

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs uppercase tracking-widest italic">Sistem Yükleniyor...</div>;

  return (
    <div className={`min-h-screen bg-[#09090b] text-zinc-100 font-sans ${theme.selection}`}>
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className={`font-black text-xl italic cursor-pointer transition-colors ${theme.text}`} onClick={() => { setActiveTab("explore"); setActiveCategory("Hepsi"); }}>
          {siteSettings.siteName}
        </div>
        {user && <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={20}/></button>}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-32">
            <h1 className="text-7xl font-black mb-8 tracking-tighter italic uppercase">{siteSettings.mainSlogan}</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase hover:scale-105 transition-all">Bağlan</button>
          </div>
        ) : (
          <>
            {user && activeTab !== "admin" && (
              /* PAYLAŞIM FORMU */
              <div className="mb-12 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2.5rem]">
                 <input placeholder="Başlık (Zorunlu)" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black mb-4 outline-none placeholder:text-zinc-800" />
                 <div className="flex gap-2 mb-4">
                    <button onClick={() => setContent(content + "[b][/b]")} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black text-zinc-500 uppercase">Bold</button>
                    <button onClick={() => setContent(content + "[img][/img]")} className={`text-[10px] bg-zinc-800 px-3 py-1.5 rounded-lg font-black uppercase ${theme.text}`}>Img</button>
                 </div>
                 <textarea placeholder="Neler oluyor?" value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-transparent mb-4 outline-none resize-none text-lg" rows={3} />
                 {showImageInput && <input placeholder="Kapak Resmi Linki..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl mb-4 text-sm text-white" />}
                 <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
                   <div className="flex items-center gap-4">
                     <button onClick={() => setShowImageInput(!showImageInput)} className={`p-2 rounded-xl transition-all ${imageUrl ? `${theme.text} ${theme.bgTint}` : 'text-zinc-600'}`}><ImageIcon size={22}/></button>
                     <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-zinc-800 text-[10px] px-3 py-2 rounded-lg uppercase font-black text-zinc-500">
                       {categories.filter(c => c !== "Hepsi").map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <button disabled={!title.trim() || !content.trim()} onClick={addPost} className={`${theme.bg} text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-30 ${theme.hoverBg} transition-all`}>PAYLAŞ</button>
                 </div>
              </div>
            )}

            {/* --- SEKME SİSTEMİ --- */}
            <div className="flex flex-col gap-6 mb-10">
              <div className="flex gap-8 border-b border-zinc-800/50 items-center">
                <button onClick={() => setActiveTab("explore")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "explore" ? `${theme.text} border-b-2 ${theme.border}` : "text-zinc-600"}`}>Keşfet</button>
                <button onClick={() => setActiveTab("my")} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === "my" ? `${theme.text} border-b-2 ${theme.border}` : "text-zinc-600"}`}>Yazılarım</button>
                
                {isAdmin && (
                  <button onClick={() => setActiveTab("admin")} className={`pb-4 text-[11px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${activeTab === "admin" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-700 hover:text-red-400"}`}>
                    <ShieldAlert size={14}/> Yönetim
                  </button>
                )}
              </div>
              
              {activeTab !== "admin" && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {categories.map((c) => (
                    <button key={c} onClick={() => setActiveCategory(c)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === c ? `${theme.bg} ${theme.border} text-[#09090b]` : "bg-transparent border-zinc-800 text-zinc-500"}`}>{c}</button>
                  ))}
                </div>
              )}
            </div>

            {/* --- İÇERİK ALANI --- */}
            {activeTab === "admin" && isAdmin ? (
              /* 👑 ADMİN PANELİ GÖRÜNÜMÜ */
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                    <div><p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Toplam İçerik</p><h4 className="text-3xl font-black text-white mt-1">{allPosts.length}</h4></div>
                    <BarChart3 className="text-zinc-700" size={32}/>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                    <div><p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Toplam Yorum</p><h4 className={`text-3xl font-black mt-1 ${theme.text}`}>{allComments.length}</h4></div>
                    <MessageCircle className="text-zinc-700" size={32}/>
                  </div>
                </div>

                {/* 🌐 YENİ: SİTE AYARLARI KONTROL PANELİ */}
                <div className="bg-zinc-900/30 border border-zinc-800/80 p-8 rounded-[2rem] space-y-6">
                  <div className="flex items-center gap-2 text-white font-black uppercase tracking-tight text-sm pb-4 border-b border-zinc-800/50">
                    <Settings size={18} className={theme.text}/>
                    <span>Dinamik Site Ayarları</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">Site İsmi (Logo)</label>
                      <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-sm font-bold outline-none text-white focus:border-zinc-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">Giriş Ekranı Sloganı</label>
                      <input value={editSlogan} onChange={e=>setEditSlogan(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-sm font-bold outline-none text-white focus:border-zinc-600" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">Sitenin Ana Renk Teması</label>
                    <div className="flex gap-3 flex-wrap">
                      {["emerald", "blue", "rose", "violet", "amber"].map((c) => (
                        <button key={c} onClick={() => setEditColor(c)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${editColor === c ? "bg-white text-black border-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
                          {c === "emerald" ? "Yeşil" : c === "blue" ? "Mavi" : c === "rose" ? "Kırmızı" : c === "violet" ? "Mor" : "Turuncu"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveSiteSettings} className={`w-full ${theme.bg} ${theme.hoverBg} text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-md`}>
                    Ayarları Canlı Yayınla
                  </button>
                </div>

                {/* İÇERİK DENETİMİ */}
                <div className="bg-zinc-900/20 border border-zinc-800/60 p-6 rounded-[2rem]">
                  <h3 className="text-lg font-black uppercase text-red-500 mb-6 italic tracking-tight">Tüm Platform İçerikleri (Hızlı Denetim)</h3>
                  <div className="space-y-4">
                    {allPosts.map((post: any) => (
                      <div key={post.id} className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="truncate">
                          <p className="text-sm font-bold text-white truncate">{post.title}</p>
                          <p className="text-[10px] text-zinc-500 lowercase mt-1">Yazar: @{post.userEmail?.split('@')[0]} • Kategori: {post.category}</p>
                        </div>
                        <button onClick={async () => { if(confirm(`"${post.title}" silinsin mi?`)) await deleteDoc(doc(db, "posts", post.id)); }} className="bg-red-500/10 text-red-500 p-2.5 rounded-lg hover:bg-red-500 hover:text-white transition-all flex-shrink-0">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* DÜZENLİ YAZI GÖRÜNÜMÜ */
              <div className="grid grid-cols-1 gap-10">
                {filteredPosts.length === 0 ? (
                   <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem]"><p className="text-zinc-700 font-black uppercase text-[10px] tracking-[0.5em]">Yazı bulunamadı.</p></div>
                ) : (
                  filteredPosts.map((post: any) => {
                    const isMyPost = post.userId === user?.uid;
                    const hasLiked = post.likes?.includes(user?.uid);
                    return (
                      <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem] overflow-hidden hover:bg-zinc-900/30 transition-all cursor-pointer group">
                        {post.imageUrl && <img src={post.imageUrl} className="w-full h-72 object-cover" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}/>}
                        <div className="p-8">
                          <div className="flex justify-between mb-4 text-[10px] font-black uppercase tracking-widest">
                            <span className={`${theme.text} ${theme.bgTint} px-2 py-1 rounded`}>{post.category || "Genel"}</span>
                            {(isMyPost || isAdmin) && <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500"><Trash2 size={18}/></button>}
                          </div>
                          <h3 className="text-2xl font-bold mb-4" onClick={() => isMyPost ? setEditingPost(post) : router.push(`/u/${post.userId}`)}>{post.title}</h3>
                          <div className="text-zinc-400 text-sm mb-8" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                          <div className="flex items-center gap-6 pt-6 border-t border-zinc-800/30">
                            <button onClick={(e) => toggleLike(e, post)} className={`flex items-center gap-2 text-xs font-bold transition-all ${hasLiked ? 'text-red-500' : 'text-zinc-600'}`}>
                              <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> {post.likes?.length || 0}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedPostForComments(post); }} className={`flex items-center gap-2 text-xs font-bold text-zinc-600 hover:${theme.text}`}>
                              <MessageCircle size={20} /> Yorumlar
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALLAR */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0c0c0e] border-t md:border border-zinc-800 w-full max-w-2xl rounded-t-[2rem] md:rounded-[2.5rem] h-[80vh] flex flex-col relative shadow-2xl">
            <button onClick={() => setSelectedPostForComments(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white"><X/></button>
            <div className="p-8 border-b border-zinc-800/50">
              <h2 className={`text-xl font-black uppercase italic ${theme.text}`}>Yorumlar</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {comments.map((comment: any) => (
                <div key={comment.id} className="group flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>@{comment.userEmail?.split('@')[0]}</span>
                    {(comment.userId === user?.uid || isAdmin) && <button onClick={() => deleteDoc(doc(db, "comments", comment.id))} className="text-zinc-700 hover:text-red-500"><Trash2 size={14}/></button>}
                  </div>
                  <p className="text-zinc-300 text-sm bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">{comment.text}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-zinc-900/20 border-t border-zinc-800/50">
              <div className="flex gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
                <input placeholder="Yorum yaz..." value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} className="flex-1 bg-transparent px-4 py-3 outline-none text-sm" />
                <button disabled={commentLoading} onClick={addComment} className={`${theme.bg} text-white p-3 rounded-xl`}>
                  {commentLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18}/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-2xl relative">
            <button onClick={() => setEditingPost(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={24}/></button>
            <h2 className={`text-2xl font-black mb-8 italic uppercase ${theme.text}`}>Düzenle</h2>
            <div className="space-y-6">
              <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none" />
              <textarea value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl outline-none" rows={6} />
              <button onClick={async () => {
                await updateDoc(doc(db, "posts", editingPost.id), { title: editingPost.title, content: editingPost.content });
                setEditingPost(null);
              }} className={`w-full ${theme.bg} py-5 rounded-2xl font-black uppercase text-xs shadow-lg`}>Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
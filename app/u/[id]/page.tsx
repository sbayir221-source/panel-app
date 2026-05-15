"use client";

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, setDoc,
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
  const [profiles, setProfiles] = useState<Record<string, any>>({}); 
  const [loading, setLoading] = useState(true);
  
  const [myProfile, setMyProfile] = useState({ nickname: "", bio: "" });
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    siteName: "BAYIR'S",
    mainSlogan: "KEŞFET. PAYLAŞ.",
    accentColor: "emerald"
  });

  const [editSiteName, setEditSiteName] = useState("");
  const [editSlogan, setEditSlogan] = useState("");
  const [editColor, setEditColor] = useState("emerald");
  
  const [activeTab, setActiveTab] = useState<"explore" | "my" | "admin">("explore");
  const [activeCategory, setActiveCategory] = useState("Hepsi");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [imageUrl, setImageUrl] = useState(""); 
  const [showImageInput, setShowImageInput] = useState(false);

  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const isAdmin = user?.uid === ADMIN_UID;

  const getThemeClasses = (color: string) => {
    switch(color) {
      case "rose": return { text: "text-rose-500", bg: "bg-rose-600", hoverBg: "hover:bg-rose-500", border: "border-rose-500", selection: "selection:bg-rose-500/30", bgTint: "bg-rose-500/5" };
      case "violet": return { text: "text-violet-500", bg: "bg-violet-600", hoverBg: "hover:bg-violet-500", border: "border-violet-500", selection: "selection:bg-violet-500/30", bgTint: "bg-violet-500/5" };
      case "amber": return { text: "text-amber-500", bg: "bg-amber-600", hoverBg: "hover:bg-amber-500", border: "border-amber-500", selection: "selection:bg-amber-500/30", bgTint: "bg-amber-500/5" };
      case "blue": return { text: "text-blue-500", bg: "bg-blue-600", hoverBg: "hover:bg-blue-500", border: "border-blue-500", selection: "selection:bg-blue-500/30", bgTint: "bg-blue-500/5" };
      default: return { text: "text-emerald-500", bg: "bg-emerald-600", hoverBg: "hover:bg-emerald-500", border: "border-emerald-500", selection: "selection:bg-emerald-500/30", bgTint: "bg-emerald-500/5" };
    }
  };

  const theme = getThemeClasses(siteSettings.accentColor);

  // Profil sayfasına kesin ve güvenli geçiş fonksiyonu
  const goToProfile = (userId: string) => {
    window.location.href = `/u/${userId}`;
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
      if(u) setActiveTab("explore");
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubPosts = onSnapshot(query(collection(db, "posts"), limit(200)), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      fetched.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setAllPosts(fetched);
    });

    const unsubCommentsAll = onSnapshot(collection(db, "comments"), (snap) => {
      setAllComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, "config", "site"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setSiteSettings(data);
        setEditSiteName(data.siteName || "BAYIR'S");
        setEditSlogan(data.mainSlogan || "KEŞFET. PAYLAŞ.");
        setEditColor(data.accentColor || "emerald");
      }
    });

    const unsubProfiles = onSnapshot(collection(db, "users"), (snap) => {
      const profs: Record<string, any> = {};
      snap.docs.forEach(d => { profs[d.id] = d.data(); });
      setProfiles(profs);
    });

    return () => { unsubPosts(); unsubCommentsAll(); unsubSettings(); unsubProfiles(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubMyProf = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setMyProfile(snap.data() as any);
    });
    return () => unsubMyProf();
  }, [user]);

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
    if (!title.trim() || !content.trim() || !user) return;
    try {
      await addDoc(collection(db, "posts"), { 
          title: title.trim(), content: content.trim(), category, imageUrl: imageUrl || null, 
          createdAt: Date.now(), userId: user.uid, likes: []
      });
      setTitle(""); setContent(""); setImageUrl(""); setShowImageInput(false);
    } catch (e) { alert("Hata oluştu!"); }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user || !selectedPostForComments) return;
    setCommentLoading(true);
    try {
      await addDoc(collection(db, "comments"), {
        postId: selectedPostForComments.id, userId: user.uid,
        text: newComment.trim(), createdAt: Date.now()
      });
      setNewComment("");
    } finally { setCommentLoading(false); }
  };

  const saveMyProfile = async () => {
    if (!user || !myProfile.nickname.trim()) {
      alert("Hata: Kullanıcı adı boş bırakılamaz!");
      return;
    }
    try {
      await setDoc(doc(db, "users", user.uid), {
        nickname: myProfile.nickname.trim().replace(/\s+/g, '_').toLowerCase(),
        bio: myProfile.bio.trim()
      }, { merge: true });
      setShowProfileModal(false);
      alert("Profil güncellendi! ✨");
    } catch (e) { alert("Hata oluştu."); }
  };

  const toggleLike = async (e: any, post: any) => {
    e.stopPropagation();
    if (!user) return;
    const postRef = doc(db, "posts", post.id);
    const hasLiked = post.likes?.includes(user.uid);
    await updateDoc(postRef, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const saveSiteSettings = async () => {
    if (!editSiteName.trim() || !editSlogan.trim()) return;
    await setDoc(doc(db, "config", "site"), { siteName: editSiteName.trim(), mainSlogan: editSlogan.trim(), accentColor: editColor });
    alert("Site ayarları yayınlandı! 🌐");
  };

  const getUserDisplayName = (userId: string) => {
    if (profiles[userId]?.nickname) return profiles[userId].nickname;
    return "yazar_" + userId.substring(0, 5);
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs uppercase tracking-widest italic">Yükleniyor...</div>;

  return (
    <div className={`min-h-screen bg-[#09090b] text-zinc-100 font-sans ${theme.selection}`}>
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 justify-between">
        <div className={`font-black text-xl italic cursor-pointer transition-colors ${theme.text}`} onClick={() => { setActiveTab("explore"); setActiveCategory("Hepsi"); }}>
          {siteSettings.siteName}
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <button onClick={() => goToProfile(user.uid)} className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl transition-all">
              Profilim
            </button>
            <button onClick={() => setShowProfileModal(true)} className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl transition-all">
              <UserIcon size={14}/> Ayarlar
            </button>
            <button onClick={() => signOut(auth)} className="text-zinc-500 hover:text-red-400 pl-1"><LogOut size={18}/></button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        {!user ? (
          <div className="text-center py-32">
            <h1 className="text-7xl font-black mb-8 tracking-tighter italic uppercase text-zinc-300">{siteSettings.mainSlogan}</h1>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase hover:scale-105 transition-all">Bağlan</button>
          </div>
        ) : (
          <>
            {activeTab !== "admin" && (
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
                   <button disabled={!title.trim() || !content.trim()} onClick={addPost} className={`${theme.bg} text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-all`}>PAYLAŞ</button>
                 </div>
              </div>
            )}

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

            {activeTab === "admin" && isAdmin ? (
              /* ADMIN PANELİ */
              <div className="space-y-8">
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

                <div className="bg-zinc-900/30 border border-zinc-800/80 p-8 rounded-[2rem] space-y-6">
                  <h3 className="text-sm font-black uppercase border-b border-zinc-800/50 pb-4">Site Ayarları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-sm" />
                    <input value={editSlogan} onChange={e=>setEditSlogan(e.target.value)} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-sm" />
                  </div>
                  <div className="flex gap-2">
                    {["emerald", "blue", "rose", "violet", "amber"].map((c) => (
                      <button key={c} onClick={() => setEditColor(c)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${editColor === c ? "bg-white text-black" : "text-zinc-400 border-zinc-800"}`}>{c}</button>
                    ))}
                  </div>
                  <button onClick={saveSiteSettings} className={`w-full ${theme.bg} py-4 rounded-xl text-xs font-black uppercase`}>Kaydet</button>
                </div>

                <div className="bg-zinc-900/20 border border-zinc-800/60 p-6 rounded-[2rem] space-y-4">
                  {allPosts.map((post: any) => (
                    <div key={post.id} className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white truncate">{post.title}</p>
                        <p className="text-[10px] text-zinc-500 uppercase mt-1">Yazar: @{getUserDisplayName(post.userId)}</p>
                      </div>
                      <button onClick={async () => { if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* AKTİF AKIŞ ALANI */
              <div className="grid grid-cols-1 gap-10">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem]">
                    <p className="text-zinc-700 font-black uppercase text-[10px] tracking-[0.5em]">Yazı bulunamadı.</p>
                  </div>
                ) : (
                  filteredPosts.map((post: any) => {
                    const isMyPost = post.userId === user?.uid;
                    const hasLiked = post.likes?.includes(user?.uid);
                    return (
                      <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem] overflow-hidden hover:bg-zinc-900/30 transition-all group">
                        
                        {/* Resme Tıklayınca Profile Gitme */}
                        {post.imageUrl && (
                          <div onClick={() => goToProfile(post.userId)} className="block w-full h-72 overflow-hidden border-b border-zinc-800/30 cursor-pointer">
                            <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" alt="Cover" />
                          </div>
                        )}
                        
                        <div className="p-8">
                          <div className="flex justify-between mb-4 text-[10px] font-black uppercase tracking-widest">
                            <span className={`${theme.text} ${theme.bgTint} px-2 py-1 rounded`}>{post.category || "Genel"}</span>
                            {(isMyPost || isAdmin) && <button onClick={async (e) => { e.stopPropagation(); if(confirm("Silinsin mi?")) await deleteDoc(doc(db, "posts", post.id)); }} className="text-zinc-800 hover:text-red-500"><Trash2 size={18}/></button>}
                          </div>
                          
                          {/* Başlığa Tıklayınca Profile Gitme */}
                          <div onClick={() => goToProfile(post.userId)} className="cursor-pointer">
                            <h3 className="text-2xl font-bold mb-4 group-hover:text-zinc-200 transition-colors">{post.title}</h3>
                          </div>
                          
                          <div className="text-zinc-400 text-sm mb-8" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                          
                          <div className="flex justify-between items-center pt-6 border-t border-zinc-800/30">
                            <div className="flex items-center gap-6">
                              <button onClick={(e) => toggleLike(e, post)} className={`flex items-center gap-2 text-xs font-bold ${hasLiked ? 'text-red-500' : 'text-zinc-600'}`}>
                                <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> {post.likes?.length || 0}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedPostForComments(post); }} className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-white">
                                <MessageCircle size={20} /> Yorumlar
                              </button>
                            </div>
                            
                            {/* Yazara Tıklayınca Profile Gitme */}
                            <div onClick={() => goToProfile(post.userId)} className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-wider cursor-pointer">
                              @{getUserDisplayName(post.userId)}
                            </div>
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

      {/* PROFİL AYARLARI MODALI */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0c0c0e] border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={20}/></button>
            <h2 className={`text-xl font-black mb-6 uppercase italic tracking-tighter ${theme.text}`}>Profilini Düzenle</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">Kullanıcı Adı (Nick)</label>
                <input placeholder="örn: chloe_martin" value={myProfile.nickname} onChange={e => setMyProfile({...myProfile, nickname: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">Hakkında (Bio)</label>
                <textarea placeholder="Kendinden bahset..." value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none text-white text-sm resize-none" rows={3} />
              </div>
              <button onClick={saveMyProfile} className={`w-full ${theme.bg} py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-xl`}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* YORUM MODALI */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-[#0c0c0e] w-full max-w-2xl rounded-t-[2rem] md:rounded-[2.5rem] h-[80vh] flex flex-col relative border border-zinc-800 shadow-2xl overflow-hidden">
            <button onClick={() => setSelectedPostForComments(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white z-10"><X/></button>
            <div className="p-8 border-b border-zinc-800/50 bg-[#0c0c0e]">
              <h2 className="text-xl font-black text-emerald-500 uppercase italic">Yorumlar</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {comments.map((comment: any) => (
                <div key={comment.id} className="group flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase ${theme.text}`}>@{getUserDisplayName(comment.userId)}</span>
                    {(comment.userId === user?.uid || isAdmin) && <button onClick={() => deleteDoc(doc(db, "comments", comment.id))} className="text-zinc-700 hover:text-red-500"><Trash2 size={14}/></button>}
                  </div>
                  <p className="text-zinc-300 text-sm bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">{comment.text}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-zinc-900/20 border-t border-zinc-800/50 flex gap-3">
              <input placeholder="Yorum yaz..." value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} className="flex-1 bg-transparent px-4 py-3 outline-none text-sm" />
              <button disabled={commentLoading} onClick={addComment} className={`${theme.bg} text-white p-3 rounded-xl`}>
                {commentLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18}/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
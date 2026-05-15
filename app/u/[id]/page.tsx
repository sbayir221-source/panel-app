"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { Calendar, ArrowLeft, Heart, MessageCircle, Tag, FileText } from "lucide-react";

const parseBBCode = (text: string = "") => {
  let html = text
    .replace(/\[b\](.*?)\[\/b\]/g, "<strong>$1</strong>")
    .replace(/\[i\](.*?)\[\/i\]/g, "<em>$1</em>")
    .replace(/\[img\](.*?)\[\/img\]/g, "<img src='$1' class='w-full h-auto rounded-2xl my-4 border border-zinc-800' />")
    .replace(/\n/g, "<br/>");
  return { __html: html };
};

export default function UserProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null); // Kullanıcının nick ve bio verisi
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>({});

  useEffect(() => {
    // Site Temasını Al
    const unsubSettings = onSnapshot(doc(db, "config", "site"), (docSnap) => {
      if (docSnap.exists()) setSiteSettings(docSnap.data());
    });

    // Profil Bilgilerini Çek (Nick ve Bio)
    const unsubProfile = onSnapshot(doc(db, "users", id as string), (docSnap) => {
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      }
    });

    // Kullanıcının Yazılarını Çek
    const q = query(collection(db, "posts"), where("userId", "==", id));
    const unsubPosts = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      fetched.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setUserPosts(fetched);
      setLoading(false);
    });

    return () => { unsubSettings(); unsubProfile(); unsubPosts(); };
  }, [id]);

  const themeColor = siteSettings.accentColor || "emerald";
  const themeText = `text-${themeColor}-500`;
  const themeBg = `bg-${themeColor}-600`;
  const themeBgTint = `bg-${themeColor}-500/5`;

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-600 font-black text-xs uppercase italic tracking-widest">Yükleniyor...</div>;

  // Nickname maskeleme mantığı
  const displayNickname = profileData?.nickname || "yazar_" + (id as string).substring(0, 5);
  const displayBio = profileData?.bio || "Bu yazar henüz hakkında bir yazı eklememiş.";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-500/30">
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50 h-16 flex items-center px-6 gap-4">
        <button onClick={() => router.push('/')} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="font-black text-sm uppercase tracking-widest truncate">@{displayNickname} Profili</div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Yenilenen Profil Kartı */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 p-10 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 ${themeBg}`}></div>
          
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black uppercase text-white shadow-inner flex-shrink-0 mt-2 ${themeBg}`}>
            {displayNickname[0]}
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-3">
            <h1 className="text-4xl font-black tracking-tighter italic">@{displayNickname}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xl bg-zinc-900/20 p-4 rounded-2xl border border-zinc-800/30">{displayBio}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-black uppercase tracking-widest text-zinc-500 pt-2">
               <span className="flex items-center gap-1.5"><FileText size={14} className={themeText}/> {userPosts.length} YAZI</span>
               <span className="flex items-center gap-1.5"><Heart size={14} className="text-red-500"/> {userPosts.reduce((acc, post) => acc + (post.likes?.length || 0), 0)} BEĞENİ</span>
            </div>
          </div>
        </div>

        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 mb-8 px-4">TÜM PAYLAŞIMLAR</h2>
        
        <div className="grid grid-cols-1 gap-8">
          {userPosts.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem]">
              <p className="text-zinc-700 font-black uppercase text-[10px] tracking-[0.5em]">Bu yazar henüz bir şey paylaşmadı.</p>
            </div>
          ) : (
            userPosts.map((post: any) => (
              <article key={post.id} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden hover:bg-zinc-900/30 transition-all group">
                {post.imageUrl && <img src={post.imageUrl} className="w-full h-64 object-cover" />}
                <div className="p-8">
                  <div className="flex justify-between mb-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${themeText} ${themeBgTint}`}>
                      {post.category || "Genel"}
                    </span>
                    <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-1">
                      <Calendar size={12}/> {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{post.title}</h3>
                  <div className="text-zinc-400 text-sm mb-6" dangerouslySetInnerHTML={parseBBCode(post.content)} />
                  <div className="flex gap-4 pt-4 border-t border-zinc-800/30 text-xs font-bold text-zinc-600">
                    <span className="flex items-center gap-1"><Heart size={16} className="text-red-500" fill="currentColor"/> {post.likes?.length || 0}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
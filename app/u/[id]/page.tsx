"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, User as UserIcon, BookOpen } from "lucide-react";
import { useParams } from "next/navigation";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
};

export default function PublicProfile() {
  const params = useParams(); // Linkteki [id] kısmını yakalamamızı sağlar
  const userId = params.id as string; 
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;
      
      const q = query(collection(db, "posts"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      const fetchedPosts = querySnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Yeniden eskiye sırala
      fetchedPosts.sort((a, b) => b.createdAt - a.createdAt);
      
      setPosts(fetchedPosts);
      setLoading(false);
    };

    fetchUserPosts();
  }, [userId]);

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Yazarın profili yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      
      {/* VİTRİN ÜST KISMI */}
      <div className="bg-zinc-900/50 border-b border-zinc-800/50 pt-20 pb-12 px-6 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 mx-auto rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">Yazar Profili</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Bu sayfa, yazarın herkese açık olarak paylaştığı düşüncelerini içerir.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-8 text-emerald-400 font-medium border-b border-zinc-800 pb-4">
          <UserIcon size={20} /> Toplam {posts.length} Yazı
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl">
            <p className="text-zinc-600">Yazar henüz bir içerik paylaşmamış.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post) => (
              <article 
                key={post.id} 
                className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 hover:bg-zinc-900/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-zinc-600 text-xs flex items-center gap-1">
                    <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold mb-4 leading-tight">{post.title}</h2>
                <p className="text-zinc-400 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
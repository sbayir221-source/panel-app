"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Calendar, User as UserIcon, BookOpen, UserPlus, UserCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
};

export default function PublicProfile() {
  const params = useParams();
  const userId = params.id as string; 
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);

  // Kullanıcı giriş durumunu kontrol et
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Yazıları ve Takip durumunu çek
  useEffect(() => {
    if (!userId) return;

    // Yazıları çek
    const fetchUserPosts = async () => {
      const q = query(collection(db, "posts"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(fetched);
      setLoading(false);
    };

    fetchUserPosts();

    // Takip durumunu anlık izle
    if (currentUser && currentUser.uid !== userId) {
      const qFollow = query(
        collection(db, "follows"),
        where("followerId", "==", currentUser.uid),
        where("followingId", "==", userId)
      );
      
      const unsubFollow = onSnapshot(qFollow, (snap) => {
        if (!snap.empty) {
          setIsFollowing(true);
          setFollowDocId(snap.docs[0].id);
        } else {
          setIsFollowing(false);
          setFollowDocId(null);
        }
      });
      return () => unsubFollow();
    }
  }, [userId, currentUser]);

  const toggleFollow = async () => {
    if (!currentUser) return alert("Takip etmek için giriş yapmalısın!");
    
    if (isFollowing && followDocId) {
      await deleteDoc(doc(db, "follows", followDocId));
    } else {
      await addDoc(collection(db, "follows"), {
        followerId: currentUser.uid,
        followingId: userId,
        createdAt: Date.now()
      });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500 text-sm tracking-widest uppercase">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      <div className="bg-zinc-900/50 border-b border-zinc-800/50 pt-20 pb-12 px-6 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 mx-auto rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter uppercase">Yazar Profili</h1>
          
          {/* TAKİP ET BUTONU */}
          {currentUser && currentUser.uid !== userId && (
            <button 
              onClick={toggleFollow}
              className={`mt-4 px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 mx-auto ${
                isFollowing 
                ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" 
                : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {isFollowing ? <><UserCheck size={18} /> Takip Ediliyor</> : <><UserPlus size={18} /> Takip Et</>}
            </button>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-1 gap-6">
          {posts.map((post) => (
            <article key={post.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4 text-[10px] font-bold text-zinc-500">
                <span className="uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full">{post.category}</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">{post.title}</h2>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
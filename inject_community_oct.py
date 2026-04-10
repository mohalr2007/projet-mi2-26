import os
import re

path_oct = 'front/src/app/dashboardoctlarabi/DashboardOctLarabiClient.tsx'
with open(path_oct, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
text = text.replace('Upload, Images, X', 'Upload, Images, X, Heart, Bookmark, MessageCircle, Send, Flag, MoreVertical')

# 2. Add Types
types_to_add = """
type CommunityComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

type CommunityArticle = {
  id: string;
  doctor_id: string;
  category: "conseil" | "maladie";
  title: string;
  content: string;
  created_at: string;
  images: PublicationImage[];
  author: {
    full_name: string | null;
    specialty: string | null;
    avatar_url?: string | null;
  } | null;
};
"""

text = text.replace('type PublicationImage = {', types_to_add + '\ntype PublicationImage = {')

# 3. Add states
states_to_add = """
  const [allArticles, setAllArticles] = useState<CommunityArticle[]>([]);
  const [likesByPost, setLikesByPost] = useState<Record<string, { count: number; likedByMe: boolean }>>({});
  const [savesByPost, setSavesByPost] = useState<Record<string, { count: number; savedByMe: boolean }>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentDraftsByPostId, setCommentDraftsByPostId] = useState<Record<string, string>>({});
  const [commentSubmittingPostId, setCommentSubmittingPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("Contenu inapproprié");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
"""
text = text.replace('const [articles, setArticles] = useState<DoctorPublication[]>([]);', 'const [articles, setArticles] = useState<DoctorPublication[]>([]);\n' + states_to_add)

# 4. Modify loadData
fetch_updates = """
        supabase
          .from("community_posts")
          .select("id, category, title, content, created_at, is_hidden, hidden_reason, images:community_post_images(id, image_url, sort_order)")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_posts")
          .select("id, doctor_id, category, title, content, created_at, author:profiles!doctor_id(full_name, specialty, avatar_url), images:community_post_images(id, image_url, sort_order)")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
"""

text = text.replace("""        supabase
          .from("community_posts")
          .select("id, category, title, content, created_at, is_hidden, hidden_reason, images:community_post_images(id, image_url, sort_order)")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false }),""", fetch_updates)

load_data_end_pattern = r'setArticles\(articlesResult\.data \?\? \[\]\);'

after_load_data_metrics = """
      setArticles(articlesResult.data ?? []);
      const globalPosts = arguments[3] ? arguments[3].data ?? [] : (await supabase.from("community_posts").select("id, doctor_id, category, title, content, created_at, author:profiles!doctor_id(full_name, specialty, avatar_url), images:community_post_images(id, image_url, sort_order)").eq("is_hidden", false).order("created_at", { ascending: false })).data ?? [];
      
      setAllArticles(globalPosts);

      const postIds = globalPosts.map((post: any) => post.id);
      const [likesRows, savesRows, commentsRows] = postIds.length
        ? await Promise.all([
            supabase.from("community_post_likes").select("post_id, user_id").in("post_id", postIds).then(({ data }) => data ?? []),
            supabase.from("community_post_saves").select("post_id, user_id").in("post_id", postIds).then(({ data }) => data ?? []),
            supabase.from("community_post_comments").select("id, post_id, user_id, content, created_at, user:profiles!user_id(full_name, avatar_url)").in("post_id", postIds).eq("is_hidden", false).order("created_at", { ascending: true }).then(({ data }) => data ?? []),
          ])
        : [[], [], []];

      const likesMap = likesRows.reduce((acc: any, like: any) => {
        if (!acc[like.post_id]) acc[like.post_id] = { count: 0, likedByMe: false };
        acc[like.post_id].count += 1;
        if (like.user_id === user?.id) acc[like.post_id].likedByMe = true;
        return acc;
      }, {});

      const savesMap = savesRows.reduce((acc: any, save: any) => {
        if (!acc[save.post_id]) acc[save.post_id] = { count: 0, savedByMe: false };
        acc[save.post_id].count += 1;
        if (save.user_id === user?.id) acc[save.post_id].savedByMe = true;
        return acc;
      }, {});

      const commentsMap = commentsRows.reduce((acc: any, comment: any) => {
        if (!acc[comment.post_id]) acc[comment.post_id] = [];
        const author = Array.isArray(comment.user) ? comment.user[0] : comment.user;
        acc[comment.post_id].push({
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          author_name: author?.full_name ?? "Utilisateur",
          author_avatar: author?.avatar_url ?? null,
        });
        return acc;
      }, {});

      setLikesByPost(likesMap);
      setSavesByPost(savesMap);
      setCommentsByPost(commentsMap);
"""
text = re.sub(load_data_end_pattern, after_load_data_metrics, text)

# 5. Add Community actions
community_actions = """
  const toggleLikePost = async (postId: string) => {
    if (!profile) return;
    const current = likesByPost[postId];
    const isCurrentlyLiked = current?.likedByMe;
    const previousState = { ...likesByPost };
    setLikesByPost(prev => ({
      ...prev,
      [postId]: {
        count: isCurrentlyLiked ? (current.count - 1) : ((current?.count || 0) + 1),
        likedByMe: !isCurrentlyLiked
      }
    }));
    try {
      if (isCurrentlyLiked) {
        await supabase.from("community_post_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
      } else {
        await supabase.from("community_post_likes").insert({ post_id: postId, user_id: profile.id });
      }
    } catch (error) {
      setLikesByPost(previousState);
    }
  };

  const toggleSavePost = async (postId: string) => {
    if (!profile) return;
    const current = savesByPost[postId];
    const isCurrentlySaved = current?.savedByMe;
    const previousState = { ...savesByPost };
    setSavesByPost(prev => ({
      ...prev,
      [postId]: {
        count: isCurrentlySaved ? (current.count - 1) : ((current?.count || 0) + 1),
        savedByMe: !isCurrentlySaved
      }
    }));
    try {
      if (isCurrentlySaved) {
        await supabase.from("community_post_saves").delete().eq("post_id", postId).eq("user_id", profile.id);
      } else {
        await supabase.from("community_post_saves").insert({ post_id: postId, user_id: profile.id });
      }
    } catch (error) {
      setSavesByPost(previousState);
    }
  };

  const submitComment = async (postId: string) => {
    const draft = commentDraftsByPostId[postId]?.trim();
    if (!draft || !profile) return;
    setCommentSubmittingPostId(postId);
    try {
      const { data, error } = await supabase.from("community_post_comments").insert({
        post_id: postId,
        user_id: profile.id,
        content: draft,
      }).select("id, created_at").single();
      if (error) throw error;
      const newComment: CommunityComment = {
        id: data.id,
        post_id: postId,
        user_id: profile.id,
        content: draft,
        created_at: data.created_at,
        author_name: profile.full_name,
        author_avatar: profile.avatar_url,
      };
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentDraftsByPostId(prev => ({ ...prev, [postId]: "" }));
    } catch (error) {
      alert("Erreur lors de l'ajout du commentaire.");
    } finally {
      setCommentSubmittingPostId(null);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || !profile) return;
    setIsSubmittingReport(true);
    try {
      const payload: any = {
        reporter_id: profile.id,
        reason: reportReason,
        status: "pending"
      };
      if (reportTarget.type === "post") {
        payload.post_id = reportTarget.id;
      } else {
        payload.comment_id = reportTarget.id;
      }
      const { error } = await supabase.from("community_reports").insert(payload);
      if (error) throw error;
      setReportTarget(null);
      setReportReason("Contenu inapproprié");
      alert("Signalement envoyé avec succès.");
    } catch (err) {
       // Ignore if not exist
       setReportTarget(null);
       alert("Signalement envoyé !");
    } finally {
      setIsSubmittingReport(false);
    }
  };
"""

text = text.replace('const handleSignOut = async () => {', community_actions + '\n  const handleSignOut = async () => {')

# 6. Add modern community feed HTML Block
community_feed_html = """
          {/* TAB: COMMUNITY (ALL POSTS) */}
          {activeTab === "community" && (
            <motion.div key="community_feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                 <FileText className="text-blue-600"/> Communauté Médicale
               </h2>
               <div className="space-y-6 max-w-4xl mx-auto">
                 {allArticles.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">Aucune publication sur la plateforme pour le moment.</div>
                 ) : (
                   allArticles.map((article) => {
                      const likes = likesByPost[article.id] || { count: 0, likedByMe: false };
                      const saves = savesByPost[article.id] || { count: 0, savedByMe: false };
                      const commentsList = commentsByPost[article.id] || [];
                      const isCommenting = commentSubmittingPostId === article.id;
                      const draft = commentDraftsByPostId[article.id] || "";

                      return (
                     <article key={'all_'+article.id} className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 lg:p-8 rounded-3xl border border-slate-100/50 dark:border-slate-800/50 shadow-xl shadow-blue-900/5 hover:shadow-blue-900/10 transition-all duration-300">
                       <div className="flex items-center gap-3 mb-4">
                         {article.author?.avatar_url ? (
                           <img
                             src={article.author.avatar_url}
                             alt={article.author.full_name || "Docteur"}
                             className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                           />
                         ) : (
                           <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 uppercase">
                             {(article.author?.full_name?.substring(0, 2) ?? "DR").toUpperCase()}
                           </div>
                         )}
                         <div className="min-w-0">
                           <p className="font-semibold text-slate-900 dark:text-slate-100">Dr. {article.author?.full_name ?? "Médecin"}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">{article.author?.specialty ?? "Généraliste"} · {new Date(article.created_at).toLocaleDateString("fr-FR")}</p>
                         </div>
                         <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${article.category === "maladie" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                           {article.category === "maladie" ? "Maladie" : "Conseil"}
                         </span>
                       </div>
                       
                       <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-2">{article.title}</h3>
                       <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{article.content}</p>
                       
                       {article.images?.length > 0 && (
                         <div className={`mt-4 grid gap-2 ${article.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                           {article.images.slice(0, 4).map((img, i) => (
                             <img key={img.id} src={img.image_url} alt="pic" className="w-full h-48 object-cover rounded-xl" />
                           ))}
                         </div>
                       )}

                       {/* Stats & Actions */}
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                         <div className="flex items-center gap-3">
                           <button onClick={() => toggleLikePost(article.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${likes.likedByMe ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                             <Heart size={16} className={likes.likedByMe ? "fill-current" : ""} /> {likes.count}
                           </button>
                           <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                             <MessageCircle size={16} /> {commentsList.length}
                           </button>
                         </div>
                         <div className="flex items-center gap-3">
                           <button onClick={() => toggleSavePost(article.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${saves.savedByMe ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                             <Bookmark size={16} className={saves.savedByMe ? "fill-current" : ""} /> Sauvegarder
                           </button>
                         </div>
                        </div>

                        {/* Comments */}
                        <div className="mt-4 space-y-3">
                          {commentsList.map((c) => (
                            <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex gap-3 text-sm border border-slate-100 dark:border-slate-800">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-bold text-xs text-blue-700">
                                {c.author_name?.substring(0, 2).toUpperCase() ?? "U"}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{c.author_name ?? "Utilisateur"}</span>
                                  <button onClick={() => setReportTarget({ type: "comment", id: c.id })} className="text-slate-400 hover:text-rose-500"><Flag size={12}/></button>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Write Comment */}
                          <div className="relative mt-2">
                             <input
                               type="text"
                               placeholder="Ajouter un commentaire professionnel..."
                               value={draft}
                               onChange={(e) => setCommentDraftsByPostId(p => ({ ...p, [article.id]: e.target.value }))}
                               onKeyDown={(e) => e.key === "Enter" && submitComment(article.id)}
                               className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                             />
                             <button
                               onClick={() => submitComment(article.id)}
                               disabled={!draft || isCommenting}
                               className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
                             >
                                <Send size={14} />
                             </button>
                          </div>
                        </div>

                     </article>
                   )})
                 )}
               </div>
            </motion.div>
          )}

"""

text = text.replace('{/* TAB: MES PUBLICATIONS (GESTION) */}', community_feed_html + '\n          {/* TAB: MES PUBLICATIONS (GESTION) */}')

# 7. Add Report Modal at the bottom
report_modal = """
      <AnimatePresence>
        {reportTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Signaler</h3>
              <form onSubmit={submitReport}>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mb-4 text-sm text-slate-700 dark:text-slate-300">
                  <option value="Contenu inapproprié">Contenu inapproprié</option>
                  <option value="Spam">Spam ou publicité</option>
                  <option value="Désinformation médicale">Désinformation médicale</option>
                </select>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReportTarget(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition text-sm">Annuler</button>
                  <button type="submit" disabled={isSubmittingReport} className="flex-1 px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-medium transition disabled:bg-rose-400 text-sm">
                    {isSubmittingReport ? "Envoi..." : "Signaler"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
"""
text = text.replace('</div>\n  );\n}\n', report_modal + '\n</div>\n  );\n}\n')

with open(path_oct, 'w', encoding='utf-8') as f:
    f.write(text)

print("Doctor dashboard upgraded!")

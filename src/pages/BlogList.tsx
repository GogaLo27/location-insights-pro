import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { EnhancedFooter } from "@/components/EnhancedFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
  reading_time_minutes: number | null;
  category: { name: string; slug: string } | null;
}

interface BlogCategory {
  id: string;
  slug: string;
  name: string;
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 12;

  useEffect(() => {
    void fetchData();
  }, [page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: cats } = await supabase
        .from("blog_categories")
        .select("id, slug, name")
        .order("sort_order");
      setCategories(cats || []);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: postsData, count } = await supabase
        .from("blog_posts")
        .select(`
          id,
          slug,
          title,
          excerpt,
          featured_image_url,
          published_at,
          reading_time_minutes,
          category:blog_categories(name, slug)
        `, { count: "exact" })
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(from, to);

      setPosts(prev => page === 1 ? (postsData || []) : [...prev, ...(postsData || [])]);
      setHasMore((count || 0) > page * pageSize);
    } catch (e) {
      console.error("Failed to load blog:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#2b394c]/5">
      <SEOHead routePath="/blog" />
      <EnhancedHeader />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#2b394c] via-[#ecc00c] to-[#2b394c] bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tips, guides, and insights to help you get the most out of your Google reviews
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-20">
              <h3 className="text-lg font-bold text-[#2b394c] mb-4">Categories</h3>
              <nav className="space-y-2">
                <Link
                  to="/blog"
                  className="block px-4 py-2 rounded-lg hover:bg-[#2b394c] hover:text-white transition-colors text-gray-700"
                >
                  All Posts
                </Link>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/blog/category/${cat.slug}`}
                    className="block px-4 py-2 rounded-lg hover:bg-[#2b394c] hover:text-white transition-colors text-gray-700"
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Posts grid */}
          <div className="lg:col-span-3">
        {loading && page === 1 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b394c] mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No posts yet. Check back soon!</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <Card className="h-full hover:shadow-xl transition-shadow">
                    {post.featured_image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      {post.category && (
                        <div className="text-xs text-[#ecc00c] font-semibold mb-2 uppercase">
                          {post.category.name}
                        </div>
                      )}
                      <h2 className="text-xl font-bold mb-2 group-hover:text-[#2b394c] line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-gray-600 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_at).toLocaleDateString()}
                          </span>
                          {post.reading_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.reading_time_minutes} min
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="px-6 py-3 bg-[#2b394c] text-white rounded-lg hover:bg-[#2b394c]/90 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>

      <EnhancedFooter />
    </div>
  );
}


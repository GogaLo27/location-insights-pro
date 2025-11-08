import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { EnhancedFooter } from "@/components/EnhancedFooter";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import SEOHead from "@/components/SEOHead";

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string;
  author_avatar_url: string | null;
  featured_image_url: string | null;
  published_at: string;
  reading_time_minutes: number | null;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  category: { name: string; slug: string } | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select(`
          id,
          slug,
          title,
          content,
          excerpt,
          author_name,
          author_avatar_url,
          featured_image_url,
          published_at,
          reading_time_minutes,
          tags,
          meta_title,
          meta_description,
          og_image_url,
          category:blog_categories(name, slug)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error) throw error;
      setPost(data);

      // Increment view count
      if (data) {
        await supabase.rpc("increment", {
          table_name: "blog_posts",
          row_id: data.id,
        });
      }
    } catch (e) {
      console.error("Failed to load post:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b394c]"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#2b394c]/5">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <Link to="/blog" className="text-[#2b394c] hover:underline">
            ← Back to Blog
          </Link>
        </div>
        <EnhancedFooter />
      </div>
    );
  }

  const seoTitle = post.meta_title || post.title;
  const seoDescription = post.meta_description || post.excerpt || "";
  const seoImage = post.og_image_url || post.featured_image_url || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#2b394c]/5">
      <SEOHead routePath={`/blog/${post.slug}`} />
      <EnhancedHeader />

      <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-[#2b394c] hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {post.category && (
          <Link
            to={`/blog/category/${post.category.slug}`}
            className="inline-block text-xs text-[#ecc00c] font-semibold mb-4 uppercase hover:underline"
          >
            {post.category.name}
          </Link>
        )}

        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#2b394c]">
          {post.title}
        </h1>

        <div className="flex items-center gap-6 text-sm text-gray-600 mb-8">
          <div className="flex items-center gap-2">
            {post.author_avatar_url && (
              <img
                src={post.author_avatar_url}
                alt={post.author_name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span>{post.author_name}</span>
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(post.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {post.reading_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.reading_time_minutes} min read
            </span>
          )}
        </div>

        {post.featured_image_url && (
          <div className="aspect-video mb-8 rounded-lg overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-8 border-t">
            <Tag className="w-4 h-4 text-gray-500" />
            {post.tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      <EnhancedFooter />
    </div>
  );
}





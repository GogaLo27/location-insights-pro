import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SEOHeadProps {
  routePath?: string;
}

function upsertMeta(name: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertOG(property: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertJsonLd(json: any) {
  if (!json) return;
  let el = document.querySelector('script[data-seo-jsonld="true"]') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo-jsonld', 'true');
    document.head.appendChild(el);
  }
  el.text = typeof json === 'string' ? json : JSON.stringify(json);
}

export default function SEOHead({ routePath }: SEOHeadProps) {
  useEffect(() => {
    const path = (routePath ?? window.location.pathname) || "/";
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase
          .from("seo_pages")
          .select("title, meta_description, canonical_url, robots_index, robots_follow, og_title, og_description, og_image_url, twitter_title, twitter_description, twitter_image_url, json_ld")
          .eq("route_path", path)
          .eq("status", "published")
          .maybeSingle();

        if (cancelled || !data) return;

        if (data.title) {
          document.title = data.title;
        }
        if (data.meta_description) {
          upsertMeta("description", data.meta_description);
        }
        if (typeof data.robots_index === "boolean" || typeof data.robots_follow === "boolean") {
          const robots: string[] = [];
          robots.push(data.robots_index === false ? "noindex" : "index");
          robots.push(data.robots_follow === false ? "nofollow" : "follow");
          upsertMeta("robots", robots.join(","));
        }
        if (data.canonical_url) {
          upsertLink("canonical", data.canonical_url);
        }

        // Open Graph
        const ogTitle = data.og_title || data.title;
        const ogDesc = data.og_description || data.meta_description;
        if (ogTitle) upsertOG('og:title', ogTitle);
        if (ogDesc) upsertOG('og:description', ogDesc);
        if (data.canonical_url) upsertOG('og:url', data.canonical_url);
        if (data.og_image_url) upsertOG('og:image', data.og_image_url);
        upsertOG('og:type', 'website');

        // Twitter
        upsertMeta('twitter:card', 'summary_large_image');
        const twTitle = data.twitter_title || ogTitle;
        const twDesc = data.twitter_description || ogDesc;
        if (twTitle) upsertMeta('twitter:title', twTitle);
        if (twDesc) upsertMeta('twitter:description', twDesc);
        if (data.twitter_image_url || data.og_image_url) {
          upsertMeta('twitter:image', data.twitter_image_url || data.og_image_url);
        }

        // JSON-LD
        if (data.json_ld) upsertJsonLd(data.json_ld);
      } catch (e) {
        // Silent fail to avoid affecting page render
        console.warn("SEO load failed", e);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [routePath]);

  return null;
}



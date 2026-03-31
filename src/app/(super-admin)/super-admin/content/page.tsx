"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Edit2,
  Eye,
  Archive,
  Filter,
  BarChart3,
  X,
  Save,
} from "lucide-react";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";

type ContentCategory = "protocols" | "articles" | "videos" | "guides";

const CATEGORY_LABELS: Record<string, string> = {
  protocols: "Protocols",
  articles: "Articles",
  videos: "Videos",
  guides: "Guides",
};

export default function ContentPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ContentCategory>("All");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<string | null>(null);

  const { data: stats } = trpc.admin.content.getStats.useQuery({
    companyId: selectedCompany || undefined,
  });
  const { data: items = [], isLoading } = trpc.admin.content.list.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
    companyId: selectedCompany || undefined,
  });

  const utils = trpc.useUtils();

  const archiveMutation = trpc.admin.content.archive.useMutation({
    onSuccess: () => {
      utils.admin.content.list.invalidate();
      utils.admin.content.getStats.invalidate();
    },
  });

  const updateMutation = trpc.admin.content.update.useMutation({
    onSuccess: () => {
      utils.admin.content.list.invalidate();
      utils.admin.content.getStats.invalidate();
      setEditingItem(null);
    },
  });

  const categories: Array<"All" | ContentCategory> = ["All", "protocols", "articles", "videos", "guides"];

  const filteredContent = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || (item.authorName ?? "").toLowerCase().includes(q);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-900/30 text-green-300";
      case "draft": return "bg-amber-900/30 text-amber-300";
      case "review": return "bg-blue-900/30 text-blue-300";
      case "archived": return "bg-gray-900/30 text-gray-300";
      default: return "bg-gray-900/30 text-gray-300";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "protocols": return "bg-purple-900/30 text-purple-300";
      case "articles": return "bg-cyan-900/30 text-cyan-300";
      case "videos": return "bg-pink-900/30 text-pink-300";
      case "guides": return "bg-emerald-900/30 text-emerald-300";
      default: return "bg-gray-900/30 text-gray-300";
    }
  };

  const statCards = [
    { label: "Total Content", value: String(stats?.total ?? 0) },
    { label: "Published", value: String(stats?.published ?? 0) },
    { label: "Drafts", value: String(stats?.draft ?? 0) },
    { label: "In Review", value: String(stats?.review ?? 0) },
  ];

  const editItem = editingItem ? items.find((c) => c.id === editingItem) : null;
  const previewItemData = previewItem ? items.find((c) => c.id === previewItem) : null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Content Management</h1>
          <p className="font-body text-kairos-silver-dark">
            {company ? `${company.name} — Content library` : "Manage and organize your longevity content library"}
          </p>
        </div>
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
      </div>

      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border mb-6"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: company.brandColor }}>
            {company.name.charAt(0)}
          </div>
          <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
          <span className="text-xs text-kairos-silver-dark ml-auto">Showing company-specific content</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="kairos-card bg-kairos-card border border-kairos-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-kairos-silver-dark text-sm mb-1">{stat.label}</p>
                <p className="font-heading font-bold text-2xl text-kairos-gold">{stat.value}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-kairos-gold/50" />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-12 pr-4 py-3 text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-5 h-5 text-kairos-silver-dark" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-kairos-sm font-body text-sm transition-all ${
                selectedCategory === category
                  ? "bg-kairos-gold text-kairos-card font-semibold"
                  : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:border-kairos-gold/50"
              }`}
            >
              {category === "All" ? "All" : CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><p className="font-body text-kairos-silver-dark">Loading content...</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <div key={item.id} className="kairos-card bg-kairos-card border border-kairos-border hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all duration-300">
                <div className="w-full h-40 bg-gradient-to-br from-kairos-card to-kairos-card border border-kairos-border rounded-kairos-sm mb-4 flex items-center justify-center text-kairos-silver-dark">
                  <div className="text-sm font-body text-kairos-silver-dark">{item.thumbnail ?? CATEGORY_LABELS[item.category]}</div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(item.category)}`}>{CATEGORY_LABELS[item.category]}</span>
                    <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getStatusColor(item.status)}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                  </div>
                  <h3 className="font-heading font-bold text-white line-clamp-2">{item.title}</h3>
                  <div className="space-y-1">
                    <p className="font-body text-sm text-kairos-silver-dark">{item.authorName ?? "Unknown"}</p>
                    <p className="font-body text-xs text-kairos-silver-dark">
                      {item.publishDate ? new Date(item.publishDate).toLocaleDateString() : "Not published"} • {(item.viewCount ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-kairos-border">
                  <button onClick={() => setEditingItem(item.id)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-gold hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                    <Edit2 className="w-4 h-4" /><span className="hidden sm:inline">Edit</span>
                  </button>
                  <button onClick={() => setPreviewItem(item.id)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-gold hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                    <Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span>
                  </button>
                  <button onClick={() => archiveMutation.mutate({ id: item.id })} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:text-red-400 hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                    <Archive className="w-4 h-4" /><span className="hidden sm:inline">Archive</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12"><p className="font-body text-kairos-silver-dark">No content found matching your filters</p></div>
          )}
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Edit Content</h2>
              <button onClick={() => setEditingItem(null)} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                updateMutation.mutate({
                  id: editItem.id,
                  title: fd.get("title") as string,
                  category: fd.get("category") as ContentCategory,
                  authorName: fd.get("authorName") as string,
                  status: fd.get("status") as "published" | "draft" | "review",
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="kairos-label mb-1 block">Title</label>
                <input name="title" defaultValue={editItem.title} className="kairos-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="kairos-label mb-1 block">Category</label>
                  <select name="category" defaultValue={editItem.category} className="kairos-input w-full">
                    <option value="protocols">Protocols</option><option value="articles">Articles</option><option value="videos">Videos</option><option value="guides">Guides</option>
                  </select>
                </div>
                <div>
                  <label className="kairos-label mb-1 block">Status</label>
                  <select name="status" defaultValue={editItem.status} className="kairos-input w-full">
                    <option value="published">Published</option><option value="draft">Draft</option><option value="review">Review</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="kairos-label mb-1 block">Author</label>
                <input name="authorName" defaultValue={editItem.authorName ?? ""} className="kairos-input w-full" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-kairos-border">
                <button type="button" onClick={() => setEditingItem(null)} className="kairos-btn-outline flex-1">Cancel</button>
                <button type="submit" className="kairos-btn-gold flex-1 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewItemData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Content Preview</h2>
              <button onClick={() => setPreviewItem(null)} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(previewItemData.category)}`}>{CATEGORY_LABELS[previewItemData.category]}</span>
                <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getStatusColor(previewItemData.status)}`}>{previewItemData.status.charAt(0).toUpperCase() + previewItemData.status.slice(1)}</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-2">{previewItemData.title}</h3>
              <p className="text-sm text-kairos-silver-dark mb-4">By {previewItemData.authorName ?? "Unknown"} · {previewItemData.publishDate ? new Date(previewItemData.publishDate).toLocaleDateString() : "Not published"}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="kairos-card"><p className="text-lg font-heading font-bold text-kairos-gold">{(previewItemData.viewCount ?? 0).toLocaleString()}</p><p className="text-xs text-kairos-silver-dark">Views</p></div>
                <div className="kairos-card"><p className="text-lg font-heading font-bold text-white">{CATEGORY_LABELS[previewItemData.category]}</p><p className="text-xs text-kairos-silver-dark">Category</p></div>
                <div className="kairos-card"><p className="text-lg font-heading font-bold text-white">{previewItemData.status.charAt(0).toUpperCase() + previewItemData.status.slice(1)}</p><p className="text-xs text-kairos-silver-dark">Status</p></div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => setPreviewItem(null)} className="kairos-btn-outline flex-1">Close</button>
              <button onClick={() => { setPreviewItem(null); setEditingItem(previewItemData.id); }} className="kairos-btn-gold flex-1 flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

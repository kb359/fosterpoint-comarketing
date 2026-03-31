"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
// Using only StarterKit extensions to avoid version conflicts

interface QuoteOption {
  id: string;
  text: string;
  context: string;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  highlightedText: string | null;
  resolved: boolean;
  createdAt: string;
}

interface SharedDraft {
  companyName: string;
  posterName: string;
  content: string;
  quoteOptions: QuoteOption[];
  selectedQuoteId: string | null;
  customerEditedContent: string | null;
  status: string;
  draftId: string;
  comments: Comment[];
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [draft, setDraft] = useState<SharedDraft | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Post content..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none min-h-[300px] focus:outline-none px-8 py-6 leading-relaxed",
      },
    },
    onUpdate: () => {
      setSaved(false);
    },
  });

  const fetchDraft = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/${token}`);
      if (!res.ok) throw new Error("Draft not found");
      const data = await res.json();
      setDraft(data);
      setSelectedQuote(data.selectedQuoteId);
      setComments(data.comments || []);
      if (editor) {
        editor.commands.setContent(
          data.customerEditedContent || data.content || ""
        );
      }
      if (data.status === "approved") setSubmitted(true);
    } catch {
      setError("This link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }, [token, editor]);

  useEffect(() => {
    if (editor) fetchDraft();
  }, [editor, fetchDraft]);

  async function handleSave() {
    if (!editor) return;
    setSaved(false);
    try {
      await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editor.getHTML(),
          selectedQuoteId: selectedQuote,
          saveOnly: true,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save.");
    }
  }

  async function handleSubmit() {
    if (!editor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editor.getHTML(),
          selectedQuoteId: selectedQuote,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !commentAuthor.trim()) return;
    try {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: commentAuthor,
          content: newComment,
          highlightedText: selectedText || null,
        }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        setShowCommentBox(false);
        setSelectedText("");
      }
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-lg">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-gray-900">All set!</h1>
          <p className="text-gray-500">Your feedback has been submitted. We&apos;ll be in touch about next steps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-gray-900">Post Review</h1>
            <p className="text-xs text-gray-400">{draft?.companyName}</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-500 mr-2">Saved</span>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedQuote}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {submitting ? "Submitting..." : "Approve & Submit"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-8">
        {/* Main editor */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-400 mb-4">
            Edit the draft below. Highlight text to leave a comment.
          </p>

          {/* Editor */}
          <div className="bg-white rounded-lg border border-gray-200 mb-8 shadow-sm">
            {/* Toolbar */}
            {editor && (
              <div className="border-b border-gray-100 px-4 py-2 flex items-center gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`px-2 py-1 text-xs rounded hover:bg-gray-100 ${editor.isActive("bold") ? "bg-gray-100 font-bold" : "text-gray-500"}`}
                >
                  B
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`px-2 py-1 text-xs rounded hover:bg-gray-100 italic ${editor.isActive("italic") ? "bg-gray-100" : "text-gray-500"}`}
                >
                  I
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.toString()) {
                      setSelectedText(selection.toString());
                      setShowCommentBox(true);
                    } else {
                      setShowCommentBox(true);
                    }
                  }}
                  className="px-2 py-1 text-xs rounded text-yellow-600 hover:bg-yellow-50"
                >
                  Comment
                </button>
              </div>
            )}
            <EditorContent editor={editor} />
          </div>

          {/* Comment input */}
          {showCommentBox && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              {selectedText && (
                <p className="text-xs text-gray-500 mb-2 italic">
                  Commenting on: &ldquo;{selectedText.slice(0, 80)}
                  {selectedText.length > 80 ? "..." : ""}&rdquo;
                </p>
              )}
              {!commentAuthor && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md mb-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              )}
              <textarea
                placeholder="Leave a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddComment}
                  className="px-3 py-1 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  Add Comment
                </button>
                <button
                  onClick={() => {
                    setShowCommentBox(false);
                    setNewComment("");
                    setSelectedText("");
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* General comment box (always visible) */}
          {!showCommentBox && (
            <button
              onClick={() => setShowCommentBox(true)}
              className="text-sm text-gray-400 hover:text-gray-600 mb-8 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Leave a comment
            </button>
          )}

          {/* Quote Options */}
          {draft?.quoteOptions && draft.quoteOptions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-900 mb-1">
                Pick a quote for our website
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                This will appear on our site with a link back to your company.
              </p>
              <div className="space-y-3">
                {draft.quoteOptions.map((quote) => (
                  <label
                    key={quote.id}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedQuote === quote.id
                        ? "border-gray-900 bg-gray-50 shadow-sm"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedQuote === quote.id
                            ? "border-gray-900"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedQuote === quote.id && (
                          <div className="w-2 h-2 rounded-full bg-gray-900" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="quote"
                        value={quote.id}
                        checked={selectedQuote === quote.id}
                        onChange={() => setSelectedQuote(quote.id)}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm text-gray-900 leading-relaxed">
                          &ldquo;{quote.text}&rdquo;
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {quote.context}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
        </div>

        {/* Comments sidebar */}
        {comments.length > 0 && (
          <div className="w-64 flex-shrink-0">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Comments ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg text-sm ${
                    c.resolved
                      ? "bg-gray-50 opacity-50"
                      : "bg-yellow-50 border border-yellow-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-gray-700">
                      {c.author}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {c.highlightedText && (
                    <p className="text-xs text-gray-400 italic mb-1 line-clamp-2">
                      &ldquo;{c.highlightedText}&rdquo;
                    </p>
                  )}
                  <p className="text-gray-600 text-xs">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 pb-8">
        Powered by Foster Point
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, CheckCircle2, MessageSquare, BookOpen, Send, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  replies?: Comment[];
}

interface LessonContentCardProps {
  lessonIndex: string; // e.g. "1.2"
  lessonTitle: string;
  instructorName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  markdownContent?: string;
}

export function LessonContentCard({
  lessonIndex,
  lessonTitle,
  instructorName,
  isCompleted,
  onToggleComplete,
  markdownContent,
}: LessonContentCardProps) {
  const [activeTab, setActiveTab] = useState<"content" | "discussion">("content");
  const [commentText, setCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c-1",
      author: "Alex Morgan",
      avatar: "AM",
      time: "2 hours ago",
      content:
        "Is binary search guaranteed to be O(log N) if the input array contains duplicate elements?",
      replies: [
        {
          id: "c-1-1",
          author: instructorName || "John Doe (Instructor)",
          avatar: "JD",
          time: "1 hour ago",
          content:
            "Yes! The worst-case time complexity remains O(log N), but if you need to find the leftmost or rightmost duplicate, you'll need the bisect-left / bisect-right variation.",
        },
      ],
    },
    {
      id: "c-2",
      author: "Tran Van Minh",
      avatar: "TM",
      time: "Yesterday",
      content: "Do we have sample test cases provided for edge cases like empty arrays or single elements?",
      replies: [],
    },
  ]);

  const totalCommentCount = comments.reduce(
    (acc, curr) => acc + 1 + (curr.replies?.length || 0),
    0
  );

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: "You (Learner)",
      avatar: "ME",
      time: "Just now",
      content: commentText.trim(),
      replies: [],
    };
    setComments([...comments, newComment]);
    setCommentText("");
  };

  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return;
    setComments(
      comments.map((c) => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [
              ...(c.replies || []),
              {
                id: `rep-${Date.now()}`,
                author: "You (Learner)",
                avatar: "ME",
                time: "Just now",
                content: replyText.trim(),
              },
            ],
          };
        }
        return c;
      })
    );
    setReplyingToId(null);
    setReplyText("");
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {lessonIndex} {lessonTitle}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Instructor: <span className="font-medium text-foreground">{instructorName}</span>
          </p>
        </div>

        <Button
          variant={isCompleted ? "default" : "outline"}
          size="sm"
          onClick={onToggleComplete}
          className={`shrink-0 font-medium transition-all ${
            isCompleted
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "border-input hover:bg-accent"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Completed
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Mark as Completed
            </>
          )}
        </Button>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted ? "w-full bg-emerald-600" : "w-1/3 bg-primary/60"
          }`}
        />
      </div>

      {/* Reading Document Container */}
      <div className="rounded-lg border bg-background/50 p-4 max-h-[360px] overflow-y-auto space-y-3 text-sm leading-relaxed scrollbar-thin">
        {markdownContent ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
            {markdownContent}
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">
                ## Introduction to Search
              </h2>
              <p className="text-muted-foreground">
                Given a sorted array of integers... write a search function with O(log N)
                complexity.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">### Concept</h3>
              <p className="text-muted-foreground">
                The search algorithm partitions the dataset, on search algorithms for the course that
                is selecting the function on bmo-search results. By repeatedly halving the search space,
                binary search achieves logarithmic efficiency.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">### Constraints</h3>
              <p className="text-muted-foreground">
                Học viên đọc tài liệu và thảo luận bên dưới. Chú ý các trường hợp biên như mảng rỗng,
                mảng chỉ có 1 phần tử hoặc mảng chứa nhiều giá trị trùng lặp.
              </p>
            </div>

            <div className="rounded-md bg-muted p-3 font-mono text-xs text-foreground overflow-x-auto">
              <code>{`def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`}</code>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm font-medium">
        <button
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "content"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Content
        </button>
        <button
          onClick={() => setActiveTab("discussion")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "discussion"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Discussion ({totalCommentCount})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "content" ? (
        <div className="text-xs text-muted-foreground italic py-1">
          Đang xem nội dung lý thuyết bài học. Chọn tab &quot;Discussion&quot; để trao đổi cùng giảng viên và bạn học.
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Discussions ({totalCommentCount})
            </h3>
            <p className="text-xs text-muted-foreground">
              Text-based discussion forum posts with Nested comment threads (parent/child)
            </p>
          </div>

          {/* Comment Threads */}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                      {c.avatar}
                    </div>
                    <span className="font-semibold text-foreground">{c.author}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{c.time}</span>
                </div>

                <p className="text-foreground pl-8">{c.content}</p>

                <div className="pl-8">
                  <button
                    onClick={() =>
                      setReplyingToId(replyingToId === c.id ? null : c.id)
                    }
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {replyingToId === c.id ? "Cancel Reply" : "Reply"}
                  </button>
                </div>

                {/* Nested Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className="pl-6 border-l-2 border-primary/30 space-y-2 mt-2">
                    {c.replies.map((reply) => (
                      <div key={reply.id} className="bg-background rounded p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-[9px]">
                              {reply.avatar}
                            </div>
                            <span className="font-medium text-xs text-foreground">
                              {reply.author}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {reply.time}
                          </span>
                        </div>
                        <p className="text-xs text-foreground pl-4">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Box */}
                {replyingToId === c.id && (
                  <div className="pl-6 mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddReply(c.id);
                      }}
                      className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => handleAddReply(c.id)}
                    >
                      Send
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* New Discussion Message Input Card */}
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <textarea
              rows={2}
              placeholder="Message input card... Type your question or discussion topic here"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full resize-none border-none bg-transparent p-0 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex justify-end pt-1 border-t">
              <Button
                size="sm"
                onClick={handleAddComment}
                className="gap-1.5 text-xs h-8 px-3"
              >
                <Send className="h-3 w-3" />
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useMemo, useState } from "react";
import { Copy, Share2, Check, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type MonitorStory,
  type StoryInsights,
  type MessageTemplate,
  generateDeveloperMessage,
  formatDisplayDate,
} from "@/lib/story-monitoring";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface DeveloperCommunicationCardProps {
  story: MonitorStory;
  insights: StoryInsights;
}

const TEMPLATE_OPTIONS: { value: MessageTemplate; label: string }[] = [
  { value: "assignment", label: "Task Assignment" },
  { value: "reminder", label: "Deadline Reminder" },
  { value: "delay", label: "Delay Notification" },
];

export default function DeveloperCommunicationCard({
  story,
  insights,
}: DeveloperCommunicationCardProps) {
  const [template, setTemplate] = useState<MessageTemplate>("assignment");
  const [copied, setCopied] = useState(false);

  const targetInsight = insights.currentStageInsight;

  const message = useMemo(() => {
    if (!targetInsight) return "";
    return generateDeveloperMessage({ story, insight: targetInsight, template });
  }, [story, targetInsight, template]);

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.add({ title: "Message copied", description: "Developer message copied to clipboard.", type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!message || !targetInsight) return;
    const dev = targetInsight.stage.developBy;
    const shareData = {
      title: `Task: ${targetInsight.stageName}`,
      text: message,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (!targetInsight) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Developer Communication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No active stage to generate a message for.</p>
        </CardContent>
      </Card>
    );
  }

  const dev = targetInsight.stage.developBy;
  const stage = targetInsight.stage;

  return (
    <Card className="border-border shadow-md overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/10 pb-3">
        <CardTitle className="text-sm font-bold tracking-tight">Developer Communication</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Task summary */}
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> To
              </p>
              <p className="font-semibold text-foreground">{dev?.name || "Unassigned"}</p>
              {dev?.email && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {dev.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <InfoCell label="Current Task" value={targetInsight.stageName} />
              <InfoCell label="Status" value={stage.status.replace(/_/g, " ")} className="capitalize" />
              <InfoCell label="Planned Start" value={formatDisplayDate(stage.plannedStartDate)} />
              <InfoCell label="Planned End" value={formatDisplayDate(stage.plannedEndDate)} />
              {story.hasSprint && story.sprintUrl && (
                <InfoCell label="Sprint URL" value={story.sprintUrl} className="truncate text-primary" />
              )}
              {stage.branchName && <InfoCell label="Branch" value={stage.branchName} className="font-mono" />}
              {stage.githubPrLink && (
                <InfoCell label="PR" value={stage.githubPrLink} className="truncate text-primary" />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Message Type</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as MessageTemplate)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-xs"
              >
                {TEMPLATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message preview */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Message Preview</p>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans bg-muted/30 border border-border rounded-lg p-3 max-h-[280px] overflow-y-auto">
              {message}
            </pre>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleCopy} className="cursor-pointer text-xs">
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy Message
              </Button>
              <Button size="sm" onClick={handleShare} className="cursor-pointer text-xs">
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-card p-2">
      <p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-semibold mt-0.5 truncate", className)} title={value}>
        {value}
      </p>
    </div>
  );
}

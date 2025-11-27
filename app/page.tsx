"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";
import { VoiceButton } from "@/components/voice-button";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): StorageData => {
  if (typeof window === "undefined")
    return { messages: [], durations: {} };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>,
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

export default function ChatPage() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages, input, setInput } =
    useChat({
      messages: initialMessages,
    });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  // show welcome message only once
  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    <div className="chat-shell font-sans">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:py-6">
        {/* Top nav */}
        <header className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 ring-1 ring-emerald-500/70">
              <AvatarImage src="/logo.png" />
              <AvatarFallback>
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={36}
                  height={36}
                />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <h1 className="text-sm font-semibold tracking-tight text-slate-50">
                {AI_NAME}
              </h1>
              <p className="text-xs text-slate-400">
                FMCG Research Copilot for Financial Analysts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 md:inline">
              FMCG • NIFTY • MVP
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-900/60 text-xs text-slate-100 hover:border-emerald-500 hover:bg-slate-900"
              onClick={clearChat}
            >
              <Plus className="mr-1 size-3.5" />
              {CLEAR_CHAT_TEXT}
            </Button>
          </div>
        </header>

        {/* Main content: sidebar + chat */}
        <section className="grid flex-1 gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar with analyst tips */}
          <aside className="hidden flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-xs text-slate-200 md:flex">
            <h2 className="mb-1 text-sm font-semibold text-slate-50">
              How analysts use {AI_NAME}
            </h2>
            <ul className="space-y-1">
              <li>• Compare gross profit and margins across FMCG names.</li>
              <li>• Track YoY changes vs. previous annual reports.</li>
              <li>• Ask for segment breakdowns, RM / packaging inflation, A&amp;P.</li>
              <li>• Summarise management commentary on risks and outlook.</li>
            </ul>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-[11px] text-slate-400">
                FinSight AI searches embedded FMCG reports first and uses web
                data only when internal documents are insufficient. All answers
                should be grounded in filings and properly cited.
              </p>
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-700 bg-slate-900/80 p-3 shadow-sm backdrop-blur">
            {/* Messages area */}
            <div className="relative flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-1 pb-4 pt-1">
                <div className="flex min-h-[260px] flex-col items-center justify-end">
                  {isClient ? (
                    <>
                      <MessageWall
                        messages={messages}
                        status={status}
                        durations={durations}
                        onDurationChange={handleDurationChange}
                      />
                      {status === "submitted" && (
                        <div className="mt-2 flex w-full max-w-3xl justify-start">
                          <Loader2 className="size-4 animate-spin text-slate-400" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex w-full max-w-2xl justify-center">
                      <Loader2 className="size-4 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="message-fade-overlay" />
            </div>

            {/* Input row */}
            <div className="mt-3 border-t border-slate-700 pt-3">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel
                          htmlFor="chat-form-message"
                          className="sr-only"
                        >
                          Message
                        </FieldLabel>
                        <div className="flex items-end gap-2">
                          <div className="relative flex-1">
                            <Input
                              {...field}
                              id="chat-form-message"
                              className="h-12 w-full rounded-2xl border-slate-700 bg-slate-950/60 pr-24 pl-4 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500"
                              placeholder="Ask about gross profit, margins, volume growth, risks..."
                              disabled={status === "streaming"}
                              aria-invalid={fieldState.invalid}
                              autoComplete="off"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmit)();
                                }
                              }}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2">
                              {status === "streaming" ||
                              status === "submitted" ? (
                                <div className="pointer-events-auto">
                                  <Button
                                    className="h-8 w-8 rounded-full border border-slate-600 bg-slate-900/80 text-slate-100 hover:border-emerald-500"
                                    size="icon"
                                    type="button"
                                    onClick={() => {
                                      stop();
                                    }}
                                  >
                                    <Square className="size-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 pointer-events-auto">
                                  <VoiceButton
                                    onTranscript={(t) => {
                                      const nextValue = field.value
                                        ? `${field.value} ${t}`
                                        : t;
                                      field.onChange(nextValue);
                                      setInput(nextValue);
                                    }}
                                  />
                                  <Button
                                    className="h-8 w-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                    type="submit"
                                    disabled={!field.value.trim()}
                                    size="icon"
                                  >
                                    <ArrowUp className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </section>
        </section>

        {/* Footer */}
        <footer className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} {OWNER_NAME}. All rights reserved.
          </p>
          <p className="space-x-1">
            <Link href="/terms" className="underline">
              Terms of Use
            </Link>
            <span>·</span>
            <Link href="https://ringel.ai/" className="underline">
              Powered by Ringel.AI
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

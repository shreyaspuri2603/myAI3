"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Mic, Plus, Square } from "lucide-react";

import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";

import {
  AI_NAME,
  CLEAR_CHAT_TEXT,
  OWNER_NAME,
  WELCOME_MESSAGE,
} from "@/config";

import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "finsight-chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): StorageData => {
  if (typeof window === "undefined") {
    return { messages: [], durations: {} };
  }

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
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;

  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);
  const [isListening, setIsListening] = useState(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };

  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => ({
      ...prevDurations,
      [key]: duration,
    }));
  };

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
    const newDurations: Record<string, number> = {};

    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);

    toast.success("Chat cleared");
  }

  // Voice input using Web Speech API
  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      const current = form.getValues("message");
      form.setValue(
        "message",
        current ? `${current} ${transcript}` : transcript
      );
    };

    recognition.start();
  };

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-slate-50 font-sans text-slate-900">
      <main className="relative flex h-screen w-full max-w-6xl flex-col">
        {/* Header */}
        <div className="fixed left-0 right-0 top-0 z-50 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-9 ring-1 ring-emerald-500">
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
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  {AI_NAME}
                </p>
                <p className="text-xs text-slate-500">
                  FMCG Financial Research Copilot
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 md:inline">
                Focus: NIFTY FMCG • Annual Reports
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={clearChat}
              >
                <Plus className="mr-1 size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="mt-[64px] flex flex-1 gap-4 px-5 pb-[150px] pt-4">
          {/* Left rail: quick tips (desktop only) */}
          <aside className="hidden w-64 flex-col gap-3 rounded-xl border bg-white p-4 text-xs text-slate-600 md:flex">
            <h2 className="text-sm font-semibold text-slate-800">
              How analysts use {AI_NAME}
            </h2>
            <ul className="space-y-1">
              <li>• Compare gross profit and margins across FMCG names.</li>
              <li>• Track year-on-year changes from annual reports.</li>
              <li>
                • Ask for segment breakdowns, A&amp;P intensity, RM inflation,
                and key risks.
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              {AI_NAME} searches embedded FMCG documents first and uses web data
              only when internal filings are insufficient.
            </p>
          </aside>

          {/* Chat area */}
          <section className="flex flex-1 flex-col items-center">
            <div className="flex h-full w-full flex-col items-center justify-end">
              <div className="flex w-full max-w-3xl flex-1 flex-col justify-end">
                {isClient ? (
                  <>
                    {/* Preset Questions – show only when chat is empty (only welcome message or none) */}
                    {messages.length <= 1 && (
                      <div className="mb-10 w-full max-w-3xl">
                        <h2 className="mb-4 text-sm font-semibold text-slate-700">
                          Try asking FinSight AI:
                        </h2>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {[
                            "What can FinSight AI do?",
                            "Compare gross profit of HUL and ITC",
                            "Show margin trends in FMCG over the last 3 years",
                            "What are the key risks mentioned by FMCG companies?",
                            "Which FMCG companies have the highest pricing power?",
                          ].map((question) => (
                            <button
                              key={question}
                              onClick={() => sendMessage({ text: question })}
                              className="rounded-xl border bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <MessageWall
  messages={messages}
  status={status}
  durations={durations}
  onDurationChange={handleDurationChange}
  onFollowupClick={(text) => sendMessage({ text })}
/>

                    {status === "submitted" && (
                      <div className="mt-2 flex w-full justify-start">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex w-full justify-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-5 pt-4 pb-2">
            <div className="w-full max-w-3xl">
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

                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-13 rounded-full border-slate-300 bg-slate-50 pr-24 pl-5 text-sm shadow-sm focus-visible:ring-emerald-500"
                            placeholder="Ask about gross profit trends, margins, segment performance, or risks..."
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

                          {/* Voice button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={`absolute right-14 top-1.5 rounded-full border-slate-300 ${
                              isListening
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-white text-slate-600"
                            }`}
                            onClick={handleVoiceInput}
                          >
                            <Mic className="size-4" />
                          </Button>

                          {/* Send / Stop button */}
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-2 top-1.5 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}

                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-1.5 rounded-full"
                              size="icon"
                              type="button"
                              onClick={() => stop()}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-white/95">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 text-[11px] text-slate-500">
              <div>
                © {new Date().getFullYear()} {OWNER_NAME}. All rights reserved.
              </div>
              <div className="flex items-center gap-2">
                <Link href="/terms" className="underline">
                  Terms of Use
                </Link>
                <span>•</span>
                <span>
                  Built for FMCG financial research with{" "}
                  <Link href="https://ringel.ai/" className="underline">
                    Ringel.AI
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

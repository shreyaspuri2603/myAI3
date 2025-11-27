import { UIMessage, ToolCallPart, ToolResultPart } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";
import { ToolCall, ToolResult } from "./tool-call";

type AssistantMessageProps = {
  message: UIMessage;
  status?: string;
  isLastMessage?: boolean;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
  onFollowupClick?: (text: string) => void;
};

export function AssistantMessage({
  message,
  status,
  isLastMessage,
  durations,
  onDurationChange,
  onFollowupClick,
}: AssistantMessageProps) {
  return (
    <div className="w-full">
      <div className="text-sm flex flex-col gap-4">
        {message.parts.map((part, i) => {
          const isStreaming =
            status === "streaming" &&
            isLastMessage &&
            i === message.parts.length - 1;
          const durationKey = `${message.id}-${i}`;
          const duration = durations?.[durationKey];

          if (part.type === "text") {
            const text = String(part.text ?? "");

            // Look for a "Relevant follow-up questions:" section in this text part
            const headerRegex = /Relevant follow-up questions:\s*/i;
            const headerIndex = text.search(headerRegex);

            if (headerIndex === -1) {
              // No follow-ups → render as usual
              return (
                <Response key={`${message.id}-${i}`}>{text}</Response>
              );
            }

            // Split into main answer + follow-up section
            const mainAnswer = text.slice(0, headerIndex).trim();
            const followupRaw = text
              .slice(headerIndex)
              .replace(headerRegex, "")
              .trim();

            const followupQuestions = followupRaw
              .split("\n")
              .map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
              .filter(Boolean);

            return (
              <div
                key={`${message.id}-${i}`}
                className="flex flex-col gap-3"
              >
                {mainAnswer && <Response>{mainAnswer}</Response>}

                {followupQuestions.length > 0 && (
                  <div className="mt-1 space-y-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Relevant follow-up questions:
                    </p>

                    {followupQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          onFollowupClick && onFollowupClick(q)
                        }
                        className="block w-full rounded-xl border bg-white px-4 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          } else if (part.type === "reasoning") {
            return (
              <ReasoningPart
                key={`${message.id}-${i}`}
                part={part}
                isStreaming={isStreaming}
                duration={duration}
                onDurationChange={
                  onDurationChange
                    ? (d) => onDurationChange(durationKey, d)
                    : undefined
                }
              />
            );
          } else if (
            part.type.startsWith("tool-") ||
            part.type === "dynamic-tool"
          ) {
            if ("state" in part && part.state === "output-available") {
              return (
                <ToolResult
                  key={`${message.id}-${i}`}
                  part={part as unknown as ToolResultPart}
                />
              );
            } else {
              return (
                <ToolCall
                  key={`${message.id}-${i}`}
                  part={part as unknown as ToolCallPart}
                />
              );
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}

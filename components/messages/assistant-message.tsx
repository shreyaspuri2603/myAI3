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

          // ---------- TEXT PART ----------
          if (part.type === "text") {
            const raw = String(part.text ?? "");
            const lines = raw.split("\n").filter((l) => l.trim().length > 0);

            // Look for a line that is the follow-up heading
            const headerIndex = lines.findIndex((line) =>
              line.toLowerCase().startsWith("follow-up questions")
            );

            // If no heading, render normally
            if (headerIndex === -1) {
              return (
                <Response key={`${message.id}-${i}`}>{raw}</Response>
              );
            }

            // Everything before the heading (usually already rendered in another part,
            // but we keep it for safety)
            const preText = lines.slice(0, headerIndex).join("\n");
            const heading = lines[headerIndex];
            const questionLines = lines.slice(headerIndex + 1);

            const questions = questionLines
              .map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
              .filter((q) => q.length > 0);

            return (
              <div
                key={`${message.id}-${i}`}
                className="flex flex-col gap-3"
              >
                {preText && <Response>{preText}</Response>}

                {/* Heading */}
                <p className="font-semibold text-slate-800">
                  {heading.replace(/:\s*$/, ":")}
                </p>

                {/* Make each question itself clickable */}
                <div className="space-y-1">
                  {questions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        onFollowupClick && onFollowupClick(q)
                      }
                      className="block w-full text-left text-sm text-slate-900 hover:underline cursor-pointer"
                    >
                      {`${idx + 1}. ${q}`}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          // ---------- REASONING ----------
          if (part.type === "reasoning") {
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
          }

          // ---------- TOOL CALL / RESULT ----------
          if (
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

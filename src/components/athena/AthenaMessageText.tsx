import { Fragment, ReactNode } from "react";

interface AthenaMessageTextProps {
  text: string;
  className?: string;
}

function renderInlineMarkdown(line: string): ReactNode[] {
  return line
    .split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("__") && part.endsWith("__")) {
        return <strong key={index} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

export function AthenaMessageText({ text, className = "" }: AthenaMessageTextProps) {
  return (
    <div className={`break-words [overflow-wrap:anywhere] font-sans ${className}`}>
      {text.split("\n").map((line, index, lines) => (
        <Fragment key={index}>
          {renderInlineMarkdown(line)}
          {index < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </div>
  );
}

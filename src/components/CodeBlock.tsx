import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  title,
  maxHeight = 'max-h-72'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-2 border-[#51404B] rounded-sm overflow-hidden shadow-brutal-sm bg-[#1e191d] text-[#e0d6dc] my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#51404B] text-white border-b border-[#79616f]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] inline-block"></span>
          <span className="font-mono text-xs uppercase tracking-wider font-bold ml-1">
            {title || language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-[#79616f] hover:bg-[#917987] text-white rounded transition"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className={`p-3 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all ${maxHeight}`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

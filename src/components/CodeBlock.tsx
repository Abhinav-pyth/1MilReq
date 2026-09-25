import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="overflow-auto max-h-[600px]">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.8rem',
          lineHeight: '1.5',
        }}
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#4a5568',
          borderRight: '1px solid #2d3748',
          marginRight: '1em',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import hljs from "highlight.js";
import classes from "../styles/code-block.module.css";

type Props = {
  code: string;
  language?: string;
};

export default function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && language) {
      try {
        const result = hljs.highlight(code, { language, ignoreIllegals: true });
        codeRef.current.innerHTML = result.value;
      } catch {
        // Fallback: auto-detect language
        try {
          const result = hljs.highlightAuto(code);
          codeRef.current.innerHTML = result.value;
        } catch {
          codeRef.current.textContent = code;
        }
      }
    }
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={classes.codeBlock}>
      <div className={classes.codeHeader}>
        {language && <span className={classes.languageLabel}>{language}</span>}
        <Tooltip label={copied ? "Copied!" : "Copy code"}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            className={classes.copyButton}
            onClick={handleCopy}
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        </Tooltip>
      </div>
      <pre className={classes.pre}>
        <code ref={codeRef} className={classes.code}>
          {code}
        </code>
      </pre>
    </div>
  );
}

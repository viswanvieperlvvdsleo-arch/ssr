"use client";

import React, { useRef, useEffect } from "react";
import { useCMS } from "./CMSContext";

export default function EditableText({ tagName = "p", value, onChange, className, style }) {
  const { isEditMode, triggerSave } = useCMS();
  const Tag = tagName;
  const contentEditableRef = useRef(null);

  // Focus effect: if it's contentEditable, optionally do something, but let user click to focus.
  
  if (!isEditMode) {
    return <Tag className={className} style={style} suppressHydrationWarning={true}>{value}</Tag>;
  }

  return (
    <Tag
      ref={contentEditableRef}
      className={className}
      style={{
        ...style,
        outline: "1px dashed rgba(0, 150, 255, 0.5)",
        cursor: "text",
        minHeight: "1em",
        minWidth: "20px",
        display: style?.display || "inline-block",
        transition: "outline 0.2s",
        padding: "2px 4px",
        margin: "-2px -4px",
        borderRadius: "4px"
      }}
      contentEditable={true}
      suppressContentEditableWarning={true}
      suppressHydrationWarning={true}
      onBlur={(e) => {
        const newValue = e.target.innerText;
        if (newValue !== value) {
          onChange(newValue);
          triggerSave();
        }
      }}
      onFocus={(e) => {
        e.target.style.outline = "2px solid #4fc3f7";
        e.target.style.background = "rgba(0, 150, 255, 0.1)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.target) {
          e.target.style.outline = "1px dashed rgba(0, 150, 255, 0.5)";
          e.target.style.background = "transparent";
        }
      }}
      onMouseEnter={(e) => {
        if (document.activeElement !== e.target) {
          e.target.style.outline = "2px dashed #4fc3f7";
        }
      }}
    >
      {value}
    </Tag>
  );
}

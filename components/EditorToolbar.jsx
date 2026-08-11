"use client";

import React from "react";
import { useCMS } from "./CMSContext";
import { useRouter, usePathname } from "next/navigation";

export default function EditorToolbar() {
  const { isEditMode, toggleEditMode, isSaving, saveSuccess, triggerSave } = useCMS();
  const router = useRouter();
  const pathname = usePathname();

  if (!isEditMode) return null;

  return (
    <>
      {/* Editor bar sits BELOW the navbar */}
      <div className="editor-toolbar-bar">
        {/* Left: Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="editor-badge">
            <span className="editor-pulse-dot"></span>
            Editor Active
          </div>
          <span className="editor-path-label">
            Editing: <span style={{ color: "#4fc3f7" }}>{pathname || "/"}</span>
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {saveSuccess && (
            <span style={{ color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>
              ✓ Saved
            </span>
          )}
          
          <button
            onClick={() => triggerSave(() => {})}
            disabled={isSaving}
            className="editor-publish-btn"
          >
            {isSaving ? "⏳ Saving..." : "💾 Publish"}
          </button>

          <button
            onClick={() => {
              toggleEditMode(false);
              router.push("/admin");
            }}
            className="editor-exit-btn"
          >
            ✕ Exit
          </button>
        </div>
      </div>

      <style>{`
        @keyframes editorPulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        /* The toolbar sits fixed at the bottom of the screen. */
        .editor-toolbar-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: linear-gradient(to right, #001220, #002b4d);
          border-top: 1px solid rgba(0, 150, 255, 0.4);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
          font-family: system-ui, sans-serif;
        }

        .editor-badge {
          background: rgba(0,150,255,0.2);
          border: 1px solid #4fc3f7;
          padding: 3px 10px;
          border-radius: 16px;
          color: #4fc3f7;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .editor-pulse-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          background: #4fc3f7;
          border-radius: 50%;
          animation: editorPulse 1.5s infinite;
        }

        .editor-path-label {
          color: rgba(255,255,255,0.4);
          font-size: 11px;
        }

        .editor-publish-btn {
          background: #2563eb;
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .editor-publish-btn:disabled {
          background: rgba(255,255,255,0.1);
          cursor: not-allowed;
        }
        .editor-publish-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .editor-exit-btn {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,0.3);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .editor-exit-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        /* Pad the bottom of the body so content isn't blocked by the footer toolbar */
        body {
          padding-bottom: 48px !important;
        }

        /* On mobile */
        @media (max-width: 768px) {
          .editor-toolbar-bar {
            height: 44px;
            padding: 0 12px;
          }
          .editor-path-label {
            display: none;
          }
          .editor-badge {
            font-size: 10px;
            padding: 2px 8px;
          }
          body {
            padding-bottom: 44px !important;
          }
        }
      `}</style>
    </>
  );
}

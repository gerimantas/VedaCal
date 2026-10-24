"""Deny broad code search until a code graph has answered in this task.

One script, three hook events (see .claude/settings.json):
  UserPromptSubmit  a new user message is a new task: close the window.
  PostToolUse/Bash  graphify or code-review-graph returned real content: open it.
  PreToolUse        Grep over src/ or tests/, or a recursive grep/rg/find in Bash
                    or PowerShell, is denied while the window is closed.

Why a deny and not a reminder: vault wiki/agents/agent-ignores-project-tools.md.
A reminder can be skipped at no cost; a denied call cannot.
"""
import json
import os
import re
import sys
import tempfile

CODE_DIRS = ("src", "tests", "scripts")
GRAPH_CMD = re.compile(
    r"\b(graphify\s+(explain|query|path|affected)|code-review-graph\s+(query|impact|search))\b"
)
EMPTY_ANSWER = re.compile(
    r"No node matching|\"status\": \"not_found\"|Found 0 node|\"results\": \[\]"
)
SHELL_SEARCH = re.compile(
    r"\b(grep\s+(-\w*[rR]|--recursive)|rg\s|git\s+grep|find\s+\S*(src|tests|scripts)"
    r"|Select-String|findstr\s+/s)"
)

REASON = (
    "Broad code search is blocked until the code graph has answered in this task. "
    "Ask it first, from the repo root:\n"
    '  graphify explain "<symbol or file>"        what it is, where, its neighbours\n'
    '  code-review-graph query callers_of <name>  who calls it (sees calls inside .svelte)\n'
    "  code-review-graph impact --files <path> --depth 1   what a file change reaches\n"
    "Then say what it returned (\"daySummary is at src/ui/week.ts:179, called from "
    "Week.svelte\") and read those files directly. Grep on one named file, or on "
    ".planning/ and docs, is not blocked."
)


def state_path(session_id):
    return os.path.join(tempfile.gettempdir(), f"vedacal-graph-window-{session_id}")


def response_text(resp):
    if isinstance(resp, dict):
        return "\n".join(str(resp.get(k) or "") for k in ("stdout", "output", "stderr"))
    return str(resp or "")


def is_broad_grep(tool_input):
    path = (tool_input.get("path") or ".").replace("\\", "/").rstrip("/")
    rel = path.split("/VedaCal/", 1)[-1] if "/VedaCal/" in path else path
    if rel in (".", "") or rel.lower().endswith("projects/vedacal"):
        glob = tool_input.get("glob") or ""
        ftype = tool_input.get("type") or ""
        return not (glob.endswith(".md") or ftype == "md")
    top = rel.lstrip("./").split("/", 1)[0]
    is_file = os.path.splitext(rel)[1] != ""
    return top in CODE_DIRS and not is_file


def main():
    data = json.load(sys.stdin)
    event = data.get("hook_event_name")
    window = state_path(data.get("session_id", "none"))

    if event == "UserPromptSubmit":
        if os.path.exists(window):
            os.remove(window)
        return

    tool = data.get("tool_name")
    tool_input = data.get("tool_input") or {}
    command = tool_input.get("command") or ""

    if event == "PostToolUse":
        if tool == "Bash" and GRAPH_CMD.search(command):
            text = response_text(data.get("tool_response"))
            if text.strip() and not EMPTY_ANSWER.search(text):
                open(window, "w").close()
        return

    if event != "PreToolUse" or os.path.exists(window):
        return
    if tool == "Grep":
        broad = is_broad_grep(tool_input)
    elif tool in ("Bash", "PowerShell"):
        broad = bool(SHELL_SEARCH.search(command)) and ".planning" not in command
    else:
        broad = False
    if broad:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": REASON,
        }}))


if __name__ == "__main__":
    main()

import json
import re

log_path = "/Users/jacko/.gemini/antigravity-ide/brain/6281b43a-c922-444e-9844-93f72b66bfa7/.system_generated/logs/transcript.jsonl"

print("Searching logs...")
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get("content", "")
            # Look for VIEW_FILE or WRITE_FILE content containing PRD title
            if "相亲软件PRD" in content and ("# “校缘”" in content or "## 1. 问题陈述" in content) and len(content) > 5000:
                print(f"Found match in step {data.get('step_index')}, size {len(content)}")
                # Print a snippet to verify
                print(content[:500])
                # Save it
                with open(f"/Volumes/Files/Anti-gravity/六朝松相亲会/scratch/prd_extracted_{data.get('step_index')}.md", "w", encoding="utf-8") as out:
                    out.write(content)
        except Exception as e:
            pass
print("Done.")

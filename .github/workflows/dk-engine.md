---
description: Build and upload the dk-engine executable as a workflow artifact
name: Build dk-engine
on:
  workflow_dispatch:
permissions:
  contents: read
  actions: read
  issues: read
  pull-requests: read
engine:
  id: gemini
network:
  allowed:
    - defaults
    - github
    - go
    - node
    - python
    - rust
tools:
  mount-as-clis: true
  github:
    toolsets: [default]
  bash:
    - "*"
  edit:
safe-outputs:
  upload-artifact:
    max-uploads: 2
    retention-days: 14
    skip-archive: true
timeout-minutes: 20
strict: true
features:
  mcp-cli: true
---

# Build dk-engine

Build a real executable artifact named `dk-engine` from the current repository and upload it as a workflow artifact.

## Goal

Produce exactly one executable file named `dk-engine`. Do not create source code stubs, placeholder scripts, or fake binaries.

## Required process

1. Inspect the repository to identify the intended build path for `dk-engine`.
   - Check manifests, build scripts, Makefiles, task runners, package metadata, and documentation.
   - Prefer an existing documented target over heuristics.

2. Choose the narrowest valid build command that can produce `dk-engine`.
   - Prefer existing commands such as `make build`, `just build`, `go build`, `cargo build --release`, or another repository-native build entrypoint.
   - Only use a fallback command if the repository clearly contains a `dk-engine` executable target but lacks a single wrapper command.

3. Build the binary into a temporary staging directory.
   - Use `/tmp/dk-engine-build/` for intermediate files.
   - Place the final executable at `/tmp/dk-engine-build/dk-engine`.
   - Ensure the file is executable with `chmod +x`.

4. Verify the artifact before upload.
   - Run `ls -l /tmp/dk-engine-build/dk-engine`
   - Run `file /tmp/dk-engine-build/dk-engine`
   - Run `shasum -a 256 /tmp/dk-engine-build/dk-engine`
   - Save a short build summary to `/tmp/dk-engine-build/summary.txt`

5. Upload the artifact.
   - Stage the executable in `$RUNNER_TEMP/gh-aw/safeoutputs/upload-artifacts/dk-engine`
   - Call the `upload_artifact` safe-output tool with `path: "dk-engine"`

## Fallback rules

- If the repository does not contain a credible, evidence-based way to build `dk-engine`, do not guess.
- If multiple incompatible build paths exist and the correct one is not clear from the repo, do not guess.
- If the build fails, report the exact command and failure reason in a `noop`.

## Constraints

- Do not modify repository files.
- Do not invent new build tooling.
- Do not upload archives, only the single executable file.
- Keep the final response concise and include the command that produced the binary.

## If blocked

Call `noop` with a short explanation that states why a trustworthy `dk-engine` executable could not be produced.

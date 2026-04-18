---
description: Build and upload the dhok executable as a workflow artifact
name: Build dhok
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

# Build dhok

Build a real executable artifact named `dhok` from the current repository and upload it as a workflow artifact.

## Goal

Produce exactly one executable file named `dhok`. Do not create source code stubs, placeholder scripts, or fake binaries.

## Required process

1. Inspect the repository to identify the intended build path for `dhok`.
   - Check manifests, build scripts, Makefiles, task runners, package metadata, and documentation.
   - Prefer an existing documented target over heuristics.

2. Choose the narrowest valid build command that can produce `dhok`.
   - Prefer existing commands such as `make build`, `just build`, `go build`, `cargo build --release`, or another repository-native build entrypoint.
   - Only use a fallback command if the repository clearly contains a `dhok` executable target but lacks a single wrapper command.

3. Build the binary into a temporary staging directory.
   - Use `/tmp/dhok-build/` for intermediate files.
   - Place the final executable at `/tmp/dhok-build/dhok`.
   - Ensure the file is executable with `chmod +x`.

4. Verify the artifact before upload.
   - Run `ls -l /tmp/dhok-build/dhok`
   - Run `file /tmp/dhok-build/dhok`
   - Run `shasum -a 256 /tmp/dhok-build/dhok`
   - Save a short build summary to `/tmp/dhok-build/summary.txt`

5. Upload the artifact.
   - Stage the executable in `$RUNNER_TEMP/gh-aw/safeoutputs/upload-artifacts/dhok`
   - Call the `upload_artifact` safe-output tool with `path: "dhok"`

## Fallback rules

- If the repository does not contain a credible, evidence-based way to build `dhok`, do not guess.
- If multiple incompatible build paths exist and the correct one is not clear from the repo, do not guess.
- If the build fails, report the exact command and failure reason in a `noop`.

## Constraints

- Do not modify repository files.
- Do not invent new build tooling.
- Do not upload archives, only the single executable file.
- Keep the final response concise and include the command that produced the binary.

## If blocked

Call `noop` with a short explanation that states why a trustworthy `dhok` executable could not be produced.

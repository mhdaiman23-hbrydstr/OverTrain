# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! command -v rg >/dev/null 2>&1; then
  alias rg=''\''c:\Users\mhdai\.vscode\extensions\anthropic.claude-code-2.0.8\resources\claude-code\vendor\ripgrep\x64-win32\rg.exe'\'''
fi
export PATH=$PATH

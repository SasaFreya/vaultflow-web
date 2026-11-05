# Local bank-parser fixtures

Original bank statement extracts are excluded from the public source snapshot.
Do not commit real bank statements, account identifiers or transaction histories.

The main finance regression suite uses synthetic in-memory data and does not
require these files:

```bash
npm run test:finance
```

`scripts/test-bank-debug.ts` can extract locally supplied PDFs for personal
parser debugging. Its `.txt` outputs are intentionally ignored by Git.

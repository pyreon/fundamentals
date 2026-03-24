---
"@pyreon/store": minor
"@pyreon/state-tree": minor
"@pyreon/form": minor
"@pyreon/validation": minor
"@pyreon/query": minor
"@pyreon/table": minor
"@pyreon/virtual": minor
"@pyreon/i18n": minor
"@pyreon/feature": minor
"@pyreon/charts": minor
"@pyreon/storage": minor
"@pyreon/hotkeys": minor
"@pyreon/permissions": minor
"@pyreon/machine": minor
"@pyreon/storybook": minor
"@pyreon/flow": minor
"@pyreon/code": minor
"@pyreon/document": minor
---

### Improvements
- Upgrade to TypeScript 6.0 and pyreon 0.7.3
- Switch to @pyreon/typescript for tsconfig presets
- Full exactOptionalPropertyTypes compliance
- Security: add sanitization across all document renderers (XSS, XML injection, protocol validation)
- Fix WebSocket.send() type for TS 6.0
- Clean up conditional spreading now that core 0.7.3 accepts undefined on JSX attrs

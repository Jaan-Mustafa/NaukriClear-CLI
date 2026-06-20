## What does this PR do?

<!-- One line summary -->

## Type of change

- [ ] New ATS provider
- [ ] New companies added to portals.example.yml
- [ ] Bug fix
- [ ] Improvement to existing provider
- [ ] Other

## For new providers — checklist

- [ ] `detect()` handles both `provider_id` field and URL pattern
- [ ] `fetch()` returns `[]` on all errors (never throws)
- [ ] Each job object has `{ title, company, location, url, source }`
- [ ] `url` is validated — starts with `https://` and is on the expected domain
- [ ] `matchesFilters` applied before returning
- [ ] At least one real company added to `portals.example.yml` to demonstrate it works

## Testing

<!-- How did you verify this works? Paste the test command and output -->

```bash
node -e "import('./providers/myprovider.mjs').then(async m => { ... })"
```

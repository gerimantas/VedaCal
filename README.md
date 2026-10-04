# VedaCal

The traditional Hindu lunar calendar (Panchang) in plain words, for people who follow
moon cycles and mindful routines. A web app you can install on your phone; everything is
calculated on your device and works offline.

**Status:** early development — https://gerimantas.github.io/VedaCal/

## Development

```bash
npm ci          # install (scripts disabled by .npmrc)
npm run dev     # local server
npm test        # tests
npm run scan    # dependency security scan — rerun after any dependency change
npm run build   # production build into dist/
```

Calculations: [`@ishubhamx/panchangam-js`](https://www.npmjs.com/package/@ishubhamx/panchangam-js)
on [`astronomy-engine`](https://github.com/cosinekitty/astronomy), checked against
drikpanchang.com and mypanchang.com.

Not medical advice. Guidance in the app describes tradition, not health effects.

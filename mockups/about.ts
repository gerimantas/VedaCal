// P3 mockup — About page: what VedaCal is, a plain-English key to every term on the day
// screen, how times are calculated, and credits. Texts come from en.json.
import { sheet, t } from '../src/ui/format'
import { icon, mount, tabs, terms, type Term, vilnius } from './common'
import { MOCKUP_VERSION } from './version'

mount(`
<main class="screen">
  <h1 class="page-title">${t('about')}</h1>

  <section class="card about-intro">
    <p>${sheet('about')}</p>
  </section>

  <h2 class="about-head">${t('howToRead')}</h2>
  <ul class="card terms">
    ${(Object.entries(terms) as [Term, (typeof terms)[Term]][])
      .map(
        ([key, [name, sanskrit]]) => `<li><details>
          <summary><b>${name}</b>${sanskrit ? `<span class="sk">${sanskrit}</span>` : ''}${icon.down}</summary>
          <p>${sheet(key)}</p>
        </details></li>`,
      )
      .join('')}
  </ul>

  <section class="card about-intro">
    <p>${sheet('times', { city: vilnius.name })}</p>
  </section>

  <h2 class="about-head">${t('credits')}</h2>
  <section class="card about-intro">
    <p>${t('creditMoon')}</p>
    <p>${t('creditCities')}</p>
    <p class="quiet num">${t('version')} ${MOCKUP_VERSION}</p>
  </section>
</main>
${tabs('about')}
`)

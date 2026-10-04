import { t } from './format'

// Every term on the day screen: plain-English name, Sanskrit name, explanation sheet.
// One list, used by the tap-to-explain sheet and the About page.
export const terms = {
  tithi: ['Lunar day', 'Tithi'],
  vara: [t('labelWeekday'), 'Vara'],
  masa: [t('labelMonth'), 'Masa'],
  nakshatra: [t('labelStar'), 'Nakshatra'],
  rashi: ['Moon & Sun signs', 'Rashi'],
  yoga: [t('labelYoga'), 'Yoga'],
  karana: [t('labelKarana'), 'Karana'],
  brahma: [t('legendCalmTime'), 'Brahma Muhurta'],
  abhijit: [t('legendGoodTime'), 'Abhijit Muhurta'],
  rahuKaal: [t('legendAvoidTime'), 'Rahu Kaal'],
  parana: [t('labelParana'), 'Parana'],
  eclipse: [t('labelEclipse'), 'Grahan'],
  sankranti: [t('labelSankranti'), 'Sankranti'],
  pushya: [t('labelFavoured'), 'Guru / Ravi Pushya'],
  rhythm: [t('sectionTradition'), ''],
} as const
export type Term = keyof typeof terms

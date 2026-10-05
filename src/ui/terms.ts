import { t } from './format'

// Every term on the day screen: plain-English name, Sanskrit name, explanation sheet.
// One list, used by the tap-to-explain sheet and the About page.
export const terms = {
  tithi: [t('labelTithi'), 'Tithi'],
  vara: [t('labelWeekday'), 'Vara'],
  masa: [t('labelMonth'), 'Masa'],
  nakshatra: [t('labelStar'), 'Nakshatra'],
  rashi: [t('labelSigns'), 'Rashi'],
  yoga: [t('labelYoga'), 'Yoga'],
  karana: [t('labelKarana'), 'Karana'],
  brahma: [t('legendCalmTime'), 'Brahma Muhurta'],
  abhijit: [t('legendGoodTime'), 'Abhijit Muhurta'],
  rahuKaal: [t('legendAvoidTime'), 'Rahu Kaal'],
  yamaganda: [t('labelYamaganda'), 'Yamaganda'],
  gulika: [t('labelGulika'), 'Gulika'],
  choghadiya: [t('labelChoghadiya'), 'Choghadiya'],
  parana: [t('labelParana'), 'Parana'],
  eclipse: [t('labelEclipse'), 'Grahan'],
  sankranti: [t('labelSankranti'), 'Sankranti'],
  pushya: [t('labelFavoured'), 'Guru / Ravi Pushya'],
  rhythm: [t('sectionTradition'), ''],
} as const
export type Term = keyof typeof terms

// The About page's key, grouped so a long list stays easy to scan.
export const termGroups: [string, Term[]][] = [
  [t('groupCalendar'), ['tithi', 'vara', 'masa', 'nakshatra', 'rashi', 'yoga', 'karana']],
  [t('groupTimes'), ['brahma', 'abhijit', 'rahuKaal', 'yamaganda', 'gulika', 'choghadiya']],
  [t('groupSpecial'), ['parana', 'eclipse', 'sankranti', 'pushya', 'rhythm']],
]

import { bundledLanguagesInfo } from 'shiki/bundle/web';

export type SupportedLanguageConfig = {
  id: string; // 语言的唯一标识
  name: string; //语言的显示名称
  match: string[]; //匹配规则
};

const defaultSupportedLanguages: SupportedLanguageConfig[] = [
  {
    id: 'text',
    name: 'Plain Text',
    match: ['text', 'txt', 'plain'],
  },
  ...bundledLanguagesInfo
    .filter((lang) => {
      // 过滤不常用的语言
      return ![
        'angular-html',
        'angular-ts',
        'astro',
        'blade',
        'coffee',
        'handlebars',
        'html-derivative',
        'http',
        'imba',
        'jinja',
        'jison',
        'json5',
        'marko',
        'mdc',
        'stylus',
        'ts-tags',
      ].includes(lang.id);
    })
    .map((lang) => ({
      name: lang.name,
      id: lang.id,
      match: [lang.id, ...(lang.aliases || [])],
    })),

  {
    id: 'haskell',
    name: 'Haskell',
    match: ['haskell', 'hs'],
  },
  {
    id: 'csharp',
    name: 'C#',
    match: ['c#', 'csharp', 'cs'],
  },
  {
    id: 'latex',
    name: 'LaTeX',
    match: ['latex'],
  },
  {
    id: 'lua',
    name: 'Lua',
    match: ['lua'],
  },
  {
    id: 'mermaid',
    name: 'Mermaid',
    match: ['mermaid', 'mmd'],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    match: ['ruby', 'rb'],
  },
  {
    id: 'rust',
    name: 'Rust',
    match: ['rust', 'rs'],
  },
  {
    id: 'scala',
    name: 'Scala',
    match: ['scala'],
  },
  {
    id: 'swift',
    name: 'Swift',
    match: ['swift'],
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    match: ['kotlin', 'kt', 'kts'],
  },
  {
    id: 'objective-c',
    name: 'Objective C',
    match: ['objective-c', 'objc'],
  },
];

let currentSupportedLanguages: SupportedLanguageConfig[] =
  defaultSupportedLanguages;

export function addSupportedLanguage(language: SupportedLanguageConfig[]) {
  const existingIds = new Set(currentSupportedLanguages.map((lang) => lang.id));

  for (const lang of language) {
    if (!existingIds.has(lang.id)) {
      currentSupportedLanguages.push(lang);
      existingIds.add(lang.id);
    }
  }
}

export function getSupportedLanguages(): SupportedLanguageConfig[] {
  return currentSupportedLanguages;
}

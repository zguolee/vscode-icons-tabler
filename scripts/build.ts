import { execSync } from 'child_process'
import fs from 'fs-extra'
// @ts-expect-error missing types
import gen from 'webfonts-generator'
import pkg from '../package.json'
import { sets } from './sets'

const e = (cmd: string) => execSync(cmd, { stdio: 'inherit' })

for (const set of sets) {
  const START_CODEPOINT = 0xE000

  const name = set.name
  const displayName = set.display

  fs.removeSync('temp')
  fs.ensureDirSync('temp/dist')
  fs.ensureDirSync('temp/icons')
  fs.ensureDirSync(`build/${name}`)
  fs.emptyDirSync(`build/${name}`)

  const icons = Object.entries(set.icons).map(([k, v]) => {
    v = v || k
    k = k.replace('codicon:', '')
    const [id, name] = v.split(':')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const json = require(`@iconify/json/json/${id}.json`)
    const body = json.icons[name]?.body
    const height = json.info.height
    if (!body)
      console.error(v)

    fs.writeFileSync(`temp/icons/${k}.svg`, `<svg width="${height}" height="${height}" viewBox="0 0 ${height} ${height}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${body}</svg>`, 'utf-8')
    return k
  })

  e('npx svgo -f temp/icons/ --config svgo-config.yml')

  gen(
    {
      files: icons.map(i => `./temp/icons/${i}.svg`),
      dest: './temp/dist',
      types: ['woff'],
      fontName: name,
      css: false,
      html: true,
      startCodepoint: START_CODEPOINT,
      fontHeight: 1000,
      normalize: true,
    },
    (error: any) => {
      if (error) {
        console.log('Font creation failed.', error)
        process.exit(1)
      }

      fs.copyFileSync(`./temp/dist/${name}.woff`, `build/${name}/${name}.woff`)
    },
  )

  fs.writeJSONSync(
    `build/${name}/${name}.json`,
    {
      fonts: [
        {
          id: name,
          src: [
            {
              path: `./${name}.woff`,
              format: 'woff',
            },
          ],
          weight: 'normal',
          style: 'normal',
        },
      ],

      iconDefinitions: Object.fromEntries(icons.map((i, idx) => [i, { fontCharacter: formatUnicode(START_CODEPOINT + idx) }])),
    },
    { spaces: 2 },
  )

  fs.writeJSONSync(
    `build/${name}/package.json`,
    {
      name,
      publisher: 'zguolee',
      version: pkg.version,
      displayName: `${displayName} Product Icons`,
      description: `${displayName} Product Icons for VS Code`,
      icon: 'icon.png',
      categories: ['Themes'],
      engines: {
        vscode: pkg.engines.vscode,
      },
      license: 'MIT',
      keywords: ['icon', 'theme', 'product', 'product-icon-theme'],
      extensionKind: ['ui'],
      contributes: {
        productIconThemes: [
          {
            id: name,
            label: `${displayName} Icons`,
            path: `./${name}.json`,
          },
        ],
      },
      repository: {
        type: 'git',
        url: 'https://github.com/zguolee/vscode-icons-tabler.git',
      },
      bugs: {
        url: 'https://github.com/zguolee/vscode-icons-tabler/issues',
      },
      author: {
        name: 'Neil Lee',
      },
    },
    { spaces: 2 },
  )

  fs.copySync('README.md', `build/${name}/README.md`)
  fs.copySync('icon.png', `build/${name}/icon.png`)
}

function formatUnicode(unicode: number) {
  return `\\${unicode.toString(16)}`
}

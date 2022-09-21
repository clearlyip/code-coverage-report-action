import {promises as fs} from 'fs'
import {XMLParser} from 'fast-xml-parser'
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
  TargetLanguage
} from 'quicktype-core'

const {access, readFile, writeFile} = fs

async function quicktypeJSON(
  targetLanguage: string | TargetLanguage,
  typeName: string,
  jsonString: string
) {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage)

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we're
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: typeName,
    samples: [jsonString]
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage
  })
}

async function quicktypeJSONSchema(
  targetLanguage: string | TargetLanguage,
  typeName: string,
  jsonSchemaString: string | undefined
) {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore())

  // We could add multiple schemas for multiple types,
  // but here we're just making one type from JSON schema.
  await schemaInput.addSource({name: typeName, schema: jsonSchemaString})

  const inputData = new InputData()
  inputData.addInput(schemaInput)

  return await quicktype({
    inputData,
    lang: targetLanguage
  })
}

async function run() {
  const contents = await readFile('./__tests__/clover.xml', 'binary')

  const parsed = new XMLParser({
    ignoreAttributes: false
  }).parse(contents)

  const {lines: swiftPerson} = await quicktypeJSON(
    'typescript',
    'Clover',
    JSON.stringify(parsed)
  )

  await writeFile('./src/reports/clover.ts', swiftPerson.join('\n'))
}

run()

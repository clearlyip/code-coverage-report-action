import fs from 'fs'

export async function loadFixture(filename: string): Promise<string> {
  return fs.promises.readFile(__dirname + '/fixtures/' + filename, 'utf8')
}

export async function loadJSONFixture(filename: string): Promise<any> {
  return JSON.parse(await loadFixture(filename))
}

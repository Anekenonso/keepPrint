export async function readFile(): Promise<Buffer> {
  throw new Error('File reading is not supported in browser client.');
}

export default { readFile };

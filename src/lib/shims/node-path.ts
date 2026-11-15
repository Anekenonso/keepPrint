export function extname(path: string): string {
  const match = /\.[^.]+$/.exec(path);
  return match ? match[0] : '';
}

export default { extname };

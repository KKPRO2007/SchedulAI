import { readWorkbook, type ParseRequest } from './readWorkbook';

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, name, buffer } = event.data;
  try {
    const sheets = readWorkbook(name, buffer);
    self.postMessage({ id, ok: true, sheets });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : 'Could not read file' });
  }
};

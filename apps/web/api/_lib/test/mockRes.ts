import { EventEmitter } from 'node:events';

export function createMockRes() {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      queueMicrotask(() => emitter.emit('finish'));
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    end(payload?: unknown) {
      if (payload !== undefined) res.body = payload;
      queueMicrotask(() => emitter.emit('finish'));
      return res;
    }
  });
  return res;
}

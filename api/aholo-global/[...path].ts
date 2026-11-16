import { proxyToAholo } from '../_proxy';

export const config = {
  runtime: 'edge',
};

export default function handler(request: Request): Promise<Response> {
  return proxyToAholo(request, 'api.aholo.ai', '/api/aholo-global');
}

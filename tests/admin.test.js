import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn(async () => ({
  data: { milestones: {}, events: {}, daily_creates: [], totals: {} },
  error: null,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: rpcMock }),
}));

const { default: handler } = await import('../api/admin.js');

function mockReq(headers = {}, query = {}) {
  return { method: 'GET', headers, query };
}
function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = () => {};
  res.end = () => res;
  return res;
}

beforeEach(() => {
  rpcMock.mockClear();
  process.env.ADMIN_TOKEN = 'correct-horse-battery-staple';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('api/admin auth', () => {
  it('401s without a token', async () => {
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('401s on a wrong token (including different lengths)', async () => {
    for (const bad of ['nope', 'correct-horse-battery-stapl', 'correct-horse-battery-staple-x']) {
      const res = mockRes();
      await handler(mockReq({ authorization: `Bearer ${bad}` }), res);
      expect(res.statusCode).toBe(401);
    }
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('503s when ADMIN_TOKEN is unset (never open by default)', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = mockRes();
    await handler(mockReq({ authorization: 'Bearer anything' }), res);
    expect(res.statusCode).toBe(503);
  });

  it('serves metrics with the correct token and clamps the window', async () => {
    const res = mockRes();
    await handler(mockReq({ authorization: 'Bearer correct-horse-battery-staple' }, { days: '9999' }), res);
    expect(res.statusCode).toBeNull(); // json 200 path
    expect(res.body.days).toBe(365);
    expect(rpcMock).toHaveBeenCalledWith('admin_metrics', expect.objectContaining({
      p_from: expect.any(String),
      p_to: expect.any(String),
    }));
  });
});

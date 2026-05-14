const makeChain = (resolved: any = { data: null, error: null }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolved),
    then: (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject),
    catch: (fn: any) => Promise.resolve(resolved).catch(fn),
    finally: (fn: any) => Promise.resolve(resolved).finally(fn),
  };
  return chain;
};

export const supabaseAdmin = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => makeChain()),
};

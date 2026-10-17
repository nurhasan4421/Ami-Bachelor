import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabase = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('mock'));
export const BYPASS_AUTH = !isLiveSupabase;

const liveClient = isLiveSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;
const MOCK_USER = {
  id: 'manager-user-001',
  email: 'nurhasan@gmail.com',
  user_metadata: { full_name: 'Nur Hasan' }
};

const MOCK_SESSION = {
  user: MOCK_USER,
  access_token: 'mock-token-local',
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const INITIAL_DB: Record<string, any[]> = {
  hostels: [
    {
      id: 1,
      name: 'Ami Bachelor Mess',
      security_code: 'BACH26',
      owner_id: 'manager-user-001'
    }
  ],
  months: [
    {
      id: 'month-current',
      name: 'October 2026',
      owner_id: 'manager-user-001',
      hostel_id: 1,
      security_code: 'BACH26',
      show_actions_to_members: true,
      created_at: new Date().toISOString()
    }
  ],
  roommates: [
    { id: '1', name: 'Nur Hasan', user_id: 'manager-user-001', month_id: 'month-current', role: 'manager', email: 'nurhasan@gmail.com', phone: '01711-000000', joined_date: '2026-10-01' },
    { id: '2', name: 'Tanvir', user_id: 'user-002', month_id: 'month-current', role: 'member', email: 'tanvir@gmail.com', phone: '01811-000000', joined_date: '2026-10-01' },
    { id: '3', name: 'Siam', user_id: 'user-003', month_id: 'month-current', role: 'member', email: 'siam@gmail.com', phone: '01911-000000', joined_date: '2026-10-01' },
    { id: '4', name: 'Rakib', user_id: 'user-004', month_id: 'month-current', role: 'member', email: 'rakib@gmail.com', phone: '01611-000000', joined_date: '2026-10-01' }
  ],
  fixed_costs: [
    { id: 'fc1', category: 'Rent', amount: 16000, month_id: 'month-current' },
    { id: 'fc2', category: 'WiFi', amount: 1000, month_id: 'month-current' },
    { id: 'fc3', category: 'Gas', amount: 1080, month_id: 'month-current' },
    { id: 'fc4', category: 'Electricity', amount: 1800, month_id: 'month-current' },
    { id: 'fc5', category: 'Chef', amount: 4000, month_id: 'month-current' }
  ],
  food_deposits: [
    { id: 'd1', person: 'Nur Hasan', amount: 3000, date: '2026-10-01', month_id: 'month-current' },
    { id: 'd2', person: 'Tanvir', amount: 3000, date: '2026-10-01', month_id: 'month-current' },
    { id: 'd3', person: 'Siam', amount: 3000, date: '2026-10-01', month_id: 'month-current' },
    { id: 'd4', person: 'Rakib', amount: 3000, date: '2026-10-01', month_id: 'month-current' },
    { id: 'd5', person: 'Nur Hasan', amount: 1500, date: '2026-10-05', month_id: 'month-current' },
    { id: 'd6', person: 'Tanvir', amount: 1200, date: '2026-10-08', month_id: 'month-current' }
  ],
  expenses: [
    { id: 'e1', description: 'Monthly Rice & Spices', amount: 4800, category: 'Grocery', paidBy: 'Meal', date: '2026-10-02', month_id: 'month-current' },
    { id: 'e2', description: 'Fish & Meat', amount: 2400, category: 'Grocery', paidBy: 'Nur Hasan', date: '2026-10-04', month_id: 'month-current' },
    { id: 'e3', description: 'Vegetables & Oil', amount: 1150, category: 'Grocery', paidBy: 'Tanvir', date: '2026-10-06', month_id: 'month-current' },
    { id: 'e4', description: 'Morning Groceries & Eggs', amount: 620, category: 'Grocery', paidBy: 'Rakib', date: '2026-10-08', month_id: 'month-current' },
    { id: 'e5', description: 'Chicken & Masala', amount: 1350, category: 'Grocery', paidBy: 'Siam', date: '2026-10-09', month_id: 'month-current' },
    { id: 'e6', description: 'Cooking Oil & Salt', amount: 840, category: 'Grocery', paidBy: 'Nur Hasan', date: '2026-10-10', month_id: 'month-current' }
  ],
  daily_meals: [
    { id: 'm1', date: '2026-10-01', month_id: 'month-current', meals: { 'Nur Hasan': 2, 'Tanvir': 2, 'Siam': 2, 'Rakib': 2 } },
    { id: 'm2', date: '2026-10-02', month_id: 'month-current', meals: { 'Nur Hasan': 2, 'Tanvir': 3, 'Siam': 2, 'Rakib': 1 } },
    { id: 'm3', date: '2026-10-03', month_id: 'month-current', meals: { 'Nur Hasan': 2, 'Tanvir': 2, 'Siam': 3, 'Rakib': 2 } }
  ],
  manual_adjustments: [],
  history_logs: [
    { id: 'h1', person: 'Nur Hasan', action: 'Created workspace and started month', created_at: new Date().toISOString(), month_id: 'month-current' }
  ],
  bazar_list: [
    { id: 1, date: getTodayDate(), item_name: 'Eggs (1 Dozen)', is_completed: false, month_id: 'month-current' },
    { id: 2, date: getTodayDate(), item_name: 'Onions & Green Chilies', is_completed: true, completed_by: 'Nur Hasan', month_id: 'month-current' }
  ],
  meal_schedules: [
    { id: 1, date: getTodayDate(), breakfast: 'Roti + Dal', lunch: 'Rice + Fish', dinner: 'Rice + Chicken', month_id: 'month-current' }
  ],
  member_availability: [
    { id: 1, user_id: 'manager-user-001', name: 'Nur Hasan', status: 'in', month_id: 'month-current' },
    { id: 2, user_id: 'user-002', name: 'Tanvir', status: 'in', month_id: 'month-current' },
    { id: 3, user_id: 'user-003', name: 'Siam', status: 'out', month_id: 'month-current' },
    { id: 4, user_id: 'user-004', name: 'Rakib', status: 'in', month_id: 'month-current' }
  ],
  join_requests: []
};

const DB_KEY = '__AMI_BACHELOR_LOCAL_DB__';

function getLocalDB(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DB));
      return JSON.parse(JSON.stringify(INITIAL_DB));
    }
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function saveLocalDB(db: Record<string, any[]>) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertPayload: any = null;
  private updatePayload: any = null;
  private selectColumns: string = '*';
  private sortFn: ((a: any, b: any) => number) | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private countMode: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    if (this.action !== 'insert' && this.action !== 'update' && this.action !== 'delete') {
      this.action = 'select';
    }
    this.selectColumns = columns;
    if (options?.count) this.countMode = options.count;
    return this;
  }

  insert(payload: any | any[]) {
    this.action = 'insert';
    this.insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(item => item && String(item[column]) === String(value));
    return this;
  }

  in(column: string, values: any[]) {
    const strVals = values.map(v => String(v));
    this.filters.push(item => item && strVals.includes(String(item[column])));
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.sortFn = (a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (ascending) return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private execute() {
    const db = getLocalDB();
    if (!db[this.tableName]) {
      db[this.tableName] = [];
    }
    let table = db[this.tableName];

    if (this.action === 'insert') {
      const inserted: any[] = [];
      const hostelsTable = db['hostels'] || [];
      for (const rawItem of this.insertPayload) {
        const item = {
          id: rawItem.id || (typeof rawItem.id === 'number' ? Date.now() : String(Date.now() + Math.random().toString(36).substring(2, 6))),
          created_at: rawItem.created_at || new Date().toISOString(),
          ...rawItem
        };
        table.push(item);
        inserted.push(item);
      }
      saveLocalDB(db);

      // Handle relations if needed (e.g. months -> hostels)
      if (this.tableName === 'months') {
        inserted.forEach(m => {
          m.hostels = hostelsTable.find((h: any) => h.id === m.hostel_id) || null;
        });
      }

      return {
        data: this.isSingle || this.isMaybeSingle ? inserted[0] : inserted,
        error: null,
        count: inserted.length
      };
    }

    if (this.action === 'update') {
      const updated: any[] = [];
      table.forEach((item: any, idx: number) => {
        if (this.filters.every(fn => fn(item))) {
          table[idx] = { ...item, ...this.updatePayload };
          updated.push(table[idx]);
        }
      });
      saveLocalDB(db);
      return {
        data: this.isSingle || this.isMaybeSingle ? updated[0] || null : updated,
        error: null,
        count: updated.length
      };
    }

    if (this.action === 'delete') {
      const beforeCount = table.length;
      db[this.tableName] = table.filter((item: any) => !this.filters.every(fn => fn(item)));
      saveLocalDB(db);
      return {
        data: null,
        error: null,
        count: beforeCount - db[this.tableName].length
      };
    }

    // Default: 'select'
    let results = table.filter((item: any) => this.filters.every(fn => fn(item)));
    const totalCount = results.length;

    // Attach hostels if querying months
    if (this.tableName === 'months' && this.selectColumns.includes('hostels')) {
      const hostelsTable = db['hostels'] || [];
      results = results.map((m: any) => ({
        ...m,
        hostels: hostelsTable.find((h: any) => h.id === m.hostel_id) || null
      }));
    }

    if (this.sortFn) {
      results.sort(this.sortFn);
    }
    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    let returnData: any = results;
    if (this.isSingle) {
      returnData = results[0] || null;
    } else if (this.isMaybeSingle) {
      returnData = results[0] || null;
    }

    return {
      data: returnData,
      error: null,
      count: totalCount
    };
  }

  // Promise resolution support so `await supabase.from(...)` works seamlessly
  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    try {
      const res = this.execute();
      return Promise.resolve(resolve(res));
    } catch (err) {
      if (reject) return Promise.reject(reject(err));
      return Promise.reject(err);
    }
  }
}

const mockSupabase = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  auth: {
    async getSession() {
      return { data: { session: MOCK_SESSION }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      // Notify immediately with mock session
      setTimeout(() => callback('SIGNED_IN', MOCK_SESSION), 10);
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    async signOut() {
      return { error: null };
    }
  }
};

export const supabase = (liveClient || mockSupabase) as any;
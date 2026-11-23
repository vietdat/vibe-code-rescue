'use strict';
// DEMO ONLY — intentionally vulnerable.
// A tiny stand-in for a Supabase client. There is no RLS policy file
// anywhere in this demo project, so these queries have no row-level
// protection. The audit flags that.
const rows = [
  { id: 1, owner: 'user-a', item: 'Wedding video 60s' },
  { id: 2, owner: 'user-a', item: 'Wedding video 2min' },
];

const supabase = {
  from(table) {
    return {
      select() {
        void table;
        return Promise.resolve(rows);
      },
    };
  },
};

module.exports = supabase;

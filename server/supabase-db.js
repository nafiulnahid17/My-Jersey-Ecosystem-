import { createClient } from '@supabase/supabase-js';

export function createSupabaseDatabase(url, secretKey) {
  const supabase = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    close() {},

    async health() {
      const { error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });
      throwIfError(error);
      return true;
    },

    async listProducts({ includeInactive = false, category = '', search = '' } = {}) {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) query = query.eq('active', true);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      throwIfError(error);

      if (!search) return data;
      const needle = search.toLocaleLowerCase();
      return data.filter((product) =>
        product.name.toLocaleLowerCase().includes(needle)
        || product.description.toLocaleLowerCase().includes(needle));
    },

    async getProductBySlug(slug, includeInactive = false) {
      let query = supabase
        .from('products')
        .select('*')
        .eq('slug', slug);

      if (!includeInactive) query = query.eq('active', true);
      const { data, error } = await query.maybeSingle();
      throwIfError(error);
      return data;
    },

    async createProduct(input) {
      const { data, error } = await supabase
        .from('products')
        .insert(input)
        .select('*')
        .single();
      throwIfError(error);
      return data;
    },

    async updateProduct(id, input) {
      const { data, error } = await supabase
        .from('products')
        .update(input)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      throwIfError(error);
      return data;
    },

    async deleteProduct(id) {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      throwIfError(error);
      return Boolean(data);
    },

    async createSubmission(table, input) {
      const allowedTables = new Set(['custom_requests', 'team_orders', 'contact_messages']);
      if (!allowedTables.has(table)) throw new Error('Unknown submission table');

      const { data, error } = await supabase
        .from(table)
        .insert(input)
        .select('id, created_at')
        .single();
      throwIfError(error);
      return data;
    },

    async listSubmissions() {
      const [custom, teams, messages] = await Promise.all([
        supabase.from('custom_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('team_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      ]);

      throwIfError(custom.error);
      throwIfError(teams.error);
      throwIfError(messages.error);

      return {
        custom_requests: custom.data,
        team_orders: teams.data,
        contact_messages: messages.data,
      };
    },
  };
}

function throwIfError(error) {
  if (!error) return;
  const wrapped = new Error(error.message);
  wrapped.code = error.code;
  wrapped.details = error.details;
  throw wrapped;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\//i;

export class ValidationError extends Error {
  constructor(fields) {
    super('The submitted data is invalid.');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export function validate(schema, source) {
  const output = {};
  const errors = {};
  for (const [key, rules] of Object.entries(schema)) {
    let value = source?.[key];
    if (typeof value === 'string') value = value.trim();
    if ((value === undefined || value === null || value === '') && rules.required) {
      errors[key] = 'This field is required.';
      continue;
    }
    if (value === undefined || value === null || value === '') {
      output[key] = rules.default ?? null;
      continue;
    }
    if (rules.type === 'string') {
      if (typeof value !== 'string') errors[key] = 'Must be text.';
      else if (value.length > rules.max) errors[key] = `Must be ${rules.max} characters or fewer.`;
      else if (rules.min && value.length < rules.min) errors[key] = `Must be at least ${rules.min} characters.`;
    }
    if (rules.type === 'integer') {
      value = Number(value);
      if (!Number.isInteger(value) || value < (rules.min ?? 0) || value > (rules.max ?? Number.MAX_SAFE_INTEGER)) {
        errors[key] = `Must be a whole number from ${rules.min ?? 0} to ${rules.max ?? Number.MAX_SAFE_INTEGER}.`;
      }
    }
    if (rules.email && !emailPattern.test(value)) errors[key] = 'Enter a valid email address.';
    if (rules.url && !urlPattern.test(value)) errors[key] = 'Enter a full http or https URL.';
    if (rules.oneOf && !rules.oneOf.includes(value)) errors[key] = 'Choose a valid option.';
    if (rules.pattern && !rules.pattern.test(value)) errors[key] = 'Use the required format.';
    output[key] = value;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return output;
}

const text = (max, extra = {}) => ({ type: 'string', max, ...extra });

export const schemas = {
  product: {
    slug: text(100, { required: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }),
    name: text(120, { required: true }),
    description: text(2000, { default: '' }),
    category: text(60, { required: true }),
    base_price: { type: 'integer', min: 0, max: 100000000, default: null },
    currency: text(3, { default: 'BDT', pattern: /^[A-Z]{3}$/ }),
    image_url: text(1000, { url: true, default: null }),
    stock_status: text(20, { default: 'made_to_order', oneOf: ['made_to_order', 'in_stock', 'out_of_stock'] }),
    active: { default: false },
  },
  customRequest: {
    customer_name: text(100, { required: true }),
    email: text(254, { required: true, email: true }),
    phone: text(30),
    sport: text(60, { required: true }),
    quantity: { type: 'integer', min: 1, max: 10000, required: true },
    preferred_colors: text(120),
    reference_url: text(1000, { url: true }),
    details: text(3000, { required: true, min: 10 }),
  },
  teamOrder: {
    contact_name: text(100, { required: true }),
    organization: text(160, { required: true }),
    email: text(254, { required: true, email: true }),
    phone: text(30),
    quantity: { type: 'integer', min: 1, max: 10000, required: true },
    target_date: text(10, { pattern: /^\d{4}-\d{2}-\d{2}$/ }),
    details: text(3000, { required: true, min: 10 }),
  },
  contact: {
    name: text(100, { required: true }),
    email: text(254, { required: true, email: true }),
    subject: text(160, { required: true }),
    message: text(3000, { required: true, min: 10 }),
  },
};

export function normalizeProduct(source, partial = false) {
  if (!partial) {
    const result = validate(schemas.product, source);
    result.active = source.active === true;
    return result;
  }
  const selected = Object.fromEntries(Object.entries(schemas.product).filter(([key]) => key in (source ?? {})));
  const result = validate(selected, source);
  if ('active' in (source ?? {})) result.active = source.active === true;
  return result;
}

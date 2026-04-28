import enUS from './en-US';
import { reactive, watch } from 'vue';

const baseMessages: Record<string, any> = {
  'en-US': enUS,
};

const state = reactive({
  locale: localStorage.getItem('finance_locale') || 'en-US'
});

export function setLocale(locale: string) {
  state.locale = locale;
  localStorage.setItem('finance_locale', locale);
}

export function getLocale() {
  return state.locale;
}

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((curr, key) => (curr && curr[key] !== undefined ? curr[key] : undefined), obj);
}

export function t(path: string, params: Record<string, any> = {}) {
  const localeMessages = baseMessages[state.locale] || baseMessages['en-US'] || {};
  let text = getByPath(localeMessages, path);

  if (text === undefined) {
    return path;
  }

  if (typeof text !== 'string') {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export default {
  t,
  setLocale,
  getLocale
};

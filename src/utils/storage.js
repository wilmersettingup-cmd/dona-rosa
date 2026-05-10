const API_KEY = 'dona-rosa-api-key'

export const getApiKey = () => localStorage.getItem(API_KEY) || ''
export const setApiKey = (k) => k ? localStorage.setItem(API_KEY, k) : localStorage.removeItem(API_KEY)

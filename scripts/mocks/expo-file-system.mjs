export const cacheDirectory = '/tmp/cache/';
export const documentDirectory = '/tmp/doc/';
export const readAsStringAsync = async () => '{}';
export const writeAsStringAsync = async () => {};
export const deleteAsync = async () => {};
export const getInfoAsync = async () => ({ exists: false });
export default {
  cacheDirectory,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
};

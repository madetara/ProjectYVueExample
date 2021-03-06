export default (target: any, path: string, fallbackValue: any): any => {
  let value = target;
  for (const pathPeace of path.split('.')) {
    if (value[pathPeace] == null) return fallbackValue;

    value = value[pathPeace];
  }
  return value;
};

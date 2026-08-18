// Wrapper pour que les handlers async propagent leurs erreurs vers le middleware Express
export const ah = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
